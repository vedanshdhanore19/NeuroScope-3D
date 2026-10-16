import React, { useState } from 'react';
import { api } from '../../services/api';
import { useStudyStore } from '../../store/studyStore';
import { ValidationResponse, DatasetProfile } from '../../types/api';
import {
  UploadCloud,
  FileCheck,
  AlertCircle,
  Cpu,
  CheckCircle2,
  HelpCircle,
  FileCode2,
  RefreshCw
} from 'lucide-react';

export function UploadWorkspace() {
  const { setRunId, setStudyDetails, setIsSegmenting } = useStudyStore();

  const [activeWorkflow, setActiveWorkflow] = useState<DatasetProfile>('brats');
  
  // BraTS File State (4 individual modalities)
  const [t1File, setT1File] = useState<File | null>(null);
  const [t1gdFile, setT1gdFile] = useState<File | null>(null);
  const [t2File, setT2File] = useState<File | null>(null);
  const [flairFile, setFlairFile] = useState<File | null>(null);
  const [bratsExpertFile, setBratsExpertFile] = useState<File | null>(null);

  // MSD File State (Single 4D NIfTI)
  const [msdFile, setMsdFile] = useState<File | null>(null);
  const [msdExpertFile, setMsdExpertFile] = useState<File | null>(null);

  // Status & Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validatedData, setValidatedData] = useState<ValidationResponse | null>(null);

  // Handle BraTS Form Submit
  const handleValidateBraTS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!t1File || !t1gdFile || !t2File || !flairFile) {
      setValidationError('Please select all four required BraTS NIfTI modalities (T1, T1Gd, T2, FLAIR).');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    const formData = new FormData();
    formData.append('t1', t1File);
    formData.append('t1gd', t1gdFile);
    formData.append('t2', t2File);
    formData.append('flair', flairFile);
    if (bratsExpertFile) {
      formData.append('expert_mask', bratsExpertFile);
    }
    formData.append('dataset_profile', 'brats');

    try {
      const res = await api.validateBraTS(formData);
      setValidatedData(res);
      setRunId(res.run_id);
      // Fetch initial study details
      const study = await api.getStudy(res.run_id);
      setStudyDetails(study);
    } catch (err: any) {
      setValidationError(
        err.response?.data?.detail || err.message || 'Validation failed. Check scan dimensions and affine alignment.'
      );
    } finally {
      setIsValidating(false);
    }
  };

  // Handle MSD Form Submit
  const handleValidateMSD = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!msdFile) {
      setValidationError('Please select a 4D NIfTI file (MSD Task01 BrainTumour format).');
      return;
    }

    setIsValidating(true);
    setValidationError(null);

    const formData = new FormData();
    formData.append('msd_volume', msdFile);
    if (msdExpertFile) {
      formData.append('expert_mask', msdExpertFile);
    }

    try {
      const res = await api.validateMSD(formData);
      setValidatedData(res);
      setRunId(res.run_id);
      // Fetch initial study details
      const study = await api.getStudy(res.run_id);
      setStudyDetails(study);
    } catch (err: any) {
      setValidationError(
        err.response?.data?.detail || err.message || 'Validation failed. Ensure volume is 4-dimensional [4, H, W, D].'
      );
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Workflow Selector Tabs */}
      <div className="flex border-b border-slate-800">
        <button
          onClick={() => {
            setActiveWorkflow('brats');
            setValidatedData(null);
            setValidationError(null);
          }}
          className={`px-5 py-3 text-xs font-semibold tracking-wider uppercase transition-colors border-b-2 flex items-center space-x-2 ${
            activeWorkflow === 'brats'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>BraTS Protocol</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            4-Modality NIfTI
          </span>
        </button>

        <button
          onClick={() => {
            setActiveWorkflow('msd_task01');
            setValidatedData(null);
            setValidationError(null);
          }}
          className={`px-5 py-3 text-xs font-semibold tracking-wider uppercase transition-colors border-b-2 flex items-center space-x-2 ${
            activeWorkflow === 'msd_task01'
              ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>MSD Task01 Protocol</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
            Single 4D NIfTI
          </span>
        </button>
      </div>

      {/* Validation Alert */}
      {validationError && (
        <div className="p-4 rounded-lg bg-red-950/40 border border-red-500/40 flex items-start space-x-3 text-xs text-red-200">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300 mb-0.5">Validation Error</p>
            <p>{validationError}</p>
          </div>
        </div>
      )}

      {/* BraTS Upload Form */}
      {activeWorkflow === 'brats' && (
        <form onSubmit={handleValidateBraTS} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* T1 */}
            <div className="glass-panel p-4 rounded-xl border-slate-800">
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
                <span>1. T1 Native (t1.nii.gz)</span>
                <span className="text-[10px] text-cyan-400 font-mono">Required</span>
              </label>
              <input
                type="file"
                accept=".nii,.nii.gz"
                onChange={(e) => setT1File(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">Unenhanced T1-weighted structural anatomical sequence.</p>
            </div>

            {/* T1Gd */}
            <div className="glass-panel p-4 rounded-xl border-slate-800">
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
                <span>2. T1 Gadolinium (t1ce.nii.gz)</span>
                <span className="text-[10px] text-cyan-400 font-mono">Required</span>
              </label>
              <input
                type="file"
                accept=".nii,.nii.gz"
                onChange={(e) => setT1gdFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">Contrast-enhanced T1 highlighting vascular rim / active lesion.</p>
            </div>

            {/* T2 */}
            <div className="glass-panel p-4 rounded-xl border-slate-800">
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
                <span>3. T2 Weighted (t2.nii.gz)</span>
                <span className="text-[10px] text-cyan-400 font-mono">Required</span>
              </label>
              <input
                type="file"
                accept=".nii,.nii.gz"
                onChange={(e) => setT2File(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">T2 relaxation weighting highlighting fluid and edema margins.</p>
            </div>

            {/* FLAIR */}
            <div className="glass-panel p-4 rounded-xl border-slate-800">
              <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
                <span>4. T2 FLAIR (flair.nii.gz)</span>
                <span className="text-[10px] text-cyan-400 font-mono">Required</span>
              </label>
              <input
                type="file"
                accept=".nii,.nii.gz"
                onChange={(e) => setFlairFile(e.target.files?.[0] || null)}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">Fluid-Attenuated Inversion Recovery for peritumoral edema.</p>
            </div>
          </div>

          {/* Optional Ground Truth Expert Mask */}
          <div className="glass-panel p-4 rounded-xl border-slate-800">
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
              <span>Optional Ground Truth Mask (seg.nii.gz)</span>
              <span className="text-[10px] text-slate-400 font-mono">Evaluation Only</span>
            </label>
            <input
              type="file"
              accept=".nii,.nii.gz"
              onChange={(e) => setBratsExpertFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1.5">
              Providing ground truth enables automated Dice score, Sensitivity, and HD95 evaluation.
            </p>
          </div>

          <button
            type="submit"
            disabled={isValidating}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs tracking-wider uppercase transition-all shadow-glow-cyan flex items-center justify-center space-x-2"
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Running Affine & Header Validation...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>Validate BraTS MRI Series</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* MSD Upload Form */}
      {activeWorkflow === 'msd_task01' && (
        <form onSubmit={handleValidateMSD} className="space-y-4">
          <div className="glass-panel p-5 rounded-xl border-slate-800">
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
              <span>MSD Task01 4D Multi-Channel Volume (*.nii.gz)</span>
              <span className="text-[10px] text-cyan-400 font-mono">Required</span>
            </label>
            <input
              type="file"
              accept=".nii,.nii.gz"
              onChange={(e) => setMsdFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-cyan-400 hover:file:bg-slate-700 cursor-pointer mt-2"
            />
            <p className="text-[11px] text-slate-500 mt-2">
              Accepts 4D Decathlon format with 4 stacked modal channels [FLAIR, T1w, T1gd, T2w].
            </p>
          </div>

          <div className="glass-panel p-4 rounded-xl border-slate-800">
            <label className="block text-xs font-semibold text-slate-200 mb-1 flex items-center justify-between">
              <span>Optional MSD Ground Truth Mask (*.nii.gz)</span>
              <span className="text-[10px] text-slate-400 font-mono">Evaluation Only</span>
            </label>
            <input
              type="file"
              accept=".nii,.nii.gz"
              onChange={(e) => setMsdExpertFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={isValidating}
            className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs tracking-wider uppercase transition-all shadow-glow-cyan flex items-center justify-center space-x-2"
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validating 4D Structure & Affine...</span>
              </>
            ) : (
              <>
                <FileCheck className="w-4 h-4" />
                <span>Validate MSD Task01 Volume</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Validation Result Confirmation Card */}
      {validatedData && (
        <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-xs space-y-2 shadow-glow-cyan/10">
          <div className="flex items-center space-x-2 text-cyan-400 font-semibold">
            <CheckCircle2 className="w-4 h-4" />
            <span>Scan Validation Succeeded — Ready for AI Inference</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 font-mono text-[11px] pt-1">
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">Run ID</span>
              <span className="text-slate-200 truncate block">{validatedData.run_id}</span>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">Dimensions</span>
              <span className="text-slate-200 block">{validatedData.dimensions.join(' × ')}</span>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">Skull-Stripped</span>
              <span className={validatedData.is_skull_stripped ? 'text-emerald-400' : 'text-amber-400'}>
                {validatedData.is_skull_stripped ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block">Expert Mask</span>
              <span className={validatedData.has_expert_mask ? 'text-emerald-400' : 'text-slate-400'}>
                {validatedData.has_expert_mask ? 'INCLUDED' : 'NONE'}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
