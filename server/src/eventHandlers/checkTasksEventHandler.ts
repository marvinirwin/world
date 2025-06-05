import { v4 as uuidv4 } from 'uuid';
import { Database } from '../database.js';
import { GameEvent, CharacterCronjob } from '../../../shared/types.js';
import { LLMService } from '../services/llmService.js';
import { MemoryService } from '../services/memoryService.js';
import { MoveEventHandler } from './moveEventHandler.js';

export async function handleCheckTasksEvent(
  event: GameEvent,
  database: Database,
  llmService: LLMService,
  memoryService: MemoryService
): Promise<GameEvent[]> {
  const { entityId, worldId } = event.parameters;
  const resultEvents: GameEvent[] = [];

  console.log(`DEBUG: handleCheckTasksEvent starting for entity ${entityId} in world ${worldId}`);

  try {
    // Get character's cronjobs
    const cronjobs = await database.getCharacterCronjobs(entityId, worldId);
    console.log(`DEBUG: Found ${cronjobs.length} cronjobs for entity ${entityId}`);
    if (cronjobs.length > 0) {
      console.log(`DEBUG: Cronjobs:`, cronjobs.map(c => `"${c.taskDescription}"`).join(', '));
    }
    
    // Get character's recent memories for context
    const memories = await database.getCharacterMemories(entityId, worldId, 15);
    console.log(`DEBUG: Found ${memories.length} memories for entity ${entityId}`);
    console.log(`DEBUG: Recent memories:`, memories.slice(0, 5).map(m => `"${m.memoryText}"`).join(' | '));
    
    // Get recent world events for situational awareness
    const recentEvents = await database.getRecentEvents(worldId, 20);
    console.log(`DEBUG: Found ${recentEvents.length} recent world events`);
    
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

AVAILABLE ACTIONS:
1. "move" - Move to a specific position
   Parameters: {"targetPosition": {"x": float, "y": float, "z": float}}

2. "speak" - Say something out loud  
   Parameters: {"message": "string", "volume": float (1.0-10.0)}

3. "pickup" - Pick up an item
   Parameters: {"itemId": "string"}

4. "drop" - Drop an item you're carrying
   Parameters: {"itemId": "string"}

IMPORTANT: Pay special attention to any recurring instructions or ongoing tasks you remember receiving, such as:
- "walk around every X seconds" 
- "check on something regularly"
- "patrol an area"
- "repeat an action periodically"

If you have memories of being given recurring instructions, you should act on them now if it's been long enough since you last did so.

Consider:
- Are you expecting anything or anyone?
- Do you have urgent desires to fulfill?
- Is there something happening that requires your attention?
- Should you act on one of your scheduled tasks now?
- Do you remember being given any recurring instructions that you should follow?

Examples:
{"functionCall": "move", "parameters": {"targetPosition": {"x": 5.0, "y": 0.0, "z": 3.0}}, "reasoning": "Moving to explore the area"}
{"functionCall": "speak", "parameters": {"message": "Hello there!", "volume": 5.0}, "reasoning": "Greeting nearby entities"}
{"functionCall": "pickup", "parameters": {"itemId": "sword_001"}, "reasoning": "This looks useful"}
{"functionCall": "drop", "parameters": {"itemId": "rock_012"}, "reasoning": "Don't need this anymore"}

Respond with a single action decision.`;

    console.log(`DEBUG: Sending prompt to LLM for entity ${entityId} (${prompt.length} characters)`);
    
    // Get LLM decision
    const decision = await llmService.getDecision(prompt, entityId, worldId);
    
    if (decision) {
      console.log(`DEBUG: LLM decision for entity ${entityId}: ${decision.functionCall}`, decision.parameters);
      console.log(`DEBUG: LLM reasoning: ${decision.reasoning || 'No reasoning provided'}`);
    } else {
      console.log(`DEBUG: No LLM decision generated for entity ${entityId}`);
    }
    
    if (decision && decision.functionCall !== 'checkTasks') {
      // Handle move decisions properly by calling MoveEventHandler directly
      if (decision.functionCall === 'move') {
        console.log(`DEBUG: Processing move decision for entity ${entityId} with targetPosition:`, decision.parameters.targetPosition);
        const { targetPosition } = decision.parameters;
        const moveHandler = new MoveEventHandler(database);
        const moveEvents = await moveHandler.handleMoveDecision(entityId, worldId, targetPosition);
        resultEvents.push(...moveEvents);
        
        console.log(`DEBUG: Move handler returned ${moveEvents.length} movement events for entity ${entityId}`);
      } else {
        // For other decisions, create event normally
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
        
        console.log(`DEBUG: Created action event ${actionEvent.id} for entity ${entityId}: ${actionEvent.functionCall}`);
        resultEvents.push(actionEvent);
      }
      
      // Create memory about the decision
      const decisionMemory = {
        id: uuidv4(),
        characterId: entityId,
        worldId: worldId,
        memoryText: `I checked my tasks and decided to: ${decision.functionCall}. ${decision.reasoning || ''}`,
        importanceScore: 0.7,
        timestamp: new Date(),
        relatedEventIds: [event.id, ...resultEvents.map(e => e.id)]
      };
      
      await database.saveMemory(decisionMemory);
      console.log(`DEBUG: Saved decision memory for entity ${entityId}: "${decisionMemory.memoryText}"`);
    } else {
      console.log(`DEBUG: Entity ${entityId} decided to observe/wait`);
      
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
      console.log(`DEBUG: Saved observe memory for entity ${entityId}`);
    }

  } catch (error) {
    console.error(`DEBUG: Error in handleCheckTasksEvent for entity ${entityId}:`, error);
    
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

  console.log(`DEBUG: handleCheckTasksEvent completed for entity ${entityId}, returning ${resultEvents.length} events`);
  return resultEvents;
} 