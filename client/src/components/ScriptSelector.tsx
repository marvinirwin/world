import React from 'react';
import { TestScript } from '../scripts';

interface ScriptSelectorProps {
  scripts: TestScript[];
  selectedScriptId: string | null;
  onScriptSelect: (scriptId: string) => void;
  onExecuteScript: () => void;
  onClearScript: () => void;
}

const ScriptSelector: React.FC<ScriptSelectorProps> = ({
  scripts,
  selectedScriptId,
  onScriptSelect,
  onExecuteScript,
  onClearScript
}) => {
  const selectedScript = scripts.find(script => script.id === selectedScriptId);

  const handleScriptClick = async (script: TestScript) => {
    onScriptSelect(script.id);
    // Auto-execute immediately when clicked
    setTimeout(() => onExecuteScript(), 100);
  };

  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ 
        marginBottom: '8px',
        fontSize: '16px',
        color: '#ffcc99',
        fontWeight: 'bold'
      }}>
        Test Scripts:
      </div>

      {/* Script Buttons */}
      <div style={{ marginBottom: '12px' }}>
        {scripts.map(script => (
          <button
            key={script.id}
            onClick={() => handleScriptClick(script)}
            style={{
              display: 'block',
              width: '100%',
              margin: '4px 0',
              padding: '8px 12px',
              backgroundColor: selectedScriptId === script.id ? '#4CAF50' : '#333',
              color: 'white',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '15px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              if (selectedScriptId !== script.id) {
                e.currentTarget.style.backgroundColor = '#444';
              }
            }}
            onMouseLeave={(e) => {
              if (selectedScriptId !== script.id) {
                e.currentTarget.style.backgroundColor = '#333';
              }
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
              {script.name}
            </div>
            <div style={{ fontSize: '13px', color: '#ccc', lineHeight: '1.2' }}>
              {script.description}
            </div>
          </button>
        ))}
      </div>

      {/* Clear Button */}
      <button
        onClick={onClearScript}
        style={{
          width: '100%',
          padding: '6px 12px',
          backgroundColor: '#f44336',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '15px',
          cursor: 'pointer'
        }}
      >
        Clear Selection
      </button>

      {/* Current Selection Display */}
      {selectedScript && (
        <div style={{ 
          marginTop: '8px',
          padding: '6px', 
          backgroundColor: 'rgba(76, 175, 80, 0.2)', 
          border: '1px solid #4CAF50',
          borderRadius: '4px',
          fontSize: '14px',
          color: '#4CAF50'
        }}>
          Selected: {selectedScript.name}
        </div>
      )}
    </div>
  );
};

export default ScriptSelector; 