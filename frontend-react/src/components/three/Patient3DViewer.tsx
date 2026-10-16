import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, GizmoHelper, GizmoViewport } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { useStudyStore } from '../../store/studyStore';
import { Button } from '../ui/Button';
import {
  RotateCcw,
  Layers,
  BoxSelect,
  Info
} from 'lucide-react';

/**
 * 3D Patient Visualization Component
 * Renders patient spatial bounding box and subregion volume clusters
 * derived from verified MONAI segmentation output.
 */

function TumorCluster({
  volumes,
  options,
  opacity,
}: {
  volumes?: { WT?: number; TC?: number; ET?: number; ED?: number; NCR?: number };
  options: {
    showTumor: boolean;
    showET: boolean;
    showNCR: boolean;
    showED: boolean;
  };
  opacity: number;
}) {
  if (!options.showTumor) return null;

  // Derive cluster sphere radii from real physical mL volumes: V = 4/3 pi r^3 => r ~ cbrt(V)
  const etRadius = Math.max(0.14, Math.cbrt((volumes?.ET || 4) / 90) * 0.45);
  const ncrRadius = Math.max(0.18, Math.cbrt((volumes?.NCR || 8) / 90) * 0.55);
  const edRadius = Math.max(0.28, Math.cbrt((volumes?.ED || 20) / 90) * 0.75);

  return (
    <group position={[0.2, 0.1, -0.1]}>
      {/* Peritumoral Edema Shell (Green) */}
      {options.showED && (
        <mesh>
          <sphereGeometry args={[edRadius, 32, 32]} />
          <meshStandardMaterial
            color="#10B981"
            transparent
            opacity={opacity * 0.5}
            roughness={0.2}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Necrotic Core Shell (Amber) */}
      {options.showNCR && (
        <mesh position={[0.04, 0.04, 0.04]}>
          <sphereGeometry args={[ncrRadius, 24, 24]} />
          <meshStandardMaterial
            color="#F59E0B"
            transparent
            opacity={opacity * 0.8}
            roughness={0.6}
          />
        </mesh>
      )}

      {/* Enhancing Tumor Rim (Coral Red) */}
      {options.showET && (
        <mesh position={[-0.04, 0, -0.04]}>
          <sphereGeometry args={[etRadius, 24, 24]} />
          <meshStandardMaterial
            color="#EF4444"
            emissive="#EF4444"
            emissiveIntensity={0.6}
            transparent
            opacity={opacity}
            roughness={0.3}
          />
        </mesh>
      )}
    </group>
  );
}

function BoundingBox({
  dims,
  visible,
}: {
  dims: [number, number, number];
  visible: boolean;
}) {
  if (!visible) return null;

  const maxD = Math.max(...dims);
  const sx = (dims[0] / maxD) * 2.2;
  const sy = (dims[1] / maxD) * 2.2;
  const sz = (dims[2] / maxD) * 2.2;

  return (
    <group>
      <Box args={[sx, sy, sz]}>
        <meshBasicMaterial color="#3B82F6" wireframe transparent opacity={0.3} />
      </Box>
    </group>
  );
}

export function Patient3DViewer() {
  const {
    studyDetails,
    view3DOptions,
    setView3DOptions,
    overlayOpacity,
    setOverlayOpacity
  } = useStudyStore();

  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  if (!studyDetails) {
    return (
      <div className="bg-surface p-12 rounded-2xl border border-surface-border text-center flex flex-col items-center justify-center space-y-4">
        <BoxSelect className="w-12 h-12 text-slate-600" />
        <div>
          <h3 className="text-sm font-semibold text-slate-200">No Patient Study Active</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Validate and segment an MRI scan in the workspace to project 3D coordinate volumes.
          </p>
        </div>
      </div>
    );
  }

  const dims = studyDetails.dimensions || [155, 240, 240];

  const handleResetCamera = () => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  };

  return (
    <div className="space-y-3">
      
      {/* 3D Top Controls Bar */}
      <div className="bg-surface p-3 rounded-xl border border-surface-border flex flex-wrap items-center justify-between gap-3">
        
        {/* Toggles */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Button
            variant={view3DOptions.showBoundingBox ? 'primary' : 'secondary'}
            size="sm"
            onClick={() =>
              setView3DOptions({ showBoundingBox: !view3DOptions.showBoundingBox })
            }
          >
            <BoxSelect className="w-3.5 h-3.5" />
            <span>Grid Volume</span>
          </Button>

          {studyDetails.has_prediction && (
            <>
              <Button
                variant={view3DOptions.showTumor ? 'primary' : 'secondary'}
                size="sm"
                onClick={() =>
                  setView3DOptions({ showTumor: !view3DOptions.showTumor })
                }
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Tumor Cluster</span>
              </Button>

              <div className="h-4 w-px bg-surface-border mx-1 hidden sm:block" />

              {/* Subregion Pills */}
              <button
                type="button"
                onClick={() => setView3DOptions({ showET: !view3DOptions.showET })}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                  view3DOptions.showET
                    ? 'bg-red-950/40 border-red-500/50 text-red-400 font-bold'
                    : 'bg-surface-elevated border-surface-border text-slate-500 line-through'
                }`}
              >
                ET
              </button>

              <button
                type="button"
                onClick={() => setView3DOptions({ showNCR: !view3DOptions.showNCR })}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                  view3DOptions.showNCR
                    ? 'bg-amber-950/40 border-amber-500/50 text-amber-400 font-bold'
                    : 'bg-surface-elevated border-surface-border text-slate-500 line-through'
                }`}
              >
                NCR
              </button>

              <button
                type="button"
                onClick={() => setView3DOptions({ showED: !view3DOptions.showED })}
                className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                  view3DOptions.showED
                    ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400 font-bold'
                    : 'bg-surface-elevated border-surface-border text-slate-500 line-through'
                }`}
              >
                ED
              </button>
            </>
          )}
        </div>

        {/* Camera Reset & Opacity */}
        <div className="flex items-center space-x-3 text-xs">
          {studyDetails.has_prediction && (
            <div className="flex items-center space-x-2">
              <span className="text-[11px] text-slate-400 font-mono">Opacity</span>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={overlayOpacity}
                onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                className="w-16 accent-cyan-400 h-1"
              />
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={handleResetCamera}
            title="Reset Camera View"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </Button>

          <button
            type="button"
            onClick={() => setShowInfoPopover(!showInfoPopover)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-elevated"
            title="About this visualization"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Info Popover */}
      {showInfoPopover && (
        <div className="p-3.5 rounded-xl bg-surface-elevated border border-cyan-500/30 text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-cyan-300">About 3D Spatial Representation</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            This viewport renders patient-specific spatial coordinate bounds from the verified NIfTI header and physical subregion volume bodies ($V = N \times s_x s_y s_z / 1000$ mL) produced by MONAI SegResNet inference. Full volumetric voxel-by-voxel inspection is provided in the 2D Multiplanar View, and the exported NIfTI mask can be visualized directly in 3D Slicer or ITK-SNAP.
          </p>
        </div>
      )}

      {/* 3D Canvas Viewport */}
      <div className="relative w-full aspect-square max-h-[560px] bg-[#070A10] rounded-2xl overflow-hidden border border-surface-border shadow-card select-none">
        <Canvas
          camera={{ position: [2.5, 2.0, 3.2], fov: 45 }}
          dpr={[1, 1.75]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={1.0} color="#22D3EE" />
          <pointLight position={[-10, -10, -5]} intensity={0.7} color="#EF4444" />
          <directionalLight position={[0, 4, 3]} intensity={0.5} />

          <BoundingBox dims={dims} visible={view3DOptions.showBoundingBox} />

          {studyDetails.has_prediction && (
            <TumorCluster
              volumes={studyDetails.volumes}
              options={view3DOptions}
              opacity={overlayOpacity}
            />
          )}

          <OrbitControls
            ref={controlsRef}
            makeDefault
            enableDamping
            dampingFactor={0.08}
          />

          <GizmoHelper alignment="bottom-right" margin={[70, 70]}>
            <GizmoViewport
              axisColors={['#EF4444', '#10B981', '#3B82F6']}
              labelColor="#FFFFFF"
            />
          </GizmoHelper>
        </Canvas>

        {/* Viewport HUD */}
        <div className="absolute top-4 left-4 bg-surface/80 backdrop-blur-md p-3 rounded-lg border border-surface-border text-[11px] font-mono space-y-0.5 pointer-events-none">
          <p className="text-cyan-400 font-bold">3D SPATIAL CLUSTER VIEW</p>
          <p className="text-slate-400">VOX GRID: {dims.join(' × ')}</p>
          <p className="text-slate-400">
            TUMOR: {studyDetails.has_prediction ? 'SEGMENTED (MONAI)' : 'PENDING'}
          </p>
        </div>

        {/* Control Hints */}
        <div className="absolute bottom-4 left-4 bg-surface/80 backdrop-blur-md px-2.5 py-1 rounded text-[10px] font-mono text-slate-400 pointer-events-none border border-surface-border">
          Drag to rotate • Scroll to zoom • Right-click to pan
        </div>
      </div>

    </div>
  );
}
