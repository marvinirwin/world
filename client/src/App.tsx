import React, { useState, useEffect } from 'react';
import LoginScreen from './components/LoginScreen';
import World3D from './components/World3D';
import GameUI from './components/GameUI';
import CommandInput from './components/CommandInput';
import DevMenu from './components/DevMenu';
import ErrorDisplay from './components/ErrorDisplay';
import { useWebSocket } from './hooks/useWebSocket';
import { isDevelopmentMode } from './services/devEnvironmentService';
import { getSelectedScriptId, getScriptById, executeScript, clearSelectedScript } from './services/scriptService';

const App: React.FC = () => {
  const [entityId, setEntityId] = useState<string | null>(null);

  // Check for saved entity ID on app start
  useEffect(() => {
    console.log('DEBUG: App starting, checking for saved entityId in localStorage');
    const savedEntityId = localStorage.getItem('worldEntityId');
    console.log('DEBUG: Saved entityId from localStorage:', savedEntityId);
    if (savedEntityId) {
      console.log('DEBUG: Setting entityId from localStorage:', savedEntityId);
      setEntityId(savedEntityId);
    } else {
      console.log('DEBUG: No saved entityId found, user needs to login');
    }
  }, []);

  const { 
    gameState, 
    connected, 
    error, 
    characterErrors, 
    cronjobs,
    dismissCharacterError, 
    sendAction, 
    sendCommand, 
    sendCommandWithSource,
    sendDevCommand,
    getCronjobs
  } = useWebSocket(entityId);

  // Auto-execute script on page load (localhost only)
  useEffect(() => {
    if (isDevelopmentMode() && gameState && sendCommandWithSource && entityId) {
      const scriptId = getSelectedScriptId();
      if (scriptId) {
        const script = getScriptById(scriptId);
        if (script) {
          // Small delay to ensure everything is initialized
          setTimeout(async () => {
            await executeScript(
              script, 
              (command) => sendCommandWithSource(command, 'script'),
              sendDevCommand,
              () => entityId
            );
            clearSelectedScript(); // Clear after execution
          }, 1000);
        }
      }
    }
  }, [gameState, sendCommandWithSource, sendDevCommand, entityId]);

  const handleLogin = (newEntityId: string) => {
    console.log('DEBUG: handleLogin called with entityId:', newEntityId);
    console.log('DEBUG: Saving entityId to localStorage:', newEntityId);
    localStorage.setItem('worldEntityId', newEntityId);
    console.log('DEBUG: Setting entityId state:', newEntityId);
    setEntityId(newEntityId);
  };

  const handleLogout = () => {
    console.log('DEBUG: handleLogout called');
    console.log('DEBUG: Removing entityId from localStorage');
    localStorage.removeItem('worldEntityId');
    console.log('DEBUG: Setting entityId state to null');
    setEntityId(null);
  };

  console.log('DEBUG: App render - entityId:', entityId, 'connected:', connected, 'hasGameState:', !!gameState);

  if (!entityId) {
    console.log('DEBUG: No entityId, showing LoginScreen');
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      {/* Character Error Display */}
      <ErrorDisplay 
        characterErrors={characterErrors}
        onDismissError={dismissCharacterError}
      />

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
          entityId={entityId}
          worldId={gameState.worldId}
        />
      )}

      {/* Development Menu (localhost only) */}
      {isDevelopmentMode() && gameState && (
        <DevMenu 
          sendCommand={sendCommand} 
          sendCommandWithSource={sendCommandWithSource}
          sendDevCommand={sendDevCommand}
          gameState={gameState}
          cronjobs={cronjobs}
          getCronjobs={getCronjobs}
          entityId={entityId}
        />
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