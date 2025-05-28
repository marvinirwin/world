import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database.js';
import { GameEvent, CharacterCronjob } from '../../../shared/types.js';
import { LLMService } from '../services/llmService.js';
import { MemoryService } from '../services/memoryService.js';

export async function handleCheckTasksEvent(
  event: GameEvent,
  database: Database,
  llmService: LLMService,
  memoryService: MemoryService
): Promise<GameEvent[]> {
  const { entityId, worldId } = event.parameters;
  const resultEvents: GameEvent[] = [];

  try {
    // Get character's cronjobs
    const cronjobs = await database.getCharacterCronjobs(entityId, worldId);
    
    // Get character's recent memories for context
    const memories = await database.getCharacterMemories(entityId, worldId, 15);
    
    // Get recent world events for situational awareness
    const recentEvents = await database.getRecentEvents(worldId, 20);
    
    if (cronjobs.length === 0) {
      // No tasks to check, but create a memory about checking
      const checkMemory = {
        id: uuidv4(),
        characterId: entityId,
        worldId: worldId,
        memoryText: "I checked for tasks but had none scheduled at this time.",
        importanceScore: 0.3,
        timestamp: new Date(),
        relatedEventIds: [event.id]
      };
      
      await database.saveMemory(checkMemory);
      return resultEvents;
    }

    // Build context for LLM
    const memoriesText = memories.map(m => m.memoryText).join('\n');
    const recentEventsText = recentEvents
      .filter(e => e.parameters.entityId !== entityId) // Exclude own events
      .slice(0, 10)
      .map(e => `${e.functionCall}: ${JSON.stringify(e.parameters)}`)
      .join('\n');
    
    const tasksText = cronjobs.map(job => job.taskDescription).join('\n');

    const prompt = `You are a character checking your scheduled tasks and desires.

Your memories:
${memoriesText}

Recent events happening around you:
${recentEventsText}

Your scheduled tasks and desires:
${tasksText}

Based on your memories, the current situation, and your tasks/desires, decide what action to take right now.
You can: move somewhere, speak to someone, pick something up, drop something, or simply observe and wait.

Consider:
- Are you expecting anything or anyone?
- Do you have urgent desires to fulfill?
- Is there something happening that requires your attention?
- Should you act on one of your scheduled tasks now?

Respond with a single action decision.`;

    // Get LLM decision
    const decision = await llmService.getDecision(prompt, entityId, worldId);
    
    if (decision && decision.functionCall !== 'checkTasks') {
      // Create the decided action event
      const actionEvent: GameEvent = {
        id: uuidv4(),
        functionCall: decision.functionCall,
        parameters: {
          entityId: entityId,
          worldId: worldId,
          ...decision.parameters
        },
        timestamp: new Date()
      };
      
      resultEvents.push(actionEvent);
      
      // Create memory about the decision
      const decisionMemory = {
        id: uuidv4(),
        characterId: entityId,
        worldId: worldId,
        memoryText: `I checked my tasks and decided to: ${decision.functionCall}. ${decision.reasoning || ''}`,
        importanceScore: 0.7,
        timestamp: new Date(),
        relatedEventIds: [event.id, actionEvent.id]
      };
      
      await database.saveMemory(decisionMemory);
    } else {
      // No action taken, just observing
      const observeMemory = {
        id: uuidv4(),
        characterId: entityId,
        worldId: worldId,
        memoryText: "I checked my tasks and current situation but decided to wait and observe for now.",
        importanceScore: 0.4,
        timestamp: new Date(),
        relatedEventIds: [event.id]
      };
      
      await database.saveMemory(observeMemory);
    }

  } catch (error) {
    console.error('Error handling checkTasks event:', error);
    
    // Create error memory
    const errorMemory = {
      id: uuidv4(),
      characterId: entityId,
      worldId: worldId,
      memoryText: "I tried to check my tasks but encountered some confusion.",
      importanceScore: 0.5,
      timestamp: new Date(),
      relatedEventIds: [event.id]
    };
    
    await database.saveMemory(errorMemory);
  }

  return resultEvents;
} 