# Item Instance System Implementation

## Overview

The game now has a complete item instance inventory system where characters "have" items with relative positioning. All items are rendered on characters using their offset positions.

## Key Changes Made

### 1. Updated Shared Types (`shared/types.ts`)
- Added `ItemInstance` interface with id, assetId, description, and relativePosition
- Updated `Entity` interface to use `itemInstances: ItemInstance[]` instead of `items: string[]`
- Updated `PickupEvent` and `DropEvent` to use `itemInstanceId` and include `relativePosition`

### 2. Database Schema Updates (`server/src/database.ts`)
- Added `item_instances` table with foreign key to entities
- Removed `items` column from entities table
- Added methods: `getEntityItemInstances()`, `addItemInstanceToEntity()`, `removeItemInstanceFromEntity()`, `getItemInstance()`
- Updated entity loading to include item instances

### 3. Event Handler Updates
- **PickupEventHandler**: Now creates item instances with positioning instead of simple item IDs
- **DropEventHandler**: Now removes specific item instances from entity inventory

### 4. Game Engine Updates (`server/src/gameEngine.ts`)
- New entities spawn with basic body parts: `['human_head', 'human_torso', 'human_legs']`
- Empty item instances array for new characters

### 5. 3D Rendering System (`client/src/components/World3D.tsx`)
- Added `ItemMesh` component that renders items at relative positions
- Added `BodyPartMesh` component that renders body parts with proper positioning
- Updated `EntityMesh` to render both body parts and item instances
- Different colors and sizes for different item types

### 6. Asset Service Updates (`client/src/services/assetService.ts`)
- Updated asset manifest to include body part assets
- Better asset type detection for body parts vs items

### 7. Test Scripts (`client/src/scripts/testScripts.ts`)
- Added equipment test script
- Added inventory management test script  
- Added body parts demonstration script

## Database Schema

```sql
-- Entities (characters with body parts)
entities: id, name, world_id, position_x/y/z, body_parts[]

-- Item instances with relative positioning
item_instances: id, entity_id, asset_id, description, relative_position_x/y/z
```

## Item Instance Structure

```typescript
interface ItemInstance {
  id: string;              // Unique instance ID
  assetId: string;         // Reference to asset type (sword, helmet, etc.)
  description: string;     // Custom description
  relativePosition: {      // Position relative to entity center
    x: number,
    y: number, 
    z: number
  }
}
```

## Body Part Rendering

Characters are now rendered as composed body parts:
- **Head**: Flesh colored, positioned at y+1.75
- **Torso**: Blue shirt, positioned at y+0.75  
- **Legs**: Blue pants, positioned at y-0.5
- **Arms**: Flesh colored, positioned at y+0.75 (wide)

## Item Rendering

Items are rendered with different colors and sizes:
- **Swords**: Silver, tall and thin
- **Shields**: Brown, wide and flat
- **Helmets**: Dark gray, head-sized
- **Armor**: Gray, torso-sized
- **Boots**: Brown, foot-sized
- **Rocks**: Gray, small
- **Sticks**: Brown, long and thin

## Benefits

1. **Realistic Inventory**: Items have physical presence on characters
2. **Flexible Positioning**: Items can be positioned anywhere relative to character
3. **Visual Feedback**: Players can see what items characters are carrying
4. **Persistent State**: Item positions are saved in database
5. **Extensible**: Easy to add new item types and positioning logic

## Usage Examples

```typescript
// Pickup a sword positioned at the character's right hand
pickup('sword', 'A sharp blade', { x: 0.5, y: 1.0, z: 0 })

// Drop a specific item instance
drop('item-instance-uuid-123')
```

The system is now fully functional and ready for testing with the provided test scripts! 