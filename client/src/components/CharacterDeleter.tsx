import React, { useState, useEffect } from 'react';
import { Entity } from '../../../shared/types';

interface CharacterDeleterProps {
  entities: Record<string, Entity>;
  onDeleteCharacter: (characterId: string) => void;
}

const CharacterDeleter: React.FC<CharacterDeleterProps> = ({ entities, onDeleteCharacter }) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [confirmDelete, setConfirmDelete] = useState<boolean>(false);

  const handleDeleteClick = () => {
    if (!selectedCharacterId) return;
    setConfirmDelete(true);
  };

  const handleConfirmDelete = () => {
    if (selectedCharacterId) {
      onDeleteCharacter(selectedCharacterId);
      setSelectedCharacterId('');
      setConfirmDelete(false);
    }
  };

  const handleCancelDelete = () => {
    setConfirmDelete(false);
  };

  const entityEntries = Object.entries(entities);

  return (
    <div style={{
      borderTop: '1px solid #333',
      paddingTop: '8px',
      marginTop: '12px'
    }}>
      <div style={{
        color: '#ff6600',
        fontSize: '14px',
        fontWeight: 'bold',
        marginBottom: '8px'
      }}>
        Character Management
      </div>

      {entityEntries.length === 0 ? (
        <div style={{
          color: '#666',
          fontSize: '12px',
          fontStyle: 'italic'
        }}>
          No characters in world
        </div>
      ) : (
        <>
          <select
            value={selectedCharacterId}
            onChange={(e) => setSelectedCharacterId(e.target.value)}
            style={{
              width: '100%',
              padding: '4px',
              marginBottom: '8px',
              backgroundColor: '#333',
              color: '#fff',
              border: '1px solid #666',
              borderRadius: '4px',
              fontSize: '12px'
            }}
          >
            <option value="">Select character to delete...</option>
            {entityEntries.map(([id, entity]) => (
              <option key={id} value={id}>
                {entity.name} ({id})
              </option>
            ))}
          </select>

          {!confirmDelete ? (
            <button
              onClick={handleDeleteClick}
              disabled={!selectedCharacterId}
              style={{
                backgroundColor: selectedCharacterId ? '#cc4400' : '#666',
                color: '#fff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                cursor: selectedCharacterId ? 'pointer' : 'not-allowed',
                width: '100%'
              }}
            >
              Delete Character
            </button>
          ) : (
            <div>
              <div style={{
                color: '#ff6600',
                fontSize: '12px',
                marginBottom: '8px',
                textAlign: 'center'
              }}>
                Delete {entities[selectedCharacterId]?.name}?
              </div>
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <button
                  onClick={handleConfirmDelete}
                  style={{
                    backgroundColor: '#cc4400',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Confirm
                </button>
                <button
                  onClick={handleCancelDelete}
                  style={{
                    backgroundColor: '#666',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                    flex: 1
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CharacterDeleter; 