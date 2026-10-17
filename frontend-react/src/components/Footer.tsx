import React from 'react';
import { useStudyStore } from '../store/studyStore';
import { Brain, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const { health, setActiveTab } = useStudyStore();
  const sha = health?.data?.model?.checkpoint_sha256
    ? health.data.model.checkpoint_sha256.slice(0, 12)
    : '860ccb3f1c21';

  return (
    <footer className="border-t border-slate-200/80 bg-white/70 py-12 text-slate-600 text-xs mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8">
        
        {/* Col 1: Brand & Purpose */}
        <div className="md:col-span-5 space-y-3">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-navy flex items-center justify-center text-white">
              <Brain className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="font-bold text-navy text-sm">NeuroScope-3D Workstation</span>
          </div>
          <p className="text-slate-500 text-xs leading-relaxed max-w-sm">
            Clinical-grade research interface for multi-contrast brain MRI preprocessing, dense 3D MONAI SegResNet segmentation, marching-cubes surface reconstruction, and volumetric reporting.
          </p>
          <div className="font-mono text-[11px] text-slate-400 pt-1">
            MONAI Model Checkpoint: <span className="text-navy font-semibold">{sha}...</span>
          </div>
        </div>

        {/* Col 2: Navigation Links */}
        <div className="md:col-span-3 space-y-2">
          <h4 className="font-bold text-navy text-xs uppercase tracking-wider mb-2">Workstation Modules</h4>
          <ul className="space-y-1.5 text-slate-500">
            <li>
              <button onClick={() => setActiveTab('dashboard')} className="hover:text-navy transition-colors">
                Platform Dashboard
              </button>
            </li>
            <li>
              <button onClick={() => setActiveTab('upload')} className="hover:text-navy transition-colors">
                New Study Ingestion
              </button>
            </li>
            <li>
              <button onClick={() => setActiveTab('viewer')} className="hover:text-navy transition-colors">
                2D/3D Orthogonal Viewer
              </button>
            </li>
            <li>
              <button onClick={() => setActiveTab('results')} className="hover:text-navy transition-colors">
                Volumetrics & Metrics
              </button>
            </li>
            <li>
              <button onClick={() => setActiveTab('reports')} className="hover:text-navy transition-colors">
                PDF Clinical Dossier Export
              </button>
            </li>
          </ul>
        </div>

        {/* Col 3: Research Compliance & Disclaimer */}
        <div className="md:col-span-4 space-y-3">
          <div className="flex items-center space-x-1.5 text-amber-800 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-amber-600" />
            <span>Research Compliance Disclaimer</span>
          </div>
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-900 leading-relaxed">
            Research and teaching prototype only. Not cleared or approved by the FDA or CE for clinical diagnostic decisions. AI-generated segmentations and measurements must be verified by a qualified medical professional.
          </div>
          <p className="text-slate-400 text-[10px]">
            NeuroScope 3D • MONAI SegResNet BraTS Protocol • v1.2.0
          </p>
        </div>

      </div>
    </footer>
  );
};
