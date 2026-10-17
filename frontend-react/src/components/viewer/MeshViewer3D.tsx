import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { api } from '../../services/api';
import { MeshResponse } from '../../types/api';
import {
  Eye,
  EyeOff,
  Info,
  RotateCcw,
} from 'lucide-react';

interface MeshViewer3DProps {
  runId: string;
  hasPrediction: boolean;
  showWT: boolean;
  showTC: boolean;
  showET: boolean;
  onToggleRegion: (region: 'WT' | 'TC' | 'ET') => void;
}

export const MeshViewer3D: React.FC<MeshViewer3DProps> = ({
  runId,
  hasPrediction,
  showWT,
  showTC,
  showET,
  onToggleRegion,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshesGroupRef = useRef<THREE.Group | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const autoRotateRef = useRef<boolean>(true);
  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);
  const [meshStats, setMeshStats] = useState<Record<string, { vertices: number; faces: number }>>({});
  const [error, setError] = useState<string | null>(null);
  const [showInfoPopover, setShowInfoPopover] = useState<boolean>(false);

  // Mouse drag state
  const isDraggingRef = useRef<boolean>(false);
  const previousMousePositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth || 600;
    const height = containerRef.current.clientHeight || 500;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d); // Clinical deep dark viewport
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1500);
    camera.position.set(0, 0, 180);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    containerRef.current.replaceChildren(renderer.domElement);

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 1.2); // sky blue key
    dirLight1.position.set(100, 100, 100);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x00d690, 0.8); // mint rim
    dirLight2.position.set(-100, -50, -100);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight3.position.set(0, -100, 100);
    scene.add(dirLight3);

    // Grid Floor
    const grid = new THREE.GridHelper(160, 16, 0x1e293b, 0x0f172a);
    grid.position.y = -60;
    scene.add(grid);

    // Mesh Group
    const meshGroup = new THREE.Group();
    scene.add(meshGroup);
    meshesGroupRef.current = meshGroup;

    // Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (autoRotateRef.current && meshGroup) {
        meshGroup.rotation.y += 0.007;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Mouse Interaction
    const dom = renderer.domElement;

    const handleMouseDown = (e: MouseEvent) => {
      isDraggingRef.current = true;
      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !meshGroup) return;

      const deltaX = e.clientX - previousMousePositionRef.current.x;
      const deltaY = e.clientY - previousMousePositionRef.current.y;

      meshGroup.rotation.y += deltaX * 0.01;
      meshGroup.rotation.x += deltaY * 0.01;

      previousMousePositionRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!camera) return;
      camera.position.z = Math.min(Math.max(camera.position.z + e.deltaY * 0.12, 40), 500);
    };

    dom.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    dom.addEventListener('wheel', handleWheel, { passive: false });

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const newWidth = containerRef.current.clientWidth;
      const newHeight = containerRef.current.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      dom.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      dom.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', handleResize);

      // Clean up meshes group
      if (meshGroup) {
        meshGroup.children.forEach((child) => {
          const m = child as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (m.material) {
            if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
            else m.material.dispose();
          }
        });
        meshGroup.clear();
      }

      // Clean up grid
      if (grid.geometry) grid.geometry.dispose();
      if (grid.material) {
        if (Array.isArray(grid.material)) grid.material.forEach((mat) => mat.dispose());
        else (grid.material as THREE.Material).dispose();
      }

      renderer.dispose();
    };
  }, []);

  const showWTRef = useRef(showWT);
  const showTCRef = useRef(showTC);
  const showETRef = useRef(showET);
  const wireframeRef = useRef(wireframe);
  useEffect(() => {
    showWTRef.current = showWT;
    showTCRef.current = showTC;
    showETRef.current = showET;
    wireframeRef.current = wireframe;
  }, [showWT, showTC, showET, wireframe]);

  // Fetch Marching Cubes Meshes
  useEffect(() => {
    if (!hasPrediction || !runId) return;

    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) {
        setIsLoading(true);
        setError(null);
      }
    });

    const loadMeshes = async () => {
      try {
        const regions: Array<'WT' | 'TC' | 'ET'> = ['WT', 'TC', 'ET'];
        const results = await Promise.allSettled(regions.map((r) => api.getMesh(runId, r)));

        if (!isMounted || !meshesGroupRef.current) return;

        // Clean up previous geometries
        while (meshesGroupRef.current.children.length > 0) {
          const obj = meshesGroupRef.current.children[0] as THREE.Mesh;
          if (obj.geometry) obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else if (obj.material) {
            obj.material.dispose();
          }
          meshesGroupRef.current.remove(obj);
        }

        const stats: Record<string, { vertices: number; faces: number }> = {};

        results.forEach((res, idx) => {
          if (res.status === 'fulfilled' && res.value && res.value.num_vertices > 0) {
            const data: MeshResponse = res.value;
            const region = regions[idx];

            stats[region] = {
              vertices: data.num_vertices,
              faces: data.num_faces,
            };

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.vertices, 3));
            geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
            geometry.setIndex(data.faces);

            // Material config
            let hexColor = 0x00d690;
            let opacity = 0.35;

            if (region === 'WT') {
              hexColor = 0x00d690; // Mint green
              opacity = 0.35;
            } else if (region === 'TC') {
              hexColor = 0xf59e0b; // Amber
              opacity = 0.65;
            } else if (region === 'ET') {
              hexColor = 0xef4444; // Coral red
              opacity = 0.85;
            }

            const material = new THREE.MeshStandardMaterial({
              color: hexColor,
              roughness: 0.35,
              metalness: 0.15,
              transparent: true,
              opacity: opacity,
              wireframe: wireframeRef.current,
              side: THREE.DoubleSide,
              depthWrite: false, // Ensures inner nested tumors remain clearly visible!
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = `mesh_${region}`;
            mesh.visible = region === 'WT' ? showWTRef.current : region === 'TC' ? showTCRef.current : showETRef.current;

            meshesGroupRef.current?.add(mesh);
          }
        });

        setMeshStats(stats);
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to extract 3D surface mesh');
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadMeshes();

    return () => {
      isMounted = false;
    };
  }, [runId, hasPrediction]);

  // Update Mesh Visibility & Wireframe
  useEffect(() => {
    if (!meshesGroupRef.current) return;

    meshesGroupRef.current.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.name === 'mesh_WT') mesh.visible = showWT;
      if (mesh.name === 'mesh_TC') mesh.visible = showTC;
      if (mesh.name === 'mesh_ET') mesh.visible = showET;

      if (mesh.material && !Array.isArray(mesh.material)) {
        (mesh.material as THREE.MeshStandardMaterial).wireframe = wireframe;
      }
    });
  }, [showWT, showTC, showET, wireframe]);

  const handleResetCamera = () => {
    if (cameraRef.current && meshesGroupRef.current) {
      cameraRef.current.position.set(0, 0, 180);
      cameraRef.current.lookAt(0, 0, 0);
      meshesGroupRef.current.rotation.set(0, 0, 0);
    }
  };

  const totalFaces = Object.values(meshStats).reduce((acc, curr) => acc + curr.faces, 0);
  const totalVertices = Object.values(meshStats).reduce((acc, curr) => acc + curr.vertices, 0);

  return (
    <div className="relative w-full h-full min-h-[480px] bg-slate-950 rounded-2xl overflow-hidden flex flex-col border border-slate-800 shadow-xl">
      {/* 3D WebGL Canvas */}
      <div ref={containerRef} className="w-full h-full flex-1 cursor-grab active:cursor-grabbing" />

      {/* Top Floating Viewport Toolbar */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 shadow-md">
            <span className="w-2 h-2 rounded-full bg-mint animate-pulse" />
            <span className="text-xs font-extrabold text-white">Marching Cubes 3D Surface</span>
          </div>

          <button
            type="button"
            onClick={() => setShowInfoPopover(!showInfoPopover)}
            className="p-1.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-700 shadow-md transition-colors"
            title="About this 3D reconstruction"
            aria-label="About this 3D reconstruction"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            type="button"
            onClick={() => setAutoRotate(!autoRotate)}
            aria-label="Toggle auto rotation"
            className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${
              autoRotate
                ? 'bg-sky-500/20 border-sky-400/40 text-sky-300'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            {autoRotate ? 'Rotate: ON' : 'Rotate: OFF'}
          </button>

          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            aria-label="Toggle wireframe mode"
            className={`px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md transition-all ${
              wireframe
                ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                : 'bg-slate-900/80 border-slate-700 text-slate-400'
            }`}
          >
            Wireframe
          </button>

          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-700 transition-colors"
            title="Reset Camera Orientation"
            aria-label="Reset Camera Orientation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Surface Extraction Error Banner */}
      {error && (
        <div className="absolute top-16 right-4 z-20 max-w-xs bg-rose-950/95 border border-rose-700/80 text-rose-200 text-xs p-3 rounded-xl shadow-lg">
          <p className="font-bold text-rose-100">Surface extraction note</p>
          <p className="text-[11px] mt-0.5">{error}</p>
        </div>
      )}

      {/* "About this view" popover */}
      {showInfoPopover && (
        <div className="absolute top-16 left-4 z-20 max-w-sm bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-2xl p-4 text-xs text-slate-300 shadow-2xl space-y-2">
          <div className="flex items-center justify-between text-white font-bold pb-1 border-b border-slate-800">
            <span>Anatomical Surface Reconstruction</span>
            <button
              type="button"
              onClick={() => setShowInfoPopover(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p>
            Surfaces are reconstructed via scikit-image's <strong>Marching Cubes</strong> algorithm
            at an isosurface threshold of 0.5 directly from the predicted NIfTI array.
          </p>
          <p>
            Vertices are transformed into physical patient coordinates ($x, y, z$ in mm) and
            centered on the lesion centroid. Nested alpha layering lets you peer through Whole
            Tumor (Mint) into the Tumor Core (Amber) and Enhancing Active Tumor (Coral).
          </p>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-10">
          <div className="w-8 h-8 rounded-full border-2 border-mint border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-slate-300">
            Extracting Marching Cubes isosurfaces...
          </p>
        </div>
      )}

      {/* Bottom HUD: Stats & Region Toggles */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        {/* Region toggles */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700">
          <button
            type="button"
            onClick={() => onToggleRegion('WT')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              showWT ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' : 'text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-tumor-wt" />
            <span>WT</span>
            {showWT ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleRegion('TC')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              showTC ? 'bg-amber-950/80 text-amber-400 border border-amber-500/40' : 'text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-tumor-tc" />
            <span>TC</span>
            {showTC ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>

          <button
            type="button"
            onClick={() => onToggleRegion('ET')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
              showET ? 'bg-rose-950/80 text-rose-400 border border-rose-500/40' : 'text-slate-500'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-tumor-et" />
            <span>ET</span>
            {showET ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
        </div>

        {/* Mesh Stats HUD */}
        {totalFaces > 0 && (
          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700 text-[11px] font-mono text-slate-400 flex items-center gap-3 pointer-events-auto">
            <span>
              Faces: <strong className="text-white">{totalFaces.toLocaleString()}</strong>
            </span>
            <span>•</span>
            <span>
              Vertices: <strong className="text-white">{totalVertices.toLocaleString()}</strong>
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
export default MeshViewer3D;
