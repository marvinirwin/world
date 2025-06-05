import { v4 as uuidv4 } from 'uuid';
import { Database } from './database.js';
import { GameEvent, LLMDecision, GameState, UserCommandEvent } from '../../shared/types.js';
import { LLMService } from './services/llmService.js';
import { MemoryService } from './services/memoryService.js';
import { ErrorService } from './services/errorService.js';
import { 
  handleMoveEvent, 
  handleSpeakEvent, 
  handlePickupEvent, 
  handleDropEvent,
  handleCheckTasksEvent
} from './eventHandlers/index.js';
import { MoveEventHandler } from './eventHandlers/moveEventHandler.js';

export class CommandHandler {
  private database: Database;
  private llmService: LLMService;
  private memoryService: MemoryService;
  private onErrorEvent?: (event: GameEvent) => Promise<void>;

  constructor(
    database: Database, 
    llmService: LLMService, 
    memoryService: MemoryService,
    onErrorEvent?: (event: GameEvent) => Promise<void>
  ) {
    this.database = database;
    this.llmService = llmService;
    this.memoryService = memoryService;
    this.onErrorEvent = onErrorEvent;
  }

  async processCommand(
    entityId: string, 
    worldId: string, 
    command: string, 
    source: 'manual' | 'script',
    gameState: GameState
  ): Promise<GameEvent[]> {
    console.log(`DEBUG: CommandHandler.processCommand called with: entityId=${entityId}, worldId=${worldId}, command="${command}", source=${source}`);
    const resultEvents: GameEvent[] = [];

    try {
      // Create UserCommandEvent first to show the command was received
      const userCommandEvent: UserCommandEvent = {
        id: uuidv4(),
        functionCall: 'userCommand',
        parameters: {
          entityId,
          worldId,
          command,
          source
        },
        timestamp: new Date()
      };
      
      // Add the user command event to results immediately
      resultEvents.push(userCommandEvent);
      console.log(`DEBUG: Created UserCommandEvent: ${userCommandEvent.id}`);

      // Get LLM decision based on instruction
      console.log(`DEBUG: Requesting LLM decision for command: "${command}"`);
      const decision = await this.llmService.generateDecision(
        entityId,
        worldId,
        command,
        gameState
      );

      if (!decision) {
        console.warn(`DEBUG: No decision generated for instruction: "${command}" from entity: ${entityId}`);
        
        // Create error event for no decision
        const errorEvent = ErrorService.createCharacterError(
          entityId,
          worldId,
          'No decision could be generated for this command',
          'command',
          command,
          undefined,
          'low'
        );
        
        if (this.onErrorEvent) {
          await this.onErrorEvent(errorEvent);
        }
        
        console.log(`DEBUG: Returning ${resultEvents.length} events (UserCommand only, no LLM decision)`);
        return resultEvents;
      }

      console.log(`DEBUG: LLM decision received: ${decision.functionCall} with parameters:`, decision.parameters);

      // Process decision directly through appropriate handler without creating intermediate event
      console.log(`DEBUG: Processing decision through handler: ${decision.functionCall}`);
      let handlerEvents: GameEvent[] = [];
      
      if (decision.functionCall === 'move') {
        // Handle move decisions directly without intermediate event
        const { targetPosition } = decision.parameters;
        const moveHandler = new MoveEventHandler(this.database);
        handlerEvents = await moveHandler.handleMoveDecision(entityId, worldId, targetPosition);
      } else {
        // For other decisions, create event and use existing handlers
        const event: GameEvent = {
          id: uuidv4(),
          functionCall: decision.functionCall,
          parameters: {
            entityId,
            worldId,
            ...decision.parameters
          },
          timestamp: new Date()
        };
        handlerEvents = await this.handleEvent(event);
      }

      console.log(`DEBUG: Handler returned ${handlerEvents.length} events:`, 
        handlerEvents.map(e => `${e.functionCall}(${e.id})`).join(', '));
      resultEvents.push(...handlerEvents);

      // Create memory of the instruction and decision
      const instructionMemory = {
        id: uuidv4(),
        characterId: entityId,
        worldId: worldId,
        memoryText: `I heard the instruction "${command}" in my mind and decided to ${decision.functionCall}. ${decision.reasoning || ''}`,
        importanceScore: 0.8,
        timestamp: new Date(),
        relatedEventIds: handlerEvents.map(e => e.id)
      };

      await this.database.saveMemory(instructionMemory);
      console.log(`DEBUG: Saved memory for instruction: ${instructionMemory.id}`);

    } catch (error) {
      console.error('DEBUG: Error processing instruction:', error);
      
      // Create character error event
      const errorEvent = ErrorService.createCharacterError(
        entityId,
        worldId,
        'Failed to process command due to system error',
        'command',
        command,
        error as Error,
        'high'
      );
      
      if (this.onErrorEvent) {
        await this.onErrorEvent(errorEvent);
      }
      
      // Create error memory
      const errorMemory = {
        id: uuidv4(),
        characterId: entityId,
        worldId: worldId,
        memoryText: `I encountered an error while processing the instruction "${command}" that I heard in my mind.`,
        importanceScore: 0.6,
        timestamp: new Date(),
        relatedEventIds: []
      };

      await this.database.saveMemory(errorMemory);
    }

    console.log(`DEBUG: CommandHandler.processCommand returning ${resultEvents.length} events:`, 
      resultEvents.map(e => `${e.functionCall}(${e.id})`).join(', '));
    return resultEvents;
  }

  async handleEvent(event: GameEvent): Promise<GameEvent[]> {
    const resultEvents: GameEvent[] = [];

    try {
      switch (event.functionCall) {
        case 'move':
          const moveEvents = await handleMoveEvent(event, this.database, this.llmService, this.memoryService);
          resultEvents.push(...moveEvents);
          break;
          
        case 'speak':
          const speakEvents = await handleSpeakEvent(event, this.database, this.llmService, this.memoryService);
          resultEvents.push(...speakEvents);
          break;
          
        case 'pickup':
          const pickupEvents = await handlePickupEvent(event, this.database, this.llmService, this.memoryService);
          resultEvents.push(...pickupEvents);
          break;
          
        case 'drop':
          const dropEvents = await handleDropEvent(event, this.database, this.llmService, this.memoryService);
          resultEvents.push(...dropEvents);
          break;
          
        case 'checkTasks':
          console.log(`DEBUG: CommandHandler.handleEvent processing checkTasks for entity ${event.parameters.entityId}`);
          const checkTasksEvents = await handleCheckTasksEvent(event, this.database, this.llmService, this.memoryService);
          console.log(`DEBUG: checkTasksEventHandler returned ${checkTasksEvents.length} events:`, 
            checkTasksEvents.map(e => `${e.functionCall}(${e.id})`).join(', '));
          resultEvents.push(...checkTasksEvents);
          break;
          
        default:
          console.warn(`Unknown event function call: ${event.functionCall}`);
          
          // Create error event for unknown function call
          const errorEvent = ErrorService.createCharacterError(
            event.parameters.entityId,
            event.parameters.worldId,
            `Unknown action type: ${event.functionCall}`,
            'event',
            undefined,
            undefined,
            'medium'
          );
          
          if (this.onErrorEvent) {
            await this.onErrorEvent(errorEvent);
          }
      }
    } catch (error) {
      console.error('Error handling event:', error);
      
      // Create character error event for event handling failure
      const errorEvent = ErrorService.createCharacterError(
        event.parameters.entityId,
        event.parameters.worldId,
        `Failed to execute ${event.functionCall} action`,
        event.functionCall as any,
        undefined,
        error as Error,
        'high'
      );
      
      if (this.onErrorEvent) {
        await this.onErrorEvent(errorEvent);
      }
    }

    return resultEvents;
  }
} 