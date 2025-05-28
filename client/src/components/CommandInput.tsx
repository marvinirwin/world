import React, { useState, useRef, useEffect } from 'react';
import { GameEvent } from '../../../shared/types';

interface CommandInputProps {
  onSendCommand: (instruction: string) => void;
  recentEvents: GameEvent[];
  disabled?: boolean;
}

const CommandInput: React.FC<CommandInputProps> = ({ 
  onSendCommand, 
  recentEvents, 
  disabled = false 
}) => {
  const [instruction, setInstruction] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const eventLogRef = useRef<HTMLDivElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim() && !disabled) {
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

  const formatEventMessage = (event: GameEvent): string => {
    switch (event.functionCall) {
      case 'move':
        return `${event.parameters.entityId} moved to (${event.parameters.to?.x?.toFixed(1)}, ${event.parameters.to?.y?.toFixed(1)}, ${event.parameters.to?.z?.toFixed(1)})`;
      case 'speak':
        return `${event.parameters.entityId} says: "${event.parameters.message}"`;
      case 'heard':
        return `${event.parameters.entityId} heard ${event.parameters.speakerId}: "${event.parameters.message}"`;
      case 'pickup':
        return `${event.parameters.entityId} picked up ${event.parameters.itemId}`;
      case 'drop':
        return `${event.parameters.entityId} dropped ${event.parameters.itemId}`;
      default:
        return `${event.parameters.entityId}: ${event.functionCall}`;
    }
  };

  // Auto-scroll to bottom when new events arrive
  useEffect(() => {
    if (eventLogRef.current) {
      eventLogRef.current.scrollTop = eventLogRef.current.scrollHeight;
    }
  }, [recentEvents]);

  // Focus input when component becomes visible
  useEffect(() => {
    if (isVisible && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isVisible]);

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
          fontSize: '12px',
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
        {recentEvents.length === 0 ? (
          <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontStyle: 'italic' }}>
            No events yet...
          </div>
        ) : (
          recentEvents.slice().reverse().map((event, index) => (
            <div
              key={`${event.id}-${index}`}
              style={{
                marginBottom: '5px',
                padding: '5px',
                borderLeft: event.functionCall === 'speak' ? '3px solid #FF9800' : '3px solid #2196F3',
                paddingLeft: '8px',
                opacity: Math.max(0.3, 1 - (index * 0.05))
              }}
            >
              <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '10px' }}>
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
              <br />
              {formatEventMessage(event)}
            </div>
          ))
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