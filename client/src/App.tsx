import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import World3D from './components/World3D';
import GameUI from './components/GameUI';
import CommandInput from './components/CommandInput';
import DevMenu from './components/DevMenu';
import { useWebSocket } from './hooks/useWebSocket';
import { isDevelopmentMode } from './services/devEnvironmentService';
import { getSelectedScriptId, getScriptById, executeScript, clearSelectedScript } from './services/scriptService';

const App: React.FC = () => {
  const [entityId, setEntityId] = useState<string | null>(null);

  // Check for saved entity ID on app start
  useEffect(() => {
    const savedEntityId = localStorage.getItem('worldEntityId');
    if (savedEntityId) {
      setEntityId(savedEntityId);
    }
  }, []);

  const { gameState, connected, error, sendAction, sendCommand } = useWebSocket(entityId);

  // Auto-execute script on page load (localhost only)
  useEffect(() => {
    if (isDevelopmentMode() && gameState && sendCommand) {
      const scriptId = getSelectedScriptId();
      if (scriptId) {
        const script = getScriptById(scriptId);
        if (script) {
          // Small delay to ensure everything is initialized
          setTimeout(async () => {
            await executeScript(script, sendCommand);
            clearSelectedScript(); // Clear after execution
          }, 1000);
        }
      }
    }
  }, [gameState, sendCommand]);

  const handleLogin = (newEntityId: string) => {
    setEntityId(newEntityId);
  };

  const handleLogout = () => {
    localStorage.removeItem('worldEntityId');
    setEntityId(null);
  };

  if (!entityId) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* 3D World */}
      {gameState && (
        <World3D gameState={gameState} playerEntityId={entityId} />
      )}

      {/* UI Overlay */}
      <GameUI
        gameState={gameState}
        connected={connected}
        error={error}
        playerEntityId={entityId}
      />

      {/* Command Input */}
      {gameState && (
        <CommandInput
          onSendCommand={sendCommand}
          recentEvents={gameState.recentEvents}
          disabled={!connected}
        />
      )}

      {/* Development Menu (localhost only) */}
      {isDevelopmentMode() && gameState && (
        <DevMenu sendCommand={sendCommand} />
      )}

      {/* Logout Button */}
      <button
        onClick={handleLogout}
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 16px',
          backgroundColor: 'rgba(244, 67, 54, 0.9)',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontSize: '12px',
          cursor: 'pointer',
          zIndex: 1001,
          pointerEvents: 'auto'
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default App; 