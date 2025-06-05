import React from 'react';
import { GameState } from '../types';
import InventoryPanel from './InventoryPanel';

interface GameUIProps {
  gameState: GameState | null;
  connected: boolean;
  error: string | null;
  playerEntityId: string;
}

const GameUI: React.FC<GameUIProps> = ({ gameState, connected, error, playerEntityId }) => {
  const playerEntity = gameState?.entities[playerEntityId];

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      zIndex: 1000
    }}>
      {/* Inventory Panel */}
      {playerEntity && (
        <InventoryPanel 
          itemInstances={playerEntity.itemInstances} 
          playerName={playerEntity.name}
        />
      )}

      {/* Connection Status - moved down to avoid overlap with inventory */}
      <div style={{
        position: 'absolute',
        top: '440px',
        right: '20px',
        padding: '10px 15px',
        backgroundColor: connected ? 'rgba(76, 175, 80, 0.9)' : 'rgba(244, 67, 54, 0.9)',
        borderRadius: '5px',
        fontSize: '14px',
        fontWeight: 'bold',
        pointerEvents: 'auto'
      }}>
        {connected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>

      {/* Error Message - moved down to avoid overlap */}
      {error && (
        <div style={{
          position: 'absolute',
          top: '490px',
          right: '20px',
          padding: '10px 15px',
          backgroundColor: 'rgba(244, 67, 54, 0.9)',
          borderRadius: '5px',
          fontSize: '14px',
          maxWidth: '300px',
          pointerEvents: 'auto'
        }}>
          Error: {error}
        </div>
      )}

      {/* Player Info */}
      {gameState && gameState.entities[playerEntityId] && gameState.entities[playerEntityId].position && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          padding: '15px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '8px',
          fontSize: '14px',
          minWidth: '200px',
          pointerEvents: 'auto'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#4CAF50' }}>Your Entity</h3>
          <div><strong>ID:</strong> {playerEntityId}</div>
          <div><strong>Position:</strong> ({gameState.entities[playerEntityId].position.x.toFixed(1)}, {gameState.entities[playerEntityId].position.y.toFixed(1)}, {gameState.entities[playerEntityId].position.z.toFixed(1)})</div>
        </div>
      )}

      {/* Entity List */}
      {gameState && (
        <div style={{
          position: 'absolute',
          bottom: '260px',
          left: '20px',
          padding: '15px',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '8px',
          fontSize: '14px',
          maxWidth: '300px',
          maxHeight: '200px',
          overflowY: 'auto',
          pointerEvents: 'auto'
        }}>
          <h3 style={{ margin: '0 0 10px 0', color: '#2196F3' }}>Entities ({Object.keys(gameState.entities).length})</h3>
          {Object.values(gameState.entities).map(entity => (
            <div key={entity.id} style={{ 
              marginBottom: '5px',
              color: entity.id === playerEntityId ? '#4CAF50' : '#fff'
            }}>
              {entity.name} {entity.id === playerEntityId && '(You)'}
            </div>
          ))}
        </div>
      )}

      {/* Instructions */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        fontSize: '16px',
        color: 'rgba(255, 255, 255, 0.7)',
        pointerEvents: 'none'
      }}>
        {!gameState && connected && (
          <div>Loading world...</div>
        )}
        {gameState && Object.keys(gameState.entities).length === 0 && (
          <div>Waiting for entities to spawn...</div>
        )}
      </div>
    </div>
  );
};

export default GameUI; 