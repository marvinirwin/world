import React, { useRef, useEffect, useState } from 'react';
import { Text, Box } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpeechBubbleProps {
  message: string;
  position: [number, number, number];
  duration?: number;
  onComplete?: () => void;
}

const SpeechBubble: React.FC<SpeechBubbleProps> = ({ 
  message, 
  position, 
  duration = 3000,
  onComplete 
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [opacity, setOpacity] = useState(1);
  const [scale, setScale] = useState(0);
  const startTime = useRef(Date.now());

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  useFrame(() => {
    const elapsed = Date.now() - startTime.current;
    const progress = elapsed / duration;

    if (groupRef.current) {
      // Animate in (first 200ms)
      if (progress < 0.067) {
        const scaleProgress = progress / 0.067;
        setScale(scaleProgress);
        setOpacity(1);
      }
      // Stay visible (middle period)
      else if (progress < 0.8) {
        setScale(1);
        setOpacity(1);
        // Gentle floating animation
        groupRef.current.position.y = position[1] + Math.sin(elapsed * 0.002) * 0.1;
      }
      // Fade out (last 20%)
      else {
        const fadeProgress = (progress - 0.8) / 0.2;
        setScale(1 - fadeProgress * 0.3);
        setOpacity(1 - fadeProgress);
        groupRef.current.position.y = position[1] + (fadeProgress * 0.5);
      }
    }
  });

  // Truncate long messages
  const displayMessage = message.length > 50 ? message.substring(0, 47) + '...' : message;

  return (
    <group 
      ref={groupRef} 
      position={position}
      scale={[scale, scale, scale]}
    >
      {/* Background bubble */}
      <Box args={[displayMessage.length * 0.12 + 0.5, 0.8, 0.1]} position={[0, 0, -0.05]}>
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={opacity * 0.9}
        />
      </Box>
      
      {/* Border */}
      <Box args={[displayMessage.length * 0.12 + 0.6, 0.9, 0.08]} position={[0, 0, -0.06]}>
        <meshBasicMaterial 
          color="#333333" 
          transparent 
          opacity={opacity * 0.8}
        />
      </Box>

      {/* Speech bubble tail */}
      <Box args={[0.2, 0.2, 0.05]} position={[0, -0.5, -0.05]} rotation={[0, 0, Math.PI / 4]}>
        <meshBasicMaterial 
          color="#ffffff" 
          transparent 
          opacity={opacity * 0.9}
        />
      </Box>

      {/* Text */}
      <Text
        position={[0, 0, 0]}
        fontSize={0.25}
        color="#333333"
        anchorX="center"
        anchorY="middle"
        maxWidth={displayMessage.length * 0.12}
        textAlign="center"
        material-transparent
        material-opacity={opacity}
      >
        {displayMessage}
      </Text>
    </group>
  );
};

export default SpeechBubble; 