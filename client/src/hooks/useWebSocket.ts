import { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, ServerMessage, ClientMessage, GameEvent, CharacterErrorEvent } from '../../../shared/types';

export const useWebSocket = (entityId: string | null) => {
  console.log('DEBUG: useWebSocket hook called with entityId:', entityId);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [characterErrors, setCharacterErrors] = useState<CharacterErrorEvent[]>([]);
  const [cronjobs, setCronjobs] = useState<Record<string, any[]>>({});
  const wsRef = useRef<WebSocket | null>(null);

  // Add debug log whenever entityId changes
  useEffect(() => {
    console.log('DEBUG: useWebSocket entityId changed to:', entityId);
  }, [entityId]);

  // Add debug log whenever gameState changes
  useEffect(() => {
    console.log('DEBUG: useWebSocket gameState changed:', {
      hasGameState: !!gameState,
      worldId: gameState?.worldId,
      entityCount: gameState ? Object.keys(gameState.entities).length : 0,
      playerEntityExists: gameState && entityId ? !!gameState.entities[entityId] : false
    });
  }, [gameState, entityId]);

  const connect = useCallback(() => {
    console.log('DEBUG: connect() called with entityId:', entityId);
    if (!entityId) {
      console.log('DEBUG: No entityId provided, cannot connect');
      return;
    }

    try {
      console.log('DEBUG: Creating WebSocket connection to ws://localhost:3010');
      const ws = new WebSocket('ws://localhost:3010');
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('DEBUG: WebSocket connected successfully');
        setConnected(true);
        setError(null);
        
        // Join the game
        const joinMessage: ClientMessage = {
          type: 'join',
          entityId: entityId
        };
        console.log('DEBUG: Sending join message:', joinMessage);
        ws.send(JSON.stringify(joinMessage));
      };

      ws.onmessage = (event) => {
        try {
          const message: ServerMessage = JSON.parse(event.data);
          console.log(`DEBUG: Client received WebSocket message type: ${message.type}`);
          
          switch (message.type) {
            case 'gameState':
              console.log('DEBUG: Client received gameState update with entities:', Object.keys(message.data.entities || {}));
              console.log('DEBUG: Client received gameState update with events:', (message.data.recentEvents || []).length);
              setGameState(message.data);
              break;
            case 'event':
              console.log('DEBUG: Client received event:', message.data.functionCall, message.data.id);
              handleGameEvent(message.data);
              break;
            case 'error':
              console.log('DEBUG: Client received error:', message.data);
              setError(message.data.message);
              break;
            case 'characterError':
              console.log('DEBUG: Client received character error:', message.data);
              handleCharacterError(message.data);
              break;
            case 'cronjobs':
              console.log('DEBUG: Client received cronjobs:', message.data);
              setCronjobs(prevCronjobs => ({
                ...prevCronjobs,
                [message.data.characterId]: message.data.cronjobs
              }));
              break;
          }
        } catch (err) {
          console.error('DEBUG: Client error parsing message:', err);
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

  const handleCharacterError = useCallback((errorEvent: CharacterErrorEvent) => {
    setCharacterErrors(prevErrors => {
      // Add the new error to the list
      const newErrors = [...prevErrors, errorEvent];
      
      // Keep only the last 5 errors to prevent memory buildup
      return newErrors.slice(-5);
    });
  }, []);

  const dismissCharacterError = useCallback((errorId: string) => {
    setCharacterErrors(prevErrors => 
      prevErrors.filter(error => error.id !== errorId)
    );
  }, []);

  const handleGameEvent = useCallback((event: GameEvent) => {
    console.log(`DEBUG: Client handling game event: ${event.functionCall}(${event.id}) for entity ${event.parameters.entityId}`);
    setGameState(prevState => {
      if (!prevState) {
        console.log('DEBUG: No previous game state, ignoring event');
        return prevState;
      }

      const newState = { ...prevState };
      
      // Add event to recent events
      newState.recentEvents = [event, ...prevState.recentEvents.slice(0, 49)];
      console.log(`DEBUG: Added event to recent events list (total: ${newState.recentEvents.length})`);

      // Update entity state based on event
      switch (event.functionCall) {
        case 'move':
          console.log(`DEBUG: Processing move event for entity ${event.parameters.entityId} to position:`, event.parameters.to);
          // Don't immediately update position - let the animation system handle it
          // The entity's actual position will be updated by the animation in World3D
          // Once animation completes, the final position will be set correctly
          if (newState.entities[event.parameters.entityId]) {
            // Update the entity's position to the final position after a delay
            // This ensures the gameState reflects the final position even if animation is interrupted
            setTimeout(() => {
              setGameState(currentState => {
                if (currentState && currentState.entities[event.parameters.entityId]) {
                  console.log(`DEBUG: Updating entity ${event.parameters.entityId} final position after animation`);
                  return {
                    ...currentState,
                    entities: {
                      ...currentState.entities,
                      [event.parameters.entityId]: {
                        ...currentState.entities[event.parameters.entityId],
                        position: event.parameters.to
                      }
                    }
                  };
                }
                return currentState;
              });
            }, event.parameters.duration || 1000);
          }
          break;
        case 'pickup':
          console.log(`DEBUG: Processing pickup event for entity ${event.parameters.entityId}, item ${event.parameters.itemId}`);
          if (newState.entities[event.parameters.entityId]) {
            const entity = newState.entities[event.parameters.entityId];
            newState.entities[event.parameters.entityId] = {
              ...entity,
              items: [...entity.items, event.parameters.itemId]
            };
          }
          break;

        case 'drop':
          console.log(`DEBUG: Processing drop event for entity ${event.parameters.entityId}, item ${event.parameters.itemId}`);
          if (newState.entities[event.parameters.entityId]) {
            const entity = newState.entities[event.parameters.entityId];
            newState.entities[event.parameters.entityId] = {
              ...entity,
              items: entity.items.filter(item => item !== event.parameters.itemId)
            };
          }
          break;
        default:
          console.log(`DEBUG: No specific handling for event type: ${event.functionCall}`);
      }

      console.log(`DEBUG: Client state updated for event ${event.id}`);
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

  const sendCommandWithSource = useCallback((command: string, source: 'manual' | 'script') => {
    console.log(`DEBUG: Client sending command: "${command}" (source: ${source})`);
    console.log(`DEBUG: sendCommandWithSource callback values:`, {
      entityId: entityId,
      entityIdType: typeof entityId,
      wsExists: !!wsRef.current,
      wsReadyState: wsRef.current?.readyState,
      wsOpen: wsRef.current?.readyState === WebSocket.OPEN,
      gameStateExists: !!gameState,
      worldId: gameState?.worldId
    });
    
    // Double-check entityId is valid
    if (!entityId || typeof entityId !== 'string' || entityId.trim() === '') {
      console.log('DEBUG: entityId is invalid:', { entityId, type: typeof entityId });
      return;
    }
    
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.log('DEBUG: WebSocket is not ready');
      return;
    }
    
    const worldId = gameState?.worldId || 'default';
    
    // Send the command to server with source information - server will create the UserCommandEvent
    const message: ClientMessage = {
      type: 'command',
      entityId,
      worldId,
      data: { command, source }
    };
    console.log(`DEBUG: Client sending WebSocket message:`, message);
    wsRef.current.send(JSON.stringify(message));
  }, [entityId, gameState?.worldId]);

  const sendCommand = useCallback((command: string) => {
    console.log('DEBUG: sendCommand called, forwarding to sendCommandWithSource');
    sendCommandWithSource(command, 'manual');
  }, [sendCommandWithSource]);

  const sendDevCommand = useCallback((command: string, data: any = {}) => {
    console.log('useWebSocket: Sending dev command', { command, data });
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: ClientMessage = {
        type: 'devCommand',
        data: { command, ...data }
      };
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.log('useWebSocket: Cannot send dev command - WebSocket not ready');
    }
  }, []);

  const getCronjobs = useCallback((characterId: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const message: ClientMessage = {
        type: 'getCronjobs',
        data: { characterId }
      };
      wsRef.current.send(JSON.stringify(message));
      console.log(`DEBUG: Requested cronjobs for character ${characterId}`);
    } else {
      console.log('DEBUG: Cannot get cronjobs - WebSocket not ready');
    }
  }, []);

  useEffect(() => {
    console.log('DEBUG: useWebSocket useEffect triggered with entityId:', entityId);
    if (entityId) {
      console.log('DEBUG: EntityId exists, calling connect()');
      connect();
    } else {
      console.log('DEBUG: No entityId, not connecting');
    }

    return () => {
      console.log('DEBUG: useWebSocket cleanup, calling disconnect()');
      disconnect();
    };
  }, [entityId, connect, disconnect]);

  return {
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
    disconnect,
    getCronjobs
  };
}; 