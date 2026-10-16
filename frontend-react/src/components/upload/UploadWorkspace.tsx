import React, { useState } from 'react';
import { api } from '../../services/api';
import { useStudyStore } from '../../store/studyStore';
import { ValidationResponse, DatasetProfile } from '../../types/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  Upload,
  FileCheck2,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface FileUploadSlotProps {
  label: string;
  sublabel: string;
  accept?: string;
  file: File | null;
  onFileSelect: (file: File | null) => void;
  required?: boolean;
}

function FileUploadSlot({
  label,
  sublabel,
  accept = '.nii,.nii.gz',
  file,
  onFileSelect,
  required = true,
}: FileUploadSlotProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`relative p-3 rounded-xl border transition-all ${
        isDragOver
          ? 'border-cyan-400 bg-cyan-950/20'
          : file
          ? 'border-emerald-500/30 bg-surface-elevated'
          : 'border-surface-border bg-surface hover:border-surface-border-hover'
      }`}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-semibold text-slate-200">{label}</span>
            {required ? (
              <Badge variant="cyan">Required</Badge>
            ) : (
              <Badge variant="neutral">Optional</Badge>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-0.5">{sublabel}</p>
        </div>

        {file ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        ) : (
          <Upload className="w-4 h-4 text-slate-500 shrink-0" />
        )}
      </div>

      <div className="mt-2.5 flex items-center justify-between">
        {file ? (
          <div className="text-[11px] font-mono text-emerald-300 truncate max-w-[220px]">
            {file.name} <span className="text-slate-500">({formatSize(file.size)})</span>
          </div>
        ) : (
          <span className="text-[11px] text-slate-500">No file selected</span>
        )}

        <label className="cursor-pointer">
          <span className="text-[11px] font-medium text-cyan-400 hover:text-cyan-300 transition-colors">
            {file ? 'Change' : 'Browse'}
          </span>
          <input
            type="file"
            accept={accept}
            onChange={(e) => onFileSelect(e.target.files?.[0] || null)}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}

export function UploadWorkspace() {
  const {
    currentRunId,
    setRunId,
    studyDetails,
    setStudyDetails,
    isSegmenting,
    setIsSegmenting
  } = useStudyStore();

  const [activeWorkflow, setActiveWorkflow] = useState<DatasetProfile>('brats');
  
  // BraTS File State
  const [t1File, setT1File] = useState<File | null>(null);
  const [t1gdFile, setT1gdFile] = useState<File | null>(null);
  const [t2File, setT2File] = useState<File | null>(null);
  const [flairFile, setFlairFile] = useState<File | null>(null);
  const [bratsExpertFile, setBratsExpertFile] = useState<File | null>(null);

  // MSD File State
  const [msdFile, setMsdFile] = useState<File | null>(null);
  const [msdExpertFile, setMsdExpertFile] = useState<File | null>(null);

  // Status & Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [_validatedData, setValidatedData] = useState<ValidationResponse | null>(null);

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
      setValidationError('Please select a 4D NIfTI file (MSD Task01 format).');
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

  // Run Inference Trigger
  const handleRunInference = async () => {
    if (!currentRunId) return;
    setIsSegmenting(true);
    try {
      await api.runSegmentation(currentRunId);
      const updated = await api.getStudy(currentRunId);
      setStudyDetails(updated);
    } catch (err: any) {
      alert(`Segmentation failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsSegmenting(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Workstation Protocol Selection */}
      <Card className="p-3">
        <div className="flex border-b border-surface-border">
          <button
            type="button"
            onClick={() => {
              setActiveWorkflow('brats');
              setValidatedData(null);
              setValidationError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold tracking-wider uppercase transition-colors border-b-2 flex items-center justify-center space-x-1.5 ${
              activeWorkflow === 'brats'
                ? 'border-cyan-400 text-cyan-300 bg-surface-elevated'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>BraTS (4-Modality)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveWorkflow('msd_task01');
              setValidatedData(null);
              setValidationError(null);
            }}
            className={`flex-1 py-2 text-xs font-semibold tracking-wider uppercase transition-colors border-b-2 flex items-center justify-center space-x-1.5 ${
              activeWorkflow === 'msd_task01'
                ? 'border-cyan-400 text-cyan-300 bg-surface-elevated'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>MSD Task01 (4D)</span>
          </button>
        </div>
      </Card>

      {/* Validation Error Alert */}
      {validationError && (
        <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 flex items-start space-x-2.5 text-xs text-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-red-300">Validation Issue</p>
            <p className="text-[11px] text-red-300/90">{validationError}</p>
          </div>
        </div>
      )}

      {/* BraTS Upload Form */}
      {activeWorkflow === 'brats' && (
        <form onSubmit={handleValidateBraTS} className="space-y-3">
          <FileUploadSlot
            label="T1 Native"
            sublabel="Unenhanced structural anatomical MRI (t1.nii.gz)"
            file={t1File}
            onFileSelect={setT1File}
          />
          <FileUploadSlot
            label="T1 Gadolinium (T1c)"
            sublabel="Contrast-enhanced active tumor margin (t1ce.nii.gz)"
            file={t1gdFile}
            onFileSelect={setT1gdFile}
          />
          <FileUploadSlot
            label="T2 Weighted"
            sublabel="T2 relaxation for fluid/edema boundaries (t2.nii.gz)"
            file={t2File}
            onFileSelect={setT2File}
          />
          <FileUploadSlot
            label="T2 FLAIR"
            sublabel="Inversion recovery for peritumoral edema (flair.nii.gz)"
            file={flairFile}
            onFileSelect={setFlairFile}
          />
          <FileUploadSlot
            label="Optional Ground Truth"
            sublabel="Expert segmentation mask for validation metrics (seg.nii.gz)"
            file={bratsExpertFile}
            onFileSelect={setBratsExpertFile}
            required={false}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isValidating || !t1File || !t1gdFile || !t2File || !flairFile}
            className="w-full text-xs uppercase tracking-wider font-bold shadow-glow-cyan"
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Validating Series...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Validate BraTS MRI Series</span>
              </>
            )}
          </Button>
        </form>
      )}

      {/* MSD Upload Form */}
      {activeWorkflow === 'msd_task01' && (
        <form onSubmit={handleValidateMSD} className="space-y-3">
          <FileUploadSlot
            label="MSD Task01 4D Multi-Channel Volume"
            sublabel="Single 4D NIfTI containing stacked [FLAIR, T1, T1c, T2]"
            file={msdFile}
            onFileSelect={setMsdFile}
          />
          <FileUploadSlot
            label="Optional Expert Mask"
            sublabel="Ground truth label volume for Dice evaluation"
            file={msdExpertFile}
            onFileSelect={setMsdExpertFile}
            required={false}
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={isValidating || !msdFile}
            className="w-full text-xs uppercase tracking-wider font-bold shadow-glow-cyan"
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Validating 4D Structure...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-3.5 h-3.5" />
                <span>Validate MSD Task01 Volume</span>
              </>
            )}
          </Button>
        </form>
      )}

      {/* Post-Validation Summary Card */}
      {studyDetails && (
        <Card className="p-4 space-y-3 border-cyan-500/30 bg-surface-elevated">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-1.5 text-xs font-semibold text-cyan-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Validated Study Summary</span>
            </div>
            <Badge variant="cyan">{studyDetails.dataset_profile}</Badge>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="p-2 rounded bg-surface border border-surface-border">
              <span className="text-slate-500 block">Run ID</span>
              <span className="text-slate-200 truncate block font-bold">{studyDetails.run_id}</span>
            </div>
            <div className="p-2 rounded bg-surface border border-surface-border">
              <span className="text-slate-500 block">Dimensions</span>
              <span className="text-slate-200 block font-bold">
                {studyDetails.dimensions ? studyDetails.dimensions.join(' × ') : '—'}
              </span>
            </div>
            <div className="p-2 rounded bg-surface border border-surface-border">
              <span className="text-slate-500 block">Skull-Stripped</span>
              <span className={studyDetails.is_skull_stripped ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                {studyDetails.is_skull_stripped ? 'YES' : 'NO'}
              </span>
            </div>
            <div className="p-2 rounded bg-surface border border-surface-border">
              <span className="text-slate-500 block">Expert Mask</span>
              <span className={studyDetails.has_expert_mask ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                {studyDetails.has_expert_mask ? 'INCLUDED' : 'NONE'}
              </span>
            </div>
          </div>

          {/* AI Segmentation Action */}
          {!studyDetails.has_prediction ? (
            <div className="pt-1">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleRunInference}
                disabled={isSegmenting}
                className="w-full bg-gradient-to-r from-red-500 to-amber-500 hover:from-red-400 hover:to-amber-400 text-slate-950 font-bold"
              >
                {isSegmenting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Executing MONAI SegResNet (up to 120s)...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Run AI Segmentation Inference</span>
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="p-2 rounded bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
              <span className="font-semibold">AI Prediction Ready</span>
              <span className="font-mono text-[10px] text-slate-400">
                {studyDetails.inference_time_seconds
                  ? `${studyDetails.inference_time_seconds.toFixed(2)}s`
                  : 'Computed'}
              </span>
            </div>
          )}
        </Card>
      )}

    </div>
  );
}
