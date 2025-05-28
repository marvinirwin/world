# Game Architecture - Vibe Coding Ready

This game has an extremely simple, organized architecture designed for easy modification through prompts. Each file has a single, clear responsibility.

## Folder Structure

```
/shared/                    # Single source of truth for types
  └── types.ts             # All interfaces used by client & server

/server/src/
  ├── database.ts          # PostgreSQL operations (entities, events, memories, cronjobs, item instances)
  ├── config.ts            # Environment configuration
  ├── eventHandlers/       # One file per event type
  │   ├── moveEventHandler.ts
  │   ├── speakEventHandler.ts
  │   ├── pickupEventHandler.ts    # Item pickup with positioning
  │   ├── dropEventHandler.ts     # Item drop handling
  │   ├── checkTasksEventHandler.ts  # Character task checking
  │   └── index.ts         # Exports all handlers
  ├── services/
  │   ├── memoryService.ts # Character memory compilation & retrieval
  │   ├── llmService.ts    # Gemini AI integration
  │   └── cronjobService.ts # Character task scheduling
  ├── commandHandler.ts    # Command processing coordination
  ├── websocketServer.ts   # Real-time client communication
  ├── gameEngine.ts        # Core game logic coordination
  └── index.ts             # Server entry point

/client/src/
  ├── services/
  │   ├── websocketService.ts    # Server communication
  │   ├── assetService.ts        # 3D model/texture loading with body parts
  │   └── localStorageService.ts # Character ID persistence
  ├── components/          # React UI components with 3D rendering
  │   └── World3D.tsx      # Entity and item instance rendering
  ├── renderers/           # 3D world display (to be created)
  └── utils/               # Helper functions (to be created)

/client/assets/            # 3D models, textures, sounds
```

## Item Instance System

Characters have item instances with relative positioning for realistic rendering:

### Item Instance Structure
```typescript
{
  id: string,              // Unique instance ID
  assetId: string,         // Reference to asset type
  description: string,     // Custom description
  relativePosition: {      // Position relative to entity center
    x: number,
    y: number,
    z: number
  }
}
```

### Inventory Management
- All characters start with basic body parts: head, torso, legs
- Items are picked up and positioned relative to character center
- Drop events remove items from character inventory
- Real-time 3D rendering shows items on characters
- Item positions persist in database

### Body Part System
- Characters are composed of attachable body parts
- Basic parts: `human_head`, `human_torso`, `human_legs`, `human_arms`
- Each part has specific positioning and rendering properties
- Body parts are rendered as colored 3D boxes with proper spacing

## Event System

All events follow this structure:
```typescript
{
  functionCall: "move" | "speak" | "pickup" | "drop" | "heard" | "checkTasks",
  parameters: {
    entityId: string,
    worldId: string,
    // ... action-specific parameters
  },
  timestamp: Date
}
```

### Updated Pickup/Drop Events
```typescript
// Pickup Event
{
  functionCall: "pickup",
  parameters: {
    entityId: string,
    worldId: string,
    itemInstanceId: string,         // New: specific item instance
    fromPosition: Position,
    relativePosition: Position      // New: where item attaches
  }
}

// Drop Event  
{
  functionCall: "drop",
  parameters: {
    entityId: string,
    worldId: string,
    itemInstanceId: string,         // New: specific item instance
    toPosition: Position
  }
}
```

## Character Cronjob System

Characters can have scheduled tasks and desires that drive autonomous behavior:

### Cronjob Structure
```typescript
{
  id: string,
  characterId: string,
  worldId: string,
  taskDescription: string,    // "Find food", "Guard the gate", etc.
  intervalSeconds: number,    // How often to check this task
  lastExecuted: Date,
  isActive: boolean
}
```

### Task Checking Flow
1. **Every 2 seconds**: All characters get `checkTasks` events
2. **Character evaluation**: LLM considers memories, world state, and tasks
3. **Decision making**: Character decides to act or wait
4. **Action execution**: Chosen actions become events
5. **Memory creation**: Decisions are remembered for future context

### Autonomous Behavior
- Characters respond to world events (hearing speech, seeing movement)
- Characters pursue their desires and scheduled tasks
- Characters build memories that influence future decisions
- Characters can interact with players and each other

## World Isolation

- Each world has a unique `worldId`
- Characters can move between worlds
- Database queries are filtered by `worldId`
- Memories and cronjobs are world-specific

## Memory System

- Events are compiled into character memories
- Memories have importance scores for LLM context
- Stored in PostgreSQL for persistence
- Retrieved for LLM decision-making

## LLM Integration

- User commands → LLM decisions → Event handlers → Database events
- Character memories provide context
- Gemini Pro generates decisions in JSON format
- Event handlers execute decisions and create events

## 3D Rendering System

- Characters rendered as composed body parts with proper positioning
- Item instances rendered at relative positions on characters
- Different colors and sizes for different item types
- Real-time updates when inventory changes
- Body parts: head (flesh), torso (blue shirt), legs (blue pants), arms (flesh)
- Items: swords (silver), shields (brown), helmets (dark), armor (gray), etc.

## Asset Management

- 3D models stored in `/client/assets/`
- Loaded on-demand by `AssetService`
- Supports .glb models with texture mapping
- Manifest-based asset discovery
- Includes body part and item asset definitions

## Database Schema

```sql
-- Entities (characters with body parts)
entities: id, name, world_id, position_x/y/z, body_parts[]

-- Item instances with relative positioning
item_instances: id, entity_id, asset_id, description, relative_position_x/y/z

-- All game events
events: id, function_call, parameters (JSONB), timestamp

-- Character memories
character_memories: id, character_id, world_id, memory_text, importance_score, timestamp, related_event_ids[]

-- Character scheduled tasks and desires
character_cronjobs: id, character_id, world_id, task_description, interval_seconds, last_executed, is_active, created_at, updated_at
```

## Vibe Coding Benefits

1. **Single Responsibility**: Each file does one thing
2. **Clear Naming**: File names indicate exact purpose
3. **Shared Types**: No duplication, single source of truth
4. **Event Handlers**: Easy to modify individual actions
5. **Service Pattern**: Clean separation of concerns
6. **World Isolation**: Easy to understand scope
7. **Memory System**: Transparent character context
8. **Autonomous Characters**: Self-driven behavior through cronjobs
9. **Item Instance System**: Realistic inventory with positioning
10. **3D Rendering**: Visual representation matches data structure

## Easy Modifications

- **Add new action**: Create new event handler in `/server/src/eventHandlers/`
- **Modify LLM behavior**: Edit `/server/src/services/llmService.ts`
- **Change memory logic**: Edit `/server/src/services/memoryService.ts`
- **Add character tasks**: Use cronjob management methods in game engine
- **Adjust task frequency**: Modify `CHECK_TASKS_INTERVAL_MS` in cronjob service
- **Add UI features**: Create components in `/client/src/components/`
- **Asset management**: Modify `/client/src/services/assetService.ts`
- **Item positioning**: Modify relative positions in pickup event handler
- **Body part rendering**: Update `BodyPartMesh` in `World3D.tsx`
- **Item rendering**: Update `ItemMesh` in `World3D.tsx`

Each file can be easily understood and modified through focused prompts! 