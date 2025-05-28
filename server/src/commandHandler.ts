import { v4 as uuidv4 } from 'uuid';
import { Database } from './database.js';
import { GameEvent, LLMDecision, GameState } from '../../shared/types.js';
import { LLMService } from './services/llmService.js';
import { MemoryService } from './services/memoryService.js';
import { 
  handleMoveEvent, 
  handleSpeakEvent, 
  handlePickupEvent, 
  handleDropEvent,
  handleCheckTasksEvent 
} from './eventHandlers/index.js';

export class CommandHandler {
  private database: Database;
  private llmService: LLMService;
  private memoryService: MemoryService;

  constructor(database: Database, llmService: LLMService, memoryService: MemoryService) {
    this.database = database;
    this.llmService = llmService;
    this.memoryService = memoryService;
  }

  async processCommand(
    entityId: string, 
    worldId: string, 
    command: string, 
    gameState: GameState
  ): Promise<GameEvent[]> {
    const resultEvents: GameEvent[] = [];

    try {
      // Get LLM decision based on instruction
      const decision = await this.llmService.generateDecision(
        entityId,
        worldId,
        command,
        gameState
      );

      if (!decision) {
        console.warn(`No decision generated for instruction: "${command}" from entity: ${entityId}`);
        return resultEvents;
      }

      // Create event from decision
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

      // Process event through appropriate handler
      const handlerEvents = await this.handleEvent(event);
      resultEvents.push(...handlerEvents);

      // Create memory of the instruction and decision
      const instructionMemory = {
        id: uuidv4(),
        characterId: entityId,
        worldId: worldId,
        memoryText: `I heard the instruction "${command}" in my mind and decided to ${decision.functionCall}. ${decision.reasoning || ''}`,
        importanceScore: 0.8,
        timestamp: new Date(),
        relatedEventIds: [event.id]
      };

      await this.database.saveMemory(instructionMemory);

    } catch (error) {
      console.error('Error processing instruction:', error);
      
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
          const checkTasksEvents = await handleCheckTasksEvent(event, this.database, this.llmService, this.memoryService);
          resultEvents.push(...checkTasksEvents);
          break;
          
        default:
          console.warn(`Unknown event function call: ${event.functionCall}`);
      }
    } catch (error) {
      console.error('Error handling event:', error);
    }

    return resultEvents;
  }
} 