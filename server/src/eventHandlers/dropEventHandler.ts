import { DropEvent, Entity, ItemInstance, GameEvent } from '../../../shared/types.js';
import { Database } from '../database.js';
import { LLMService } from '../services/llmService.js';
import { MemoryService } from '../services/memoryService.js';
import { v4 as uuidv4 } from 'uuid';

export class DropEventHandler {
  constructor(private database: Database) {}

  async handleDropDecision(
    entityId: string,
    worldId: string,
    itemInstanceId: string
  ): Promise<DropEvent[]> {
    const entity = await this.database.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // Check if entity has the item instance
    const itemInstance = entity.itemInstances.find(item => item.id === itemInstanceId);
    if (!itemInstance) {
      throw new Error(`Entity ${entityId} does not have item instance ${itemInstanceId}`);
    }

    const dropEvent: DropEvent = {
      id: uuidv4(),
      functionCall: 'drop',
      parameters: {
        entityId,
        worldId,
        itemInstanceId,
        toPosition: entity.position
      },
      timestamp: new Date()
    };

    // Remove item instance from entity's inventory
    await this.database.removeItemInstanceFromEntity(itemInstanceId);
    // Don't save drop event here - let GameEngine handle event saving
    // await this.database.saveEvent(dropEvent);

    return [dropEvent];
  }
}

// Export wrapper function for index.ts compatibility
export async function handleDropEvent(
  event: GameEvent,
  database: Database,
  llmService: LLMService,
  memoryService: MemoryService
): Promise<DropEvent[]> {
  const { entityId, worldId, itemInstanceId } = event.parameters;
  const handler = new DropEventHandler(database);
  return await handler.handleDropDecision(entityId, worldId, itemInstanceId);
} 