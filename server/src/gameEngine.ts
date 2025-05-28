import { v4 as uuidv4 } from 'uuid';
import { Database } from './database.js';
import { Entity, GameEvent, GameState, Position, ItemInstance } from '../../shared/types.js';
import { CronjobService } from './services/cronjobService.js';

export class GameEngine {
  private database: Database;
  private gameState: GameState;
  private worldId: string;
  private cronjobService: CronjobService;

  constructor(database: Database, worldId: string = 'default') {
    this.database = database;
    this.worldId = worldId;
    this.cronjobService = new CronjobService(database);
    this.gameState = {
      worldId: this.worldId,
      entities: {},
      recentEvents: []
    };
  }

  async initialize(): Promise<void> {
    await this.loadGameState();
    
    // Start the periodic task checking system
    this.cronjobService.startPeriodicTaskChecking(
      this.worldId,
      (event: GameEvent) => this.addEvent(event)
    );
    
    console.log(`Game engine initialized for world: ${this.worldId}`);
  }

  private async loadGameState(): Promise<void> {
    const entities = await this.database.getEntitiesByWorld(this.worldId);
    this.gameState.entities = {};
    
    for (const entity of entities) {
      this.gameState.entities[entity.id] = entity;
    }

    this.gameState.recentEvents = await this.database.getRecentEvents(this.worldId, 10);
    console.log(`Loaded ${entities.length} entities and ${this.gameState.recentEvents.length} recent events for world ${this.worldId}`);
  }

  async joinEntity(entityId: string): Promise<Entity> {
    let entity = this.gameState.entities[entityId];
    
    if (!entity) {
      // Create basic starting item instances for a character (empty hands, no equipment)
      const startingItemInstances: ItemInstance[] = [];

      // Create new entity with basic human body parts
      entity = {
        id: entityId,
        name: entityId,
        worldId: this.worldId,
        position: { x: 0, y: 0, z: 0 },
        bodyParts: ['human_head', 'human_torso', 'human_legs'],
        itemInstances: startingItemInstances
      };
      
      this.gameState.entities[entityId] = entity;
      await this.database.createOrUpdateEntity(entity);
      
      // Create spawn event
      const spawnEvent: GameEvent = {
        id: uuidv4(),
        functionCall: 'spawn',
        parameters: {
          entityId: entityId,
          worldId: this.worldId,
          position: entity.position
        },
        timestamp: new Date()
      };
      
      await this.addEvent(spawnEvent);
      console.log(`New entity spawned: ${entityId} in world ${this.worldId} with basic body parts`);
    }
    
    return entity;
  }

  getGameState(): GameState {
    return {
      worldId: this.worldId,
      entities: { ...this.gameState.entities },
      recentEvents: [...this.gameState.recentEvents]
    };
  }

  async addEvent(event: GameEvent): Promise<void> {
    // Ensure event belongs to this world
    if (event.parameters.worldId !== this.worldId) {
      console.warn(`Event for world ${event.parameters.worldId} ignored by engine for world ${this.worldId}`);
      return;
    }

    // Save to database
    await this.database.saveEvent(event);
    
    // Add to recent events
    this.gameState.recentEvents.unshift(event);
    if (this.gameState.recentEvents.length > 50) {
      this.gameState.recentEvents = this.gameState.recentEvents.slice(0, 50);
    }

    // Process event
    await this.processEvent(event);
  }

  private async processEvent(event: GameEvent): Promise<void> {
    switch (event.functionCall) {
      case 'move':
        await this.processMovementEvent(event);
        break;
      case 'speak':
        await this.processSpeakEvent(event);
        break;
      case 'checkTasks':
        await this.processCheckTasksEvent(event);
        break;
      default:
        break;
    }
  }

  private async processMovementEvent(event: GameEvent): Promise<void> {
    const entity = this.gameState.entities[event.parameters.entityId];
    if (!entity) return;

    const { to } = event.parameters;
    entity.position = to;
    await this.database.updateEntityPosition(event.parameters.entityId, to);
  }

  private async processSpeakEvent(event: GameEvent): Promise<void> {
    const speakerEntity = this.gameState.entities[event.parameters.entityId];
    if (!speakerEntity) return;

    const { message, volume = 1.0 } = event.parameters;
    const hearingRange = volume * 10; // Base hearing range

    // Generate heard events for nearby entities
    for (const [entityId, entity] of Object.entries(this.gameState.entities)) {
      if (entityId === event.parameters.entityId) continue; // Don't hear yourself

      const distance = this.calculateDistance(speakerEntity.position, entity.position);
      if (distance <= hearingRange) {
        const heardEvent: GameEvent = {
          id: uuidv4(),
          functionCall: 'heard',
          parameters: {
            entityId: entityId,
            worldId: this.worldId,
            speakerId: event.parameters.entityId,
            message: message,
            distance: distance
          },
          timestamp: new Date()
        };

        await this.addEvent(heardEvent);
      }
    }
  }

  private async processCheckTasksEvent(event: GameEvent): Promise<void> {
    // The checkTasks event itself doesn't need processing here
    // as it's handled by the checkTasksEventHandler through the websocket server
    // This is just for consistency with other events
    console.log(`CheckTasks event processed for entity: ${event.parameters.entityId}`);
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) +
      Math.pow(pos1.y - pos2.y, 2) +
      Math.pow(pos1.z - pos2.z, 2)
    );
  }

  async shutdown(): Promise<void> {
    this.cronjobService.stopPeriodicTaskChecking();
    console.log('Game engine shut down');
  }

  // Public methods for cronjob management
  async createCharacterCronjob(
    characterId: string,
    taskDescription: string,
    intervalSeconds: number
  ) {
    return await this.cronjobService.createCronjob(
      characterId,
      this.worldId,
      taskDescription,
      intervalSeconds
    );
  }

  async getCharacterCronjobs(characterId: string) {
    return await this.cronjobService.getCharacterCronjobs(characterId, this.worldId);
  }

  async deactivateCharacterCronjob(cronjobId: string) {
    return await this.cronjobService.deactivateCronjob(cronjobId);
  }
}