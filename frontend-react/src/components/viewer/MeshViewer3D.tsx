import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { api } from '../../services/api';
import { MeshResponse } from '../../types/api';
import { Eye, EyeOff, RotateCcw } from 'lucide-react';

interface MeshViewer3DProps {
  runId: string;
  hasPrediction: boolean;
  showWT: boolean;
  showTC: boolean;
  showET: boolean;
  onToggleRegion: (region: 'WT' | 'TC' | 'ET') => void;
}

type Region = 'BRAIN' | 'WT' | 'TC' | 'ET';
const COLORS: Record<Region, number> = { BRAIN: 0xb8c7d9, WT: 0x2dd4bf, TC: 0xfbbf24, ET: 0xf43f5e };
const OPACITY: Record<Region, number> = { BRAIN: 0.16, WT: 0.30, TC: 0.62, ET: 0.86 };

export const MeshViewer3D: React.FC<MeshViewer3DProps> = ({ runId, hasPrediction, showWT, showTC, showET, onToggleRegion }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const groupRef = useRef<THREE.Group | null>(null);
  const meshRefs = useRef<Record<string, THREE.Mesh>>({});
  const [autoRotate, setAutoRotate] = useState(true);
  const [wireframe, setWireframe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opacity, setOpacity] = useState<Record<Region, number>>({ ...OPACITY });

  useEffect(() => {
    if (!containerRef.current) return;
    const scene = new THREE.Scene(); scene.background = new THREE.Color(0x070d18);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 2000); camera.position.set(0, 0, 190); cameraRef.current = camera;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1;
    containerRef.current.replaceChildren(renderer.domElement);
    scene.add(new THREE.HemisphereLight(0xe6f3ff, 0x111827, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(100, 120, 140); scene.add(key);
    const fill = new THREE.DirectionalLight(0x7dd3fc, 1); fill.position.set(-120, 20, 60); scene.add(fill);
    const rim = new THREE.DirectionalLight(0x5eead4, 1.2); rim.position.set(-80, -60, -120); scene.add(rim);
    scene.add(new THREE.GridHelper(150, 15, 0x233044, 0x111827));
    const group = new THREE.Group(); scene.add(group); groupRef.current = group;
    let raf = 0; const animate = () => { raf = requestAnimationFrame(animate); if (autoRotate) group.rotation.y += 0.007; renderer.render(scene, camera); }; animate();
    const resize = () => { if (!containerRef.current) return; const w = containerRef.current.clientWidth || 600; const h = containerRef.current.clientHeight || 500; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }; resize(); window.addEventListener('resize', resize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); group.traverse((obj) => { if (obj instanceof THREE.Mesh) { obj.geometry.dispose(); const m = obj.material; Array.isArray(m) ? m.forEach(x => x.dispose()) : m.dispose(); } }); renderer.dispose(); group.clear(); };
  }, [autoRotate]);

  useEffect(() => {
    Object.entries(meshRefs.current).forEach(([region, mesh]) => { const r = region as Region; mesh.visible = r === 'BRAIN' ? true : r === 'WT' ? showWT : r === 'TC' ? showTC : showET; const material = mesh.material as THREE.MeshStandardMaterial; material.opacity = opacity[r]; material.wireframe = wireframe; });
  }, [showWT, showTC, showET, opacity, wireframe]);

  useEffect(() => {
    if (!hasPrediction || !runId || !groupRef.current) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const regions: Region[] = ['BRAIN', 'WT', 'TC', 'ET'];
        const results = await Promise.allSettled(regions.map(r => api.getMesh(runId, r)));
        if (cancelled || !groupRef.current) return;
        results.forEach((result, i) => {
          if (result.status !== 'fulfilled' || !result.value || result.value.num_vertices === 0) return;
          const region = regions[i]; const data = result.value as MeshResponse; const geometry = new THREE.BufferGeometry();
          geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.vertices, 3)); geometry.setIndex(data.faces); geometry.computeVertexNormals();
          const material = new THREE.MeshStandardMaterial({ color: COLORS[region], transparent: true, opacity: opacity[region], roughness: 0.36, metalness: 0.04, side: THREE.DoubleSide, depthWrite: false, wireframe });
          const mesh = new THREE.Mesh(geometry, material); mesh.name = `mesh_${region}`; meshRefs.current[region]?.geometry.dispose(); groupRef.current?.add(mesh); meshRefs.current[region] = mesh;
        });
      } catch (e) { if (!cancelled) setError(e instanceof Error ? e.message : '3D surface loading failed'); }
      finally { if (!cancelled) { setLoading(false); setRefining(false); } }
    };
    load(); return () => { cancelled = true; };
  }, [runId, hasPrediction]);

  const reset = () => { cameraRef.current?.position.set(0, 0, 190); groupRef.current?.rotation.set(0, 0, 0); };
  const toggle = (region: Region) => { if (region !== 'BRAIN') onToggleRegion(region); };

  return <div className="relative w-full h-full min-h-[480px] overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-xl">
    <div ref={containerRef} className="absolute inset-0 cursor-grab" />
    <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-xs font-bold text-white backdrop-blur"><span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />3D Brain + Tumor{refining && <span className="text-[10px] text-cyan-300">Refining...</span>}</div>
      <div className="flex gap-2"><button onClick={() => setAutoRotate(v => !v)} className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-[11px] font-semibold text-slate-200">Orbit {autoRotate ? 'ON' : 'OFF'}</button><button onClick={() => setWireframe(v => !v)} className="rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-[11px] font-semibold text-slate-200">Wireframe</button><button onClick={reset} className="rounded-full border border-slate-700 bg-slate-900/90 p-1.5 text-slate-200" title="Reset"><RotateCcw className="h-4 w-4" /></button></div>
    </div>
    {loading && <div className="absolute inset-0 flex items-center justify-center bg-slate-950/35 pointer-events-none"><div className="rounded-full bg-slate-900/90 px-4 py-2 text-xs text-slate-300">Loading 3D surfaces...</div></div>}
    {error && <div className="absolute top-16 right-4 rounded-xl border border-rose-700 bg-rose-950/90 px-3 py-2 text-xs text-rose-200">{error}</div>}
    <div className="absolute bottom-4 left-4 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/90 p-2 backdrop-blur">{(['BRAIN','WT','TC','ET'] as Region[]).map(region => { const active = region === 'BRAIN' ? true : region === 'WT' ? showWT : region === 'TC' ? showTC : showET; return <button key={region} onClick={() => toggle(region)} className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${active ? 'text-white' : 'text-slate-500'}`}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: `#${COLORS[region].toString(16).padStart(6, '0')}` }} />{region}{active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}</button>; })}</div>
    <div className="absolute bottom-4 right-4 flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/90 p-2 backdrop-blur">{(['BRAIN','WT','TC','ET'] as Region[]).map(region => <label key={region} className="flex items-center gap-1 text-[9px] text-slate-400"><span>{region}</span><input type="range" min="0.05" max="0.95" step="0.05" value={opacity[region]} onChange={e => setOpacity(v => ({ ...v, [region]: Number(e.target.value) }))} /></label>)}</div>
  </div>;
};
export default MeshViewer3D;
