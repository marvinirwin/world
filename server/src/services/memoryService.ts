import { CharacterMemory, GameEvent } from '../../../shared/types.js';
import { Database } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

export class MemoryService {
  constructor(private database: Database) {}

  async compileMemoriesFromEvents(
    characterId: string,
    worldId: string,
    events: GameEvent[]
  ): Promise<CharacterMemory[]> {
    const memories: CharacterMemory[] = [];

    // Group related events for better memory formation
    const eventGroups = this.groupRelatedEvents(events);

    for (const eventGroup of eventGroups) {
      const memory = this.createMemoryFromEvents(characterId, worldId, eventGroup);
      memories.push(memory);
      await this.database.saveMemory(memory);
    }

    return memories;
  }

  async getRelevantMemories(
    characterId: string,
    worldId: string,
    currentContext: string
  ): Promise<CharacterMemory[]> {
    // For now, get the most important recent memories
    // In the future, this could use semantic search or embedding similarity
    return await this.database.getCharacterMemories(characterId, worldId, 15);
  }

  async formatMemoriesForLLM(memories: CharacterMemory[]): Promise<string> {
    if (memories.length === 0) {
      return "You have no significant memories.";
    }

    const formattedMemories = memories
      .sort((a, b) => b.importanceScore - a.importanceScore)
      .map(memory => {
        const timeAgo = this.getTimeAgo(memory.timestamp);
        return `[${timeAgo}] ${memory.memoryText} (importance: ${memory.importanceScore.toFixed(1)})`;
      })
      .join('\n');

    return `Your memories:\n${formattedMemories}`;
  }

  private groupRelatedEvents(events: GameEvent[]): GameEvent[][] {
    // Simple grouping for now - each event is its own memory
    // Could be enhanced to group conversations, actions sequences, etc.
    return events.map(event => [event]);
  }

  private createMemoryFromEvents(
    characterId: string,
    worldId: string,
    events: GameEvent[]
  ): CharacterMemory {
    const event = events[0]; // For single event memories
    let memoryText = '';
    let importanceScore = 1.0;

    switch (event.functionCall) {
      case 'move':
        memoryText = `I moved from (${event.parameters.from.x}, ${event.parameters.from.y}, ${event.parameters.from.z}) to (${event.parameters.to.x}, ${event.parameters.to.y}, ${event.parameters.to.z})`;
        importanceScore = 0.5;
        break;
      case 'speak':
        memoryText = `I said: "${event.parameters.message}"`;
        importanceScore = 2.0;
        break;
      case 'heard':
        memoryText = `I heard someone say: "${event.parameters.message}"`;
        importanceScore = 1.5;
        break;
      case 'pickup':
        memoryText = `I picked up item ${event.parameters.itemId}`;
        importanceScore = 1.0;
        break;
      case 'drop':
        memoryText = `I dropped item ${event.parameters.itemId}`;
        importanceScore = 1.0;
        break;
      default:
        memoryText = `Something happened: ${event.functionCall}`;
        importanceScore = 1.0;
    }

    return {
      id: uuidv4(),
      characterId,
      worldId,
      memoryText,
      importanceScore,
      timestamp: new Date(),
      relatedEventIds: events.map(e => e.id)
    };
  }

  private getTimeAgo(timestamp: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return 'just now';
  }
} 