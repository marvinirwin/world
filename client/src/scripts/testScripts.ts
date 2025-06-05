export interface TestScript {
  id: string;
  name: string;
  description: string;
  commands: ScriptCommand[];
  delayBetweenCommands: number; // milliseconds
}

export interface ScriptCommand {
  type: 'chat' | 'devCommand';
  command: string;
  data?: any; // Additional data for dev commands
}

export const testScripts: TestScript[] = [
  {
    id: 'basic-movement',
    name: 'Basic Movement Test',
    description: 'Test character movement instructions',
    commands: [
      { type: 'chat', command: 'walk to the left' },
      { type: 'chat', command: 'walk to the right' },
      { type: 'chat', command: 'go up' },
      { type: 'chat', command: 'go down' }
    ],
    delayBetweenCommands: 2000
  },
]; 