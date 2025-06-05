import React, { useState } from 'react';
import { Entity, CharacterCronjob } from '../../../shared/types';

interface CronjobViewerProps {
  entities: Record<string, Entity>;
  cronjobs: Record<string, CharacterCronjob[]>;
  getCronjobs: (characterId: string) => void;
}

const CronjobViewer: React.FC<CronjobViewerProps> = ({ entities, cronjobs, getCronjobs }) => {
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');

  const handleCharacterSelect = (characterId: string) => {
    setSelectedCharacterId(characterId);
    if (characterId) {
      getCronjobs(characterId);
    }
  };

  const entityList = Object.values(entities);
  const selectedCharacterCronjobs = selectedCharacterId ? cronjobs[selectedCharacterId] || [] : [];

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const getTimeUntilNext = (cronjob: CharacterCronjob) => {
    const lastExecuted = new Date(cronjob.lastExecuted);
    const nextExecution = new Date(lastExecuted.getTime() + cronjob.intervalSeconds * 1000);
    const now = new Date();
    const timeUntil = nextExecution.getTime() - now.getTime();
    
    if (timeUntil <= 0) return 'Due now';
    
    const seconds = Math.floor(timeUntil / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  return (
    <div style={{
      borderTop: '1px solid #333',
      paddingTop: '8px',
      marginTop: '12px'
    }}>
      <div style={{
        color: '#ff6600',
        fontSize: '14px',
        marginBottom: '8px',
        fontWeight: 'bold'
      }}>
        Cronjob Viewer:
      </div>

      {/* Character Selector */}
      <div style={{ marginBottom: '8px' }}>
        <select
          value={selectedCharacterId}
          onChange={(e) => handleCharacterSelect(e.target.value)}
          style={{
            backgroundColor: '#333',
            color: 'white',
            border: '1px solid #666',
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '12px',
            width: '100%'
          }}
        >
          <option value="">Select a character...</option>
          {entityList.map(entity => (
            <option key={entity.id} value={entity.id}>
              {entity.name} ({entity.id.slice(0, 8)}...)
            </option>
          ))}
        </select>
      </div>

      {/* Cronjobs Display */}
      {selectedCharacterId && (
        <div style={{
          backgroundColor: '#222',
          border: '1px solid #444',
          borderRadius: '4px',
          padding: '8px',
          maxHeight: '200px',
          overflowY: 'auto'
        }}>
          {selectedCharacterCronjobs.length === 0 ? (
            <div style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
              No active cronjobs found
            </div>
          ) : (
            selectedCharacterCronjobs.map(cronjob => (
              <div
                key={cronjob.id}
                style={{
                  backgroundColor: '#111',
                  border: '1px solid #333',
                  borderRadius: '3px',
                  padding: '6px',
                  marginBottom: '6px',
                  fontSize: '11px'
                }}
              >
                <div style={{ color: '#ffcc99', fontWeight: 'bold', marginBottom: '2px' }}>
                  {cronjob.taskDescription}
                </div>
                <div style={{ color: '#ccc', marginBottom: '2px' }}>
                  Interval: {formatInterval(cronjob.intervalSeconds)}
                </div>
                <div style={{ color: '#ccc', marginBottom: '2px' }}>
                  Last executed: {formatDate(cronjob.lastExecuted)}
                </div>
                <div style={{ color: '#ccc' }}>
                  Next execution: {getTimeUntilNext(cronjob)}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CronjobViewer; 