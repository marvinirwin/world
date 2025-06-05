import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config.js';
import { GameState, LLMDecision, CharacterMemory, Entity } from '../../../shared/types.js';
import { MemoryService } from './memoryService.js';

export class LLMService {
  private genAI: GoogleGenerativeAI;

  constructor(private memoryService: MemoryService) {
    this.genAI = new GoogleGenerativeAI(config.GEMINI_API_KEY);
  }

  async generateDecision(
    characterId: string,
    worldId: string,
    userCommand: string,
    gameState: GameState
  ): Promise<LLMDecision | null> {
    console.log(`DEBUG: LLMService.generateDecision called for character ${characterId} with command: "${userCommand}"`);
    
    // Special debug command to force checkTasks
    if (userCommand.includes('DEBUG: trigger checkTasks')) {
      console.log(`DEBUG: Forcing checkTasks decision for debug command`);
      return {
        functionCall: 'checkTasks',
        parameters: {
          triggeredBy: 'debug'
        },
        reasoning: 'Manually triggered checkTasks for debugging purposes'
      };
    }
    
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      // Get character's memories for context
      console.log(`DEBUG: Getting memories for character ${characterId}`);
      const memories = await this.memoryService.getRelevantMemories(
        characterId,
        worldId,
        userCommand
      );
      console.log(`DEBUG: Retrieved ${memories.length} memories for context`);
      const memoryContext = await this.memoryService.formatMemoriesForLLM(memories);

      // Get character info
      const character = gameState.entities[characterId];
      if (!character) {
        console.error(`DEBUG: Character ${characterId} not found in game state`);
        throw new Error(`Character ${characterId} not found in game state`);
      }

      console.log(`DEBUG: Character found: ${character.name} at position (${character.position.x}, ${character.position.y}, ${character.position.z})`);

      const prompt = `
You are an AI character in a virtual world simulation. You have your own personality, memories, and decision-making autonomy.

CHARACTER INFO:
- Your ID: ${characterId}
- Your Name: ${character.name}
- Your Position: (${character.position.x}, ${character.position.y}, ${character.position.z})
- Your Items: ${character.itemInstances?.map(item => item.description).join(', ') || 'none'}

MEMORIES:
${memoryContext}

CURRENT WORLD STATE:
- World ID: ${worldId}
- Other entities nearby: ${Object.values(gameState.entities)
  .filter(e => e.id !== characterId)
  .map(e => `${e.name} at (${e.position.x}, ${e.position.y}, ${e.position.z})`)
  .join(', ') || 'none'}

INSTRUCTION HEARD IN YOUR MIND: "${userCommand}"

You just heard an instruction in your mind. This could be a suggestion, request, question, or guidance from someone who cares about you. Based on this instruction, your memories, and the current situation, decide what action to take. You have free will and can interpret the instruction however you think is best.

AVAILABLE ACTIONS:
1. "move" - Move to a specific position
   Parameters: {"targetPosition": {"x": float, "y": float, "z": float}}

2. "speak" - Say something out loud
   Parameters: {"message": "string", "volume": float (1.0-10.0)}

3. "pickup" - Pick up an item
   Parameters: {"itemId": "string"}

4. "drop" - Drop an item you're carrying
   Parameters: {"itemId": "string"}

Respond with ONLY a JSON object in this exact format:
{
  "functionCall": "move|speak|pickup|drop",
  "parameters": {
    // action-specific parameters here
  },
  "reasoning": "Brief explanation of why you chose this action based on the instruction you heard"
}

Examples:
{"functionCall": "move", "parameters": {"targetPosition": {"x": 5.0, "y": 0.0, "z": 3.0}}, "reasoning": "The voice suggested I explore, so I'm heading toward that interesting area"}
{"functionCall": "speak", "parameters": {"message": "Hello there!", "volume": 5.0}, "reasoning": "I heard I should greet people, so I'm saying hello"}
{"functionCall": "pickup", "parameters": {"itemId": "sword_001"}, "reasoning": "The instruction suggested I take this, and it does look useful"}
{"functionCall": "drop", "parameters": {"itemId": "rock_012"}, "reasoning": "I was told to drop this, and I agree it's not needed"}

Choose your action:
`;

      console.log(`DEBUG: Sending prompt to Gemini LLM (${prompt.length} characters)`);
      const result = await model.generateContent(prompt);
      const response = result.response.text().trim();
      console.log(`DEBUG: Gemini response received (${response.length} characters):`, response);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{.*\}/s);
      if (!jsonMatch) {
        console.warn('DEBUG: No valid JSON found in LLM response:', response);
        return null;
      }

      const decision = JSON.parse(jsonMatch[0]) as LLMDecision;
      console.log(`DEBUG: Parsed decision:`, decision);
      
      // Debug logging for move decisions
      if (decision.functionCall === 'move') {
        console.log('DEBUG: LLM Move Decision:', JSON.stringify(decision, null, 2));
        console.log('DEBUG: Raw LLM Response:', response);
      }
      
      // Validate decision
      if (!decision.functionCall || !decision.parameters) {
        console.warn('DEBUG: Invalid decision generated:', decision);
        return null;
      }

      console.log(`DEBUG: LLMService.generateDecision returning valid decision: ${decision.functionCall}`);
      return decision;
    } catch (error) {
      console.error('DEBUG: Error generating decision:', error);
      return null;
    }
  }

  async generateCharacterPersonality(characterName: string): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const prompt = `
Create a unique personality description for a character named "${characterName}" in a virtual world simulation.

The personality should include:
- Core traits and characteristics
- How they interact with others
- Their goals and motivations
- Any quirks or unique behaviors

Keep it concise (2-3 sentences) but distinctive. Make it feel like a real person with depth.

Example: "Alex is a curious explorer who loves discovering new places and meeting people. They're naturally optimistic and tend to trust others easily, sometimes to their detriment. Their main goal is to map out the entire world and document all the interesting things they find."

Generate a personality for ${characterName}:
`;

      const result = await model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      console.error('Error generating personality:', error);
      return `${characterName} is a mysterious individual with their own unique story waiting to unfold.`;
    }
  }

  async getDecision(
    prompt: string,
    characterId: string,
    worldId: string
  ): Promise<LLMDecision | null> {
    console.log(`DEBUG: LLMService.getDecision called for character ${characterId} in world ${worldId}`);
    
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      
      const fullPrompt = `${prompt}

Respond with ONLY a JSON object in this exact format:
{
  "functionCall": "move|speak|pickup|drop",
  "parameters": {
    // action-specific parameters here
  },
  "reasoning": "Brief explanation of why you chose this action"
}

Examples:
{"functionCall": "move", "parameters": {"targetPosition": {"x": 5.0, "y": 0.0, "z": 3.0}}, "reasoning": "Moving closer to explore"}
{"functionCall": "speak", "parameters": {"message": "Hello there!", "volume": 5.0}, "reasoning": "Greeting nearby entities"}
{"functionCall": "pickup", "parameters": {"itemId": "sword_001"}, "reasoning": "This looks useful"}
{"functionCall": "drop", "parameters": {"itemId": "rock_012"}, "reasoning": "Don't need this anymore"}

Choose your action:`;

      console.log(`DEBUG: Sending prompt to Gemini LLM for checkTasks (${fullPrompt.length} characters)`);
      console.log(`DEBUG: Full prompt content:`, fullPrompt);
      
      const result = await model.generateContent(fullPrompt);
      const response = result.response.text().trim();
      
      console.log(`DEBUG: Gemini response received for checkTasks (${response.length} characters):`, response);
      
      // Extract JSON from response
      const jsonMatch = response.match(/\{.*\}/s);
      if (!jsonMatch) {
        console.warn('DEBUG: No valid JSON found in LLM response for checkTasks:', response);
        return null;
      }

      const decision = JSON.parse(jsonMatch[0]) as LLMDecision;
      console.log(`DEBUG: Parsed checkTasks decision:`, decision);
      
      // Debug logging for move decisions
      if (decision.functionCall === 'move') {
        console.log('DEBUG: LLM Move Decision (getDecision):', JSON.stringify(decision, null, 2));
        console.log('DEBUG: Raw LLM Response (getDecision):', response);
      }
      
      // Validate decision
      if (!decision.functionCall || !decision.parameters) {
        console.warn('DEBUG: Invalid decision generated for checkTasks:', decision);
        return null;
      }

      console.log(`DEBUG: LLMService.getDecision returning valid decision: ${decision.functionCall}`);
      return decision;
    } catch (error) {
      console.error('DEBUG: Error getting checkTasks decision:', error);
      return null;
    }
  }
} 