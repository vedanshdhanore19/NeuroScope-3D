import React, { useRef, useState } from 'react';
import { api } from '../../services/api';
import { ValidationResponse } from '../../types/api';
import {
  UploadCloud,
  FileCheck,
  X,
  RefreshCw,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  Trash2,
} from 'lucide-react';

interface StudyUploadProps {
  onValidationSuccess: (result: ValidationResponse, filenames: Record<string, string>) => void;
  onErrorToast?: (message: string) => void;
}

type SequenceKey = 't1' | 't1gd' | 't2' | 'flair' | 'expert';

interface SequenceItem {
  key: SequenceKey;
  label: string;
  fullName: string;
  description: string;
  required: boolean;
  color: string;
}

const SEQUENCES: SequenceItem[] = [
  {
    key: 't1',
    label: 'T1-Weighted',
    fullName: 'Native T1-Weighted MRI',
    description: 'High anatomical detail of brain parenchyma and structural boundaries',
    required: true,
    color: '#0284c7',
  },
  {
    key: 't1gd',
    label: 'T1-Gd',
    fullName: 'Post-Contrast T1-Weighted (Gadolinium)',
    description: 'Highlights active breakdown of blood-brain barrier and vascular rim',
    required: true,
    color: '#ef4444',
  },
  {
    key: 't2',
    label: 'T2-Weighted',
    fullName: 'T2-Weighted MRI',
    description: 'Sensitive to fluid, highlighting diffuse edema and tissue hydration',
    required: true,
    color: '#00d690',
  },
  {
    key: 'flair',
    label: 'T2-FLAIR',
    fullName: 'Fluid Attenuated Inversion Recovery',
    description: 'Suppresses ventricular CSF signal to demarcate peritumoral edema',
    required: true,
    color: '#f59e0b',
  },
  {
    key: 'expert',
    label: 'Expert Mask (Optional)',
    fullName: 'Ground Truth Expert Segmentation',
    description: 'Enables Dice, Sensitivity, and HD95 mm evaluation metrics',
    required: false,
    color: '#8b5cf6',
  },
];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

async function compressIfUncompressedNii(file: File): Promise<File> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.nii') && !lower.endsWith('.nii.gz') && typeof CompressionStream !== 'undefined') {
    try {
      const stream = file.stream().pipeThrough(new CompressionStream('gzip'));
      const blob = await new Response(stream).blob();
      return new File([blob], `${file.name}.gz`, { type: 'application/gzip' });
    } catch (e) {
      console.warn('In-browser gzip compression failed, uploading raw file:', e);
      return file;
    }
  }
  return file;
}

export const StudyUpload: React.FC<StudyUploadProps> = ({ onValidationSuccess, onErrorToast }) => {
  const [uploadMode, setUploadMode] = useState<'brats' | 'msd'>('brats');

  // BraTS Files State
  const [files, setFiles] = useState<Record<SequenceKey, { file: File | null; sizeFormatted: string; isGzipping?: boolean }>>({
    t1: { file: null, sizeFormatted: '' },
    t1gd: { file: null, sizeFormatted: '' },
    t2: { file: null, sizeFormatted: '' },
    flair: { file: null, sizeFormatted: '' },
    expert: { file: null, sizeFormatted: '' },
  });

  // MSD File State
  const [msdFile, setMsdFile] = useState<File | null>(null);
  const [msdExpertFile, setMsdExpertFile] = useState<File | null>(null);

  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [validationPhase, setValidationPhase] = useState<string>('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleBraTSFileChange = async (seq: SequenceKey, incomingFile: File | null) => {
    if (!incomingFile) return;

    const lower = incomingFile.name.toLowerCase();
    if (!lower.endsWith('.nii') && !lower.endsWith('.nii.gz')) {
      const msg = 'Only NIfTI files (.nii or .nii.gz) are supported.';
      setGlobalError(msg);
      onErrorToast?.(msg);
      return;
    }

    setGlobalError(null);
    setErrorCode(null);

    // If .nii, compress client-side to save bandwidth and prevent backend rejection
    if (lower.endsWith('.nii') && !lower.endsWith('.nii.gz')) {
      setFiles((prev) => ({
        ...prev,
        [seq]: { file: incomingFile, sizeFormatted: 'Compressing .nii → .nii.gz...', isGzipping: true },
      }));
      const compressed = await compressIfUncompressedNii(incomingFile);
      setFiles((prev) => ({
        ...prev,
        [seq]: { file: compressed, sizeFormatted: `${formatBytes(compressed.size)} (GZ)`, isGzipping: false },
      }));
    } else {
      setFiles((prev) => ({
        ...prev,
        [seq]: { file: incomingFile, sizeFormatted: formatBytes(incomingFile.size), isGzipping: false },
      }));
    }
  };

  const handleMsdFileChange = async (incomingFile: File | null) => {
    if (!incomingFile) return;
    const lower = incomingFile.name.toLowerCase();
    if (!lower.endsWith('.nii') && !lower.endsWith('.nii.gz')) {
      setGlobalError('Only 4D NIfTI files (.nii or .nii.gz) are supported.');
      return;
    }
    setGlobalError(null);
    const readyFile = await compressIfUncompressedNii(incomingFile);
    setMsdFile(readyFile);
  };

  const handleRemoveBraTSFile = (seq: SequenceKey) => {
    setFiles((prev) => ({
      ...prev,
      [seq]: { file: null, sizeFormatted: '' },
    }));
    if (fileInputRefs.current[seq]) {
      fileInputRefs.current[seq]!.value = '';
    }
  };

  const isBraTSReady = files.t1.file && files.t1gd.file && files.t2.file && files.flair.file;
  const isMsdReady = !!msdFile;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isValidating) return;

    setIsValidating(true);
    setGlobalError(null);
    setErrorCode(null);

    try {
      if (uploadMode === 'brats') {
        if (!isBraTSReady) {
          setGlobalError('Please select all 4 required sequences (T1, T1Gd, T2, FLAIR).');
          setIsValidating(false);
          return;
        }

        setValidationPhase('Uploading multi-contrast series & computing cryptographic SHA-256...');
        const formData = new FormData();
        formData.append('t1', files.t1.file!);
        formData.append('t1gd', files.t1gd.file!);
        formData.append('t2', files.t2.file!);
        formData.append('flair', files.flair.file!);
        formData.append('dataset_profile', 'brats');

        if (files.expert.file) {
          formData.append('expert_mask', files.expert.file);
        }

        setValidationPhase('Executing header verification, matrix alignment & skull-strip audit...');
        const response = await api.validateBraTS(formData);

        const fileNames: Record<string, string> = {
          t1: files.t1.file!.name,
          t1gd: files.t1gd.file!.name,
          t2: files.t2.file!.name,
          flair: files.flair.file!.name,
          expert: files.expert.file?.name || '',
        };

        onValidationSuccess(response, fileNames);
      } else {
        // MSD Mode
        if (!isMsdReady) {
          setGlobalError('Please select the 4D MSD Task01 brain volume.');
          setIsValidating(false);
          return;
        }

        setValidationPhase('Uploading 4D MSD Task01 volume...');
        const formData = new FormData();
        formData.append('msd_volume', msdFile!);
        if (msdExpertFile) {
          formData.append('expert_mask', msdExpertFile);
        }

        setValidationPhase('Unpacking 4D channels (FLAIR, T1, T1Gd, T2) & auditing geometry...');
        const response = await api.validateMSD(formData);

        const fileNames: Record<string, string> = {
          msd_volume: msdFile!.name,
          expert: msdExpertFile?.name || '',
        };

        onValidationSuccess(response, fileNames);
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'object' && detail !== null) {
        setErrorCode(detail.code || 'VALIDATION_FAILED');
        setGlobalError(detail.message || JSON.stringify(detail));
      } else if (typeof detail === 'string') {
        setGlobalError(detail);
      } else {
        setGlobalError(err.message || 'Validation request failed.');
      }
    } finally {
      setIsValidating(false);
      setValidationPhase('');
    }
  };

  return (
    <div className="space-y-8 py-6 max-w-5xl mx-auto">
      {/* Section Header */}
      <div className="text-center space-y-2">
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
          Phase 1: Input Ingestion & Validation
        </span>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-navy tracking-tight">
          Upload Multi-Contrast MRI Study
        </h2>
        <p className="text-sm text-slate-600 max-w-xl mx-auto">
          Submit all 4 co-registered BraTS 3D NIfTI sequences (.nii or .nii.gz) or an official MSD
          Task01 4D volume. Uncompressed .nii files are automatically compressed client-side.
        </p>
      </div>

      {/* Upload Mode Selector */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-200/80 rounded-full border border-slate-300">
          <button
            type="button"
            onClick={() => setUploadMode('brats')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              uploadMode === 'brats'
                ? 'bg-navy text-white shadow-sm'
                : 'text-slate-700 hover:text-navy'
            }`}
          >
            BraTS Protocol (4 Separate Sequences)
          </button>
          <button
            type="button"
            onClick={() => setUploadMode('msd')}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
              uploadMode === 'msd'
                ? 'bg-navy text-white shadow-sm'
                : 'text-slate-700 hover:text-navy'
            }`}
          >
            MSD Task01 (Single 4D Volume)
          </button>
        </div>
      </div>

      {/* Global Validation Error Banner */}
      {globalError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-rose-900">Study Validation Rejected</span>
              {errorCode && (
                <span className="text-[10px] font-mono font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                  {errorCode}
                </span>
              )}
            </div>
            <p className="text-xs text-rose-800 leading-relaxed">{globalError}</p>
            <p className="text-[11px] text-rose-700 pt-1">
              Ensure all sequences match matrix dimensions (e.g. 240 × 240 × 155), have matching
              affine orientations, and are skull-stripped.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="text-rose-500 hover:text-rose-700 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {uploadMode === 'brats' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SEQUENCES.map((seq) => {
              const fileState = files[seq.key];
              const isSelected = !!fileState.file;

              return (
                <div
                  key={seq.key}
                  className={`bg-white border rounded-2xl p-5 shadow-card transition-all flex flex-col justify-between ${
                    isSelected ? 'border-emerald-300 ring-1 ring-emerald-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: `${seq.color}15`,
                          color: seq.color,
                        }}
                      >
                        {seq.label}
                      </span>
                      {seq.required ? (
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Required
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Optional
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-navy">{seq.fullName}</h4>
                    <p className="text-xs text-slate-500 leading-relaxed">{seq.description}</p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-100">
                    {isSelected ? (
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <p className="text-xs font-semibold text-navy truncate">
                              {fileState.file?.name}
                            </p>
                            <p className="text-[10px] text-slate-500">{fileState.sizeFormatted}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveBraTSFile(seq.key)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Remove file"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div>
                        <input
                          type="file"
                          accept=".nii,.nii.gz"
                          ref={(el) => {
                            fileInputRefs.current[seq.key] = el;
                          }}
                          onChange={(e) => handleBraTSFileChange(seq.key, e.target.files?.[0] || null)}
                          className="hidden"
                          id={`file-${seq.key}`}
                        />
                        <label
                          htmlFor={`file-${seq.key}`}
                          className="cursor-pointer flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-slate-300 hover:border-cyan hover:bg-sky-50/50 text-xs font-semibold text-slate-700 transition-all text-center"
                        >
                          <UploadCloud className="w-4 h-4 text-cyan" />
                          <span>Choose .nii or .nii.gz</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MSD Mode: Single 4D volume + optional expert */
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-4">
              <div>
                <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2.5 py-0.5 rounded-full border border-sky-200">
                  MSD Task01 4D Brain Volume
                </span>
                <h4 className="text-base font-extrabold text-navy mt-2">
                  Multi-contrast 4D NIfTI (BRATS_xxx.nii.gz)
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Single 4D array containing channels [0: FLAIR, 1: T1, 2: T1Gd, 3: T2]. The backend
                  will automatically unpack each sequence into separate 3D volumes.
                </p>
              </div>

              {msdFile ? (
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <FileCheck className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="text-xs font-bold text-navy">{msdFile.name}</p>
                      <p className="text-[10px] text-slate-500">{formatBytes(msdFile.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMsdFile(null)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".nii,.nii.gz"
                    onChange={(e) => handleMsdFileChange(e.target.files?.[0] || null)}
                    className="hidden"
                    id="msd-file-input"
                  />
                  <label
                    htmlFor="msd-file-input"
                    className="cursor-pointer flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed border-slate-300 hover:border-cyan hover:bg-sky-50/50 transition-all text-center space-y-2"
                  >
                    <UploadCloud className="w-8 h-8 text-cyan" />
                    <span className="text-xs font-bold text-navy">Select 4D Brain Volume (.nii.gz)</span>
                    <span className="text-[11px] text-slate-400">Medical Segmentation Decathlon Task01 format</span>
                  </label>
                </div>
              )}
            </div>

            {/* Optional MSD Ground Truth Label */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card space-y-3">
              <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                Optional Expert Label Map
              </span>
              <h4 className="text-sm font-bold text-navy">Ground-Truth Segmentation</h4>
              <p className="text-xs text-slate-500">
                Supply the corresponding reference label map for automated Dice score and HD95 metrics.
              </p>

              {msdExpertFile ? (
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <FileCheck className="w-5 h-5 text-purple-600" />
                    <p className="text-xs font-bold text-navy">{msdExpertFile.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMsdExpertFile(null)}
                    className="p-1 text-slate-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept=".nii,.nii.gz"
                    onChange={(e) => setMsdExpertFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="msd-expert-input"
                  />
                  <label
                    htmlFor="msd-expert-input"
                    className="cursor-pointer flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-dashed border-slate-300 hover:border-purple-400 text-xs font-semibold text-slate-700 text-center"
                  >
                    <UploadCloud className="w-4 h-4 text-purple-500" />
                    <span>Choose Optional Ground Truth Mask</span>
                  </label>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Validation Submit Action */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="text-xs text-slate-600">
              {isValidating ? (
                <span className="font-semibold text-navy flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 text-cyan animate-spin" />
                  <span>{validationPhase}</span>
                </span>
              ) : (
                <span>
                  All uploads undergo SHA-256 provenance registration and automated spatial geometry checks.
                </span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={isValidating || (uploadMode === 'brats' ? !isBraTSReady : !isMsdReady)}
            className="inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-full bg-navy hover:bg-navy-dark text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isValidating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validating Study...</span>
              </>
            ) : (
              <>
                <span>Validate & Register Study</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
export default StudyUpload;
