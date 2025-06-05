import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Box } from '@react-three/drei';
import { Entity, GameState, GameEvent, SpeechEvent, ItemInstance, MovementEvent, Position } from '../types';
import SpeechBubble from './SpeechBubble';
import * as THREE from 'three';

interface SpeechBubbleData {
  id: string;
  entityId: string;
  message: string;
  position: [number, number, number];
  timestamp: number;
}

interface MovementAnimation {
  entityId: string;
  from: Position;
  to: Position;
  startTime: number;
  duration: number;
  isActive: boolean;
}

interface PlayerFollowCameraProps {
  playerPosition: Position;
  playerEntityId: string;
  movementAnimations: Map<string, MovementAnimation>;
}

const PlayerFollowCamera: React.FC<PlayerFollowCameraProps> = ({ 
  playerPosition, 
  playerEntityId, 
  movementAnimations 
}) => {
  const { camera } = useThree();
  const [currentPlayerPosition, setCurrentPlayerPosition] = useState<Position>(playerPosition);

  // Update player position if there's an active movement animation
  useFrame(() => {
    const playerAnimation = movementAnimations.get(playerEntityId);
    let targetPosition = playerPosition;

    if (playerAnimation && playerAnimation.isActive) {
      const elapsed = Date.now() - playerAnimation.startTime;
      const progress = Math.min(elapsed / playerAnimation.duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      
      targetPosition = {
        x: playerAnimation.from.x + (playerAnimation.to.x - playerAnimation.from.x) * easedProgress,
        y: playerAnimation.from.y + (playerAnimation.to.y - playerAnimation.from.y) * easedProgress,
        z: playerAnimation.from.z + (playerAnimation.to.z - playerAnimation.from.z) * easedProgress
      };
    }

    setCurrentPlayerPosition(targetPosition);
  });

  return null;
};

interface PlayerTrackingControlsProps {
  playerPosition: Position;
  playerEntityId: string;
  movementAnimations: Map<string, MovementAnimation>;
}

const PlayerTrackingControls: React.FC<PlayerTrackingControlsProps> = ({
  playerPosition,
  playerEntityId,
  movementAnimations
}) => {
  const controlsRef = useRef<any>(null);

  // Update OrbitControls target to follow player
  useFrame(() => {
    if (controlsRef.current) {
      const playerAnimation = movementAnimations.get(playerEntityId);
      let targetPosition = playerPosition;

      if (playerAnimation && playerAnimation.isActive) {
        const elapsed = Date.now() - playerAnimation.startTime;
        const progress = Math.min(elapsed / playerAnimation.duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
        
        targetPosition = {
          x: playerAnimation.from.x + (playerAnimation.to.x - playerAnimation.from.x) * easedProgress,
          y: playerAnimation.from.y + (playerAnimation.to.y - playerAnimation.from.y) * easedProgress,
          z: playerAnimation.from.z + (playerAnimation.to.z - playerAnimation.from.z) * easedProgress
        };
      }

      // Smoothly update the target that the camera orbits around
      controlsRef.current.target.lerp(
        new THREE.Vector3(targetPosition.x, targetPosition.y + 1, targetPosition.z),
        0.1
      );
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false} // Disable panning to keep focus on player
      enableZoom={true}
      enableRotate={true}
      minDistance={3}
      maxDistance={25}
      target={[playerPosition.x, playerPosition.y + 1, playerPosition.z]}
    />
  );
};

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
  movementAnimation?: MovementAnimation;
}

const EntityMesh: React.FC<EntityMeshProps> = ({ entity, isPlayer, movementAnimation }) => {
  const [currentPosition, setCurrentPosition] = useState<Position>(entity.position);
  
  // Animate movement if there's an active animation
  useFrame(() => {
    if (movementAnimation && movementAnimation.isActive) {
      // Validate animation positions before using them
      if (!movementAnimation.from || !movementAnimation.to) {
        console.error('Movement animation has undefined positions:', {
          from: movementAnimation.from,
          to: movementAnimation.to,
          entityId: entity.id
        });
        // Fallback to entity position
        setCurrentPosition(entity.position);
        return;
      }
      
      // Validate position properties
      if (typeof movementAnimation.from.x !== 'number' || 
          typeof movementAnimation.from.y !== 'number' || 
          typeof movementAnimation.from.z !== 'number' ||
          typeof movementAnimation.to.x !== 'number' || 
          typeof movementAnimation.to.y !== 'number' || 
          typeof movementAnimation.to.z !== 'number') {
        console.error('Movement animation has invalid position coordinates:', {
          from: movementAnimation.from,
          to: movementAnimation.to,
          entityId: entity.id
        });
        // Fallback to entity position
        setCurrentPosition(entity.position);
        return;
      }
      
      const elapsed = Date.now() - movementAnimation.startTime;
      const progress = Math.min(elapsed / movementAnimation.duration, 1);
      
      // Use eased interpolation for smoother movement
      const easedProgress = 1 - Math.pow(1 - progress, 3); // Ease-out cubic
      
      const interpolatedPosition: Position = {
        x: movementAnimation.from.x + (movementAnimation.to.x - movementAnimation.from.x) * easedProgress,
        y: movementAnimation.from.y + (movementAnimation.to.y - movementAnimation.from.y) * easedProgress,
        z: movementAnimation.from.z + (movementAnimation.to.z - movementAnimation.from.z) * easedProgress
      };
      
      setCurrentPosition(interpolatedPosition);
    } else {
      // No animation, use entity position directly
      setCurrentPosition(entity.position);
    }
  });

  const entityPosition: [number, number, number] = [
    currentPosition.x,
    currentPosition.y,
    currentPosition.z
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
  const entities = Object.values(gameState.entities || {});
  const [speechBubbles, setSpeechBubbles] = useState<SpeechBubbleData[]>([]);
  const [movementAnimations, setMovementAnimations] = useState<Map<string, MovementAnimation>>(new Map());
  const [processedEvents, setProcessedEvents] = useState<Set<string>>(new Set());

  // Get the player entity
  const playerEntity = gameState.entities?.[playerEntityId];
  const playerPosition = playerEntity?.position || { x: 0, y: 0, z: 0 };

  // Monitor events for speech and movement
  useEffect(() => {
    const latestEvents = gameState.recentEvents.slice(0, 5); // Check last 5 events
    
    latestEvents.forEach(event => {
      // Skip if we've already processed this event
      if (processedEvents.has(event.id)) {
        return;
      }

      if (event.functionCall === 'speak') {
        const speakEvent = event as SpeechEvent;
        const entity = gameState.entities?.[speakEvent.parameters.entityId];
        
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
      } else if (event.functionCall === 'move') {
        const moveEvent = event as MovementEvent;
        if (!moveEvent.parameters.from || !moveEvent.parameters.to) {
          console.error('Move event has undefined positions:', {
            from: moveEvent.parameters.from,
            to: moveEvent.parameters.to,
            eventId: moveEvent.id,
            entityId: moveEvent.parameters.entityId
          });
          return;
        }
        
        // Validate position coordinates
        if (typeof moveEvent.parameters.from.x !== 'number' || 
            typeof moveEvent.parameters.from.y !== 'number' || 
            typeof moveEvent.parameters.from.z !== 'number' ||
            typeof moveEvent.parameters.to.x !== 'number' || 
            typeof moveEvent.parameters.to.y !== 'number' || 
            typeof moveEvent.parameters.to.z !== 'number') {
          console.error('Move event has invalid position coordinates:', {
            from: moveEvent.parameters.from,
            to: moveEvent.parameters.to,
            eventId: moveEvent.id,
            entityId: moveEvent.parameters.entityId
          });
          return;
        }
        
        const animation: MovementAnimation = {
          entityId: moveEvent.parameters.entityId,
          from: moveEvent.parameters.from,
          to: moveEvent.parameters.to,
          startTime: Date.now(),
          duration: moveEvent.parameters.duration,
          isActive: true
        };

        setMovementAnimations(prev => {
          const newAnimations = new Map(prev);
          // Replace any existing animation for this entity
          newAnimations.set(moveEvent.parameters.entityId, animation);
          return newAnimations;
        });
      }

      // Mark this event as processed
      setProcessedEvents(prev => new Set([...prev, event.id]));
    });
  }, [gameState.recentEvents, gameState.entities, processedEvents]);

  // Clean up completed animations
  useEffect(() => {
    const interval = setInterval(() => {
      setMovementAnimations(prev => {
        const newAnimations = new Map(prev);
        let hasChanges = false;

        for (const [entityId, animation] of newAnimations.entries()) {
          const elapsed = Date.now() - animation.startTime;
          if (elapsed >= animation.duration) {
            newAnimations.delete(entityId);
            hasChanges = true;
          }
        }

        return hasChanges ? newAnimations : prev;
      });

      // Clean up old processed events to prevent memory leaks
      // Keep only events that might still be in recentEvents
      setProcessedEvents(prev => {
        const currentEventIds = new Set(gameState.recentEvents.map(event => event.id));
        const filteredEvents = new Set([...prev].filter(eventId => currentEventIds.has(eventId)));
        
        // Only update if there are changes
        return filteredEvents.size !== prev.size ? filteredEvents : prev;
      });
    }, 100); // Check every 100ms for completed animations

    return () => clearInterval(interval);
  }, [gameState.recentEvents]);

  const handleSpeechBubbleComplete = (bubbleId: string) => {
    setSpeechBubbles(prev => prev.filter(bubble => bubble.id !== bubbleId));
  };

  return (
    <Canvas
      camera={{ 
        position: [playerPosition.x + 10, playerPosition.y + 8, playerPosition.z + 10], 
        fov: 60 
      }}
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
          movementAnimation={movementAnimations.get(entity.id)}
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

      <PlayerTrackingControls
        playerPosition={playerPosition}
        playerEntityId={playerEntityId}
        movementAnimations={movementAnimations}
      />
    </Canvas>
  );
};

export default World3D; 