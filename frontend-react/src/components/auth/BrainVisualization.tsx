import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Torus } from '@react-three/drei';
import * as THREE from 'three';

function RotatingBrainGrid() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.35;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Central brain volume representation */}
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial
          color="#00F0FF"
          wireframe
          transparent
          opacity={0.3}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Orbiting coordinate rings */}
      <Torus args={[1.8, 0.015, 16, 64]} rotation={[Math.PI / 4, 0, 0]}>
        <meshBasicMaterial color="#3B82F6" transparent opacity={0.4} />
      </Torus>

      <Torus args={[2.2, 0.01, 16, 64]} rotation={[-Math.PI / 3, Math.PI / 6, 0]}>
        <meshBasicMaterial color="#10B981" transparent opacity={0.3} />
      </Torus>

      {/* Pulsing core node */}
      <mesh position={[0.4, 0.2, 0.3]}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial color="#EF4444" />
      </mesh>
    </group>
  );
}

export function BrainVisualization() {
  return (
    <div className="relative w-full h-full min-h-[350px]">
      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[5, 5, 5]} color="#00F0FF" intensity={1} />
        <RotatingBrainGrid />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.2} />
      </Canvas>
    </div>
  );
}
