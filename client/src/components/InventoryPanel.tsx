import React from 'react';
import { ItemInstance } from '../../../shared/types';

interface InventoryPanelProps {
  itemInstances: ItemInstance[];
  playerName: string;
}

const InventoryPanel: React.FC<InventoryPanelProps> = ({ itemInstances, playerName }) => {
  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '20px',
      width: '280px',
      padding: '15px',
      backgroundColor: 'rgba(0, 0, 0, 0.85)',
      borderRadius: '8px',
      fontSize: '14px',
      maxHeight: '400px',
      overflowY: 'auto',
      pointerEvents: 'auto',
      border: '1px solid rgba(255, 255, 255, 0.2)'
    }}>
      <h3 style={{ 
        margin: '0 0 15px 0', 
        color: '#FF9800',
        textAlign: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
        paddingBottom: '8px'
      }}>
        {playerName}'s Inventory
      </h3>
      
      {itemInstances.length === 0 ? (
        <div style={{
          color: 'rgba(255, 255, 255, 0.6)',
          fontStyle: 'italic',
          textAlign: 'center',
          padding: '20px 0'
        }}>
          No items in inventory
        </div>
      ) : (
        <div>
          {itemInstances.map((item, index) => (
            <div key={item.id} style={{
              marginBottom: '10px',
              padding: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.15)'
            }}>
              <div style={{
                fontWeight: 'bold',
                color: '#4CAF50',
                marginBottom: '4px'
              }}>
                {item.assetId}
              </div>
              <div style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                {item.description}
              </div>
              <div style={{
                color: 'rgba(255, 255, 255, 0.5)',
                fontSize: '11px',
                marginTop: '4px'
              }}>
                Position: ({item.relativePosition.x.toFixed(1)}, {item.relativePosition.y.toFixed(1)}, {item.relativePosition.z.toFixed(1)})
              </div>
            </div>
          ))}
          
          <div style={{
            marginTop: '15px',
            padding: '8px',
            backgroundColor: 'rgba(33, 150, 243, 0.2)',
            borderRadius: '4px',
            textAlign: 'center',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            Total items: {itemInstances.length}
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPanel; 