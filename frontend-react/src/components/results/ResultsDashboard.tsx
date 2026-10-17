import React from 'react';
import { api } from '../../services/api';
import { SegmentationResponse } from '../../types/api';
import {
  Download,
  FileText,
  Clock,
  Layers,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';

interface ResultsDashboardProps {
  results: SegmentationResponse;
  onStartNewStudy: () => void;
  onExploreViewer: () => void;
}

function calculateSphericalDiameterMm(volumeMl: number): number {
  if (volumeMl <= 0) return 0;
  // Volume in mm^3 = volume_ml * 1000
  // V = (4/3) * pi * r^3 = (pi/6) * d^3
  // d = (6 * V / pi)^(1/3)
  const volumeMm3 = volumeMl * 1000;
  return Math.cbrt((6 * volumeMm3) / Math.PI);
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({
  results,
  onStartNewStudy,
  onExploreViewer,
}) => {
  const { run_id, inference_time_seconds, volumes, metrics } = results;

  const wtVolume = volumes?.WT?.volume_ml ?? 0;
  const tcVolume = volumes?.TC?.volume_ml ?? 0;
  const etVolume = volumes?.ET?.volume_ml ?? 0;
  const within5Percent =
    wtVolume > 0 &&
    tcVolume > 0 &&
    etVolume > 0 &&
    Math.abs(wtVolume - tcVolume) / wtVolume < 0.05 &&
    Math.abs(tcVolume - etVolume) / tcVolume < 0.05;
  const isPlausibilityWarning = wtVolume > 800 || within5Percent;

  const regions = [
    {
      key: 'WT',
      label: 'WT (Whole tumor)',
      description: 'Encompasses necrotic core, peritumoral vasogenic edema, and active tumor',
      color: '#00d690',
      bgLight: '#ecfdf5',
      textColor: '#065f46',
      data: volumes?.WT,
      metricData: metrics?.WT,
    },
    {
      key: 'TC',
      label: 'TC (Tumor core)',
      description: 'Isolates bulk gross tumor mass (necrotic core + enhancing active tumor)',
      color: '#f59e0b',
      bgLight: '#fef3c7',
      textColor: '#92400e',
      data: volumes?.TC,
      metricData: metrics?.TC,
    },
    {
      key: 'ET',
      label: 'ET (Enhancing)',
      description: 'Active angiogenic margin displaying hyper-intensity on post-contrast T1Gd',
      color: '#ef4444',
      bgLight: '#fee2e2',
      textColor: '#991b1b',
      data: volumes?.ET,
      metricData: metrics?.ET,
    },
  ];

  const predictionDownloadUrl = api.getPredictionDownloadUrl(run_id);
  const reportDownloadUrl = api.getReportDownloadUrl(run_id);

  return (
    <div className="space-y-8 py-6 max-w-6xl mx-auto">
      {/* Section Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
          Phase 3: Quantitative Findings & Metrics
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Volumetric & Clinical Metric Evaluation
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Quantitative volumetric breakdown for BraTS 2021 sub-regions computed via physical voxel
          determinant from reference affine.
        </p>
      </div>

      {/* Top Inference Summary Bar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-mint flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-extrabold text-navy">
                Segmentation Completed Successfully
              </h3>
              <span className="text-xs font-mono bg-sky-50 text-sky-700 px-2.5 py-0.5 rounded border border-sky-200 font-bold">
                Run: {run_id.slice(0, 8)}...
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>
                  Inference Latency: <strong>{inference_time_seconds.toFixed(2)}s</strong>
                </span>
              </span>
              <span>•</span>
              <span>
                Model: <strong>MONAI SegResNet (BraTS)</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Action Downloads */}
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={predictionDownloadUrl}
            download="prediction.nii.gz"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-navy text-xs font-semibold shadow-sm transition-all"
          >
            <Download className="w-4 h-4 text-cyan" />
            <span>Download Prediction (.nii.gz)</span>
          </a>

          <a
            href={reportDownloadUrl}
            download="NeuroScope_Report.pdf"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-bold shadow-md transition-all"
          >
            <FileText className="w-4 h-4" />
            <span>Download PDF Report</span>
          </a>
        </div>
      </div>

      {/* Amber Plausibility Warning (if WT > 800 mL or regions within 5%) */}
      {isPlausibilityWarning && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed space-y-1">
            <p className="font-bold text-amber-950">Atypical Volumetric Plausibility Warning</p>
            <p className="text-amber-900 font-semibold">
              Unusually large or implausible tumor volume. Verify input orientation, sequence
              assignment and model status.
            </p>
            <p className="text-amber-800 text-[11px]">
              Calculated Whole Tumor: {wtVolume.toFixed(2)} mL (cranial cavity threshold ~800 mL).
              Please inspect the MRI slices in the 3D Viewer to verify matrix alignment and skull-strip boundaries.
            </p>
          </div>
        </div>
      )}

      {/* 3 Volumetric Region Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {regions.map((reg) => {
          const vol = reg.data;
          const volMl = vol ? vol.volume_ml.toFixed(3) : 'N/A';
          const voxCount = vol ? vol.voxel_count.toLocaleString() : '0';
          const diameter = vol ? calculateSphericalDiameterMm(vol.volume_ml).toFixed(1) : 'N/A';
          const spacingStr = vol
            ? `${vol.spacing_x.toFixed(2)} × ${vol.spacing_y.toFixed(2)} × ${vol.spacing_z.toFixed(2)} mm`
            : '1.00 × 1.00 × 1.00 mm';

          return (
            <div
              key={reg.key}
              className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
              style={{ borderTop: `4px solid ${reg.color}` }}
            >
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span
                    className="text-xs font-bold px-3 py-1 rounded-full"
                    style={{ backgroundColor: reg.bgLight, color: reg.textColor }}
                  >
                    {reg.label}
                  </span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: reg.color }}
                  />
                </div>

                <div>
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Physical Volume
                  </span>
                  <div className="text-3xl font-extrabold text-navy tracking-tight mt-0.5">
                    {volMl} <span className="text-sm font-semibold text-slate-500">mL</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{reg.description}</p>
              </div>

              {/* Derived Diameter & Physical Details */}
              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mt-5 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Equivalent Diameter:</span>
                  <strong className="text-navy font-mono">{diameter} mm</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Voxel Count:</span>
                  <strong className="text-navy font-mono">{voxCount}</strong>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Voxel Spacing:</span>
                  <span className="text-navy font-mono text-[11px]">{spacingStr}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expert Evaluation Metrics Table (only when ground truth was provided) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-navy">
              Ground-Truth Comparative Accuracy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {metrics
                ? 'Audited evaluation metrics computed against the supplied expert ground-truth label map.'
                : 'No ground truth mask was uploaded with this study.'}
            </p>
          </div>

          {metrics && (
            <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full">
              Expert Mask Audited
            </span>
          )}
        </div>

        {metrics ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Sub-Region</th>
                  <th className="py-3 px-4">Dice Similarity (DSC)</th>
                  <th className="py-3 px-4">Sensitivity</th>
                  <th className="py-3 px-4">95% Hausdorff Distance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {regions.map((reg) => {
                  const m = reg.metricData;
                  const dice = m ? (m.dice_score * 100).toFixed(1) + '%' : 'N/A';
                  const sens = m ? (m.sensitivity * 100).toFixed(1) + '%' : 'N/A';
                  const hd95 =
                    m && m.hd95_mm !== undefined && m.hd95_mm !== null
                      ? `${m.hd95_mm.toFixed(2)} mm`
                      : 'N/A';

                  return (
                    <tr key={reg.key} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-navy flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: reg.color }}
                        />
                        <span>{reg.label}</span>
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-700 font-mono text-sm">
                        {dice}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-sky-700 font-mono text-sm">
                        {sens}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-700">{hd95}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-xs font-bold text-navy">Comparative Metrics Not Available</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Evaluation metrics (Dice score, Sensitivity, HD95) are only generated when an expert
              reference mask is submitted during ingestion.
            </p>
          </div>
        )}
      </div>

      {/* Mandatory Medical Research Disclaimer */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-900">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
        <div>
          <strong>Medical Research & Educational Disclaimer:</strong> This application and its
          outputs are intended strictly for scientific research and educational visualization. It is
          not certified as a medical device or diagnostic instrument.
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
          <span>Analyze Another Study</span>
        </button>
      </div>
    </div>
  );
};
export default ResultsDashboard;
