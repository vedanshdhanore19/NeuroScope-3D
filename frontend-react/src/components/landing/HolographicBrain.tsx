import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Float, Sphere, Torus, Ring } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Procedural Brain Hemisphere Geometry & Shaders
 * Generates an anatomical dual-hemisphere wireframe with holographic depth,
 * a pulsing simulated tumor (clearly labeled), and a scanning laser beam.
 */

function HolographicHemisphere({ isLeft = true }: { isLeft?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Distort an ellipsoid into a realistic cerebral hemisphere shape
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.4, 48, 48);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Elongate anterior-posterior (z) and flatten medial wall (x)
      v.z *= 1.35; // AP elongation
      v.y *= 1.1;  // Height
      v.x *= 0.88; // Medial flattening

      // Sulcal gyral undulations via high frequency sinusoids
      const sulci = 0.08 * Math.sin(v.x * 6) * Math.sin(v.y * 6) * Math.sin(v.z * 6);
      v.addScaledVector(v.clone().normalize(), sulci);

      // Offset left vs right hemisphere with interhemispheric fissure
      v.x += isLeft ? -0.75 : 0.75;

      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, [isLeft]);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.25) * 0.1;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#00F0FF"
        wireframe
        transparent
        opacity={0.35}
        roughness={0.2}
        metalness={0.8}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

function SimulatedTumor() {
  const tumorRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    if (tumorRef.current) {
      // Morphing pulsation of edema/infiltrative border
      const s = 1.0 + Math.sin(time * 2.5) * 0.08;
      tumorRef.current.scale.set(s, s, s);
    }
    if (coreRef.current) {
      // High-frequency active core pulsation
      const s2 = 1.0 + Math.cos(time * 3.5) * 0.12;
      coreRef.current.scale.set(s2, s2, s2);
    }
  });

  // Simulated tumor positioned realistically in right temporal-parietal region
  return (
    <group position={[0.7, 0.3, 0.4]}>
      {/* Outer Edema (Greenish-Yellow glow) */}
      <mesh ref={tumorRef}>
        <sphereGeometry args={[0.36, 32, 32]} />
        <meshStandardMaterial
          color="#10B981"
          transparent
          opacity={0.3}
          roughness={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Enhancing Active Tumor Margin (Coral Red) */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshStandardMaterial
          color="#EF4444"
          emissive="#EF4444"
          emissiveIntensity={0.8}
          roughness={0.3}
        />
      </mesh>

      {/* Necrotic Core (Amber) */}
      <Sphere args={[0.12, 16, 16]}>
        <meshStandardMaterial color="#F59E0B" roughness={0.9} />
      </Sphere>
    </group>
  );
}

function ScanningLaser() {
  const laserRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (laserRef.current) {
      // Oscillate across superior-inferior axis
      laserRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 1.3;
    }
  });

  return (
    <group ref={laserRef}>
      {/* Laser ring plane */}
      <Ring args={[0.2, 2.5, 64]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          color="#00F0FF"
          side={THREE.DoubleSide}
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </Ring>
    </group>
  );
}

function OrbitingMRIPlanes() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Axial orbital plane */}
      <Torus args={[2.8, 0.015, 16, 100]} rotation={[Math.PI / 6, 0, 0]}>
        <meshBasicMaterial color="#3B82F6" transparent opacity={0.4} />
      </Torus>
      {/* Coronal orbital plane */}
      <Torus args={[3.2, 0.01, 16, 100]} rotation={[0, Math.PI / 4, Math.PI / 4]}>
        <meshBasicMaterial color="#00F0FF" transparent opacity={0.25} />
      </Torus>
    </group>
  );
}

export function HolographicBrain({ interactive = true }: { interactive?: boolean }) {
  return (
    <div className="relative w-full h-full min-h-[420px] select-none">
      <Canvas
        camera={{ position: [0, 1.2, 4.8], fov: 45 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.2} color="#00F0FF" />
        <pointLight position={[-10, -10, -5]} intensity={0.8} color="#3B82F6" />
        <directionalLight position={[0, 5, 2]} intensity={0.6} color="#FFFFFF" />

        <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.5}>
          <group rotation={[0.1, -0.3, 0]}>
            <HolographicHemisphere isLeft={true} />
            <HolographicHemisphere isLeft={false} />
            <SimulatedTumor />
            <ScanningLaser />
            <OrbitingMRIPlanes />
          </group>
        </Float>

        {interactive && (
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            autoRotate
            autoRotateSpeed={0.8}
            maxPolarAngle={Math.PI / 1.7}
            minPolarAngle={Math.PI / 2.6}
          />
        )}
      </Canvas>

      {/* Floating Tumor Annotation Badge */}
      <div className="absolute bottom-6 right-6 pointer-events-none">
        <div className="glass-panel px-3.5 py-2 rounded-lg border border-red-500/30 flex items-center space-x-2.5 shadow-glow-coral">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase text-red-400 font-semibold">
              Simulated Lesion Visualization
            </p>
            <p className="text-xs text-slate-300">
              Right Temporo-Parietal Glioblastoma (Morphing Demo)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
