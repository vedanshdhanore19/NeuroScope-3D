import { useStudyStore } from '../../store/studyStore';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { MetricCard } from '../ui/MetricCard';
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
  Activity,
  Award,
  FileDown,
  Info
} from 'lucide-react';

export function VolumetricsPanel() {
  const { currentRunId, studyDetails } = useStudyStore();

  if (!studyDetails || !studyDetails.has_prediction || !studyDetails.volumes) {
    return (
      <div className="bg-surface p-12 rounded-2xl border border-surface-border text-center shadow-card space-y-3">
        <Activity className="w-12 h-12 text-slate-600 mx-auto" />
        <h4 className="text-sm font-semibold text-slate-200">Volumetric Data Pending</h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Execute AI segmentation on an uploaded MRI study to compute physical volumes and evaluation metrics.
        </p>
      </div>
    );
  }

  const { volumes, metrics } = studyDetails;

  // Derived Equivalent Spherical Diameter: d = (6 * V_mm3 / pi)^(1/3) mm
  // 1 mL = 1000 mm3
  const wtVolume = volumes.WT || 0;
  const derivedDiameter = wtVolume > 0
    ? Math.cbrt((6 * (wtVolume * 1000)) / Math.PI)
    : 0;

  // Chart Data Preparation (Values in mL)
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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {chartData.map((item) => (
          <MetricCard
            key={item.name}
            label={item.name.split(' ')[0]}
            value={item.volume}
            unit="mL"
            sublabel={item.desc}
            color={item.color}
          />
        ))}

        {/* Derived Diameter Card */}
        <MetricCard
          label="Equiv. Diameter"
          value={derivedDiameter.toFixed(1)}
          unit="mm"
          sublabel="Equivalent spherical"
          color="#3B82F6"
          tooltip="Derived spherical equivalent d = (6V/π)^(1/3) mm from WT volume. Not a measured caliper diameter."
        />
      </div>

      {/* Recharts Bar Visualization */}
      <div className="bg-surface p-5 rounded-2xl border border-surface-border shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
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
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="name"
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                interval={0}
              />
              <YAxis
                stroke="#64748B"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                unit=" mL"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F1623',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  color: '#F1F5F9',
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

      {/* Model Evaluation Metrics (Ground-truth validation) */}
      {metrics ? (
        <div className="bg-surface p-5 rounded-2xl border border-surface-border shadow-card space-y-3">
          <div className="flex items-center space-x-2 text-emerald-400">
            <Award className="w-4 h-4" />
            <h3 className="text-xs font-mono uppercase tracking-wider font-semibold">
              Ground-Truth Validation Metrics
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[10px] text-slate-400 uppercase border-b border-surface-border">
                <tr>
                  <th className="py-2.5">Structure</th>
                  <th className="py-2.5">Dice Score</th>
                  <th className="py-2.5">Sensitivity</th>
                  <th className="py-2.5">Specificity</th>
                  <th className="py-2.5">HD95 (mm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border text-slate-200">
                {['WT', 'TC', 'ET'].map((key) => {
                  const m = metrics[key];
                  return (
                    <tr key={key}>
                      <td className="py-2.5 font-bold text-cyan-300">{key}</td>
                      <td className="py-2.5 font-semibold">
                        {m?.dice !== undefined ? (m.dice * 100).toFixed(2) + '%' : '—'}
                      </td>
                      <td className="py-2.5">
                        {m?.sensitivity !== undefined ? (m.sensitivity * 100).toFixed(2) + '%' : '—'}
                      </td>
                      <td className="py-2.5">
                        {m?.specificity !== undefined ? (m.specificity * 100).toFixed(2) + '%' : '—'}
                      </td>
                      <td className="py-2.5">
                        {m?.hausdorff95 !== undefined ? m.hausdorff95.toFixed(2) + ' mm' : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-xl bg-surface border border-surface-border text-[11px] text-slate-400 flex items-center justify-between shadow-card">
          <div className="flex items-center space-x-2">
            <Info className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Ground truth mask was not uploaded. Quantitative metrics (Dice, Sensitivity, HD95) are inactive.</span>
          </div>
          <span className="text-slate-500 font-mono text-[10px]">Unsupervised Mode</span>
        </div>
      )}

      {/* Download Action Bar */}
      {currentRunId && (
        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href={api.getReportDownloadUrl(currentRunId)}
            download={`NeuroScope_Report_${currentRunId}.pdf`}
            className="flex-1 min-w-[240px]"
          >
            <Button
              variant="primary"
              size="lg"
              className="w-full uppercase tracking-wider font-bold shadow-glow-cyan"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDF Clinical Dossier</span>
            </Button>
          </a>

          <a
            href={api.getPredictionDownloadUrl(currentRunId)}
            download={`prediction_${currentRunId}.nii.gz`}
            className="flex-1 min-w-[240px]"
          >
            <Button
              variant="secondary"
              size="lg"
              className="w-full uppercase tracking-wider font-semibold"
            >
              <Download className="w-4 h-4 text-cyan-400" />
              <span>Export Segmentation Mask (NIfTI)</span>
            </Button>
          </a>
        </div>
      )}

    </div>
  );
}
