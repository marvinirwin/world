export class LocalStorageService {
  private static readonly CHARACTER_ID_KEY = 'gameCharacterId';
  private static readonly WORLD_ID_KEY = 'gameWorldId';
  private static readonly CHARACTER_NAME_KEY = 'gameCharacterName';

  static getCharacterId(): string | null {
    return localStorage.getItem(this.CHARACTER_ID_KEY);
  }

  static setCharacterId(characterId: string): void {
    localStorage.setItem(this.CHARACTER_ID_KEY, characterId);
  }

  static getWorldId(): string | null {
    return localStorage.getItem(this.WORLD_ID_KEY);
  }

  static setWorldId(worldId: string): void {
    localStorage.setItem(this.WORLD_ID_KEY, worldId);
  }

  static getCharacterName(): string | null {
    return localStorage.getItem(this.CHARACTER_NAME_KEY);
  }

  static setCharacterName(name: string): void {
    localStorage.setItem(this.CHARACTER_NAME_KEY, name);
  }

  static clearCharacterData(): void {
    localStorage.removeItem(this.CHARACTER_ID_KEY);
    localStorage.removeItem(this.WORLD_ID_KEY);
    localStorage.removeItem(this.CHARACTER_NAME_KEY);
  }

  static hasCharacterData(): boolean {
    return this.getCharacterId() !== null && 
           this.getWorldId() !== null && 
           this.getCharacterName() !== null;
  }

  static getCharacterData(): {
    characterId: string;
    worldId: string;
    characterName: string;
  } | null {
    const characterId = this.getCharacterId();
    const worldId = this.getWorldId();
    const characterName = this.getCharacterName();

    if (characterId && worldId && characterName) {
      return { characterId, worldId, characterName };
    }

    return null;
  }

  static setCharacterData(data: {
    characterId: string;
    worldId: string;
    characterName: string;
  }): void {
    this.setCharacterId(data.characterId);
    this.setWorldId(data.worldId);
    this.setCharacterName(data.characterName);
  }
} 