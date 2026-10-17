import React, { useEffect, useRef, useState } from 'react';
import { useStudyStore } from '../../store/studyStore';
import { authService } from '../../services/authService';

interface LoginPageProps {
  onSuccess?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSuccess }) => {
  const { login } = useStudyStore();
  const [progress, setProgress] = useState(0);
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [loaderOpacity, setLoaderOpacity] = useState(1);
  const [mainOpacity, setMainOpacity] = useState(0);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);

  // Buffer / Loading screen animation matching user specification
  useEffect(() => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 8) + 3;
      if (currentProgress >= 100) {
        currentProgress = 100;
        clearInterval(interval);
        setProgress(100);

        // Transition out loader and reveal main layout
        setTimeout(() => {
          setLoaderOpacity(0);
          setTimeout(() => {
            setLoaderVisible(false);
            setMainOpacity(1);
          }, 800);
        }, 400);
      } else {
        setProgress(currentProgress);
      }
    }, 60);

    return () => clearInterval(interval);
  }, []);

  // Real-time 3D Rotating Holographic Brain Fallback / Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 600);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener('resize', handleResize);

    // Generate 3D point cloud resembling dual brain hemispheres
    interface Point3D {
      x: number;
      y: number;
      z: number;
      hemisphere: number; // -1 or 1
      pulse: number;
      pulseSpeed: number;
    }

    const points: Point3D[] = [];
    const totalPoints = 260;

    for (let i = 0; i < totalPoints; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      // Ellipsoidal brain shape with cortical indentations
      const hemisphere = Math.random() > 0.5 ? 1 : -1;
      const rX = 140 * Math.sin(phi) * Math.cos(theta) * 0.95 + hemisphere * 18;
      const rY = 115 * Math.sin(phi) * Math.sin(theta) * 0.85;
      const rZ = 165 * Math.cos(phi);

      // Add anatomical cortex ripples
      const ripple = Math.sin(theta * 5) * Math.cos(phi * 4) * 8;
      points.push({
        x: rX + ripple,
        y: rY + ripple,
        z: rZ + ripple,
        hemisphere,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.02 + Math.random() * 0.03,
      });
    }

    let angleY = 0;
    let angleX = 0.2;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Center of canvas
      const cx = width / 2;
      const cy = height / 2;
      const fov = 380;

      angleY += 0.007;

      const cosY = Math.cos(angleY);
      const sinY = Math.sin(angleY);
      const cosX = Math.cos(angleX);
      const sinX = Math.sin(angleX);

      // Project points
      const projected = points.map((p) => {
        p.pulse += p.pulseSpeed;

        // Rotate around Y
        let x1 = p.x * cosY - p.z * sinY;
        let z1 = p.x * sinY + p.z * cosY;

        // Rotate around X
        let y2 = p.y * cosX - z1 * sinX;
        let z2 = p.y * sinX + z1 * cosX;

        const depth = fov / (fov + z2 + 220);
        const x2d = cx + x1 * depth;
        const y2d = cy + y2 * depth;

        return { x2d, y2d, depth, z: z2, pulse: p.pulse, hemisphere: p.hemisphere };
      });

      // Sort by depth
      projected.sort((a, b) => a.z - b.z);

      // Draw neural synaptic connections
      ctx.lineWidth = 0.6;
      for (let i = 0; i < projected.length; i++) {
        const p1 = projected[i];
        if (p1.depth < 0.2) continue;

        let connections = 0;
        for (let j = i + 1; j < projected.length && connections < 3; j++) {
          const p2 = projected[j];
          const dx = p1.x2d - p2.x2d;
          const dy = p1.y2d - p2.y2d;
          const distSq = dx * dx + dy * dy;

          if (distSq < 2200) {
            const alpha = (1 - distSq / 2200) * 0.28 * p1.depth;
            ctx.strokeStyle =
              p1.hemisphere === 1
                ? `rgba(56, 189, 248, ${alpha})`
                : `rgba(96, 165, 250, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(p1.x2d, p1.y2d);
            ctx.lineTo(p2.x2d, p2.y2d);
            ctx.stroke();
            connections++;
          }
        }
      }

      // Draw glowing neural nodes
      for (let i = 0; i < projected.length; i++) {
        const p = projected[i];
        if (p.depth < 0.1) continue;

        const pulseScale = (Math.sin(p.pulse) + 1) * 0.5;
        const radius = Math.max(1, 2.2 * p.depth + pulseScale * 1.5);
        const alpha = Math.min(1, 0.4 + p.depth * 0.5 + pulseScale * 0.4);

        const glow = ctx.createRadialGradient(p.x2d, p.y2d, 0, p.x2d, p.y2d, radius * 3.5);
        glow.addColorStop(0, `rgba(96, 165, 250, ${alpha})`);
        glow.addColorStop(0.4, `rgba(56, 189, 248, ${alpha * 0.7})`);
        glow.addColorStop(1, 'rgba(14, 165, 233, 0)');

        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x2d, p.y2d, radius * 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, alpha + 0.3)})`;
        ctx.beginPath();
        ctx.arc(p.x2d, p.y2d, radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const userEmail = email.trim() || 'researcher@neuroscope.io';
    setIsSubmitting(true);

    try {
      if (email && password) {
        await authService.login(email, password);
      }
      login(userEmail);
      if (onSuccess) onSuccess();
    } catch {
      // Allow fallback login to workspace
      login(userEmail);
      if (onSuccess) onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBypass = () => {
    login('guest.researcher@neuroscope.org');
    if (onSuccess) onSuccess();
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#050b14',
        color: '#ffffff',
        overflow: 'hidden',
        position: 'relative',
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
      }}
    >
      {/* --- LOADER SCREEN --- */}
      {loaderVisible && (
        <div
          id="loader-screen"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: '#050b14',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 100,
            opacity: loaderOpacity,
            transition: 'opacity 0.8s ease-in-out',
            pointerEvents: loaderOpacity === 0 ? 'none' : 'auto',
          }}
        >
          <div
            className="brand-title"
            style={{
              fontSize: '2rem',
              fontWeight: 600,
              letterSpacing: '2px',
              marginBottom: '30px',
              background: 'linear-gradient(90deg, #60a5fa, #38bdf8, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            NeuroScope 3D
          </div>
          <div
            className="loader-container"
            style={{
              width: '280px',
              height: '4px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
              position: 'relative',
            }}
          >
            <div
              id="loader-bar"
              className="loader-bar"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #3b82f6, #06b6d4)',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.8)',
                transition: 'width 0.1s linear',
              }}
            />
          </div>
          <div
            id="loader-percentage"
            className="loader-percentage"
            style={{
              marginTop: '15px',
              fontSize: '0.85rem',
              color: '#94a3b8',
              letterSpacing: '1px',
            }}
          >
            {progress}% complete
          </div>
        </div>
      )}

      {/* --- MAIN LAYOUT (SPLIT SCREEN) --- */}
      <div
        id="main-container"
        style={{
          display: 'flex',
          width: '100%',
          height: '100vh',
          opacity: mainOpacity,
          transition: 'opacity 1s ease-in-out',
        }}
        className="flex-col md:flex-row"
      >
        {/* Left Side: Sign-In Form */}
        <div
          className="auth-section w-full md:w-1/2"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: '0 clamp(24px, 6vw, 80px)',
            background: '#050b14',
            zIndex: 10,
          }}
        >
          <div className="auth-header">
            <div className="flex items-center space-x-2 mb-4">
              <span
                style={{
                  background: 'linear-gradient(90deg, #60a5fa, #38bdf8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
                className="text-xs font-bold tracking-widest uppercase"
              >
                NeuroScope 3D Workstation
              </span>
              <span className="text-[10px] text-sky-400 bg-sky-950/60 border border-sky-800/60 px-2 py-0.5 rounded-full font-mono">
                MONAI SegResNet v1.2
              </span>
            </div>
            <h1
              style={{
                fontSize: '2.2rem',
                fontWeight: 700,
                marginBottom: '8px',
                color: '#ffffff',
              }}
            >
              Welcome Back
            </h1>
            <p
              style={{
                color: '#94a3b8',
                fontSize: '0.95rem',
                marginBottom: '35px',
              }}
            >
              Sign in to access your NeuroScope EEG workspace.
            </p>
          </div>

          {errorMessage && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#fca5a5',
                padding: '12px 14px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                marginBottom: '20px',
              }}
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: '#cbd5e1',
                  marginBottom: '8px',
                }}
              >
                Email Address
              </label>
              <input
                type="email"
                placeholder="name@institution.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#38bdf8';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              />
            </div>

            <div className="input-group" style={{ marginBottom: '20px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  color: '#cbd5e1',
                  marginBottom: '8px',
                }}
              >
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  color: '#fff',
                  fontSize: '0.95rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, background 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#38bdf8';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              />
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '14px',
                background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                marginTop: '10px',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                transition: 'opacity 0.2s, transform 0.1s',
                opacity: isSubmitting ? 0.75 : 1,
              }}
              onMouseEnter={(e) => {
                if (!isSubmitting) e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                if (!isSubmitting) e.currentTarget.style.opacity = '1';
              }}
              onMouseDown={(e) => {
                e.currentTarget.style.transform = 'scale(0.98)';
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Quick Access / Research Mode Bypass */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Research Prototype Mode</span>
            <button
              type="button"
              onClick={handleBypass}
              className="text-sky-400 hover:text-sky-300 transition-colors font-medium underline underline-offset-4"
            >
              Enter Open Workspace →
            </button>
          </div>
        </div>

        {/* Right Side: Brain Visual / Video Panel */}
        <div
          className="visual-section w-full md:w-1/2 h-[45vh] md:h-full"
          style={{
            flex: 1,
            position: 'relative',
            background: 'radial-gradient(circle at center, #0f172a 0%, #050b14 100%)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'hidden',
          }}
        >
          {/* Real-time 3D Rotating Neural Brain Hologram */}
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              opacity: videoLoaded ? 0.35 : 0.95,
              transition: 'opacity 0.6s ease',
            }}
          />

          {/* Ambient Vignette & Glowing Halo */}
          <div
            style={{
              position: 'absolute',
              width: '420px',
              height: '420px',
              borderRadius: '50%',
              background:
                'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(37, 99, 235, 0.05) 50%, transparent 75%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />

          {/* Video Player */}
          <video
            ref={videoRef}
            id="brain-video"
            autoPlay
            muted
            loop
            playsInline
            onLoadedData={() => setVideoLoaded(true)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              position: 'relative',
              zIndex: 2,
              mixBlendMode: 'screen',
              opacity: videoLoaded ? 1 : 0.05,
              transition: 'opacity 0.8s ease',
            }}
          >
            <source src="brain-visual.mp4" type="video/mp4" />
            <source src="/brain-visual.mp4" type="video/mp4" />
            Your browser does not support the video tag.
          </video>

          {/* Overlay Tag / HUD */}
          <div
            style={{
              position: 'absolute',
              bottom: '24px',
              right: '28px',
              zIndex: 10,
              background: 'rgba(5, 11, 20, 0.75)',
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '8px',
              padding: '6px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '11px',
              fontFamily: 'monospace',
              color: '#94a3b8',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#38bdf8',
                boxShadow: '0 0 8px #38bdf8',
                display: 'inline-block',
              }}
            />
            <span>3D Neural Holography Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
};
