import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, ServerMessage, ClientMessage, GameEvent } from '../types';

export const useWebSocket = (entityId: string | null) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!entityId) return;

    try {
      const ws = new WebSocket('ws://localhost:3010');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to server');
        setConnected(true);
        setError(null);
        
        // Join the game
        const joinMessage: ClientMessage = {
          type: 'join',
          entityId: entityId
        };
        ws.send(JSON.stringify(joinMessage));
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'gameState':
              setGameState(message.data);
              break;
            case 'event':
              handleGameEvent(message.data);
              break;
            case 'error':
              setError(message.data.message);
              break;
          }
        } catch (err) {
          console.error('Error parsing message:', err);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from server');
        setConnected(false);
      };

      ws.onerror = (err) => {
        console.error('WebSocket error:', err);
        setError('Connection error');
      };

    } catch (err) {
      console.error('Failed to connect:', err);
      setError('Failed to connect to server');
    }
  }, [entityId]);

  const handleGameEvent = useCallback((event: GameEvent) => {
    setGameState(prevState => {
      if (!prevState) return prevState;

      const newState = { ...prevState };
      
      // Add event to recent events
      newState.recentEvents = [event, ...prevState.recentEvents.slice(0, 49)];

      // Update entity state based on event
      switch (event.functionCall) {
        case 'move':
          if (newState.entities[event.parameters.entityId]) {
            newState.entities[event.parameters.entityId] = {
              ...newState.entities[event.parameters.entityId],
              position: event.parameters.to
            };
          }
          break;
        case 'pickup':
          if (newState.entities[event.parameters.entityId]) {
            const entity = newState.entities[event.parameters.entityId];
            newState.entities[event.parameters.entityId] = {
              ...entity,
              items: [...entity.items, event.parameters.itemId]
            };
          }
          break;
        case 'drop':
          if (newState.entities[event.parameters.entityId]) {
            const entity = newState.entities[event.parameters.entityId];
            newState.entities[event.parameters.entityId] = {
              ...entity,
              items: entity.items.filter(item => item !== event.parameters.itemId)
            };
          }
          break;
      }

      return newState;
    });
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const sendAction = useCallback((data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: ClientMessage = {
        type: 'action',
        data: data
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const sendCommand = useCallback((command: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && entityId) {
      const worldId = gameState?.worldId || 'default';
      const message: ClientMessage = {
        type: 'command',
        entityId,
        worldId,
        data: { command }
      };
      wsRef.current.send(JSON.stringify(message));
    }
  }, [entityId, gameState?.worldId]);

  useEffect(() => {
    if (entityId) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [entityId, connect, disconnect]);

  return {
    gameState,
    connected,
    error,
    sendAction,
    sendCommand,
    disconnect
  };
}; 