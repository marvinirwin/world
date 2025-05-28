import { MovementEvent, Position, Entity, GameEvent } from '../../../shared/types.js';
import { Database } from '../database.js';
import { LLMService } from '../services/llmService.js';
import { MemoryService } from '../services/memoryService.js';
import { v4 as uuidv4 } from 'uuid';

export class MoveEventHandler {
  constructor(private database: Database) {}

  async handleMoveDecision(
    entityId: string,
    worldId: string,
    targetPosition: Position
  ): Promise<MovementEvent[]> {
    const entity = await this.database.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    const moveEvent: MovementEvent = {
      id: uuidv4(),
      functionCall: 'move',
      parameters: {
        entityId,
        worldId,
        from: entity.position,
        to: targetPosition,
        duration: this.calculateMovementDuration(entity.position, targetPosition)
      },
      timestamp: new Date()
    };

    // Update entity position in database
    await this.database.updateEntityPosition(entityId, targetPosition);
    
    // Don't save the movement event here - let GameEngine handle event saving
    // await this.database.saveEvent(moveEvent);

    return [moveEvent];
  }

  private calculateMovementDuration(from: Position, to: Position): number {
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + 
      Math.pow(to.y - from.y, 2) + 
      Math.pow(to.z - from.z, 2)
    );
    
    // 1 unit per second movement speed
    return Math.max(1, Math.round(distance * 1000));
  }
}

// Export wrapper function for index.ts compatibility
export async function handleMoveEvent(
  event: GameEvent,
  database: Database,
  llmService: LLMService,
  memoryService: MemoryService
): Promise<MovementEvent[]> {
  const { entityId, worldId } = event.parameters;
  // The LLM decision comes with targetPosition, map it to the expected targetPosition parameter
  const targetPosition = event.parameters.targetPosition;
  
  if (!targetPosition) {
    throw new Error(`Move event missing targetPosition parameter`);
  }
  
  const handler = new MoveEventHandler(database);
  return await handler.handleMoveDecision(entityId, worldId, targetPosition);
} 