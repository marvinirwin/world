import React, { useState, useEffect } from 'react';
import { CharacterErrorEvent } from '../../../shared/types';

interface ErrorDisplayProps {
  characterErrors: CharacterErrorEvent[];
  onDismissError: (errorId: string) => void;
}

interface ErrorDisplayItem {
  id: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
  originalCommand?: string;
  errorType: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ characterErrors, onDismissError }) => {
  const [visibleErrors, setVisibleErrors] = useState<ErrorDisplayItem[]>([]);

  useEffect(() => {
    // Convert character errors to display items
    const newErrors = characterErrors.map(error => ({
      id: error.id,
      message: error.parameters.errorMessage,
      severity: error.parameters.severity,
      timestamp: new Date(error.timestamp),
      originalCommand: error.parameters.originalCommand,
      errorType: error.parameters.errorType
    }));

    setVisibleErrors(newErrors);

    // Auto-dismiss errors after some time based on severity
    newErrors.forEach(error => {
      const dismissTime = error.severity === 'low' ? 3000 : 
                         error.severity === 'medium' ? 5000 : 8000;
      
      setTimeout(() => {
        onDismissError(error.id);
      }, dismissTime);
    });
  }, [characterErrors, onDismissError]);

  const getSeverityColor = (severity: 'low' | 'medium' | 'high'): string => {
    switch (severity) {
      case 'low':
        return '#FFA726'; // Orange
      case 'medium':
        return '#FF7043'; // Deep Orange  
      case 'high':
        return '#F44336'; // Red
      default:
        return '#FF7043';
    }
  };

  const getErrorTypeIcon = (errorType: string): string => {
    switch (errorType) {
      case 'command':
        return '💬';
      case 'move':
        return '🚶';
      case 'pickup':
        return '👋';
      case 'drop':
        return '📦';
      case 'speak':
        return '🗣️';
      case 'cronjob':
        return '⏰';
      case 'event':
        return '⚙️';
      case 'system':
        return '🔧';
      default:
        return '⚠️';
    }
  };

  const handleDismiss = (errorId: string) => {
    onDismissError(errorId);
  };

  if (visibleErrors.length === 0) {
    return null;
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 2000,
      maxWidth: '600px',
      width: '90%',
      pointerEvents: 'auto'
    }}>
      {visibleErrors.map((error, index) => (
        <div
          key={error.id}
          style={{
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            border: `2px solid ${getSeverityColor(error.severity)}`,
            borderRadius: '8px',
            padding: '12px 16px',
            marginBottom: '8px',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            fontSize: '14px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
            animation: 'slideInFromTop 0.3s ease-out'
          }}
        >
          <span style={{ fontSize: '18px' }}>
            {getErrorTypeIcon(error.errorType)}
          </span>
          
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontWeight: 'bold', 
              color: getSeverityColor(error.severity),
              marginBottom: '4px'
            }}>
              {error.errorType.toUpperCase()} ERROR
            </div>
            
            <div style={{ marginBottom: '4px' }}>
              {error.message}
            </div>
            
            {error.originalCommand && (
              <div style={{ 
                fontSize: '12px', 
                color: '#aaa',
                fontStyle: 'italic'
              }}>
                Command: "{error.originalCommand}"
              </div>
            )}
          </div>
          
          <button
            onClick={() => handleDismiss(error.id)}
            style={{
              background: 'none',
              border: 'none',
              color: '#aaa',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '4px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ×
          </button>
        </div>
      ))}
      
      <style>
        {`
          @keyframes slideInFromTop {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </div>
  );
};

export default ErrorDisplay; 