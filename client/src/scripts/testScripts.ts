export interface TestScript {
  id: string;
  name: string;
  description: string;
  commands: string[];
  delayBetweenCommands: number; // milliseconds
}

export const testScripts: TestScript[] = [
  {
    id: 'basic-movement',
    name: 'Basic Movement Test',
    description: 'Test character movement instructions',
    commands: ['go to the forest', 'look around and tell me what you see', 'head back to town'],
    delayBetweenCommands: 2000
  },
  {
    id: 'conversation-test',
    name: 'Conversation Test', 
    description: 'Test speaking and interaction',
    commands: ['say hello to everyone', 'ask how everyone is doing'],
    delayBetweenCommands: 3000
  },
  {
    id: 'item-interaction',
    name: 'Item Interaction Test',
    description: 'Test picking up and dropping items',
    commands: ['pick up that rock', 'tell everyone you found a rock', 'drop the rock'],
    delayBetweenCommands: 2500
  },
  {
    id: 'equipment-test',
    name: 'Equipment Test',
    description: 'Test picking up various equipment items',
    commands: [
      'pick up the sword',
      'announce that you have a sword now',
      'grab the shield', 
      'say you now have a shield too',
      'put on the helmet',
      'declare that you are fully equipped'
    ],
    delayBetweenCommands: 2000
  },
  {
    id: 'inventory-management',
    name: 'Inventory Management Test',
    description: 'Test complex inventory operations',
    commands: [
      'pick up the armor',
      'grab those boots',
      'mention that you are getting heavy with all this gear',
      'drop the armor',
      'say that feels much better',
      'pick up that stick instead',
      'comment that a simple stick will do'
    ],
    delayBetweenCommands: 2500
  },
  {
    id: 'body-parts-demo',
    name: 'Body Parts Demo',
    description: 'Demonstrate character body part rendering',
    commands: [
      'point out your head, torso, and legs to everyone',
      'explain that each body part is rendered separately',
      'mention how items attach to your body with relative positioning'
    ],
    delayBetweenCommands: 3000
  }
]; 