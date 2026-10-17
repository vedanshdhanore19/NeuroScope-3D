import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const HolographicBrain: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  // PRIMARY 3D RENDERER: Direct Three.js WebGL (No R3F/React 19 fiber overhead)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let animId = 0;

    try {
      const width = container.clientWidth || 500;
      const height = container.clientHeight || 460;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(44, width / height, 0.1, 100);
      camera.position.set(0, 0.35, 4.2);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      container.appendChild(renderer.domElement);

      // Lights
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
      scene.add(ambientLight);

      const pointCyan = new THREE.PointLight(0x22d3ee, 2.5, 20);
      pointCyan.position.set(5, 5, 5);
      scene.add(pointCyan);

      const pointBlue = new THREE.PointLight(0x3b82f6, 1.8, 20);
      pointBlue.position.set(-5, -4, -3);
      scene.add(pointBlue);

      const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
      dirLight.position.set(0, 5, 3);
      scene.add(dirLight);

      // Main Rig Group
      const rig = new THREE.Group();
      scene.add(rig);

      // Procedural Hemisphere Geometry Generator
      const createHemisphereGeo = (isLeft: boolean) => {
        const geo = new THREE.SphereGeometry(1.28, 38, 38);
        const pos = geo.attributes.position;
        const v = new THREE.Vector3();

        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i);
          v.z *= 1.3; // AP elongation
          v.y *= 1.06; // Height
          v.x *= 0.86; // Medial flattening

          // Anatomical sulcal ripples
          const sulci = 0.065 * Math.sin(v.x * 6) * Math.sin(v.y * 6) * Math.sin(v.z * 6);
          v.addScaledVector(v.clone().normalize(), sulci);

          // Left vs Right hemisphere split
          v.x += isLeft ? -0.68 : 0.68;
          pos.setXYZ(i, v.x, v.y, v.z);
        }
        geo.computeVertexNormals();
        return geo;
      };

      const hemiMat = new THREE.MeshStandardMaterial({
        color: 0x22d3ee,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
        roughness: 0.2,
        metalness: 0.8,
      });

      const leftHemi = new THREE.Mesh(createHemisphereGeo(true), hemiMat);
      const rightHemi = new THREE.Mesh(createHemisphereGeo(false), hemiMat);
      rig.add(leftHemi);
      rig.add(rightHemi);

      // Simulated Glioblastoma Tumor Subregions in Right Temporo-Parietal
      const tumorGroup = new THREE.Group();
      tumorGroup.position.set(0.62, 0.22, 0.32);

      // 1. Whole Tumor / Infiltrative Edema (Emerald Mint)
      const edemaMat = new THREE.MeshStandardMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.35,
        roughness: 0.2,
      });
      const edemaMesh = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 24), edemaMat);
      tumorGroup.add(edemaMesh);

      // 2. Enhancing Active Core (Coral Red Pulsing)
      const coreMat = new THREE.MeshStandardMaterial({
        color: 0xef4444,
        emissive: 0xef4444,
        emissiveIntensity: 0.7,
        roughness: 0.3,
      });
      const coreMesh = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 20), coreMat);
      tumorGroup.add(coreMesh);

      // 3. Necrotic Core Center (Amber)
      const ncrMat = new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        roughness: 0.9,
      });
      const ncrMesh = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), ncrMat);
      tumorGroup.add(ncrMesh);

      rig.add(tumorGroup);

      // Scanning Laser Ring
      const laserRingGeo = new THREE.RingGeometry(0.2, 2.2, 48);
      laserRingGeo.rotateX(-Math.PI / 2);
      const laserMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.22,
      });
      const laserRing = new THREE.Mesh(laserRingGeo, laserMat);
      rig.add(laserRing);

      // Resize Handler
      const handleResize = () => {
        if (!container || !renderer) return;
        const w = container.clientWidth || 500;
        const h = container.clientHeight || 460;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
      };
      window.addEventListener('resize', handleResize);

      // Animation Loop
      let clock = new THREE.Clock();
      const animate = () => {
        animId = requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        // Continuous smooth Y-axis rotation
        rig.rotation.y = elapsedTime * 0.42;

        // Subtle floating bob
        rig.position.y = Math.sin(elapsedTime * 1.1) * 0.05;

        // Tumor pulsation
        const sEdema = 1.0 + Math.sin(elapsedTime * 2.0) * 0.06;
        edemaMesh.scale.set(sEdema, sEdema, sEdema);

        const sCore = 1.0 + Math.cos(elapsedTime * 2.6) * 0.08;
        coreMesh.scale.set(sCore, sCore, sCore);

        // Laser scan moving vertically
        laserRing.position.y = Math.sin(elapsedTime * 1.3) * 1.05;

        if (renderer) {
          renderer.render(scene, camera);
        }
      };

      animate();

      return () => {
        cancelAnimationFrame(animId);
        window.removeEventListener('resize', handleResize);
        if (renderer && renderer.domElement && container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
          renderer.dispose();
        }
      };
    } catch (err) {
      console.warn('WebGL initialization failed, falling back to 2D/3D procedural Canvas:', err);
      setWebglFailed(true);
    }
  }, []);

  // FALLBACK 3D PROCEDURAL CANVAS (Activates if WebGL context creation fails)
  useEffect(() => {
    if (!webglFailed) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 500);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 460);

    const onResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', onResize);

    const points: Array<{ x: number; y: number; z: number; hemi: number; pulse: number }> = [];
    for (let i = 0; i < 280; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2 * Math.PI;
      const phi = Math.acos(2 * v - 1);
      const hemi = Math.random() > 0.5 ? 1 : -1;
      const rx = 135 * Math.sin(phi) * Math.cos(theta) * 0.95 + hemi * 20;
      const ry = 110 * Math.sin(phi) * Math.sin(theta) * 0.85;
      const rz = 160 * Math.cos(phi);
      points.push({ x: rx, y: ry, z: rz, hemi, pulse: Math.random() * Math.PI * 2 });
    }

    let angleY = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const cx = width / 2;
      const cy = height / 2;
      const fov = 380;
      angleY += 0.008;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);

      const projected = points.map((p) => {
        p.pulse += 0.03;
        const x1 = p.x * cosY - p.z * sinY;
        const z1 = p.x * sinY + p.z * cosY;
        const y2 = p.y * Math.cos(0.15) - z1 * Math.sin(0.15);
        const z2 = p.y * Math.sin(0.15) + z1 * Math.cos(0.15);
        const depth = fov / (fov + z2 + 220);
        return { x2d: cx + x1 * depth, y2d: cy + y2 * depth, depth, pulse: p.pulse, hemi: p.hemi };
      });

      // Connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        for (let j = i + 1; j < projected.length && j < i + 10; j++) {
          const p2 = projected[j];
          const distSq = (p1.x2d - p2.x2d) ** 2 + (p1.y2d - p2.y2d) ** 2;
          if (distSq < 2200) {
            ctx.strokeStyle = `rgba(56, 189, 248, ${(1 - distSq / 2200) * 0.28 * p1.depth})`;
            ctx.beginPath();
            ctx.moveTo(p1.x2d, p1.y2d);
            ctx.lineTo(p2.x2d, p2.y2d);
            ctx.stroke();
          }
        }
      }

      // Nodes
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        const rad = Math.max(1, 2.2 * p.depth + (Math.sin(p.pulse) + 1) * 0.8);
        ctx.fillStyle = p.hemi === 1 ? 'rgba(56, 189, 248, 0.8)' : 'rgba(96, 165, 250, 0.8)';
        ctx.beginPath();
        ctx.arc(p.x2d, p.y2d, rad, 0, Math.PI * 2);
        ctx.fill();
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
    };
  }, [webglFailed]);

  return (
    <div className="relative w-full h-full min-h-[380px] select-none">
      {/* WebGL Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Fallback Canvas (renders if WebGL context failed) */}
      {webglFailed && (
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      )}

      {/* Floating Tumor Annotation Badge */}
      <div className="absolute bottom-5 right-5 pointer-events-none z-20">
        <div className="bg-slate-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-xl border border-rose-500/30 flex items-center space-x-2.5 shadow-lg">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_#f43f5e]" />
          <div>
            <p className="text-[10px] font-mono tracking-wider uppercase text-rose-400 font-semibold">
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
};

export default HolographicBrain;
