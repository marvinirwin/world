import { Asset } from '../../../shared/types.js';

export class AssetService {
  private loadedAssets: Map<string, Asset> = new Map();
  private loadingPromises: Map<string, Promise<Asset>> = new Map();

  async loadAsset(assetId: string): Promise<Asset | null> {
    // Check if already loaded
    if (this.loadedAssets.has(assetId)) {
      return this.loadedAssets.get(assetId)!;
    }

    // Check if currently loading
    if (this.loadingPromises.has(assetId)) {
      return await this.loadingPromises.get(assetId)!;
    }

    // Start loading
    const loadingPromise = this.loadAssetFromFile(assetId);
    this.loadingPromises.set(assetId, loadingPromise);

    try {
      const asset = await loadingPromise;
      this.loadedAssets.set(assetId, asset);
      this.loadingPromises.delete(assetId);
      return asset;
    } catch (error) {
      this.loadingPromises.delete(assetId);
      console.error(`Failed to load asset ${assetId}:`, error);
      return null;
    }
  }

  async loadAllAssets(): Promise<Asset[]> {
    try {
      // In a real implementation, this would scan the assets directory
      // For now, return a basic set of placeholder assets
      const assetConfigs = await this.getAssetManifest();
      
      const loadPromises = assetConfigs.map(config => this.loadAsset(config.id));
      const results = await Promise.all(loadPromises);
      
      return results.filter((asset): asset is Asset => asset !== null);
    } catch (error) {
      console.error('Failed to load assets:', error);
      return [];
    }
  }

  getAsset(assetId: string): Asset | null {
    return this.loadedAssets.get(assetId) || null;
  }

  preloadAssets(assetIds: string[]): Promise<(Asset | null)[]> {
    return Promise.all(assetIds.map(id => this.loadAsset(id)));
  }

  private async loadAssetFromFile(assetId: string): Promise<Asset> {
    // This would normally load from /assets/{assetId}.json or similar
    // For now, create placeholder assets
    return {
      id: assetId,
      name: assetId.replace(/_/g, ' '),
      modelPath: `/assets/models/${assetId}.glb`,
      skinColor: '#ffffff',
      type: this.determineAssetType(assetId)
    };
  }

  private async getAssetManifest(): Promise<{id: string, type: Asset['type']}[]> {
    // This would normally read from /assets/manifest.json
    // For now, return basic assets including body parts
    return [
      // Basic human body parts
      { id: 'human_head', type: 'bodypart' },
      { id: 'human_torso', type: 'bodypart' },
      { id: 'human_legs', type: 'bodypart' },
      { id: 'human_arms', type: 'bodypart' },
      
      // Items that can be picked up and worn/held
      { id: 'sword', type: 'item' },
      { id: 'shield', type: 'item' },
      { id: 'helmet', type: 'item' },
      { id: 'armor', type: 'item' },
      { id: 'boots', type: 'item' },
      { id: 'rock', type: 'item' },
      { id: 'stick', type: 'item' },
      
      // World objects/models
      { id: 'tree', type: 'model' },
      { id: 'building', type: 'model' },
      { id: 'rock_large', type: 'model' }
    ];
  }

  private determineAssetType(assetId: string): Asset['type'] {
    if (assetId.includes('head') || assetId.includes('torso') || 
        assetId.includes('arm') || assetId.includes('leg')) {
      return 'bodypart';
    }
    if (assetId.includes('sword') || assetId.includes('shield') || 
        assetId.includes('helmet') || assetId.includes('armor') ||
        assetId.includes('boots') || assetId.includes('rock') || 
        assetId.includes('stick') || assetId.includes('tool')) {
      return 'item';
    }
    return 'model';
  }
} 