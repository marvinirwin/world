import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database.js';
import { GameEvent, CharacterCronjob } from '../../../shared/types.js';
import { ErrorService } from './errorService.js';

export class CronjobService {
  private database: Database;
  private checkTasksInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_TASKS_INTERVAL_MS = 30000; // 30 seconds instead of 2 seconds
  private onErrorEvent?: (event: GameEvent) => Promise<void>;

  constructor(database: Database, onErrorEvent?: (event: GameEvent) => Promise<void>) {
    this.database = database;
    this.onErrorEvent = onErrorEvent;
  }

  startPeriodicTaskChecking(
    worldId: string, 
    onCheckTasksEvent: (event: GameEvent) => Promise<void>
  ): void {
    if (this.checkTasksInterval) {
      console.log('Periodic task checking already running');
      return;
    }

    console.log(`Starting periodic task checking for world: ${worldId}`);
    
    this.checkTasksInterval = setInterval(async () => {
      await this.executeScheduledTasks(worldId, onCheckTasksEvent);
    }, this.CHECK_TASKS_INTERVAL_MS);
  }

  stopPeriodicTaskChecking(): void {
    if (this.checkTasksInterval) {
      clearInterval(this.checkTasksInterval);
      this.checkTasksInterval = null;
      console.log('Stopped periodic task checking');
    }
  }

  private async executeScheduledTasks(
    worldId: string,
    onCheckTasksEvent: (event: GameEvent) => Promise<void>
  ): Promise<void> {
    console.log(`DEBUG: CronjobService.executeScheduledTasks starting for world: ${worldId}`);
    
    try {
      // Get all cronjobs that are due for execution
      const dueCronjobs = await this.database.getCronjobsDueForExecution(worldId);
      console.log(`DEBUG: Found ${dueCronjobs.length} due cronjobs`);
      
      for (const cronjob of dueCronjobs) {
        try {
          console.log(`DEBUG: Processing cronjob ${cronjob.id} for character ${cronjob.characterId}: "${cronjob.taskDescription}"`);
          
          // Create checkTasks event for this character
          const checkTasksEvent: GameEvent = {
            id: uuidv4(),
            functionCall: 'checkTasks',
            parameters: {
              entityId: cronjob.characterId,
              worldId: worldId,
              triggeredBy: 'interval'
            },
            timestamp: new Date()
          };

          console.log(`DEBUG: Triggering checkTasks event ${checkTasksEvent.id} for character ${cronjob.characterId}`);
          // Process the event
          await onCheckTasksEvent(checkTasksEvent);
          
          // Update the cronjob's last executed time
          await this.database.updateCronjobLastExecuted(cronjob.id);
          console.log(`DEBUG: Updated cronjob ${cronjob.id} last executed time`);
        } catch (error) {
          console.error(`Error executing cronjob ${cronjob.id} for character ${cronjob.characterId}:`, error);
          
          // Create character error event for cronjob failure
          const errorEvent = ErrorService.createCharacterError(
            cronjob.characterId,
            worldId,
            `Scheduled task failed: ${cronjob.taskDescription}`,
            'cronjob',
            undefined,
            error as Error,
            'medium'
          );
          
          if (this.onErrorEvent) {
            await this.onErrorEvent(errorEvent);
          }
        }
      }

      // Also trigger checkTasks for all active characters, but less frequently
      // and only if they haven't taken action recently
      const allEntities = await this.database.getEntitiesByWorld(worldId);
      const recentEvents = await this.database.getRecentEvents(worldId, 50);
      
      console.log(`DEBUG: Found ${allEntities.length} total entities in world ${worldId}`);
      console.log(`DEBUG: Found ${recentEvents.length} recent events to check against`);
      
      for (const entity of allEntities) {
        try {
          // Check if this entity has had any recent events (within last 30 seconds)
          const entityRecentEvents = recentEvents.filter(event => 
            event.parameters.entityId === entity.id && 
            event.functionCall !== 'checkTasks' && // Don't count checkTasks events
            (Date.now() - new Date(event.timestamp).getTime()) < 30000 // Within 30 seconds
          );

          console.log(`DEBUG: Entity ${entity.id} has ${entityRecentEvents.length} recent non-checkTasks events`);
          
          // Only trigger checkTasks if the entity hasn't been active recently
          if (entityRecentEvents.length === 0) {
            console.log(`DEBUG: Entity ${entity.id} is inactive, triggering checkTasks`);
            
            const checkTasksEvent: GameEvent = {
              id: uuidv4(),
              functionCall: 'checkTasks',
              parameters: {
                entityId: entity.id,
                worldId: worldId,
                triggeredBy: 'interval'
              },
              timestamp: new Date()
            };

            console.log(`DEBUG: Triggering checkTasks event ${checkTasksEvent.id} for entity ${entity.id}`);
            await onCheckTasksEvent(checkTasksEvent);
          } else {
            console.log(`DEBUG: Entity ${entity.id} is active, skipping checkTasks`);
          }
        } catch (error) {
          console.error(`Error triggering periodic checkTasks for entity ${entity.id}:`, error);
          
          // Create character error event for periodic task failure
          const errorEvent = ErrorService.createCharacterError(
            entity.id,
            worldId,
            'Failed to execute periodic task check',
            'cronjob',
            undefined,
            error as Error,
            'low'
          );
          
          if (this.onErrorEvent) {
            await this.onErrorEvent(errorEvent);
          }
        }
      }

      console.log(`DEBUG: CronjobService.executeScheduledTasks completed for world: ${worldId}`);
    } catch (error) {
      console.error('Error executing scheduled tasks:', error);
      // For global cronjob errors, we can't target a specific character
      // so we'll just log it without creating character error events
    }
  }

  async createCronjob(
    characterId: string,
    worldId: string,
    taskDescription: string,
    intervalSeconds: number
  ): Promise<CharacterCronjob> {
    const cronjob: CharacterCronjob = {
      id: uuidv4(),
      characterId,
      worldId,
      taskDescription,
      intervalSeconds,
      lastExecuted: new Date(),
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.database.saveCronjob(cronjob);
    return cronjob;
  }

  async getCharacterCronjobs(characterId: string, worldId: string): Promise<CharacterCronjob[]> {
    return await this.database.getCharacterCronjobs(characterId, worldId);
  }

  async deactivateCronjob(cronjobId: string): Promise<void> {
    const cronjob = await this.database.getCronjobById(cronjobId);
    
    if (!cronjob) {
      throw new Error(`Cronjob ${cronjobId} not found`);
    }

    const updatedCronjob: CharacterCronjob = {
      ...cronjob,
      isActive: false,
      updatedAt: new Date()
    };

    await this.database.saveCronjob(updatedCronjob);
  }
} 