import { WebSocketServer, WebSocket } from 'ws';
import { GameEngine } from './gameEngine.js';
import { ClientMessage, ServerMessage, GameEvent } from '../../shared/types.js';
import { CommandHandler } from './commandHandler.js';
import { v4 as uuidv4 } from 'uuid';

export class GameWebSocketServer {
  private wss: WebSocketServer;
  private gameEngine: GameEngine;
  private commandHandler: CommandHandler;
  private clients: Map<WebSocket, string> = new Map(); // WebSocket -> entityId

  constructor(port: number, gameEngine: GameEngine, commandHandler?: CommandHandler) {
    this.gameEngine = gameEngine;
    this.commandHandler = commandHandler!;
    this.wss = new WebSocketServer({ port });
    this.setupEventHandlers();
  }

  setCommandHandler(commandHandler: CommandHandler): void {
    this.commandHandler = commandHandler;
  }

  private setupEventHandlers(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('New WebSocket connection');

      ws.on('message', async (data: Buffer) => {
        try {
          const message: ClientMessage = JSON.parse(data.toString());
          await this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Error handling client message:', error);
          this.sendToClient(ws, {
            type: 'error',
            data: { message: 'Invalid message format' }
          });
        }
      });

      ws.on('close', () => {
        const entityId = this.clients.get(ws);
        if (entityId) {
          console.log(`Client disconnected: ${entityId}`);
          this.clients.delete(ws);
        }
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log(`WebSocket server listening on port ${this.wss.options.port}`);
  }

  private async handleClientMessage(ws: WebSocket, message: ClientMessage): Promise<void> {
    switch (message.type) {
      case 'join':
        await this.handleJoin(ws, message);
        break;
      case 'command':
        await this.handleCommand(ws, message);
        break;
      case 'devCommand':
        await this.handleDevCommand(ws, message);
        break;
      case 'getCronjobs':
        await this.handleGetCronjobs(ws, message);
        break;
      default:
        this.sendToClient(ws, {
          type: 'error',
          data: { message: 'Unknown message type' }
        });
    }
  }

  private async handleJoin(ws: WebSocket, message: ClientMessage): Promise<void> {
    if (!message.entityId) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Entity ID required' }
      });
      return;
    }

    try {
      // Join or create entity
      const entity = await this.gameEngine.joinEntity(message.entityId);
      this.clients.set(ws, message.entityId);

      // Send current game state without recent events
      const gameState = this.gameEngine.getGameState();
      const gameStateWithoutEvents = {
        worldId: gameState.worldId,
        entities: gameState.entities,
        recentEvents: [] // Send empty events array on connect
      };
      
      this.sendToClient(ws, {
        type: 'gameState',
        data: gameStateWithoutEvents
      });

      console.log(`Entity ${message.entityId} joined the game`);
    } catch (error) {
      console.error('Error joining entity:', error);
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Failed to join game' }
      });
    }
  }

  private async handleCommand(ws: WebSocket, message: ClientMessage): Promise<void> {
    const entityId = this.clients.get(ws);
    if (!entityId) {
      console.log('DEBUG: Command rejected - no entityId associated with WebSocket');
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Not joined to any entity' }
      });
      return;
    }

    if (!message.data?.command) {
      console.log('DEBUG: Command rejected - no command in message data');
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Command required' }
      });
      return;
    }

    try {
      const worldId = message.worldId || 'default';
      const command = message.data.command;
      const source = message.data.source || 'manual'; // Default to manual if not specified
      const gameState = this.gameEngine.getGameState();
      
      console.log(`DEBUG: Processing command "${command}" from ${entityId} (${source})`);
      console.log(`DEBUG: Current game state has ${Object.keys(gameState.entities).length} entities and ${gameState.recentEvents.length} recent events`);
      
      // Process command through command handler
      const events = await this.commandHandler.processCommand(
        entityId,
        worldId,
        command,
        source,
        gameState
      );

      console.log(`DEBUG: Command handler returned ${events.length} events:`, 
        events.map(e => `${e.functionCall}(${e.id})`).join(', '));

      // Process all resulting events
      await this.processEvents(events);

      console.log(`DEBUG: Processed command "${command}" from ${entityId} (${source}), generated ${events.length} events`);
    } catch (error) {
      console.error('DEBUG: Error processing command:', error);
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Failed to process command' }
      });
    }
  }

  private async handleDevCommand(ws: WebSocket, message: ClientMessage): Promise<void> {
    // Only allow dev commands in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (!isDevelopment) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Development commands not allowed in production' }
      });
      return;
    }

    if (!message.data?.command) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Dev command required' }
      });
      return;
    }

    try {
      const { command, characterId, assetId } = message.data;

      switch (command) {
        case 'deleteCharacter':
          if (!characterId) {
            this.sendToClient(ws, {
              type: 'error',
              data: { message: 'Character ID required for deletion' }
            });
            return;
          }

          await this.gameEngine.getDatabaseConnection().deleteCharacter(characterId);
          
          // Remove entity from game state
          await this.gameEngine.removeEntityFromState(characterId);
          
          // Refresh game state for all clients
          this.broadcastGameState();
          
          this.sendToClient(ws, {
            type: 'event',
            data: { 
              message: `Character ${characterId} deleted successfully`,
              type: 'dev_notification'
            }
          });
          
          console.log(`DEV: Character ${characterId} deleted`);
          break;

        case 'giveItem':
          console.log('Server: Processing giveItem dev command', { characterId, assetId });
          
          if (!characterId || !assetId) {
            this.sendToClient(ws, {
              type: 'error',
              data: { message: 'Character ID and Asset ID required for giving items' }
            });
            return;
          }

          // Get current game state to access entity
          const gameState = this.gameEngine.getGameState();
          const entity = gameState.entities[characterId];
          
          console.log('Server: Current game state entities:', Object.keys(gameState.entities));
          console.log('Server: Looking for entity:', characterId);
          console.log('Server: Found entity:', entity ? entity.name : 'NOT FOUND');
          
          if (!entity) {
            this.sendToClient(ws, {
              type: 'error',
              data: { message: `Character ${characterId} not found` }
            });
            return;
          }

          // Create new item instance
          const itemInstance = {
            id: uuidv4(),
            assetId: assetId,
            description: assetId.replace(/_/g, ' '),
            relativePosition: { x: 0, y: 0, z: 0 } // Default position
          };

          console.log('Server: Created item instance:', itemInstance);
          console.log('Server: Entity before adding item:', { 
            id: entity.id, 
            name: entity.name, 
            itemCount: entity.itemInstances.length 
          });

          // Add item to entity in memory
          entity.itemInstances.push(itemInstance);

          console.log('Server: Entity after adding item:', { 
            id: entity.id, 
            name: entity.name, 
            itemCount: entity.itemInstances.length,
            items: entity.itemInstances.map(item => item.description)
          });

          // Save to database
          await this.gameEngine.getDatabaseConnection().addItemInstanceToEntity(characterId, itemInstance);
          
          console.log('Server: Item saved to database');
          
          // Refresh game state for all clients
          this.broadcastGameState();
          
          console.log('Server: Game state broadcasted');
          
          console.log(`DEV: Item ${assetId} given to character ${characterId}`);
          break;
          
        default:
          this.sendToClient(ws, {
            type: 'error',
            data: { message: `Unknown dev command: ${command}` }
          });
      }
    } catch (error) {
      console.error('Error processing dev command:', error);
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Failed to process dev command' }
      });
    }
  }

  private async handleGetCronjobs(ws: WebSocket, message: ClientMessage): Promise<void> {
    // Only allow in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';
    if (!isDevelopment) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Cronjob viewing not allowed in production' }
      });
      return;
    }

    const { characterId } = message.data || {};
    if (!characterId) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Character ID required to get cronjobs' }
      });
      return;
    }

    try {
      const cronjobs = await this.gameEngine.getCharacterCronjobs(characterId);
      
      this.sendToClient(ws, {
        type: 'cronjobs',
        data: {
          characterId,
          cronjobs
        }
      });
      
      console.log(`DEV: Sent ${cronjobs.length} cronjobs for character ${characterId}`);
    } catch (error) {
      console.error('Error getting cronjobs:', error);
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Failed to get cronjobs' }
      });
    }
  }

  public async processGameEngineEvent(event: GameEvent): Promise<void> {
    console.log(`DEBUG: Processing game engine event: ${event.functionCall}(${event.id}) for entity ${event.parameters.entityId}`);
    
    try {
      // For checkTasks events, route through CommandHandler first to get LLM processing
      if (event.functionCall === 'checkTasks' && this.commandHandler) {
        console.log(`DEBUG: Routing checkTasks event ${event.id} through CommandHandler`);
        
        // Process the checkTasks event through the command handler to get LLM decisions
        const resultingEvents = await this.commandHandler.handleEvent(event);
        console.log(`DEBUG: CommandHandler returned ${resultingEvents.length} events from checkTasks processing`);
        
        // Add the original checkTasks event to game state
        await this.gameEngine.addEvent(event);
        console.log(`DEBUG: Original checkTasks event ${event.id} added to game state`);
        
        // Process any resulting events (move, speak, etc.) from the LLM decision
        if (resultingEvents.length > 0) {
          console.log(`DEBUG: Processing ${resultingEvents.length} resulting events from checkTasks`);
          await this.processEvents(resultingEvents);
        }
        
        // Broadcast the original checkTasks event
        this.broadcastEvent(event);
        console.log(`DEBUG: checkTasks event ${event.id} broadcasted to ${this.clients.size} connected clients`);
      } else {
        // For all other events, process normally
        await this.gameEngine.addEvent(event);
        console.log(`DEBUG: Event ${event.id} added to game state successfully`);
        
        // Broadcast event to all clients
        this.broadcastEvent(event);
        console.log(`DEBUG: Event ${event.id} broadcasted to ${this.clients.size} connected clients`);
      }
    } catch (error) {
      console.error('DEBUG: Error processing game engine event:', error);
    }
  }

  private async processCharacterErrorEvent(event: GameEvent): Promise<void> {
    console.log(`Processing character error event for: ${event.parameters.entityId}`);
    
    try {
      // Find the client connected as the affected entity
      for (const [ws, entityId] of this.clients.entries()) {
        if (entityId === event.parameters.entityId) {
          this.sendToClient(ws, {
            type: 'characterError',
            data: event
          });
          break;
        }
      }
      
      // Also add to game state as a regular event
      await this.gameEngine.addEvent(event);
    } catch (error) {
      console.error('Error processing character error event:', error);
    }
  }

  private async processEvents(events: GameEvent[]): Promise<void> {
    console.log(`DEBUG: Processing ${events.length} events from command handler`);
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      console.log(`DEBUG: Processing event ${i + 1}/${events.length}: ${event.functionCall}(${event.id})`);
      try {
        if (event.functionCall === 'characterError') {
          await this.processCharacterErrorEvent(event);
        } else {
          await this.processGameEngineEvent(event);
        }
      } catch (error) {
        console.error(`DEBUG: Error processing event ${event.id}:`, error);
      }
    }
    console.log(`DEBUG: Finished processing all ${events.length} events`);
  }

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcastEvent(event: GameEvent): void {
    console.log(`DEBUG: Broadcasting event ${event.functionCall}(${event.id}) to all clients`);
    const message: ServerMessage = {
      type: 'event',
      data: event
    };

    let clientCount = 0;
    for (const ws of this.clients.keys()) {
      if (ws.readyState === WebSocket.OPEN) {
        this.sendToClient(ws, message);
        clientCount++;
      }
    }
    console.log(`DEBUG: Event ${event.id} sent to ${clientCount} clients`);
  }

  public broadcastGameState(): void {
    const gameState = this.gameEngine.getGameState();
    console.log('Server: Broadcasting game state with entities:', Object.keys(gameState.entities));
    
    // Log item counts for debugging
    Object.entries(gameState.entities).forEach(([id, entity]) => {
      console.log(`Server: Entity ${entity.name} (${id}) has ${entity.itemInstances.length} items:`, 
        entity.itemInstances.map(item => item.description));
    });
    
    const message: ServerMessage = {
      type: 'gameState',
      data: gameState
    };

    console.log('Server: Sending gameState to', this.wss.clients.size, 'clients');
    this.wss.clients.forEach((ws) => {
      this.sendToClient(ws, message);
    });
  }

  public close(): void {
    this.wss.close();
    console.log('WebSocket server closed');
  }
} 