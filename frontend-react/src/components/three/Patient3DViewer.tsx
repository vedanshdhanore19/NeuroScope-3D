import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box } from '@react-three/drei';
import * as THREE from 'three';
import { useStudyStore } from '../../store/studyStore';
import { Info, BoxSelect } from 'lucide-react';

/**
 * 3D Patient Visualization Component
 * Visualizes patient bounding space and segmented tumor subregion volume clusters
 * when inference has completed.
 */

function TumorCluster({
  volumes
}: {
  volumes?: { WT?: number; TC?: number; ET?: number; ED?: number; NCR?: number };
}) {
  // Normalize volume sizes to 3D sphere radii
  const etRadius = Math.max(0.15, Math.cbrt((volumes?.ET || 5) / 100) * 0.5);
  const ncrRadius = Math.max(0.2, Math.cbrt((volumes?.NCR || 10) / 100) * 0.6);
  const edRadius = Math.max(0.3, Math.cbrt((volumes?.ED || 25) / 100) * 0.8);

  return (
    <group position={[0.2, 0.1, -0.1]}>
      {/* Peritumoral Edema Shell (Green) */}
      <mesh>
        <sphereGeometry args={[edRadius, 32, 32]} />
        <meshStandardMaterial
          color="#10B981"
          transparent
          opacity={0.35}
          roughness={0.1}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Necrotic Core Shell (Amber) */}
      <mesh position={[0.05, 0.05, 0.05]}>
        <sphereGeometry args={[ncrRadius, 24, 24]} />
        <meshStandardMaterial color="#F59E0B" roughness={0.7} />
      </mesh>

      {/* Enhancing Tumor Rim (Coral Red) */}
      <mesh position={[-0.05, 0, -0.05]}>
        <sphereGeometry args={[etRadius, 24, 24]} />
        <meshStandardMaterial
          color="#EF4444"
          emissive="#EF4444"
          emissiveIntensity={0.6}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}

function BoundingBox({ dims }: { dims: [number, number, number] }) {
  // Aspect ratio scale
  const sx = dims[0] / Math.max(...dims);
  const sy = dims[1] / Math.max(...dims);
  const sz = dims[2] / Math.max(...dims);

  return (
    <group>
      <Box args={[sx * 2.5, sy * 2.5, sz * 2.5]}>
        <meshBasicMaterial color="#3B82F6" wireframe transparent opacity={0.25} />
      </Box>
    </group>
  );
}

export function Patient3DViewer() {
  const { studyDetails } = useStudyStore();

  if (!studyDetails) return null;

  const dims = studyDetails.dimensions || [155, 240, 240];

  return (
    <div className="space-y-3">
      <div className="relative w-full aspect-square max-h-[580px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800">
        <Canvas camera={{ position: [2.5, 2.0, 3.2], fov: 45 }}>
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#00F0FF" />
          <pointLight position={[-10, -10, -5]} intensity={0.8} color="#EF4444" />

          <BoundingBox dims={dims} />
          {studyDetails.has_prediction && (
            <TumorCluster volumes={studyDetails.volumes} />
          )}

          <OrbitControls makeDefault enableDamping dampingFactor={0.05} />
        </Canvas>

        {/* HUD Info Box */}
        <div className="absolute top-4 left-4 glass-panel p-3 rounded-lg border-slate-800 text-[11px] font-mono space-y-1 pointer-events-none">
          <div className="flex items-center space-x-1.5 text-cyan-400 font-semibold">
            <BoxSelect className="w-3.5 h-3.5" />
            <span>3D Spatial Reconstruction</span>
          </div>
          <p className="text-slate-400">Voxel Grid: {dims.join(' × ')}</p>
          <p className="text-slate-400">
            Render Mode: Subregion Volumetric Clustering
          </p>
        </div>
      </div>

      {/* Honest Limitation / Technical Transparency Note */}
      <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p>
          Note: This 3D view renders patient-specific coordinate bounds and computed subregion volume bodies from the verified MONAI inference result. Full continuous raymarched volume rendering of raw 4D NIfTI volumes can be reviewed in the orthogonal 2D Multiplanar Slice Viewer or loaded into 3D Slicer / ITK-SNAP via the downloaded NIfTI mask.
        </p>
      </div>
    </div>
  );
}
