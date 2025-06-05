import { TestScript, testScripts, ScriptCommand } from '../scripts';

const SELECTED_SCRIPT_KEY = 'selectedTestScript';

export const getAvailableScripts = (): TestScript[] => {
  return testScripts;
};

export const getSelectedScriptId = (): string | null => {
  return localStorage.getItem(SELECTED_SCRIPT_KEY);
};

export const setSelectedScriptId = (scriptId: string): void => {
  localStorage.setItem(SELECTED_SCRIPT_KEY, scriptId);
};

export const clearSelectedScript = (): void => {
  localStorage.removeItem(SELECTED_SCRIPT_KEY);
};

export const getScriptById = (scriptId: string): TestScript | null => {
  return testScripts.find(script => script.id === scriptId) || null;
};

export const executeScript = async (
  script: TestScript, 
  sendInstruction: (instruction: string) => void,
  sendDevCommand?: (command: string, data: any) => void,
  getCurrentCharacterId?: () => string | null
): Promise<void> => {
  for (let i = 0; i < script.commands.length; i++) {
    const scriptCommand = script.commands[i];
    
    if (scriptCommand.type === 'chat') {
      // Handle regular chat commands
      sendInstruction(scriptCommand.command);
    } else if (scriptCommand.type === 'devCommand') {
      // Handle dev commands
      if (!sendDevCommand) {
        console.warn('Dev command requested but sendDevCommand not available:', scriptCommand);
        continue;
      }
      
      let commandData = { ...scriptCommand.data };
      
      // If the dev command needs a characterId and none is provided, get current character
      if (scriptCommand.command === 'giveItem' && !commandData.characterId) {
        if (getCurrentCharacterId) {
          const characterId = getCurrentCharacterId();
          if (characterId) {
            commandData.characterId = characterId;
          } else {
            console.warn('Cannot execute giveItem dev command: no character ID available');
            continue;
          }
        } else {
          console.warn('Cannot execute giveItem dev command: getCurrentCharacterId function not provided');
          continue;
        }
      }
      
      sendDevCommand(scriptCommand.command, commandData);
    }
    
    // Don't delay after the last instruction
    if (i < script.commands.length - 1) {
      await new Promise(resolve => setTimeout(resolve, script.delayBetweenCommands));
    }
  }
}; 