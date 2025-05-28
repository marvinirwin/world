import { PickupEvent, Entity, ItemInstance, Position, GameEvent } from '../../../shared/types.js';
import { Database } from '../database.js';
import { LLMService } from '../services/llmService.js';
import { MemoryService } from '../services/memoryService.js';
import { v4 as uuidv4 } from 'uuid';

export class PickupEventHandler {
  constructor(private database: Database) {}

  async handlePickupDecision(
    entityId: string,
    worldId: string,
    assetId: string,
    description: string = '',
    relativePosition: Position = { x: 0, y: 0, z: 0 }
  ): Promise<PickupEvent[]> {
    const entity = await this.database.getEntity(entityId);
    if (!entity) {
      throw new Error(`Entity ${entityId} not found`);
    }

    // Create new item instance
    const itemInstance: ItemInstance = {
      id: uuidv4(),
      assetId,
      description: description || `A ${assetId}`,
      relativePosition
    };

    const pickupEvent: PickupEvent = {
      id: uuidv4(),
      functionCall: 'pickup',
      parameters: {
        entityId,
        worldId,
        itemInstanceId: itemInstance.id,
        fromPosition: entity.position,
        relativePosition
      },
      timestamp: new Date()
    };

    // Add item instance to entity's inventory
    await this.database.addItemInstanceToEntity(entityId, itemInstance);
    // Don't save pickup event here - let GameEngine handle event saving
    // await this.database.saveEvent(pickupEvent);

    return [pickupEvent];
  }
}

// Export wrapper function for index.ts compatibility
export async function handlePickupEvent(
  event: GameEvent,
  database: Database,
  llmService: LLMService,
  memoryService: MemoryService
): Promise<PickupEvent[]> {
  const { entityId, worldId, assetId, description = '', relativePosition = { x: 0, y: 0, z: 0 } } = event.parameters;
  const handler = new PickupEventHandler(database);
  return await handler.handlePickupDecision(entityId, worldId, assetId, description, relativePosition);
} 