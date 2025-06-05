import React, { useState, useEffect } from 'react';

interface LoginScreenProps {
  onLogin: (entityId: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [entityId, setEntityId] = useState('');

  useEffect(() => {
    // Load saved entity ID from localStorage
    const savedEntityId = localStorage.getItem('worldEntityId');
    if (savedEntityId) {
      setEntityId(savedEntityId);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEntityId = entityId.trim();
    console.log('DEBUG: LoginScreen handleSubmit called with entityId:', trimmedEntityId);
    
    if (trimmedEntityId) {
      console.log('DEBUG: LoginScreen calling onLogin with:', trimmedEntityId);
      onLogin(trimmedEntityId);
    } else {
      console.log('DEBUG: LoginScreen - empty entityId, not calling onLogin');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '40px',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '90%',
        textAlign: 'center'
      }}>
        <h1 style={{
          margin: '0 0 10px 0',
          fontSize: '28px',
          fontWeight: '700',
          color: '#333',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          World Simulation
        </h1>
        
        <p style={{
          margin: '0 0 30px 0',
          fontSize: '16px',
          color: '#666',
          lineHeight: '1.5'
        }}>
          Enter your unique entity ID to join the 3D world simulation. Your autonomous agent will interact with others and build relationships.
        </p>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="Enter your entity ID (e.g., alice, bob, charlie)"
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              border: '2px solid #e1e5e9',
              borderRadius: '8px',
              marginBottom: '20px',
              outline: 'none',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => e.target.style.borderColor = '#667eea'}
            onBlur={(e) => e.target.style.borderColor = '#e1e5e9'}
            autoFocus
          />
          
          <button
            type="submit"
            disabled={!entityId.trim()}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              background: entityId.trim() 
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : '#ccc',
              border: 'none',
              borderRadius: '8px',
              cursor: entityId.trim() ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
              transform: 'translateY(0)',
              boxShadow: entityId.trim() ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none'
            }}
            onMouseEnter={(e) => {
              if (entityId.trim()) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = entityId.trim() ? '0 4px 12px rgba(102, 126, 234, 0.4)' : 'none';
            }}
          >
            Join World
          </button>
        </form>

        <div style={{
          marginTop: '20px',
          fontSize: '14px',
          color: '#888',
          lineHeight: '1.4'
        }}>
          💡 Your entity ID will be saved locally. Multiple clients can use the same ID.
        </div>
      </div>
    </div>
  );
};

export default LoginScreen; 