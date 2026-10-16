import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Float, Sphere, Ring } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Procedural Brain Hemisphere Geometry & Shaders
 * Generates an anatomical dual-hemisphere wireframe rotating smoothly around the vertical (Y) axis.
 * No user dragging or wobble on the landing page hero.
 */

function HolographicHemisphere({ isLeft = true }: { isLeft?: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Distort an ellipsoid into a realistic cerebral hemisphere shape
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(1.35, 40, 40);
    const pos = geo.attributes.position;
    const v = new THREE.Vector3();

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);

      // Elongate anterior-posterior (z) and flatten medial wall (x)
      v.z *= 1.32; // AP elongation
      v.y *= 1.08; // Height
      v.x *= 0.88; // Medial flattening

      // Sulcal gyral undulations via high frequency sinusoids
      const sulci = 0.07 * Math.sin(v.x * 6) * Math.sin(v.y * 6) * Math.sin(v.z * 6);
      v.addScaledVector(v.clone().normalize(), sulci);

      // Offset left vs right hemisphere with interhemispheric fissure
      v.x += isLeft ? -0.72 : 0.72;

      pos.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return geo;
  }, [isLeft]);

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        color="#22D3EE"
        wireframe
        transparent
        opacity={0.3}
        roughness={0.3}
        metalness={0.7}
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
      // Subtle pulsation of edema/infiltrative border
      const s = 1.0 + Math.sin(time * 2.0) * 0.05;
      tumorRef.current.scale.set(s, s, s);
    }
    if (coreRef.current) {
      // Active core pulsation
      const s2 = 1.0 + Math.cos(time * 2.5) * 0.08;
      coreRef.current.scale.set(s2, s2, s2);
    }
  });

  // Simulated tumor positioned realistically in right temporal-parietal region
  return (
    <group position={[0.65, 0.25, 0.35]}>
      {/* Outer Edema (Emerald green) */}
      <mesh ref={tumorRef}>
        <sphereGeometry args={[0.34, 28, 28]} />
        <meshStandardMaterial
          color="#10B981"
          transparent
          opacity={0.35}
          roughness={0.2}
        />
      </mesh>

      {/* Enhancing Active Tumor Margin (Coral Red) */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          color="#EF4444"
          emissive="#EF4444"
          emissiveIntensity={0.7}
          roughness={0.3}
        />
      </mesh>

      {/* Necrotic Core (Amber) */}
      <Sphere args={[0.11, 16, 16]}>
        <meshStandardMaterial color="#F59E0B" roughness={0.9} />
      </Sphere>
    </group>
  );
}

function ScanningLaser() {
  const laserRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (laserRef.current) {
      // Smooth vertical scan
      laserRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.2) * 1.1;
    }
  });

  return (
    <group ref={laserRef}>
      <Ring args={[0.2, 2.3, 48]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshBasicMaterial
          color="#22D3EE"
          side={THREE.DoubleSide}
          transparent
          opacity={0.18}
        />
      </Ring>
    </group>
  );
}

function ContinuousRotatingRig() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((_state, delta) => {
    if (groupRef.current) {
      // Fixed angular speed rotation purely on Y axis (no pitch wobble)
      groupRef.current.rotation.y += delta * 0.45;
    }
  });

  return (
    <group ref={groupRef}>
      <HolographicHemisphere isLeft={true} />
      <HolographicHemisphere isLeft={false} />
      <SimulatedTumor />
      <ScanningLaser />
    </group>
  );
}

export function HolographicBrain() {
  return (
    <div className="relative w-full h-full min-h-[380px] select-none">
      <Canvas
        camera={{ position: [0, 0.4, 4.4], fov: 44 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.0} color="#22D3EE" />
        <pointLight position={[-10, -10, -5]} intensity={0.6} color="#3B82F6" />
        <directionalLight position={[0, 4, 3]} intensity={0.5} color="#FFFFFF" />

        <Float speed={1.2} rotationIntensity={0} floatIntensity={0.3}>
          <ContinuousRotatingRig />
        </Float>
      </Canvas>

      {/* Floating Tumor Annotation Badge */}
      <div className="absolute bottom-5 right-5 pointer-events-none">
        <div className="bg-surface/90 backdrop-blur-md px-3 py-2 rounded-lg border border-red-500/30 flex items-center space-x-2.5 shadow-card">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase text-red-400 font-semibold">
              Illustrative model
            </p>
            <p className="text-[11px] text-slate-300">
              Simulated Glioblastoma Subregions (ET · NCR · ED)
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
export default HolographicBrain;
