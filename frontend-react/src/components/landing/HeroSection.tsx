import React, { lazy, Suspense } from 'react';
import { useStudyStore } from '../../store/studyStore';
import { InlineAuthCard } from '../auth/InlineAuthCard';
import {
  Brain,
  Layers,
  ArrowUpRight,
  ArrowRight,
  Play,
  BarChart2,
  Info,
} from 'lucide-react';

const HolographicBrain = lazy(() => import('./HolographicBrain'));

interface HeroSectionProps {
  onStartUpload: () => void;
  onExploreViewer: () => void;
  onRunSegmentation?: () => void;
  isSegmenting?: boolean;
  segmentElapsed?: number;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onStartUpload,
  onExploreViewer,
  onRunSegmentation,
  isSegmenting = false,
  segmentElapsed = 0,
}) => {
  const { currentRunId, studyDetails, setActiveTab } = useStudyStore();
  const hasPrediction = !!studyDetails?.has_prediction;

  return (
    <div className="space-y-14 py-6">
      {/* Top Banner Tag */}
      <div className="flex justify-center">
        <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-emerald-50 via-sky-50 to-emerald-50 border border-emerald-200 shadow-sm">
          <span className="w-5 h-5 rounded-full bg-mint text-white flex items-center justify-center text-xs font-bold">
            +
          </span>
          <span className="text-xs font-semibold text-emerald-900 tracking-wide">
            MONAI SegResNet 3D • BraTS 2021 Benchmark Protocol
          </span>
        </div>
      </div>

      {/* Main Split Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Headlines, CTAs, and Auth Card */}
        <div className="lg:col-span-7 space-y-6">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-navy leading-[1.12]">
            QUICK{' '}
            <span className="bg-gradient-to-r from-sky-600 to-mint bg-clip-text text-transparent">
              SMART
            </span>
            <br />
            NEURO MEDIC
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
            <strong>NeuroScope-3D</strong> is an advanced clinical-grade research platform for
            multi-contrast brain MRI segmentation, sub-millimeter tumor sub-region volumetrics, and
            automated diagnostic report generation.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3.5 pt-1">
            <button
              type="button"
              onClick={onStartUpload}
              className="inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-full bg-navy hover:bg-navy-dark text-white font-semibold text-sm shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
            >
              <span>{currentRunId ? 'Upload New Study' : 'Start Study Analysis'}</span>
              <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white">
                <ArrowUpRight className="w-4 h-4" />
              </span>
            </button>

            {currentRunId && (
              <button
                type="button"
                onClick={onExploreViewer}
                className="inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-full bg-mint hover:bg-mint-dark text-white font-bold text-sm shadow-mint-glow hover:shadow-lg transition-all active:scale-[0.98]"
              >
                <Layers className="w-4 h-4" />
                <span>Open 3D Viewer</span>
              </button>
            )}
          </div>

          {/* Sign-in card on the left */}
          <div className="pt-2 max-w-md">
            <InlineAuthCard />
          </div>

          <p className="text-xs text-slate-500 flex items-center gap-1.5 pt-1">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Academic research prototype. Not for clinical diagnostic decisions.</span>
          </p>
        </div>

        {/* Right Column: 3D Holographic Brain on Fixed Vertical Y-Axis */}
        <div className="lg:col-span-5 h-[460px] w-full rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative shadow-lg">
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-full border border-slate-700 text-[11px] text-cyan-light font-mono">
            <Brain className="w-3.5 h-3.5 text-cyan-light" />
            <span>Holographic 3D Spatial Projection</span>
          </div>

          <Suspense
            fallback={
              <div className="w-full h-full flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-cyan-light border-t-transparent animate-spin" />
                <p className="text-xs font-mono text-slate-400">Initializing 3D Canvas...</p>
              </div>
            }
          >
            <HolographicBrain />
          </Suspense>
        </div>
      </section>

      {/* Active Study Overview if Available */}
      {currentRunId && (
        <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-card">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-100">
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-extrabold text-navy">Current Active Study</h3>
                <span
                  className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    hasPrediction
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      : 'bg-sky-50 text-sky-800 border border-sky-200'
                  }`}
                >
                  {hasPrediction ? 'SEGMENTATION READY' : 'STUDY VALIDATED'}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-500 mt-1">Run ID: {currentRunId}</p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onExploreViewer}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-navy text-xs font-semibold shadow-sm transition-all"
              >
                <Layers className="w-4 h-4 text-cyan" />
                <span>Inspect in 3D Viewer</span>
              </button>

              {hasPrediction ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('results')}
                  className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm transition-all"
                >
                  <BarChart2 className="w-4 h-4" />
                  <span>View Quantifications</span>
                </button>
              ) : (
                onRunSegmentation && (
                  <button
                    type="button"
                    onClick={onRunSegmentation}
                    disabled={isSegmenting}
                    className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-mint hover:bg-mint-dark text-white text-xs font-bold shadow-mint-glow transition-all disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>
                      {isSegmenting ? `Segmenting (${segmentElapsed}s)...` : 'Run Segmentation'}
                    </span>
                  </button>
                )
              )}
            </div>
          </div>

          {/* Quick volumetric summary if available */}
          {studyDetails?.volumes ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5">
              <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-l-tumor-wt">
                <span className="text-xs font-semibold text-slate-500 block">WT (Whole tumor)</span>
                <span className="text-2xl font-extrabold text-navy mt-1 block">
                  {studyDetails.volumes.WT?.volume_ml.toFixed(2) ?? '0.00'}{' '}
                  <span className="text-xs text-slate-500 font-normal">mL</span>
                </span>
                <span className="text-xs text-slate-500">
                  {studyDetails.volumes.WT?.voxel_count.toLocaleString() ?? '0'} voxels
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-l-tumor-tc">
                <span className="text-xs font-semibold text-slate-500 block">TC (Tumor core)</span>
                <span className="text-2xl font-extrabold text-navy mt-1 block">
                  {studyDetails.volumes.TC?.volume_ml.toFixed(2) ?? '0.00'}{' '}
                  <span className="text-xs text-slate-500 font-normal">mL</span>
                </span>
                <span className="text-xs text-slate-500">
                  {studyDetails.volumes.TC?.voxel_count.toLocaleString() ?? '0'} voxels
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-l-tumor-et">
                <span className="text-xs font-semibold text-slate-500 block">ET (Enhancing)</span>
                <span className="text-2xl font-extrabold text-navy mt-1 block">
                  {studyDetails.volumes.ET?.volume_ml.toFixed(2) ?? '0.00'}{' '}
                  <span className="text-xs text-slate-500 font-normal">mL</span>
                </span>
                <span className="text-xs text-slate-500">
                  {studyDetails.volumes.ET?.voxel_count.toLocaleString() ?? '0'} voxels
                </span>
              </div>
            </div>
          ) : (
            <div className="pt-4 text-xs text-slate-500">
              Study validated. Run segmentation to compute physical volumes and surface meshes.
            </div>
          )}
        </section>
      )}

      {/* Clinical Metrics / Capability Strip */}
      <section className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="text-center pt-2 sm:pt-0">
            <div className="text-3xl font-extrabold text-navy tracking-tight">4 / 4</div>
            <div className="text-xs font-bold text-cyan mt-1">Multi-Modal Sequences</div>
            <div className="text-xs text-slate-500">T1, T1Gd, T2, FLAIR</div>
          </div>

          <div className="text-center pt-4 sm:pt-0 sm:pl-4">
            <div className="text-3xl font-extrabold text-navy tracking-tight">3 Sub-Regions</div>
            <div className="text-xs font-bold text-mint mt-1">WT • TC • ET</div>
            <div className="text-xs text-slate-500">BraTS 2021 Label Codes</div>
          </div>

          <div className="text-center pt-4 sm:pt-0 sm:pl-4">
            <div className="text-3xl font-extrabold text-navy tracking-tight">&lt; 0.2 mm</div>
            <div className="text-xs font-bold text-cyan mt-1">Voxel Precision</div>
            <div className="text-xs text-slate-500">Sub-millimeter spacing</div>
          </div>

          <div className="text-center pt-4 sm:pt-0 sm:pl-4">
            <div className="text-3xl font-extrabold text-navy tracking-tight">Auto PDF</div>
            <div className="text-xs font-bold text-mint mt-1">Clinical Report</div>
            <div className="text-xs text-slate-500">Instant download artifact</div>
          </div>
        </div>
      </section>

      {/* BraTS 2021 3 Target Region Cards */}
      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
            Anatomical Target Regions
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
            BraTS 2021 Multi-Region Segmentation
          </h2>
          <p className="text-sm text-slate-600">
            NeuroScope-3D isolates three nested clinical oncology compartments with discrete
            physical volumetric metrics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: WT */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800">
                  Region: WT
                </span>
                <span className="w-8 h-8 rounded-full bg-mint text-white flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-navy">WT (Whole tumor)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Encompasses the entire pathological lesion: necrotic core (NCR), peritumoral
                vasogenic edema (ED), and active enhancing tumor (ET).
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-navy">
              <div className="w-3 h-3 rounded-full bg-tumor-wt" />
              <span>Mint Overlay (Label 1 + 2 + 4)</span>
            </div>
          </div>

          {/* Card 2: TC */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800">
                  Region: TC
                </span>
                <span className="w-8 h-8 rounded-full bg-amber text-white flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-navy">TC (Tumor core)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Isolates the gross tumor mass, combining necrotic/non-enhancing core components and
                the hyper-intense angiogenic rim (excluding peritumoral edema).
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-navy">
              <div className="w-3 h-3 rounded-full bg-tumor-tc" />
              <span>Amber Overlay (Label 1 + 4)</span>
            </div>
          </div>

          {/* Card 3: ET */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800">
                  Region: ET
                </span>
                <span className="w-8 h-8 rounded-full bg-coral text-white flex items-center justify-center">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <h3 className="text-lg font-extrabold text-navy">ET (Enhancing)</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Captures biologically active tumor borders with blood-brain barrier disruption and
                gadolinium contrast hyper-accumulation on T1Gd sequences.
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-navy">
              <div className="w-3 h-3 rounded-full bg-tumor-et" />
              <span>Ruby Coral Overlay (Label 4)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5-Step Workflow Stepper */}
      <section className="space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-navy">
            Clinical Processing Pipeline
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            End-to-end medical AI pipeline from raw NIfTI sequence ingestion to clinical PDF dossiers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {[
            { step: '01', title: 'Upload', desc: 'BraTS 4-file or MSD 4D volume ingestion' },
            { step: '02', title: 'Validation', desc: 'Matrix dimensions, affine & skull-strip audit' },
            { step: '03', title: 'Inference', desc: 'Dense 3D MONAI SegResNet neural inference' },
            { step: '04', title: 'Inspection', desc: 'Synchronized 2D MPR & 3D Marching Cubes' },
            { step: '05', title: 'Export', desc: 'PDF clinical dossier & NIfTI prediction mask' },
          ].map((item) => (
            <div
              key={item.step}
              className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm space-y-2"
            >
              <span className="text-[10px] font-mono font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                STEP {item.step}
              </span>
              <h4 className="text-sm font-bold text-navy pt-1">{item.title}</h4>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Illustrative Workstation Experience Preview Window */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-navy">Workstation Experience</h2>
            <p className="text-xs sm:text-sm text-slate-500">
              High-resolution orthogonal multiplanar viewer and real-time volumetric quantification.
            </p>
          </div>
          <span className="text-[11px] font-mono text-amber-800 bg-amber-50 border border-amber-300 px-3 py-1 rounded-full">
            Sample visualization — illustrative data
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/90 bg-white overflow-hidden shadow-card">
          <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-red-400" />
              <span className="w-3 h-3 rounded-full bg-amber-400" />
              <span className="w-3 h-3 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono text-slate-600 ml-2 font-medium">
                NeuroScope-3D Workstation • Sample Case Preview
              </span>
            </div>
            <div className="text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200 font-bold">
              AI Analysis Complete
            </div>
          </div>

          <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block font-medium">WT (Whole tumor)</span>
                  <span className="text-2xl font-extrabold text-navy mt-1 block">
                    24.60 <span className="text-xs text-slate-500 font-normal">mL</span>
                  </span>
                  <span className="text-[11px] text-emerald-700 font-mono">Total lesion volume</span>
                </div>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs text-slate-500 block font-medium">Derived Diameter</span>
                  <span className="text-2xl font-extrabold text-navy mt-1 block">
                    36.08 <span className="text-xs text-slate-500 font-normal">mm</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Spherical equivalent</span>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 text-xs font-mono">
                <div className="font-sans font-bold text-navy pb-1">Subregion Physical Volumes</div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-tumor-et" />
                    <span>ET (Enhancing)</span>
                  </span>
                  <span className="font-bold text-navy">6.42 mL</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-tumor-tc" />
                    <span>Necrotic Core (NCR)</span>
                  </span>
                  <span className="font-bold text-navy">3.18 mL</span>
                </div>
                <div className="flex justify-between items-center text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-tumor-wt" />
                    <span>Peritumoral Edema (ED)</span>
                  </span>
                  <span className="font-bold text-navy">15.00 mL</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onStartUpload}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-semibold shadow-sm transition-all"
              >
                <span>Launch Workstation With Your Scans</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Faux slice display */}
            <div className="lg:col-span-7 bg-slate-950 rounded-xl border border-slate-800 aspect-video flex flex-col items-center justify-center relative overflow-hidden text-center p-6 select-none">
              <Brain className="w-14 h-14 text-cyan-light/40 animate-pulse mb-3" />
              <p className="text-xs font-mono text-cyan-light font-bold">
                Orthogonal Slice MPR (Axial / Coronal / Sagittal)
              </p>
              <p className="text-[11px] text-slate-400 max-w-sm mt-1">
                Subregion mask overlay with opacity control, crosshair alignment, and contrast-enhanced Gadolinium toggle.
              </p>
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
    </div>
  );
};
export default HeroSection;
