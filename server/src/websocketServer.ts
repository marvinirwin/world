import { WebSocketServer, WebSocket } from 'ws';
import { GameEngine } from './gameEngine.js';
import { ClientMessage, ServerMessage, GameEvent } from '../../shared/types.js';
import { CommandHandler } from './commandHandler.js';

export class GameWebSocketServer {
  private wss: WebSocketServer;
  private gameEngine: GameEngine;
  private commandHandler: CommandHandler;
  private clients: Map<WebSocket, string> = new Map(); // WebSocket -> entityId

  constructor(port: number, gameEngine: GameEngine, commandHandler: CommandHandler) {
    this.gameEngine = gameEngine;
    this.commandHandler = commandHandler;
    this.wss = new WebSocketServer({ port });
    this.setupEventHandlers();
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

      // Send current game state
      const gameState = this.gameEngine.getGameState();
      this.sendToClient(ws, {
        type: 'gameState',
        data: gameState
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
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Not joined to any entity' }
      });
      return;
    }

    if (!message.data?.command) {
      this.sendToClient(ws, {
        type: 'error',
        data: { message: 'Command required' }
      });
      return;
    }

    try {
      const worldId = message.worldId || 'default';
      const gameState = this.gameEngine.getGameState();
      
      // Process command through command handler
      const events = await this.commandHandler.processCommand(
        entityId,
        worldId,
        message.data.command,
        gameState
      );

      // Process all resulting events
      await this.processEvents(events);

      console.log(`Processed command "${message.data.command}" from ${entityId}, generated ${events.length} events`);
    } catch (error) {
      console.error('Error processing command:', error);
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
      const { command, characterId } = message.data;

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
          
          // Refresh game state for all clients
          this.broadcastGameState();
          
          this.sendToClient(ws, {
            type: 'gameState',
            data: { message: `Character ${characterId} deleted successfully` }
          });
          
          console.log(`DEV: Character ${characterId} deleted`);
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

  // New method to handle events from both user commands and game engine
  public async processGameEngineEvent(event: GameEvent): Promise<void> {
    // Process event through command handler to generate secondary events
    const secondaryEvents = await this.commandHandler.handleEvent(event);
    
    // Add the original event to the game engine and broadcast it
    await this.gameEngine.addEvent(event);
    this.broadcastEvent(event);
    
    // Process any secondary events
    await this.processEvents(secondaryEvents);
  }

  private async processEvents(events: GameEvent[]): Promise<void> {
    const allEvents: GameEvent[] = [];
    const eventsToProcess = [...events];

    while (eventsToProcess.length > 0) {
      const event = eventsToProcess.shift()!;
      allEvents.push(event);

      // Add event to game engine and broadcast
      await this.gameEngine.addEvent(event);
      this.broadcastEvent(event);

      // Process the event through command handler to generate any secondary events
      const secondaryEvents = await this.commandHandler.handleEvent(event);
      
      // Add secondary events to the processing queue
      eventsToProcess.push(...secondaryEvents);
    }
  }

  private sendToClient(ws: WebSocket, message: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  public broadcastEvent(event: GameEvent): void {
    const message: ServerMessage = {
      type: 'event',
      data: event
    };

    this.wss.clients.forEach((ws) => {
      this.sendToClient(ws, message);
    });
  }

  public broadcastGameState(): void {
    const gameState = this.gameEngine.getGameState();
    const message: ServerMessage = {
      type: 'gameState',
      data: gameState
    };

    this.wss.clients.forEach((ws) => {
      this.sendToClient(ws, message);
    });
  }

  public close(): void {
    this.wss.close();
    console.log('WebSocket server closed');
  }
} 