import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { StudyDetails } from '../../types/api';
import {
  FileText,
  Download,
  ShieldCheck,
  Layers,
  RotateCcw,
  Copy,
  Check,
  Info,
} from 'lucide-react';

interface ReportExportProps {
  runId: string;
  hasPrediction: boolean;
  onStartNewStudy: () => void;
  onExploreViewer: () => void;
}

export const ReportExport: React.FC<ReportExportProps> = ({
  runId,
  hasPrediction,
  onStartNewStudy,
  onExploreViewer,
}) => {
  const [studyStatus, setStudyStatus] = useState<StudyDetails | null>(null);
  const [copiedHash, setCopiedHash] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    api.getStudy(runId)
      .then((data) => {
        if (isMounted) setStudyStatus(data);
      })
      .catch((err) => {
        console.error('Error fetching study status:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [runId]);

  const pdfUrl = api.getReportDownloadUrl(runId);
  const predictionUrl = api.getPredictionDownloadUrl(runId);

  const handleCopyHash = () => {
    if (studyStatus?.sha256_hash) {
      navigator.clipboard.writeText(studyStatus.sha256_hash);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  return (
    <div className="space-y-8 py-6 max-w-5xl mx-auto">
      {/* Section Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
          Phase 4: Artifact & Report Export
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Diagnostic Reports & Research Artifacts
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Export standardized clinical documentation, volumetric breakdowns, and compressed 3D
          NIfTI segmentation masks compatible with 3D Slicer, ITK-SNAP, and Mango.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* PDF Clinical Report Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-cyan flex items-center justify-center">
              <FileText className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-navy">Standard PDF Clinical Report</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Includes study audit provenance, cryptographic SHA-256 fingerprint, physical
              sub-region volume breakdown (WT, TC, ET in mL and voxel counts), comparative Dice
              metrics (if expert mask provided), and regulatory disclaimers.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Format:</span>
                <strong className="text-navy">Portable Document Format (.pdf)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Engine:</span>
                <strong className="text-navy">ReportLab Medical Template</strong>
              </div>
            </div>
          </div>

          <div className="pt-6">
            {hasPrediction ? (
              <a
                href={pdfUrl}
                download="NeuroScope_Report.pdf"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-bold shadow-md transition-all text-center"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF Clinical Report</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-3 rounded-full bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed border border-slate-200"
              >
                Report generated after segmentation
              </button>
            )}
          </div>
        </div>

        {/* 3D Prediction NIfTI Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card flex flex-col justify-between">
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-mint flex items-center justify-center">
              <Layers className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-extrabold text-navy">Predicted Segmentation Mask (NIfTI)</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              GZIP-compressed volumetric label map (<code>prediction.nii.gz</code>) preserving the
              reference T1 affine orientation matrix, voxel dimensions, and standard BraTS 2021
              component codes (1=NCR, 2=ED, 4=ET). Compatible with 3D Slicer, ITK-SNAP, and Mango.
            </p>

            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Format:</span>
                <strong className="text-navy">Compressed NIfTI (.nii.gz)</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Compatible Software:</span>
                <strong className="text-navy">3D Slicer, ITK-SNAP, Mango</strong>
              </div>
            </div>
          </div>

          <div className="pt-6">
            {hasPrediction ? (
              <a
                href={predictionUrl}
                download="prediction.nii.gz"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-mint hover:bg-mint-dark text-white text-xs font-bold shadow-mint-glow transition-all text-center"
              >
                <Download className="w-4 h-4" />
                <span>Download Prediction Mask (.nii.gz)</span>
              </a>
            ) : (
              <button
                type="button"
                disabled
                className="w-full py-3 rounded-full bg-slate-100 text-slate-400 text-xs font-bold cursor-not-allowed border border-slate-200"
              >
                Mask generated after segmentation
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Provenance Audit Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-3">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          <h4 className="text-sm font-bold text-navy">Study Provenance & Audit Trail</h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-slate-400 block font-semibold">Active Run ID</span>
            <span className="font-mono text-navy font-bold">{runId}</span>
          </div>

          <div>
            <span className="text-slate-400 block font-semibold">Dataset Profile</span>
            <span className="font-mono text-navy font-bold uppercase">
              {studyStatus?.dataset_profile || 'BraTS'}
            </span>
          </div>

          <div className="sm:col-span-2">
            <span className="text-slate-400 block font-semibold">Cryptographic SHA-256 Hash</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 flex-1 truncate">
                {studyStatus?.sha256_hash || 'Loading hash...'}
              </span>
              <button
                type="button"
                onClick={handleCopyHash}
                disabled={!studyStatus?.sha256_hash}
                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-navy font-semibold flex items-center gap-1.5 text-xs transition-colors shrink-0"
              >
                {copiedHash ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Software Compatibility Tip */}
      <div className="bg-sky-50/60 border border-sky-200 rounded-2xl p-4 flex items-center gap-3 text-xs text-sky-900">
        <Info className="w-4 h-4 text-cyan shrink-0" />
        <div>
          <strong>Viewing tip:</strong> Overlay <code>prediction.nii.gz</code> directly onto{' '}
          <code>t1gd.nii.gz</code> in 3D Slicer, ITK-SNAP, or Mango to perform secondary anatomical
          cross-validation.
        </div>
      </div>

      {/* Navigation CTAs */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <button
          type="button"
          onClick={onExploreViewer}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-navy text-xs font-semibold shadow-sm transition-all"
        >
          <Layers className="w-4 h-4 text-cyan" />
          <span>Interactive 3D Slice Viewer</span>
        </button>

        <button
          type="button"
          onClick={onStartNewStudy}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-bold shadow-md transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Start New Analysis</span>
        </button>
      </div>
    </div>
  );
};
export default ReportExport;
