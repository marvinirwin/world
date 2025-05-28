import { TestScript, testScripts } from '../scripts';

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
  sendInstruction: (instruction: string) => void
): Promise<void> => {
  for (let i = 0; i < script.commands.length; i++) {
    const instruction = script.commands[i];
    sendInstruction(instruction);
    
    // Don't delay after the last instruction
    if (i < script.commands.length - 1) {
      await new Promise(resolve => setTimeout(resolve, script.delayBetweenCommands));
    }
  }
}; 