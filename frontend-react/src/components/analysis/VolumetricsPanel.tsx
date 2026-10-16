import React from 'react';
import { useStudyStore } from '../../store/studyStore';
import { api } from '../../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import {
  Download,
  FileSpreadsheet,
  Activity,
  Layers,
  Sparkles,
  Award,
  CheckCircle2,
  FileDown
} from 'lucide-react';

export function VolumetricsPanel() {
  const { currentRunId, studyDetails } = useStudyStore();

  if (!studyDetails || !studyDetails.has_prediction || !studyDetails.volumes) {
    return (
      <div className="glass-panel p-8 rounded-xl border-slate-800 text-center">
        <Activity className="w-10 h-10 text-slate-600 mx-auto mb-3" />
        <h4 className="text-sm font-semibold text-slate-300">Volumetric Data Pending</h4>
        <p className="text-xs text-slate-500 mt-1">
          Execute AI segmentation to compute subregion physical volumes and evaluation metrics.
        </p>
      </div>
    );
  }

  const { volumes, metrics } = studyDetails;

  // Chart Data Preparation (Values converted to mL)
  const chartData = [
    {
      name: 'Whole Tumor (WT)',
      volume: volumes.WT ? parseFloat(volumes.WT.toFixed(2)) : 0,
      color: '#EC4899',
      desc: 'Complete pathological lesion',
    },
    {
      name: 'Tumor Core (TC)',
      volume: volumes.TC ? parseFloat(volumes.TC.toFixed(2)) : 0,
      color: '#F97316',
      desc: 'Active bulk + Necrotic core',
    },
    {
      name: 'Enhancing (ET)',
      volume: volumes.ET ? parseFloat(volumes.ET.toFixed(2)) : 0,
      color: '#EF4444',
      desc: 'Gadolinium hyperintense margin',
    },
    {
      name: 'Edema (ED)',
      volume: volumes.ED ? parseFloat(volumes.ED.toFixed(2)) : 0,
      color: '#10B981',
      desc: 'Peritumoral vasogenic fluid',
    },
    {
      name: 'Necrotic (NCR)',
      volume: volumes.NCR ? parseFloat(volumes.NCR.toFixed(2)) : 0,
      color: '#F59E0B',
      desc: 'Central non-enhancing necrosis',
    },
  ];

  return (
    <div className="space-y-6">
      
      {/* Volumetrics Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {chartData.map((item) => (
          <div
            key={item.name}
            className="glass-panel p-3.5 rounded-xl border-slate-800 flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center space-x-1.5 mb-1">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[11px] font-semibold text-slate-300 truncate">
                  {item.name.split(' ')[0]}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1">{item.desc}</p>
            </div>
            <div className="mt-3">
              <span className="text-xl font-bold font-mono text-white">
                {item.volume}
              </span>
              <span className="text-xs font-mono text-slate-400 ml-1">mL</span>
            </div>
          </div>
        ))}
      </div>

      {/* Recharts Bar Visualization */}
      <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Activity className="w-4 h-4" />
            <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
              Physical Subregion Volumetric Distribution (mL)
            </h3>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            Formula: V = N_voxels × (sx·sy·sz) / 1000
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                interval={0}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit=" mL"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#111827',
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#F3F4F6',
                }}
                formatter={(val: any) => [`${val} mL`, 'Physical Volume']}
              />
              <Bar dataKey="volume" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Model Evaluation Metrics (If ground truth expert mask was uploaded) */}
      {metrics ? (
        <div className="glass-panel p-5 rounded-2xl border-slate-800 space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Award className="w-4 h-4" />
            <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
              Ground-Truth Validation Metrics
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-800">
                <tr>
                  <th className="py-2">Tumor Structure</th>
                  <th className="py-2">Dice Score</th>
                  <th className="py-2">Sensitivity</th>
                  <th className="py-2">HD95 (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {['WT', 'TC', 'ET'].map((key) => {
                  const m = metrics[key];
                  return (
                    <tr key={key}>
                      <td className="py-2 font-semibold text-cyan-300">{key}</td>
                      <td className="py-2">{m?.dice !== undefined ? (m.dice * 100).toFixed(2) + '%' : '—'}</td>
                      <td className="py-2">{m?.sensitivity !== undefined ? (m.sensitivity * 100).toFixed(2) + '%' : '—'}</td>
                      <td className="py-2">{m?.hausdorff95 !== undefined ? m.hausdorff95.toFixed(2) + ' mm' : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
          <span>Ground truth mask was not provided during validation. Evaluation metrics (Dice, Sensitivity, HD95) are inactive.</span>
          <span className="text-slate-500 font-mono text-[10px]">Unsupervised Inference Mode</span>
        </div>
      )}

      {/* Action / Download Bar */}
      {currentRunId && (
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href={api.getReportDownloadUrl(currentRunId)}
            download={`NeuroScope_Report_${currentRunId}.pdf`}
            className="flex-1 py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs tracking-wider uppercase transition-all shadow-glow-cyan flex items-center justify-center space-x-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Download Clinical PDF Dossier</span>
          </a>

          <a
            href={api.getPredictionDownloadUrl(currentRunId)}
            download={`prediction_${currentRunId}.nii.gz`}
            className="flex-1 py-3 px-4 rounded-xl glass-panel hover:bg-slate-800 text-slate-200 font-semibold text-xs tracking-wider uppercase transition-colors border-slate-700 flex items-center justify-center space-x-2"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span>Export Segmentation Mask (NIfTI)</span>
          </a>
        </div>
      )}

    </div>
  );
}
