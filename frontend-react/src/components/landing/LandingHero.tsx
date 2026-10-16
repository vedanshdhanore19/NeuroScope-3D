import React, { lazy, Suspense } from 'react';
import { useStudyStore } from '../../store/studyStore';
import { InlineAuthCard } from '../auth/InlineAuthCard';
import { Button } from '../ui/Button';
import { StatusPill } from '../ui/StatusPill';
import {
  Brain,
  Activity,
  ShieldCheck,
  FileText,
  ArrowRight,
  Eye,
  Sliders,
  Info
} from 'lucide-react';

// Lazy-load 3D Holographic Brain to keep initial bundle fast and prevent layout shift
const HolographicBrain = lazy(() => import('./HolographicBrain'));

export function LandingHero() {
  const { setActiveTab, setWorkspaceMode, health } = useStudyStore();
  const isModelReady = health?.model?.ready_for_inference ?? false;

  const scrollToPreview = () => {
    const el = document.getElementById('product-preview');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="relative overflow-hidden space-y-20 pb-20">
      
      {/* Background Subtle Gradient Glows */}
      <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-20 right-10 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Hero Split Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Headlines, CTAs, and Auth Card */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Live API Health Pill */}
            <StatusPill
              status={isModelReady ? 'online' : 'connecting'}
              label={
                isModelReady
                  ? 'API: READY (8001) • MONAI SegResNet'
                  : 'API: CONNECTING • PORT 8001'
              }
            />

            {/* Main H1 */}
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              AI-Powered Tumor Detection &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                3D Medical Imaging
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
              AI-assisted tumor segmentation and interactive 3D visualization to help medical professionals analyze MRI scans. Process standard BraTS and MSD Task01 datasets with subregion volumetric quantification.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Button
                variant="primary"
                size="lg"
                onClick={() => {
                  setActiveTab('workspace');
                  setWorkspaceMode('2d');
                }}
                className="shadow-glow-cyan"
              >
                <span>Start Scan Analysis</span>
                <ArrowRight className="w-4 h-4" />
              </Button>

              <Button
                variant="secondary"
                size="lg"
                onClick={scrollToPreview}
              >
                <Eye className="w-4 h-4 text-cyan-400" />
                <span>Explore 3D Viewer</span>
              </Button>
            </div>

            {/* Inline Sign-In Card on Desktop */}
            <div className="pt-4 max-w-md">
              <InlineAuthCard />
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-slate-500 flex items-center space-x-1.5 pt-1">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Academic research prototype. Not for clinical diagnostic decisions.</span>
            </p>

          </div>

          {/* Right Column: 3D Holographic Brain (Constantly Rotating fixed Y-axis) */}
          <div className="lg:col-span-5 h-[420px] sm:h-[480px] w-full rounded-2xl bg-surface border border-surface-border overflow-hidden relative shadow-card">
            <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-surface-elevated/80 px-2.5 py-1 rounded border border-surface-border text-[11px] text-cyan-300 font-mono">
              <Brain className="w-3.5 h-3.5" />
              <span>3D Holographic Projection</span>
            </div>

            <Suspense
              fallback={
                <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
                  <p className="text-xs font-mono text-slate-400">Initializing 3D Canvas...</p>
                </div>
              }
            >
              <HolographicBrain />
            </Suspense>
          </div>

        </div>
      </section>

      {/* Capability Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-surface p-4 rounded-2xl border border-surface-border shadow-card">
          <div className="flex items-center space-x-3 p-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">AI Segmentation</p>
              <p className="text-[11px] text-slate-400">MONAI SegResNet 3D</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Eye className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">3D Visualization</p>
              <p className="text-[11px] text-slate-400">Spatial cluster models</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Tumor Volumetrics</p>
              <p className="text-[11px] text-slate-400">Physical mL quantification</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-200">Clinical Metrics</p>
              <p className="text-[11px] text-slate-400">Dice, Sensitivity & HD95</p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards (4 Features Based on Real Capabilities) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Core Clinical Imaging Capabilities
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Engineered around verifiable MONAI architectures and standardized multi-parametric MRI protocols.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-surface p-5 rounded-2xl border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
              <Brain className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">AI Tumor Detection</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Automated inference powered by MONAI SegResNet trained on the BraTS multi-parametric benchmark (T1, T1Gd, T2, FLAIR).
            </p>
          </div>

          <div className="bg-surface p-5 rounded-2xl border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Sliders className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Interactive 3D Visualization</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multi-angle spatial orbit and zoom viewer with individual subregion shell toggles and bounding volume alignment.
            </p>
          </div>

          <div className="bg-surface p-5 rounded-2xl border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <Activity className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Tumor Volumetrics</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Precise physical volume calculations in milliliters (mL) across Enhancing Tumor (ET), Necrotic Core (NCR), and Edema (ED).
            </p>
          </div>

          <div className="bg-surface p-5 rounded-2xl border border-surface-border space-y-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-white">Clinical Review & Dossier</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Export standardized clinical PDF reports and raw 3D prediction masks in compressed NIfTI format for secondary analysis.
            </p>
          </div>

        </div>
      </section>

      {/* How It Works Stepper */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white">
            Workflow Architecture
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            From raw DICOM/NIfTI sequences to quantified volumetric reports.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { step: '01', title: 'Upload', desc: 'BraTS 4-file or MSD 4D volume' },
            { step: '02', title: 'Validation', desc: 'Header, dimensions, and affine checks' },
            { step: '03', title: 'Inference', desc: 'Dense 3D MONAI SegResNet segmentation' },
            { step: '04', title: 'Inspection', desc: '2D Orthogonal slice & 3D cluster review' },
            { step: '05', title: 'Export', desc: 'PDF clinical summary & NIfTI mask download' },
          ].map((item, _idx) => (
            <div
              key={item.step}
              className="bg-surface p-4 rounded-xl border border-surface-border space-y-1.5 relative"
            >
              <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                STEP {item.step}
              </span>
              <h4 className="text-xs font-bold text-white pt-1">{item.title}</h4>
              <p className="text-[11px] text-slate-400">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Large Product Preview Window */}
      <section id="product-preview" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Workstation Experience
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              High-resolution orthogonal multiplanar viewer and synchronized volumetric quantification.
            </p>
          </div>
          <span className="text-[11px] font-mono text-amber-400 bg-amber-950/40 border border-amber-500/30 px-3 py-1 rounded-full">
            Sample visualization — illustrative data
          </span>
        </div>

        {/* Faux Window Frame */}
        <div className="rounded-2xl border border-surface-border bg-surface overflow-hidden shadow-card">
          
          {/* Window Header */}
          <div className="bg-surface-elevated px-4 py-3 border-b border-surface-border flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-500/70" />
              <span className="w-3 h-3 rounded-full bg-amber-500/70" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/70" />
              <span className="text-xs font-mono text-slate-400 ml-2">
                NeuroScope-3D Workstation • BraTS-001 Sample Case
              </span>
            </div>
            <div className="text-[11px] font-mono text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/20">
              Status: AI Analysis Complete
            </div>
          </div>

          {/* Window Body Grid */}
          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Preview: Sample Metric Cards */}
            <div className="lg:col-span-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-surface-elevated p-3.5 rounded-xl border border-surface-border">
                  <span className="text-[11px] text-slate-400 block">Whole Tumor (WT)</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">24.60 <span className="text-xs text-slate-400">mL</span></span>
                  <span className="text-[10px] text-pink-400 font-mono">Total lesion volume</span>
                </div>
                <div className="bg-surface-elevated p-3.5 rounded-xl border border-surface-border">
                  <span className="text-[11px] text-slate-400 block">Derived Diameter</span>
                  <span className="text-xl font-bold font-mono text-white mt-1 block">36.08 <span className="text-xs text-slate-400">mm</span></span>
                  <span className="text-[10px] text-slate-500 font-mono">Spherical equivalent</span>
                </div>
              </div>

              {/* Subregion breakdown */}
              <div className="bg-surface-elevated p-4 rounded-xl border border-surface-border space-y-2.5">
                <div className="text-xs font-semibold text-slate-200">Subregion Physical Volumes</div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      <span>Enhancing Tumor (ET)</span>
                    </span>
                    <span className="font-bold text-white">6.42 mL</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span>Necrotic Core (NCR)</span>
                    </span>
                    <span className="font-bold text-white">3.18 mL</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span>Peritumoral Edema (ED)</span>
                    </span>
                    <span className="font-bold text-white">15.00 mL</span>
                  </div>
                </div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setActiveTab('workspace');
                  setWorkspaceMode('2d');
                }}
                className="w-full"
              >
                <span>Launch Workstation With Your MRI</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Right Preview: Mock Orthogonal Slice Display */}
            <div className="lg:col-span-7 bg-black rounded-xl border border-surface-border aspect-video flex items-center justify-center relative overflow-hidden">
              <div className="text-center space-y-2 select-none">
                <Brain className="w-12 h-12 text-cyan-400/40 mx-auto animate-pulse" />
                <p className="text-xs font-mono text-cyan-400">Orthogonal Slice Viewer (Axial / Coronal / Sagittal)</p>
                <p className="text-[11px] text-slate-500 max-w-sm">
                  Subregion mask overlay with opacity control, crosshair alignment, and contrast-enhanced Gadolinium toggle.
                </p>
              </div>

              {/* Sample HUD Overlays */}
              <div className="absolute top-3 left-3 text-[10px] font-mono text-slate-500">
                SERIES: T1Gd • AXIS: AXIAL
              </div>
              <div className="absolute top-3 right-3 text-[10px] font-mono text-slate-500">
                VOX: 155 × 240 × 240
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Final Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-r from-surface to-surface-elevated border border-surface-border p-8 sm:p-12 text-center space-y-6 shadow-card">
          <div className="max-w-2xl mx-auto space-y-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Ready to analyze your brain MRI scans?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300">
              Upload multi-parametric NIfTI series to perform deep learning segmentation, review multiplanar slices, and export clinical dossiers.
            </p>
          </div>

          <div className="flex justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={() => {
                setActiveTab('workspace');
                setWorkspaceMode('2d');
              }}
              className="shadow-glow-cyan"
            >
              <span>Start Scan Analysis</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </section>

    </div>
  );
}
