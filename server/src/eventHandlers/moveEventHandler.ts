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
    console.log(`DEBUG: *** handleMoveDecision ENTRY *** for entity ${entityId} to (${targetPosition?.x}, ${targetPosition?.y}, ${targetPosition?.z})`);
    
    // Validate targetPosition before proceeding
    if (!targetPosition) {
      console.error(`DEBUG: *** CRITICAL ERROR *** targetPosition is undefined for entity ${entityId}`);
      throw new Error(`Target position is undefined for entity ${entityId}`);
    }
    
    if (typeof targetPosition.x !== 'number' || typeof targetPosition.y !== 'number' || typeof targetPosition.z !== 'number') {
      console.error(`DEBUG: *** CRITICAL ERROR *** targetPosition has invalid coordinates:`, targetPosition);
      throw new Error(`Invalid target position coordinates for entity ${entityId}: x=${targetPosition.x}, y=${targetPosition.y}, z=${targetPosition.z}`);
    }
    
    console.log(`DEBUG: *** handleMoveDecision GETTING ENTITY *** ${entityId} from database`);
    const entity = await this.database.getEntity(entityId);
    if (!entity) {
      console.error(`DEBUG: *** CRITICAL ERROR *** Entity ${entityId} not found in database`);
      throw new Error(`Entity ${entityId} not found`);
    }

    console.log(`DEBUG: *** handleMoveDecision ENTITY LOADED *** Entity ${entityId} found with position:`, entity.position);
    
    // Validate entity position
    if (!entity.position) {
      console.error(`DEBUG: *** CRITICAL ERROR *** Entity ${entityId} has undefined position`);
      throw new Error(`Entity ${entityId} has undefined position`);
    }
    
    if (typeof entity.position.x !== 'number' || typeof entity.position.y !== 'number' || typeof entity.position.z !== 'number') {
      console.error(`DEBUG: *** CRITICAL ERROR *** Entity ${entityId} has invalid position coordinates:`, entity.position);
      throw new Error(`Entity ${entityId} has invalid position coordinates: x=${entity.position.x}, y=${entity.position.y}, z=${entity.position.z}`);
    }

    console.log(`DEBUG: *** handleMoveDecision CALCULATING PATH *** from (${entity.position.x}, ${entity.position.y}, ${entity.position.z}) to (${targetPosition.x}, ${targetPosition.y}, ${targetPosition.z})`);
    
    // Calculate path segments with direction changes
    const pathSegments = this.calculatePathSegments(entity.position, targetPosition);
    console.log(`DEBUG: *** handleMoveDecision PATH CALCULATED *** ${pathSegments.length} path segments:`, pathSegments);
    
    // Validate pathSegments array
    if (!pathSegments || !Array.isArray(pathSegments) || pathSegments.length === 0) {
      console.error(`DEBUG: *** CRITICAL ERROR *** calculatePathSegments returned invalid data:`, pathSegments);
      throw new Error(`calculatePathSegments returned invalid path segments: ${JSON.stringify(pathSegments)}`);
    }
    
    console.log(`DEBUG: *** handleMoveDecision CREATING EVENTS *** Creating ${pathSegments.length} movement events`);
    const movementEvents: MovementEvent[] = [];

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      
      // Double-check segment validity before creating MovementEvent
      if (!segment || !segment.from || !segment.to) {
        console.error(`DEBUG: Invalid path segment ${i + 1}/${pathSegments.length}:`, segment);
        throw new Error(`Invalid path segment at index ${i}: segment=${JSON.stringify(segment)}`);
      }
      
      if (typeof segment.from.x !== 'number' || typeof segment.from.y !== 'number' || typeof segment.from.z !== 'number') {
        console.error(`DEBUG: Invalid 'from' position in segment ${i + 1}:`, segment.from);
        throw new Error(`Invalid 'from' position in segment ${i}: ${JSON.stringify(segment.from)}`);
      }
      
      if (typeof segment.to.x !== 'number' || typeof segment.to.y !== 'number' || typeof segment.to.z !== 'number') {
        console.error(`DEBUG: Invalid 'to' position in segment ${i + 1}:`, segment.to);
        throw new Error(`Invalid 'to' position in segment ${i}: ${JSON.stringify(segment.to)}`);
      }
      
      const moveEvent: MovementEvent = {
        id: uuidv4(),
        functionCall: 'move',
        parameters: {
          entityId,
          worldId,
          from: segment.from,
          to: segment.to,
          duration: this.calculateMovementDuration(segment.from, segment.to)
        },
        timestamp: new Date()
      };

      console.log(`DEBUG: Created movement event ${i + 1}/${pathSegments.length}: ${moveEvent.id} from (${moveEvent.parameters.from.x}, ${moveEvent.parameters.from.y}, ${moveEvent.parameters.from.z}) to (${moveEvent.parameters.to.x}, ${moveEvent.parameters.to.y}, ${moveEvent.parameters.to.z}) duration: ${moveEvent.parameters.duration}ms`);
      movementEvents.push(moveEvent);
    }

    // Update entity position in database to final position only once
    console.log(`DEBUG: Updating entity ${entityId} position in database to final position`);
    await this.database.updateEntityPosition(entityId, targetPosition);

    console.log(`DEBUG: MoveEventHandler.handleMoveDecision returning ${movementEvents.length} events`);
    return movementEvents;
  }

  private calculatePathSegments(from: Position, to: Position): Array<{from: Position, to: Position}> {
    console.log(`DEBUG: calculatePathSegments called with from:`, from, `to:`, to);
    
    // Validate input positions
    if (!from || !to) {
      console.error(`DEBUG: calculatePathSegments received undefined positions: from=${from}, to=${to}`);
      throw new Error(`Cannot calculate path segments with undefined positions: from=${from}, to=${to}`);
    }
    
    if (typeof from.x !== 'number' || typeof from.y !== 'number' || typeof from.z !== 'number') {
      console.error(`DEBUG: calculatePathSegments received invalid 'from' position:`, from);
      throw new Error(`Invalid 'from' position coordinates: x=${from.x}, y=${from.y}, z=${from.z}`);
    }
    
    if (typeof to.x !== 'number' || typeof to.y !== 'number' || typeof to.z !== 'number') {
      console.error(`DEBUG: calculatePathSegments received invalid 'to' position:`, to);
      throw new Error(`Invalid 'to' position coordinates: x=${to.x}, y=${to.y}, z=${to.z}`);
    }
    
    // For now, most movements are straight lines
    // In the future, this could be enhanced with pathfinding around obstacles
    
    const totalDistance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + 
      Math.pow(to.y - from.y, 2) + 
      Math.pow(to.z - from.z, 2)
    );

    // If it's a short distance or direct line of sight, just go straight
    if (totalDistance <= 2.0 || this.hasDirectPath(from, to)) {
      return [{ from, to }];
    }

    // For longer distances, we might need to break into segments in the future
    // For now, treat as single straight line segment
    // TODO: Add obstacle detection and pathfinding here
    return [{ from, to }];
  }

  private hasDirectPath(from: Position, to: Position): boolean {
    // Simple direct path check - in the future this could check for obstacles
    // For now, assume all paths are direct
    return true;
  }

  private calculateMovementDuration(from: Position, to: Position): number {
    const distance = Math.sqrt(
      Math.pow(to.x - from.x, 2) + 
      Math.pow(to.y - from.y, 2) + 
      Math.pow(to.z - from.z, 2)
    );
    
    // Faster movement for shorter segments (0.8 units per second)
    return Math.max(500, Math.round(distance * 1250)); // Minimum 500ms, 1.25 seconds per unit
  }
}

// Export wrapper function for index.ts compatibility
export async function handleMoveEvent(
  event: GameEvent,
  database: Database,
  llmService: LLMService,
  memoryService: MemoryService
): Promise<MovementEvent[]> {
  console.log(`DEBUG: *** handleMoveEvent ENTRY *** called for event ${event.id}`);
  console.log(`DEBUG: *** handleMoveEvent event.parameters:`, JSON.stringify(event.parameters, null, 2));
  
  const { entityId, worldId, targetPosition } = event.parameters;
  
  if (!targetPosition) {
    console.error('DEBUG: *** CRITICAL ERROR *** Move event missing targetPosition parameter. Available parameters:', Object.keys(event.parameters));
    throw new Error(`Move event missing targetPosition parameter. Available: ${Object.keys(event.parameters).join(', ')}`);
  }
  
  // Validate targetPosition has required properties
  if (typeof targetPosition !== 'object' || targetPosition === null) {
    console.error('DEBUG: *** CRITICAL ERROR *** targetPosition is not an object:', targetPosition);
    throw new Error(`Invalid targetPosition: expected object, got ${typeof targetPosition}`);
  }
  
  if (typeof targetPosition.x !== 'number' || typeof targetPosition.y !== 'number' || typeof targetPosition.z !== 'number') {
    console.error('DEBUG: *** CRITICAL ERROR *** targetPosition missing x/y/z coordinates:', targetPosition);
    throw new Error(`Invalid targetPosition coordinates: x=${targetPosition.x}, y=${targetPosition.y}, z=${targetPosition.z}`);
  }
  
  console.log(`DEBUG: *** handleMoveEvent VALIDATION PASSED *** Move event for entity ${entityId} to position:`, targetPosition);
  const handler = new MoveEventHandler(database);
  const result = await handler.handleMoveDecision(entityId, worldId, targetPosition);
  console.log(`DEBUG: *** handleMoveEvent RETURNING *** Move handler returned ${result.length} movement events:`, result.map(e => `${e.id}: from(${e.parameters.from?.x},${e.parameters.from?.y},${e.parameters.from?.z}) to(${e.parameters.to?.x},${e.parameters.to?.y},${e.parameters.to?.z})`));
  return result;
} 