import { v4 as uuidv4 } from 'uuid';
import { CharacterErrorEvent } from '../../../shared/types.js';

export class ErrorService {
  static createCharacterError(
    entityId: string,
    worldId: string,
    errorMessage: string,
    errorType: 'command' | 'event' | 'cronjob' | 'pickup' | 'drop' | 'move' | 'speak' | 'system',
    originalCommand?: string,
    error?: Error,
    severity: 'low' | 'medium' | 'high' = 'medium'
  ): CharacterErrorEvent {
    return {
      id: uuidv4(),
      functionCall: 'characterError',
      parameters: {
        entityId,
        worldId,
        errorMessage,
        errorType,
        originalCommand,
        stackTrace: error?.stack,
        severity
      },
      timestamp: new Date()
    };
  }

  static getDisplayMessage(errorType: string, originalCommand?: string): string {
    switch (errorType) {
      case 'command':
        return `Failed to process command${originalCommand ? `: "${originalCommand}"` : ''}`;
      case 'pickup':
        return 'Failed to pick up item';
      case 'drop':
        return 'Failed to drop item';
      case 'move':
        return 'Failed to move to location';
      case 'speak':
        return 'Failed to speak message';
      case 'cronjob':
        return 'Failed to execute scheduled task';
      case 'event':
        return 'Failed to process game event';
      case 'system':
        return 'System error occurred';
      default:
        return 'An error occurred';
    }
  }

  static getSeverityColor(severity: 'low' | 'medium' | 'high'): string {
    switch (severity) {
      case 'low':
        return '#FFA726'; // Orange
      case 'medium':
        return '#FF7043'; // Deep Orange
      case 'high':
        return '#F44336'; // Red
      default:
        return '#FF7043';
    }
  }
} 