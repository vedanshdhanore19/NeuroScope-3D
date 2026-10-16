import { useEffect } from 'react';
import { useStudyStore } from './store/studyStore';
import { api } from './services/api';
import {
  Brain,
  Lock,
  RotateCcw,
  Menu,
  X,
  Layers,
  Box,
  BarChart2,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';

import { StatusPill } from './components/ui/StatusPill';
import { Button } from './components/ui/Button';

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
    workspaceMode,
    setWorkspaceMode,
    health,
    setHealth,
    resetViewer,
    mobileMenuOpen,
    setMobileMenuOpen,
  } = useStudyStore();

  // Poll backend health status on mount & interval
  useEffect(() => {
    const fetchHealth = async () => {
      try {
        const data = await api.checkHealth();
        setHealth(data);
      } catch (_err) {
        setHealth(null);
      }
    };
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, [setHealth]);

  const isModelReady = health?.model?.ready_for_inference ?? false;
  const isServiceOnline = health?.status === 'healthy';

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans selection:bg-cyan-500/25 selection:text-cyan-200">
      
      {/* Top Application Header */}
      <header className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          
          {/* Logo & Platform Name */}
          <div
            onClick={() => setActiveTab('landing')}
            className="flex items-center space-x-3 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-subtle group-hover:scale-105 transition-transform">
              <Brain className="w-4.5 h-4.5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="text-sm font-bold tracking-tight text-white">
                  NeuroScope
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-400 font-mono border border-cyan-500/30">
                  3D
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">
                MONAI SegResNet Engine
              </p>
            </div>
          </div>

          {/* Navigation Controls (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('landing')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'landing'
                  ? 'text-cyan-300 bg-surface-elevated border border-surface-border'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => {
                setActiveTab('workspace');
                setWorkspaceMode('2d');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'workspace' && workspaceMode === '2d'
                  ? 'text-cyan-300 bg-surface-elevated border border-surface-border'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              Imaging Workspace
            </button>
            <button
              onClick={() => {
                setActiveTab('workspace');
                setWorkspaceMode('3d');
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'workspace' && workspaceMode === '3d'
                  ? 'text-cyan-300 bg-surface-elevated border border-surface-border'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              3D Viewer
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeTab === 'analytics'
                  ? 'text-cyan-300 bg-surface-elevated border border-surface-border'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              Volumetrics & Metrics
            </button>
          </nav>

          {/* Right Header Status / Auth */}
          <div className="hidden sm:flex items-center space-x-3">
            {/* Backend Health Badge */}
            <StatusPill
              status={
                isModelReady
                  ? 'online'
                  : isServiceOnline
                  ? 'warning'
                  : 'connecting'
              }
              label={
                isModelReady
                  ? 'API: READY (8001)'
                  : isServiceOnline
                  ? 'API: CONNECTED'
                  : 'API: CONNECTING'
              }
            />

            {/* NeuroScan Login Button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTab('login')}
              className="text-xs font-medium"
            >
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>NeuroScan</span>
            </Button>
          </div>

          {/* Mobile Menu Hamburger */}
          <div className="flex md:hidden items-center space-x-2">
            <StatusPill
              status={isModelReady ? 'online' : 'connecting'}
              label={isModelReady ? '8001' : '...'}
              className="px-2 py-0.5 text-[10px]"
            />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-surface-elevated border border-surface-border text-slate-300 hover:text-white"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Mobile Dropdown Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-surface-border bg-surface-elevated px-4 pt-3 pb-5 space-y-2">
            <button
              onClick={() => setActiveTab('landing')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                activeTab === 'landing' ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-300'
              }`}
            >
              <span>Overview</span>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={() => {
                setActiveTab('workspace');
                setWorkspaceMode('2d');
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                activeTab === 'workspace' && workspaceMode === '2d'
                  ? 'bg-cyan-500/15 text-cyan-300'
                  : 'text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span>Imaging Workspace (2D)</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={() => {
                setActiveTab('workspace');
                setWorkspaceMode('3d');
              }}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                activeTab === 'workspace' && workspaceMode === '3d'
                  ? 'bg-cyan-500/15 text-cyan-300'
                  : 'text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Box className="w-4 h-4 text-cyan-400" />
                <span>3D Spatial Viewer</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                activeTab === 'analytics' ? 'bg-cyan-500/15 text-cyan-300' : 'text-slate-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-cyan-400" />
                <span>Volumetrics & Metrics</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500" />
            </button>
            <div className="pt-2 border-t border-surface-border">
              <button
                onClick={() => setActiveTab('login')}
                className="w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium text-slate-300 flex items-center space-x-2"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>NeuroScan Sign In</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main App Content Viewport */}
      <main className="flex-1">
        {activeTab === 'landing' && <LandingHero />}

        {activeTab === 'login' && <LoginPage />}

        {activeTab === 'workspace' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
            
            {/* Top Workspace Header Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-surface-border">
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
                  <div className="flex items-center bg-surface-subtle p-1 rounded-lg border border-surface-border text-xs font-medium">
                    <button
                      onClick={() => setWorkspaceMode('2d')}
                      className={`px-3 py-1 rounded transition-colors ${
                        workspaceMode === '2d'
                          ? 'bg-surface-elevated text-cyan-300 font-bold border border-white/10'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2D Orthogonal
                    </button>
                    <button
                      onClick={() => setWorkspaceMode('3d')}
                      className={`px-3 py-1 rounded transition-colors ${
                        workspaceMode === '3d'
                          ? 'bg-surface-elevated text-cyan-300 font-bold border border-white/10'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      3D Cluster Space
                    </button>
                  </div>

                  {/* Reset Study */}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={resetViewer}
                    title="Load New Study"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>New Study</span>
                  </Button>
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
            <div className="pb-4 border-b border-surface-border">
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
      <footer className="border-t border-surface-border bg-surface py-6 text-center text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 space-y-1.5">
          <div className="flex items-center justify-center space-x-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold text-slate-300">
              NeuroScope-3D • Medical Imaging Research Platform
            </span>
            <span>•</span>
            <span>MONAI SegResNet Checkpoint (SHA-256: 860ccb3f1c...)</span>
          </div>
          <p className="text-slate-500 text-[11px] max-w-xl mx-auto">
            Academic research prototype only. Not cleared or approved by the FDA or CE for clinical diagnostic decisions.
          </p>
        </div>
      </footer>

    </div>
  );
}
export default App;
