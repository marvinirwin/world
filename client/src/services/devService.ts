import { WebSocketService } from './websocketService';

export class DevService {
  private websocketService: WebSocketService;

  constructor(websocketService: WebSocketService) {
    this.websocketService = websocketService;
  }

  async deleteCharacter(characterId: string): Promise<void> {
    if (!this.isLocalhost()) {
      throw new Error('Development commands only available on localhost');
    }

    this.websocketService.sendDevCommand('deleteCharacter', { characterId });
  }

  private isLocalhost(): boolean {
    return window.location.hostname === 'localhost';
  }
} 