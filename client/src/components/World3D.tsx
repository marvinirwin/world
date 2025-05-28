import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, Box } from '@react-three/drei';
import { Entity, GameState, GameEvent, SpeechEvent, ItemInstance } from '../types';
import SpeechBubble from './SpeechBubble';
import * as THREE from 'three';

interface SpeechBubbleData {
  id: string;
  entityId: string;
  message: string;
  position: [number, number, number];
  timestamp: number;
}

interface ItemMeshProps {
  itemInstance: ItemInstance;
  entityPosition: [number, number, number];
}

const ItemMesh: React.FC<ItemMeshProps> = ({ itemInstance, entityPosition }) => {
  const itemRef = useRef<THREE.Mesh>(null);
  
  // Calculate absolute position from entity position + relative position
  const absolutePosition: [number, number, number] = [
    entityPosition[0] + itemInstance.relativePosition.x,
    entityPosition[1] + itemInstance.relativePosition.y,
    entityPosition[2] + itemInstance.relativePosition.z
  ];

  // Determine item color and size based on asset type
  const { color, size } = useMemo(() => {
    const assetId = itemInstance.assetId;
    if (assetId.includes('sword')) return { color: '#C0C0C0', size: [0.1, 1.2, 0.1] as [number, number, number] };
    if (assetId.includes('shield')) return { color: '#8B4513', size: [0.8, 0.8, 0.1] as [number, number, number] };
    if (assetId.includes('helmet')) return { color: '#404040', size: [0.6, 0.6, 0.6] as [number, number, number] };
    if (assetId.includes('armor')) return { color: '#606060', size: [0.8, 1.0, 0.3] as [number, number, number] };
    if (assetId.includes('boots')) return { color: '#8B4513', size: [0.4, 0.2, 0.6] as [number, number, number] };
    if (assetId.includes('rock')) return { color: '#696969', size: [0.3, 0.3, 0.3] as [number, number, number] };
    if (assetId.includes('stick')) return { color: '#8B4513', size: [0.1, 1.0, 0.1] as [number, number, number] };
    return { color: '#FFD700', size: [0.3, 0.3, 0.3] as [number, number, number] }; // Default golden color
  }, [itemInstance.assetId]);

  return (
    <Box ref={itemRef} args={size} position={absolutePosition}>
      <meshStandardMaterial color={color} />
    </Box>
  );
};

interface BodyPartMeshProps {
  bodyPart: string;
  entityPosition: [number, number, number];
}

const BodyPartMesh: React.FC<BodyPartMeshProps> = ({ bodyPart, entityPosition }) => {
  // Define positions and sizes for different body parts
  const { position, size, color } = useMemo(() => {
    const baseX = entityPosition[0];
    const baseY = entityPosition[1];
    const baseZ = entityPosition[2];

    switch (bodyPart) {
      case 'human_head':
        return {
          position: [baseX, baseY + 1.75, baseZ] as [number, number, number],
          size: [0.6, 0.6, 0.6] as [number, number, number],
          color: '#FFDBAC'
        };
      case 'human_torso':
        return {
          position: [baseX, baseY + 0.75, baseZ] as [number, number, number],
          size: [0.8, 1.2, 0.4] as [number, number, number],
          color: '#87CEEB'
        };
      case 'human_legs':
        return {
          position: [baseX, baseY - 0.5, baseZ] as [number, number, number],
          size: [0.6, 1.0, 0.4] as [number, number, number],
          color: '#4169E1'
        };
      case 'human_arms':
        return {
          position: [baseX, baseY + 0.75, baseZ] as [number, number, number],
          size: [1.4, 0.3, 0.3] as [number, number, number],
          color: '#FFDBAC'
        };
      default:
        return {
          position: [baseX, baseY, baseZ] as [number, number, number],
          size: [0.3, 0.3, 0.3] as [number, number, number],
          color: '#888888'
        };
    }
  }, [bodyPart, entityPosition]);

  return (
    <Box args={size} position={position}>
      <meshStandardMaterial color={color} />
    </Box>
  );
};

interface EntityMeshProps {
  entity: Entity;
  isPlayer: boolean;
}

const EntityMesh: React.FC<EntityMeshProps> = ({ entity, isPlayer }) => {
  const entityPosition: [number, number, number] = [
    entity.position.x,
    entity.position.y,
    entity.position.z
  ];

  return (
    <group>
      {/* Render body parts */}
      {entity.bodyParts.map((bodyPart, index) => (
        <BodyPartMesh
          key={`${entity.id}-bodypart-${index}`}
          bodyPart={bodyPart}
          entityPosition={entityPosition}
        />
      ))}

      {/* Render item instances */}
      {entity.itemInstances.map((itemInstance) => (
        <ItemMesh
          key={itemInstance.id}
          itemInstance={itemInstance}
          entityPosition={entityPosition}
        />
      ))}

      {/* Entity name */}
      <Text
        position={[entityPosition[0], entityPosition[1] + 2.5, entityPosition[2]]}
        fontSize={0.5}
        color={isPlayer ? '#4CAF50' : '#FFFFFF'}
        anchorX="center"
        anchorY="middle"
      >
        {entity.name}
      </Text>
    </group>
  );
};

interface World3DProps {
  gameState: GameState;
  playerEntityId: string;
}

const World3D: React.FC<World3DProps> = ({ gameState, playerEntityId }) => {
  const entities = Object.values(gameState.entities);
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubbleData[]>([]);

  // Monitor events for speech
  useEffect(() => {
    const latestEvents = gameState.recentEvents.slice(0, 5); // Check last 5 events
    
    latestEvents.forEach(event => {
      if (event.functionCall === 'speak') {
        const speakEvent = event as SpeechEvent;
        const entity = gameState.entities[speakEvent.parameters.entityId];
        
        if (entity) {
          const bubbleId = `${speakEvent.id}-${Date.now()}`;
          const newBubble: SpeechBubbleData = {
            id: bubbleId,
            entityId: speakEvent.parameters.entityId,
            message: speakEvent.parameters.message,
            position: [
              entity.position.x, 
              entity.position.y + 3.5, // Above entity name
              entity.position.z
            ],
            timestamp: Date.now()
          };

          setSpeechBubbles(prev => {
            // Remove any existing bubbles for this entity
            const filtered = prev.filter(bubble => bubble.entityId !== speakEvent.parameters.entityId);
            return [...filtered, newBubble];
          });
        }
      }
    });
  }, [gameState.recentEvents, gameState.entities]);

  const handleSpeechBubbleComplete = (bubbleId: string) => {
    setSpeechBubbles(prev => prev.filter(bubble => bubble.id !== bubbleId));
  };

  return (
    <Canvas
      camera={{ position: [10, 10, 10], fov: 60 }}
      style={{ width: '100%', height: '100%' }}
    >
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} />
      
      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#333" />
      </mesh>

      {/* Grid */}
      <gridHelper args={[50, 50, '#666', '#444']} position={[0, -0.99, 0]} />

      {/* Entities */}
      {entities.map((entity) => (
        <EntityMesh
          key={entity.id}
          entity={entity}
          isPlayer={entity.id === playerEntityId}
        />
      ))}

      {/* Speech Bubbles */}
      {speechBubbles.map((bubble) => (
        <SpeechBubble
          key={bubble.id}
          message={bubble.message}
          position={bubble.position}
          duration={3000}
          onComplete={() => handleSpeechBubbleComplete(bubble.id)}
        />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={50}
      />
    </Canvas>
  );
};

export default World3D; 