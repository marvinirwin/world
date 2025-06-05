import React, { useState, useEffect } from 'react';
import ScriptSelector from './ScriptSelector';
import CharacterDeleter from './CharacterDeleter';
import ItemGiver from './ItemGiver';
import CronjobViewer from './CronjobViewer';
import { 
  getAvailableScripts, 
  getSelectedScriptId, 
  setSelectedScriptId, 
  clearSelectedScript,
  getScriptById,
  executeScript
} from '../services/scriptService';
import { TestScript } from '../scripts';
import { GameState, CharacterCronjob } from '../../../shared/types';

interface DevMenuProps {
  sendCommand: (instruction: string) => void;
  sendCommandWithSource?: (command: string, source: 'manual' | 'script') => void;
  sendDevCommand?: (command: string, data: any) => void;
  gameState?: GameState | null;
  cronjobs?: Record<string, CharacterCronjob[]>;
  getCronjobs?: (characterId: string) => void;
  entityId?: string | null;
}

const DevMenu: React.FC<DevMenuProps> = ({ sendCommand, sendCommandWithSource, sendDevCommand, gameState, cronjobs, getCronjobs, entityId }) => {
  const [scripts] = useState<TestScript[]>(getAvailableScripts());
  const [selectedScriptId, setSelectedScriptIdState] = useState<string | null>(null);

  useEffect(() => {
    const savedScriptId = getSelectedScriptId();
    setSelectedScriptIdState(savedScriptId);
  }, []);

  const handleScriptSelect = (scriptId: string) => {
    setSelectedScriptIdState(scriptId);
    setSelectedScriptId(scriptId);
  };

  const handleExecuteScript = async () => {
    if (!selectedScriptId) return;
    
    const script = getScriptById(selectedScriptId);
    if (script && sendCommandWithSource) {
      await executeScript(
        script, 
        (command) => sendCommandWithSource(command, 'script'),
        sendDevCommand,
        () => entityId || null
      );
    } else if (script) {
      // Fallback to regular sendCommand if sendCommandWithSource not available
      await executeScript(
        script, 
        sendCommand,
        sendDevCommand,
        () => entityId || null
      );
    }
  };

  const handleClearScript = () => {
    setSelectedScriptIdState(null);
    clearSelectedScript();
  };

  const handleDeleteCharacter = (characterId: string) => {
    if (sendDevCommand) {
      sendDevCommand('deleteCharacter', { characterId });
    }
  };

  const handleGiveItem = (characterId: string, assetId: string) => {
    console.log('DevMenu: Sending giveItem dev command', { characterId, assetId });
    if (sendDevCommand) {
      sendDevCommand('giveItem', { characterId, assetId });
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 2000,
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      border: '2px solid #ff6600',
      borderRadius: '8px',
      padding: '12px',
      minWidth: '350px',
      maxWidth: '400px',
      fontFamily: 'monospace',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '12px'
      }}>
        <div style={{
          color: '#ff6600',
          fontWeight: 'bold',
          fontSize: '18px'
        }}>
          DEV TOOLS
        </div>
      </div>

      {/* Content - always visible */}
      <div>
        <div style={{
          color: '#ffcc99',
          fontSize: '14px',
          marginBottom: '12px',
          fontStyle: 'italic'
        }}>
          localhost development only
        </div>

        <ScriptSelector
          scripts={scripts}
          selectedScriptId={selectedScriptId}
          onScriptSelect={handleScriptSelect}
          onExecuteScript={handleExecuteScript}
          onClearScript={handleClearScript}
        />

        {/* Character Management */}
        {sendDevCommand && gameState && (
          <>
            <CharacterDeleter
              entities={gameState.entities}
              onDeleteCharacter={handleDeleteCharacter}
            />

            <ItemGiver
              entities={gameState.entities}
              onGiveItem={handleGiveItem}
            />
          </>
        )}

        {/* Debug Actions */}
        <div style={{
          borderTop: '1px solid #333',
          paddingTop: '8px',
          marginTop: '12px',
          marginBottom: '12px'
        }}>
          <div style={{
            color: '#ff6600',
            fontSize: '14px',
            marginBottom: '8px',
            fontWeight: 'bold'
          }}>
            Debug Actions:
          </div>
          
          <button
            onClick={() => sendCommand('DEBUG: trigger checkTasks manually')}
            style={{
              backgroundColor: '#ff6600',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              marginRight: '8px',
              marginBottom: '4px'
            }}
          >
            Manual CheckTasks
          </button>
          
          <button
            onClick={() => sendCommand('walk around every 10 seconds')}
            style={{
              backgroundColor: '#0066ff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              marginBottom: '4px'
            }}
          >
            Test Recurring Command
          </button>
        </div>

        {/* Cronjob Viewer */}
        {gameState && cronjobs && getCronjobs && (
          <CronjobViewer
            entities={gameState.entities}
            cronjobs={cronjobs}
            getCronjobs={getCronjobs}
          />
        )}

        {/* Future features placeholder */}
        <div style={{
          borderTop: '1px solid #333',
          paddingTop: '8px',
          marginTop: '12px'
        }}>
          <div style={{
            color: '#666',
            fontSize: '14px',
            marginBottom: '4px'
          }}>
            Future Features:
          </div>
          <div style={{
            color: '#444',
            fontSize: '13px',
            lineHeight: '1.3'
          }}>
            • Memory Viewer<br/>
            • World Inspector<br/>
            • Event Log<br/>
            • Performance Metrics
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevMenu; 