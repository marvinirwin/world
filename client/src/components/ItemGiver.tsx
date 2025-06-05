import React, { useState, useEffect } from 'react';
import { Entity, Asset } from '../../../shared/types';
import { AssetService } from '../services/assetService';

interface ItemGiverProps {
  entities: Record<string, Entity>;
  onGiveItem: (characterId: string, assetId: string) => void;
}

const ItemGiver: React.FC<ItemGiverProps> = ({ entities, onGiveItem }) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [selectedAssetId, setSelectedAssetId] = useState<string>('');
  const [availableItems, setAvailableItems] = useState<Asset[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  useEffect(() => {
    const loadItems = async () => {
      const assetService = new AssetService();
      const allAssets = await assetService.loadAllAssets();
      const itemAssets = allAssets.filter(asset => asset.type === 'item');
      setAvailableItems(itemAssets);
      setIsLoadingItems(false);
    };

    loadItems();
  }, []);

  const handleGiveItem = () => {
    if (selectedCharacterId && selectedAssetId) {
      console.log('ItemGiver: Attempting to give item', { characterId: selectedCharacterId, assetId: selectedAssetId });
      onGiveItem(selectedCharacterId, selectedAssetId);
      // Reset selections after giving item
      setSelectedAssetId('');
    }
  };

  const characterEntries = Object.entries(entities);

  return (
    <div style={{
      borderTop: '1px solid #555',
      paddingTop: '12px',
      marginTop: '12px'
    }}>
      <div style={{
        color: '#ffcc99',
        fontSize: '16px',
        marginBottom: '8px',
        fontWeight: 'bold'
      }}>
        Give Items to Characters
      </div>

      {/* Character Selection */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{
          color: '#ccc',
          fontSize: '14px',
          display: 'block',
          marginBottom: '4px'
        }}>
          Select Character:
        </label>
        <select
          value={selectedCharacterId}
          onChange={(e) => setSelectedCharacterId(e.target.value)}
          style={{
            width: '100%',
            padding: '6px',
            fontSize: '14px',
            backgroundColor: '#333',
            color: '#fff',
            border: '1px solid #555',
            borderRadius: '4px'
          }}
        >
          <option value="">Choose a character...</option>
          {characterEntries.map(([id, entity]) => (
            <option key={id} value={id}>
              {entity.name} (ID: {id.slice(0, 8)}...)
            </option>
          ))}
        </select>
      </div>

      {/* Item Selection */}
      <div style={{ marginBottom: '8px' }}>
        <label style={{
          color: '#ccc',
          fontSize: '14px',
          display: 'block',
          marginBottom: '4px'
        }}>
          Select Item:
        </label>
        {isLoadingItems ? (
          <div style={{
            color: '#999',
            fontSize: '14px',
            padding: '6px'
          }}>
            Loading items...
          </div>
        ) : (
          <select
            value={selectedAssetId}
            onChange={(e) => setSelectedAssetId(e.target.value)}
            style={{
              width: '100%',
              padding: '6px',
              fontSize: '14px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #555',
              borderRadius: '4px'
            }}
          >
            <option value="">Choose an item...</option>
            {availableItems.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Give Item Button */}
      <button
        onClick={handleGiveItem}
        disabled={!selectedCharacterId || !selectedAssetId}
        style={{
          width: '100%',
          padding: '8px',
          fontSize: '14px',
          backgroundColor: selectedCharacterId && selectedAssetId ? '#ff6600' : '#444',
          color: selectedCharacterId && selectedAssetId ? '#fff' : '#999',
          border: 'none',
          borderRadius: '4px',
          cursor: selectedCharacterId && selectedAssetId ? 'pointer' : 'not-allowed',
          fontWeight: 'bold'
        }}
      >
        Give Item
      </button>

      {/* Current Item Count Info */}
      {selectedCharacterId && entities[selectedCharacterId] && (
        <div style={{
          marginTop: '8px',
          padding: '6px',
          backgroundColor: '#222',
          borderRadius: '4px',
          fontSize: '13px',
          color: '#ccc'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
            {entities[selectedCharacterId].name} currently has:
          </div>
          <div>
            {entities[selectedCharacterId].itemInstances.length} item(s)
            {entities[selectedCharacterId].itemInstances.length > 0 && (
              <div style={{ marginTop: '4px' }}>
                {entities[selectedCharacterId].itemInstances.map((item, index) => (
                  <div key={item.id} style={{ paddingLeft: '8px' }}>
                    • {item.description}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemGiver; 