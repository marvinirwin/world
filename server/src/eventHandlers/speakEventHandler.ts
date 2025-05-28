import { SpeechEvent, HeardEvent, Entity, GameEvent } from '../../../shared/types.js';
import { Database } from '../database.js';
import { LLMService } from '../services/llmService.js';
import { MemoryService } from '../services/memoryService.js';
import { v4 as uuidv4 } from 'uuid';

export class SpeakEventHandler {
  constructor(private database: Database) {}

  async handleSpeakDecision(
    entityId: string,
    worldId: string,
    message: string,
    volume: number = 5.0
  ): Promise<(SpeechEvent | HeardEvent)[]> {
    const speaker = await this.database.getEntity(entityId);
    if (!speaker) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const speechEvent: SpeechEvent = {
      id: uuidv4(),
      functionCall: 'speak',
      parameters: {
        entityId,
        worldId,
        message,
        volume
      },
      timestamp: new Date()
    };

    // Find all entities in the same world
    const worldEntities = await this.database.getEntitiesByWorld(worldId);
    const heardEvents: HeardEvent[] = [];

    for (const entity of worldEntities) {
      if (entity.id === entityId) continue; // Don't make speaker hear themselves

      const distance = this.calculateDistance(speaker.position, entity.position);
      
      // Check if the entity can hear based on volume and distance
      if (distance <= volume) {
        const heardEvent: HeardEvent = {
          id: uuidv4(),
          functionCall: 'heard',
          parameters: {
            entityId: entity.id,
            worldId,
            speakerId: entityId,
            message,
            distance
          },
          timestamp: new Date()
        };

        heardEvents.push(heardEvent);
      }
    }

    return [speechEvent, ...heardEvents];
  }

  private calculateDistance(pos1: any, pos2: any): number {
    return Math.sqrt(
      Math.pow(pos2.x - pos1.x, 2) + 
      Math.pow(pos2.y - pos1.y, 2) + 
      Math.pow(pos2.z - pos1.z, 2)
    );
  }
}

// Export wrapper function for index.ts compatibility
export async function handleSpeakEvent(
  event: GameEvent,
  database: Database,
  llmService: LLMService,
  memoryService: MemoryService
): Promise<(SpeechEvent | HeardEvent)[]> {
  const { entityId, worldId, message, volume = 5.0 } = event.parameters;
  const handler = new SpeakEventHandler(database);
  return await handler.handleSpeakDecision(entityId, worldId, message, volume);
} 