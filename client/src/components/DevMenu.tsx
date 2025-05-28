import React, { useState, useEffect } from 'react';
import ScriptSelector from './ScriptSelector';
import { 
  getAvailableScripts, 
  getSelectedScriptId, 
  setSelectedScriptId, 
  clearSelectedScript,
  getScriptById,
  executeScript
} from '../services/scriptService';
import { TestScript } from '../scripts';

interface DevMenuProps {
  sendCommand: (instruction: string) => void;
}

const DevMenu: React.FC<DevMenuProps> = ({ sendCommand }) => {
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
    if (script) {
      await executeScript(script, sendCommand);
    }
  };

  const handleClearScript = () => {
    setSelectedScriptIdState(null);
    clearSelectedScript();
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
      minWidth: '250px',
      maxWidth: '300px',
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
          fontSize: '14px'
        }}>
          DEV TOOLS
        </div>
      </div>

      {/* Content - always visible */}
      <div>
        <div style={{
          color: '#ffcc99',
          fontSize: '10px',
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

        {/* Future features placeholder */}
        <div style={{
          borderTop: '1px solid #333',
          paddingTop: '8px',
          marginTop: '12px'
        }}>
          <div style={{
            color: '#666',
            fontSize: '10px',
            marginBottom: '4px'
          }}>
            Future Features:
          </div>
          <div style={{
            color: '#444',
            fontSize: '9px',
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