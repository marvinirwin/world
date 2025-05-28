import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from './config.js';
import { GameState, Intent, Position } from './types.js';

export class GeminiAI {
  private genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }

  async generateIntent(gameState: GameState, entityId: string): Promise<Intent | null> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `
You are controlling an entity in a 3D world simulation game. Your goal is to make the entity behave autonomously and bond with other entities.

Current Game State:
- Your Entity ID: ${entityId}
- Entities: ${JSON.stringify(gameState.entities, null, 2)}
- Recent Events: ${JSON.stringify(gameState.recentEvents.slice(0, 10), null, 2)}

Available Actions:
1. MovementIntent: Move to a new position (x, y, z coordinates)
2. SpeakIntent: Say something to nearby entities

Rules:
- Coordinates can be any float values
- Speaking creates sound events that nearby entities can hear
- Try to interact with other entities to build relationships
- Be creative and autonomous in your behavior

Respond with ONLY a JSON object representing your intent. Examples:
{"type": "movement", "entityId": "${entityId}", "targetPosition": {"x": 5.0, "y": 0.0, "z": 3.0}}
{"type": "speak", "entityId": "${entityId}", "message": "Hello, anyone there?"}

Choose one action that makes sense given the current situation:
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{.*\}/s);
      if (!jsonMatch) {
        console.warn('No valid JSON found in Gemini response:', response);
        return null;
      }

      const intent = JSON.parse(jsonMatch[0]) as Intent;
      
      // Validate intent
      if (!intent.type || !intent.entityId || intent.entityId !== entityId) {
        console.warn('Invalid intent generated:', intent);
        return null;
      }

      return intent;
    } catch (error) {
      console.error('Error generating intent:', error);
      return null;
    }
  }

  async implementIntent(intent: Intent, gameState: GameState): Promise<any[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const prompt = `
You are implementing an intent in a 3D world simulation game.

Intent to implement: ${JSON.stringify(intent, null, 2)}
Current Game State: ${JSON.stringify(gameState, null, 2)}

For MovementIntent:
- Calculate a path from current position to target position
- Generate movement events with intermediate positions if needed
- Each movement should take a reasonable duration (1-3 seconds)
- Return an array of movement events

For SpeakIntent:
- Generate a speak event for the entity
- Calculate which other entities are nearby (within 10 units) and generate hear events for them
- Include distance information for hear events

Respond with ONLY a JSON array of events. Examples:

For movement:
[{"id": "evt_123", "type": "movement", "entityId": "${intent.entityId}", "timestamp": "${new Date().toISOString()}", "data": {"from": {"x": 0, "y": 0, "z": 0}, "to": {"x": 5, "y": 0, "z": 3}, "duration": 2000}}]

For speaking:
[
  {"id": "evt_124", "type": "speak", "entityId": "${intent.entityId}", "timestamp": "${new Date().toISOString()}", "data": {"message": "Hello!", "volume": 1.0}},
  {"id": "evt_125", "type": "hear", "entityId": "other_entity_id", "timestamp": "${new Date().toISOString()}", "data": {"speakerId": "${intent.entityId}", "message": "Hello!", "distance": 5.2}}
]

Generate the appropriate events:
`;

      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();
      
      // Extract JSON from response
      const jsonMatch = response.match(/\[.*\]/s);
      if (!jsonMatch) {
        console.warn('No valid JSON array found in Gemini response:', response);
        return [];
      }

      const events = JSON.parse(jsonMatch[0]);
      return Array.isArray(events) ? events : [];
    } catch (error) {
      console.error('Error implementing intent:', error);
      return [];
    }
  }

  private calculateDistance(pos1: Position, pos2: Position): number {
    return Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) +
      Math.pow(pos1.y - pos2.y, 2) +
      Math.pow(pos1.z - pos2.z, 2)
    );
  }
} 