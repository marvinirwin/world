export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface ItemInstance {
  id: string;
  assetId: string;
  description: string;
  relativePosition: Position; // Position relative to entity center
}

export interface Entity {
  id: string;
  name: string;
  worldId: string;
  position: Position;
  bodyParts: string[];
  itemInstances: ItemInstance[]; // Changed from items: string[]
}

export interface Asset {
  id: string;
  name: string;
  modelPath: string;
  skinColor: string;
  type: 'bodypart' | 'item' | 'model';
}

export interface GameEvent {
  id: string;
  functionCall: string; // "move", "speak", "pickup", "drop", "spawn", "despawn"
  parameters: {
    entityId: string;
    worldId: string;
    [key: string]: any;
  };
  timestamp: Date;
}

export interface MovementEvent extends GameEvent {
  functionCall: 'move';
  parameters: {
    entityId: string;
    worldId: string;
    from: Position;
    to: Position;
    duration: number;
  };
}

export interface SpeechEvent extends GameEvent {
  functionCall: 'speak';
  parameters: {
    entityId: string;
    worldId: string;
    message: string;
    volume: number;
  };
}

export interface HeardEvent extends GameEvent {
  functionCall: 'heard';
  parameters: {
    entityId: string;
    worldId: string;
    speakerId: string;
    message: string;
    distance: number;
  };
}

export interface PickupEvent extends GameEvent {
  functionCall: 'pickup';
  parameters: {
    entityId: string;
    worldId: string;
    itemInstanceId: string; // Changed from itemId
    fromPosition: Position;
    relativePosition: Position; // Where the item will be positioned on the character
  };
}

export interface DropEvent extends GameEvent {
  functionCall: 'drop';
  parameters: {
    entityId: string;
    worldId: string;
    itemInstanceId: string; // Changed from itemId
    toPosition: Position;
  };
}

export interface CharacterMemory {
  id: string;
  characterId: string;
  worldId: string;
  memoryText: string;
  importanceScore: number;
  timestamp: Date;
  relatedEventIds: string[];
}

export interface CharacterCronjob {
  id: string;
  characterId: string;
  worldId: string;
  taskDescription: string;
  intervalSeconds: number;
  lastExecuted: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckTasksEvent extends GameEvent {
  functionCall: 'checkTasks';
  parameters: {
    entityId: string;
    worldId: string;
    triggeredBy: 'interval' | 'manual';
  };
}

export interface CharacterErrorEvent extends GameEvent {
  functionCall: 'characterError';
  parameters: {
    entityId: string;
    worldId: string;
    errorMessage: string;
    errorType: 'command' | 'event' | 'cronjob' | 'pickup' | 'drop' | 'move' | 'speak' | 'system';
    originalCommand?: string;
    stackTrace?: string;
    severity: 'low' | 'medium' | 'high';
  };
}

export interface UserCommandEvent extends GameEvent {
  functionCall: 'userCommand';
  parameters: {
    entityId: string;
    worldId: string;
    command: string;
    source: 'manual' | 'script';
  };
}

export interface GameState {
  worldId: string;
  entities: Record<string, Entity>;
  recentEvents: GameEvent[];
}

export interface LLMDecision {
  functionCall: 'move' | 'speak' | 'pickup' | 'drop' | 'checkTasks';
  parameters: {
    [key: string]: any;
  };
  reasoning?: string;
}

export interface ClientMessage {
  type: 'join' | 'command' | 'devCommand' | 'getCronjobs';
  entityId?: string;
  worldId?: string;
  data?: any;
}

export interface ServerMessage {
  type: 'gameState' | 'event' | 'error' | 'characterError' | 'cronjobs';
  data: any;
} 