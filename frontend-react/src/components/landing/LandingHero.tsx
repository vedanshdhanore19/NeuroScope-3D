import React from 'react';
import { HolographicBrain } from './HolographicBrain';
import { useStudyStore } from '../../store/studyStore';
import {
  Brain,
  Activity,
  Cpu,
  Layers,
  ArrowRight,
  ShieldCheck,
  FileCheck2,
  Lock
} from 'lucide-react';

export function LandingHero() {
  const { setActiveTab, health } = useStudyStore();

  const isModelReady = health?.model?.ready_for_inference ?? false;

  return (
    <div className="relative overflow-hidden pt-6 pb-16">
      {/* Background Gradient Blurs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/3 right-10 w-[450px] h-[450px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Mission, Headlines, and CTAs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Model Status Pill */}
            <div className="inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/30 text-cyan-400 text-xs font-mono">
              <span className={`w-2 h-2 rounded-full ${isModelReady ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'}`} />
              <span>
                {isModelReady
                  ? 'MONAI SegResNet (BraTS 0.5.4) Ready'
                  : 'Backend Online • Model Checkpoint Ready'}
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Precision 3D Brain MRI{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-teal-300 to-blue-500">
                Tumor Volumetrics
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
              NeuroScope-3D bridges deep learning and volumetric neuro-oncology. Process standard 
              multi-parametric BraTS sequences and Medical Segmentation Decathlon datasets with 
              dense 3D UNet/SegResNet models, generating subregion quantification and verifiable clinical reports.
            </p>

            {/* Quick Feature Badges */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="glass-panel p-3 rounded-lg border-slate-800">
                <Layers className="w-5 h-5 text-cyan-400 mb-1.5" />
                <p className="text-xs font-medium text-slate-200">Subregion Isolation</p>
                <p className="text-[11px] text-slate-400 font-mono">ET • NCR • ED</p>
              </div>

              <div className="glass-panel p-3 rounded-lg border-slate-800">
                <Activity className="w-5 h-5 text-teal-400 mb-1.5" />
                <p className="text-xs font-medium text-slate-200">Physical Metrics</p>
                <p className="text-[11px] text-slate-400 font-mono">Milliliters (mL)</p>
              </div>

              <div className="glass-panel p-3 rounded-lg border-slate-800">
                <ShieldCheck className="w-5 h-5 text-blue-400 mb-1.5" />
                <p className="text-xs font-medium text-slate-200">Validation Engine</p>
                <p className="text-[11px] text-slate-400 font-mono">Affine & Header Checks</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-4 pt-4">
              <button
                onClick={() => setActiveTab('workspace')}
                className="px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-sm transition-all shadow-glow-cyan flex items-center space-x-2 group"
              >
                <span>Launch Segmentation Workspace</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>

              <button
                onClick={() => setActiveTab('login')}
                className="px-5 py-3 rounded-lg glass-panel hover:bg-slate-800/80 text-slate-300 hover:text-white font-medium text-sm transition-colors border-slate-700/60 flex items-center space-x-2"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>NeuroScan Sign In</span>
              </button>
            </div>

            {/* Research Disclaimer Pill */}
            <div className="pt-2 text-xs text-slate-500 flex items-center space-x-2">
              <FileCheck2 className="w-4 h-4 text-amber-500/80 shrink-0" />
              <span>
                Academic Research Prototype. Not cleared by the FDA/CE for clinical diagnostic use.
              </span>
            </div>

          </div>

          {/* Right Column: Interactive 3D Holographic Brain */}
          <div className="lg:col-span-5 h-[500px] w-full rounded-2xl glass-panel border-cyan-500/20 overflow-hidden relative shadow-glow-cyan/20">
            <div className="absolute top-4 left-4 z-10">
              <div className="flex items-center space-x-2 bg-slate-900/80 px-2.5 py-1 rounded border border-slate-800 text-[11px] text-cyan-300 font-mono">
                <Brain className="w-3.5 h-3.5" />
                <span>Holographic Volume Canvas</span>
              </div>
            </div>
            <HolographicBrain interactive={true} />
          </div>

        </div>
      </div>
    </div>
  );
}
