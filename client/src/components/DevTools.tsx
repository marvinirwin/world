import React from 'react';
import DevMenu from './DevMenu';
import { isDevelopmentMode } from '../services/devEnvironmentService';

interface DevToolsProps {
  sendCommand: (command: string) => void;
}

const DevTools: React.FC<DevToolsProps> = ({ sendCommand }) => {
  // Only render in development mode
  if (!isDevelopmentMode()) {
    return null;
  }

  return (
    <>
      <DevMenu sendCommand={sendCommand} />
      {/* Future development tools can be added here */}
    </>
  );
};

export default DevTools; 