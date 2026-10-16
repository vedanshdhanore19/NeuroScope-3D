import { useEffect, useState } from 'react';
import { useStudyStore } from './store/studyStore';
import { api } from './services/api';
import {
  Brain,
  Lock,
  RotateCcw,
} from 'lucide-react';

// Subcomponents
import { LandingHero } from './components/landing/LandingHero';
import { LoginPage } from './components/auth/LoginPage';
import { UploadWorkspace } from './components/upload/UploadWorkspace';
import { MultiPlanarViewer } from './components/viewer/MultiPlanarViewer';
import { Patient3DViewer } from './components/three/Patient3DViewer';
import { VolumetricsPanel } from './components/analysis/VolumetricsPanel';

export function App() {
  const {
    activeTab,
    setActiveTab,
    currentRunId,
    health,
    setHealth,
    resetViewer
  } = useStudyStore();

  const [workspaceMode, setWorkspaceMode] = useState<'2d' | '3d'>('2d');

  // Poll backend health status on mount
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await api.checkHealth();
        setHealth(data);
      } catch (err) {
        console.warn('Backend currently unreachable on port 8001');
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [setHealth]);

  const isModelReady = health?.model?.ready_for_inference ?? false;

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Application Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Platform Name */}
          <div
            onClick={() => setActiveTab('landing')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-glow-cyan/50 group-hover:scale-105 transition-transform">
              <Brain className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white flex items-center space-x-1.5">
                <span>NeuroScope</span>
                <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono border border-cyan-500/30">
                  3D
                </span>
              </span>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                MONAI SegResNet Engine
              </p>
            </div>
          </div>

          {/* Navigation Controls */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('landing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'landing'
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'workspace'
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Imaging Workspace
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-cyan-400 bg-cyan-950/40 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Volumetrics & Metrics
            </button>
          </nav>

          {/* Right Header Status / Auth */}
          <div className="flex items-center space-x-3">
            {/* Backend Health Badge */}
            <div
              className={`hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full text-[11px] font-mono border ${
                isModelReady
                  ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-950/30 border-amber-500/30 text-amber-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isModelReady ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
              <span>{isModelReady ? 'API: READY (8001)' : 'API: CONNECTING'}</span>
            </div>

            {/* NeuroScan Login Button */}
            <button
              onClick={() => setActiveTab('login')}
              className="px-3.5 py-1.5 rounded-lg glass-panel hover:bg-slate-800 text-xs font-medium text-slate-300 hover:text-white transition-colors border-slate-700/60 flex items-center space-x-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>NeuroScan</span>
            </button>
          </div>

        </div>
      </header>

      {/* Main App Content Viewport */}
      <main className="flex-1">
        {activeTab === 'landing' && <LandingHero />}

        {activeTab === 'login' && <LoginPage />}

        {activeTab === 'workspace' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            
            {/* Top Workspace Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                  <span>Medical Imaging & Segmentation Workspace</span>
                  {currentRunId && (
                    <span className="text-xs font-mono font-normal text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                      ID: {currentRunId.slice(0, 8)}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-400">
                  Validate multi-parametric MRI volumes, execute SegResNet deep learning inference, and inspect orthogonal slices.
                </p>
              </div>

              {currentRunId && (
                <div className="flex items-center space-x-2">
                  {/* Toggle 2D vs 3D */}
                  <div className="flex items-center bg-slate-900 p-1 rounded-lg border border-slate-800 text-xs font-medium">
                    <button
                      onClick={() => setWorkspaceMode('2d')}
                      className={`px-3 py-1 rounded transition-colors ${
                        workspaceMode === '2d'
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2D Orthogonal
                    </button>
                    <button
                      onClick={() => setWorkspaceMode('3d')}
                      className={`px-3 py-1 rounded transition-colors ${
                        workspaceMode === '3d'
                          ? 'bg-cyan-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3D Cluster Space
                    </button>
                  </div>

                  {/* Reset Study */}
                  <button
                    onClick={resetViewer}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                    title="Load New Study"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Layout: Left Column (Upload / Configuration) & Right Column (Viewer) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              <div className="lg:col-span-5 space-y-4">
                <UploadWorkspace />
              </div>

              <div className="lg:col-span-7">
                {workspaceMode === '2d' ? (
                  <MultiPlanarViewer />
                ) : (
                  <Patient3DViewer />
                )}
              </div>

            </div>

          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="pb-4 border-b border-slate-800">
              <h2 className="text-xl font-bold text-white">
                Tumor Volumetrics & Evaluation Dossier
              </h2>
              <p className="text-xs text-slate-400">
                Quantitative physical volumetrics in milliliters (mL) and comparative metrics.
              </p>
            </div>

            <VolumetricsPanel />
          </div>
        )}
      </main>

      {/* Global Academic Disclaimer Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/80 py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>
            NeuroScope-3D • Medical Imaging Research Platform • MONAI SegResNet Checkpoint (SHA-256: 860ccb3f1c...)
          </p>
          <p className="text-slate-600 text-[11px]">
            Academic research prototype only. Do not use for clinical diagnostic decisions.
          </p>
        </div>
      </footer>

    </div>
  );
}
export default App;
