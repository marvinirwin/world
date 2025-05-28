import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database.js';
import { GameEvent, CharacterCronjob } from '../../../shared/types.js';

export class CronjobService {
  private database: Database;
  private checkTasksInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_TASKS_INTERVAL_MS = 2000; // 2 seconds

  constructor(database: Database) {
    this.database = database;
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
    try {
      // Get all cronjobs that are due for execution
      const dueCronjobs = await this.database.getCronjobsDueForExecution(worldId);
      
      for (const cronjob of dueCronjobs) {
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

        // Process the event
        await onCheckTasksEvent(checkTasksEvent);
        
        // Update the cronjob's last executed time
        await this.database.updateCronjobLastExecuted(cronjob.id);
      }

      // Also trigger checkTasks for all active characters every 2 seconds
      // This allows characters to respond to events and pursue desires
      const allEntities = await this.database.getEntitiesByWorld(worldId);
      
      for (const entity of allEntities) {
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

        await onCheckTasksEvent(checkTasksEvent);
      }

    } catch (error) {
      console.error('Error executing scheduled tasks:', error);
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