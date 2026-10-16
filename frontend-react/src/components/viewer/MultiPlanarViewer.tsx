import { useState } from 'react';
import { useStudyStore } from '../../store/studyStore';
import { api } from '../../services/api';
import { MRIModality } from '../../types/api';
import { Button } from '../ui/Button';
import {
  Layers,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';

export function MultiPlanarViewer() {
  const {
    currentRunId,
    studyDetails,
    activeModality,
    setActiveModality,
    selectedAxis,
    setSelectedAxis,
    sliceIndices,
    setSliceIndex,
    overlaySegmentation,
    setOverlaySegmentation,
    overlayOpacity,
    setOverlayOpacity,
    isSegmenting,
    setIsSegmenting,
    setStudyDetails
  } = useStudyStore();

  const [_loadingSlice, setLoadingSlice] = useState(false);

  // If no run is loaded, provide empty state
  if (!currentRunId || !studyDetails) {
    return (
      <div className="bg-surface p-12 rounded-2xl border border-surface-border text-center flex flex-col items-center justify-center space-y-4 shadow-card">
        <Layers className="w-12 h-12 text-slate-600" />
        <div>
          <h3 className="text-sm font-semibold text-slate-200">No Active Imaging Study Loaded</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            Validate an MRI volume using BraTS or MSD protocol in the left panel to initialize orthogonal slices.
          </p>
        </div>
      </div>
    );
  }

  // Dimensions [dim0, dim1, dim2] -> [Sagittal, Coronal, Axial]
  const dims = studyDetails.dimensions || [155, 240, 240];
  const maxSlices = {
    0: dims[0] - 1,
    1: dims[1] - 1,
    2: dims[2] - 1,
  };

  const currentSlice = sliceIndices[selectedAxis] ?? Math.floor(dims[selectedAxis] / 2);
  const maxSliceForCurrentAxis = maxSlices[selectedAxis] ?? 150;

  const sliceUrl = api.getSliceUrl(
    currentRunId,
    activeModality,
    selectedAxis,
    currentSlice,
    overlaySegmentation && studyDetails.has_prediction,
    overlayOpacity
  );

  const handleRunInference = async () => {
    setIsSegmenting(true);
    try {
      await api.runSegmentation(currentRunId);
      const updatedStudy = await api.getStudy(currentRunId);
      setStudyDetails(updatedStudy);
    } catch (err: any) {
      alert(`Segmentation failed: ${err.response?.data?.detail || err.message}`);
    } finally {
      setIsSegmenting(false);
    }
  };

  return (
    <div className="space-y-4">
      
      {/* Top Controls Toolbar */}
      <div className="bg-surface p-3.5 rounded-xl border border-surface-border flex flex-wrap items-center justify-between gap-3 shadow-card">
        
        {/* Modality Toggles */}
        <div className="flex items-center space-x-1 bg-surface-subtle p-1 rounded-lg border border-surface-border">
          {(['t1', 't1gd', 't2', 'flair'] as MRIModality[]).map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setActiveModality(mod)}
              className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors ${
                activeModality === mod
                  ? 'bg-surface-elevated text-cyan-300 font-bold border border-white/10'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {mod}
            </button>
          ))}

          {studyDetails.has_prediction && (
            <button
              type="button"
              onClick={() => setActiveModality('prediction')}
              className={`px-2.5 py-1 rounded text-xs font-mono uppercase transition-colors ${
                activeModality === 'prediction'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 font-bold'
                  : 'text-red-400 hover:text-red-300'
              }`}
            >
              Mask Only
            </button>
          )}
        </div>

        {/* Axis Orientation Selector */}
        <div className="flex items-center space-x-1 bg-surface-subtle p-1 rounded-lg border border-surface-border">
          <button
            type="button"
            onClick={() => setSelectedAxis(2)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedAxis === 2
                ? 'bg-surface-elevated text-white font-semibold border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Axial (Z)
          </button>
          <button
            type="button"
            onClick={() => setSelectedAxis(1)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedAxis === 1
                ? 'bg-surface-elevated text-white font-semibold border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Coronal (Y)
          </button>
          <button
            type="button"
            onClick={() => setSelectedAxis(0)}
            className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
              selectedAxis === 0
                ? 'bg-surface-elevated text-white font-semibold border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sagittal (X)
          </button>
        </div>

        {/* AI Inference Action or Prediction Status */}
        <div>
          {studyDetails.has_prediction ? (
            <div className="flex items-center space-x-3 text-xs">
              <label className="flex items-center space-x-1.5 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={overlaySegmentation}
                  onChange={(e) => setOverlaySegmentation(e.target.checked)}
                  className="rounded border-slate-700 bg-surface-elevated text-cyan-500 focus:ring-0"
                />
                <span>Overlay Tumor Mask</span>
              </label>

              {overlaySegmentation && (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] text-slate-400 font-mono">Opacity</span>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(parseFloat(e.target.value))}
                    className="w-16 accent-cyan-400 h-1"
                  />
                  <span className="text-[10px] text-cyan-400 font-mono w-6">
                    {Math.round(overlayOpacity * 100)}%
                  </span>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={handleRunInference}
              disabled={isSegmenting}
              className="bg-gradient-to-r from-red-500 to-amber-500 text-slate-950 font-bold"
            >
              {isSegmenting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Segmenting MONAI...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Execute AI Segmentation</span>
                </>
              )}
            </Button>
          )}
        </div>

      </div>

      {/* Main 2D Medical Slice Canvas View */}
      <div className="relative w-full aspect-square max-h-[560px] bg-black rounded-2xl overflow-hidden border border-surface-border flex items-center justify-center select-none shadow-card">
        <img
          key={sliceUrl}
          src={sliceUrl}
          alt={`Slice ${currentSlice} (${activeModality})`}
          className="max-h-full max-w-full object-contain filter contrast-125"
          onLoadStart={() => setLoadingSlice(true)}
          onLoad={() => setLoadingSlice(false)}
        />

        {/* Anatomical Orientation Markers */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyan-300 bg-black/70 px-2 py-0.5 rounded border border-surface-border">
          {selectedAxis === 2 ? 'ANTERIOR' : 'SUPERIOR'}
        </div>
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] font-mono text-cyan-300 bg-black/70 px-2 py-0.5 rounded border border-surface-border">
          {selectedAxis === 2 ? 'POSTERIOR' : 'INFERIOR'}
        </div>
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-cyan-300 bg-black/70 px-1 py-1 rounded border border-surface-border">
          {selectedAxis === 2 ? 'R' : selectedAxis === 1 ? 'R' : 'A'}
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-cyan-300 bg-black/70 px-1 py-1 rounded border border-surface-border">
          {selectedAxis === 2 ? 'L' : selectedAxis === 1 ? 'L' : 'P'}
        </div>

        {/* PACS HUD in corners */}
        <div className="absolute top-4 left-4 text-[10px] font-mono text-slate-400 space-y-0.5 pointer-events-none bg-black/50 p-2 rounded border border-white/5">
          <p className="text-cyan-400 font-bold">NeuroScope-3D PACS</p>
          <p>RUN: {currentRunId.slice(0, 8)}</p>
          <p>MODALITY: {activeModality.toUpperCase()}</p>
        </div>

        <div className="absolute top-4 right-4 text-[10px] font-mono text-slate-400 space-y-0.5 text-right pointer-events-none bg-black/50 p-2 rounded border border-white/5">
          <p>AXIS: {selectedAxis === 2 ? 'AXIAL' : selectedAxis === 1 ? 'CORONAL' : 'SAGITTAL'}</p>
          <p>SLICE: {currentSlice} / {maxSliceForCurrentAxis}</p>
          <p>VOX: {dims.join('×')}</p>
        </div>

        {/* Subregion Color Legend Overlay */}
        {studyDetails.has_prediction && overlaySegmentation && (
          <div className="absolute bottom-4 left-4 bg-surface/85 backdrop-blur-md p-2.5 rounded-lg border border-surface-border text-[11px] space-y-1 pointer-events-none">
            <div className="font-semibold text-slate-300 pb-0.5 border-b border-surface-border">
              Subregions
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-slate-300">Enhancing Tumor (ET)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              <span className="text-slate-300">Necrotic Core (NCR)</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-slate-300">Peritumoral Edema (ED)</span>
            </div>
          </div>
        )}
      </div>

      {/* Slice Scrubber Navigation Bar */}
      <div className="bg-surface p-3 rounded-xl border border-surface-border flex items-center space-x-4 shadow-card">
        <button
          type="button"
          onClick={() => setSliceIndex(selectedAxis, Math.max(0, currentSlice - 1))}
          className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-subtle text-slate-300 border border-surface-border"
          aria-label="Previous Slice"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex-1 flex items-center space-x-3">
          <input
            type="range"
            min="0"
            max={maxSliceForCurrentAxis}
            value={currentSlice}
            onChange={(e) => setSliceIndex(selectedAxis, parseInt(e.target.value, 10))}
            className="w-full accent-cyan-400 h-1.5 cursor-ew-resize"
          />
          <span className="text-xs font-mono text-cyan-300 min-w-[50px] text-right font-semibold">
            {currentSlice} / {maxSliceForCurrentAxis}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSliceIndex(selectedAxis, Math.min(maxSliceForCurrentAxis, currentSlice + 1))}
          className="p-1.5 rounded-lg bg-surface-elevated hover:bg-surface-subtle text-slate-300 border border-surface-border"
          aria-label="Next Slice"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
