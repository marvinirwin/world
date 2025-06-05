import React, { useState, useRef, useEffect } from 'react';
import { GameEvent } from '../../../shared/types';

interface CommandInputProps {
  onSendCommand: (instruction: string) => void;
  recentEvents: GameEvent[];
  disabled?: boolean;
  entityId?: string;
  worldId?: string;
}

const CommandInput: React.FC<CommandInputProps> = ({ 
  onSendCommand, 
  recentEvents, 
  disabled = false,
  entityId,
  worldId
}) => {
  const [instruction, setInstruction] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [localEvents, setLocalEvents] = useState<GameEvent[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventLogRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim() && !disabled) {
      if (entityId && worldId) {
        const localUserCommandEvent: GameEvent = {
          id: `local-${Date.now()}`,
          functionCall: 'userCommand',
          parameters: {
            entityId,
            worldId,
            command: instruction.trim(),
            source: 'manual'
          },
          timestamp: new Date()
        };
        
        setLocalEvents(prev => [localUserCommandEvent, ...prev.slice(0, 4)]);
      }
      
      onSendCommand(instruction.trim());
      setInstruction('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    } else if (e.key === 'Escape') {
      setIsVisible(!isVisible);
    }
  };

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [recentEvents]);

  // Clean up local events when server confirms them
  useEffect(() => {
    setLocalEvents(prev => prev.filter(localEvent => {
      // Keep local events that haven't been confirmed by server
      const serverHasEvent = recentEvents.some(serverEvent => 
        serverEvent.functionCall === 'userCommand' &&
        serverEvent.parameters.command === localEvent.parameters.command &&
        Math.abs(new Date(serverEvent.timestamp).getTime() - localEvent.timestamp.getTime()) < 10000 // Within 10 seconds
      );
      return !serverHasEvent;
    }));
  }, [recentEvents]);

  // Focus input when component becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

  // Compress consecutive checkTasks events
  const compressEvents = (events: GameEvent[]): GameEvent[] => {
    if (events.length === 0) return events;
    
    const compressed: GameEvent[] = [];
    let consecutiveCheckTasks = 0;
    let lastCheckTasksEvent: GameEvent | null = null;
    
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      
      if (event.functionCall === 'checkTasks') {
        consecutiveCheckTasks++;
        lastCheckTasksEvent = event;
      } else {
        // If we had consecutive checkTasks events, add a compressed version
        if (consecutiveCheckTasks > 1 && lastCheckTasksEvent) {
          const compressedEvent: GameEvent = {
            ...lastCheckTasksEvent,
            id: `compressed-checktasks-${lastCheckTasksEvent.id}`,
            parameters: {
              ...lastCheckTasksEvent.parameters,
              compressedCount: consecutiveCheckTasks
            }
          };
          compressed.push(compressedEvent);
        } else if (consecutiveCheckTasks === 1 && lastCheckTasksEvent) {
          // Single checkTasks event, add it normally
          compressed.push(lastCheckTasksEvent);
        }
        
        // Reset counters and add the current non-checkTasks event
        consecutiveCheckTasks = 0;
        lastCheckTasksEvent = null;
        compressed.push(event);
      }
    }
    
    // Handle case where events end with checkTasks
    if (consecutiveCheckTasks > 1 && lastCheckTasksEvent) {
      const compressedEvent: GameEvent = {
        ...lastCheckTasksEvent,
        id: `compressed-checktasks-${lastCheckTasksEvent.id}`,
        parameters: {
          ...lastCheckTasksEvent.parameters,
          compressedCount: consecutiveCheckTasks
        }
      };
      compressed.push(compressedEvent);
    } else if (consecutiveCheckTasks === 1 && lastCheckTasksEvent) {
      compressed.push(lastCheckTasksEvent);
    }
    
    return compressed;
  };

  const formatEventMessage = (event: GameEvent): string => {
    // Handle standard game events
    if (!event.parameters) {
      return `Unknown event: ${event.functionCall}`;
    }

    // Handle compressed checkTasks events
    if (event.functionCall === 'checkTasks' && event.parameters.compressedCount) {
      return `${event.parameters.entityId} checked tasks (${event.parameters.compressedCount} times)`;
    }

    switch (event.functionCall) {
      case 'userCommand':
        const sourcePrefix = event.parameters.source === 'script' ? '[SCRIPT] ' : '[YOU] ';
        return `${sourcePrefix}${event.parameters.command}`;
      case 'move':
        const position = event.parameters.to || event.parameters.targetPosition;
        if (position) {
          return `${event.parameters.entityId} moved to (${position.x?.toFixed(1)}, ${position.y?.toFixed(1)}, ${position.z?.toFixed(1)})`;
        } else {
          return `${event.parameters.entityId} moved`;
        }
      case 'speak':
        return `${event.parameters.entityId} says: "${event.parameters.message}"`;
      case 'heard':
        return `${event.parameters.entityId} heard ${event.parameters.speakerId}: "${event.parameters.message}"`;
      case 'pickup':
        return `${event.parameters.entityId} picked up ${event.parameters.itemId}`;
      case 'drop':
        return `${event.parameters.entityId} dropped ${event.parameters.itemId}`;
      case 'checkTasks':
        return `${event.parameters.entityId} checked for interactions`;
      default:
        return `${event.parameters.entityId}: ${event.functionCall}`;
    }
  };

  // Combine server events with local events, removing duplicates
  const allEvents = [...recentEvents];
  
  // Add local events that haven't been confirmed by server yet
  localEvents.forEach(localEvent => {
    // Check if this local event has been confirmed by server
    const serverHasEvent = recentEvents.some(serverEvent => 
      serverEvent.functionCall === 'userCommand' &&
      serverEvent.parameters.command === localEvent.parameters.command &&
      Math.abs(new Date(serverEvent.timestamp).getTime() - localEvent.timestamp.getTime()) < 10000 // Within 10 seconds
    );
    
    if (!serverHasEvent) {
      allEvents.unshift(localEvent);
    }
  });

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '10px 20px',
          backgroundColor: 'rgba(33, 150, 243, 0.9)',
          color: 'white',
          border: 'none',
          borderRadius: '25px',
          fontSize: '14px',
          cursor: 'pointer',
          zIndex: 1002,
          pointerEvents: 'auto'
        }}
      >
        Show Character Interface (Press ESC)
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '600px',
      maxWidth: 'calc(100vw - 40px)',
      backgroundColor: 'rgba(0, 0, 0, 0.9)',
      borderRadius: '10px',
      padding: '15px',
      zIndex: 1002,
      pointerEvents: 'auto'
    }}>
      {/* Event Log */}
      <div
        ref={eventLogRef}
        style={{
          height: '200px',
          overflowY: 'auto',
          marginBottom: '15px',
          padding: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '5px',
          fontSize: '20px',
          color: '#fff'
        }}
      >
        <div style={{ 
          marginBottom: '10px', 
          color: '#4CAF50', 
          fontWeight: 'bold',
          borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
          paddingBottom: '5px'
        }}>
          Event Log
        </div>
        {allEvents.length === 0 ? (
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
            No events yet...
          </div>
        ) : (
          compressEvents(allEvents).slice().reverse().map((event, index) => {
            const getBorderColor = () => {
              if (event.functionCall === 'userCommand') {
                return event.parameters.source === 'script' 
                  ? '3px solid #9C27B0' // Purple for script commands
                  : '3px solid #4CAF50'; // Green for manual commands  
              }
              return event.functionCall === 'speak' ? '3px solid #FF9800' : '3px solid #2196F3';
            };

            // Make recent events brighter (higher opacity)
            const opacity = 1.0; // Set consistent opacity for all events

            return (
              <div
                key={`${event.id}-${index}`}
                style={{
                  marginBottom: '5px',
                  padding: '5px',
                  borderLeft: getBorderColor(),
                  paddingLeft: '8px',
                  opacity: opacity
                }}
              >
                <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
                <br />
                {formatEventMessage(event)}
              </div>
            );
          })
        )}
      </div>

      {/* Instruction Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '10px' }}>
        <input
          ref={inputRef}
          type="text"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Speak to your character... (e.g., 'go to the forest', 'say hello to everyone', 'pick up that sword')"
          disabled={disabled}
          style={{
            flex: 1,
            padding: '10px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            color: '#000',
            outline: 'none'
          }}
        />
        <button
          type="submit"
          disabled={disabled || !instruction.trim()}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: disabled || !instruction.trim() ? 'rgba(150, 150, 150, 0.5)' : 'rgba(76, 175, 80, 0.9)',
            color: 'white',
            cursor: disabled || !instruction.trim() ? 'not-allowed' : 'pointer'
          }}
        >
          Send
        </button>
        <button
          type="button"
          onClick={() => setIsVisible(false)}
          style={{
            padding: '10px',
            fontSize: '12px',
            border: 'none',
            borderRadius: '5px',
            backgroundColor: 'rgba(244, 67, 54, 0.7)',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Hide (ESC)
        </button>
      </form>

      <div style={{
        marginTop: '8px',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center'
      }}>
        Press ESC to toggle visibility • You're speaking to your character's mind • Examples: "go to the town square" | "tell everyone hello" | "pick up that item"
      </div>
    </div>
  );
};

export default CommandInput; 