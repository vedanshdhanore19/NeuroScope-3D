import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { VolumeInfoResponse } from '../../types/api';
import { MeshViewer3D } from './MeshViewer3D';
import {
  Layers,
  RotateCcw,
  Box,
  LayoutGrid,
  Sun,
  Contrast,
  Eye,
  EyeOff,
  Play,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

interface OrthogonalViewerProps {
  runId: string;
  hasPrediction: boolean;
  onRunSegmentation?: () => void;
  isSegmenting?: boolean;
  elapsedSeconds?: number;
}

export const OrthogonalViewer: React.FC<OrthogonalViewerProps> = ({
  runId,
  hasPrediction,
  onRunSegmentation,
  isSegmenting = false,
  elapsedSeconds = 0,
}) => {
  const [volInfo, setVolInfo] = useState<VolumeInfoResponse | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState<boolean>(true);
  const [selectedModality, setSelectedModality] = useState<string>('t1');

  // Slices
  const [axialSlice, setAxialSlice] = useState<number>(64);
  const [coronalSlice, setCoronalSlice] = useState<number>(64);
  const [sagittalSlice, setSagittalSlice] = useState<number>(64);

  // Region Toggles
  const [showWT, setShowWT] = useState<boolean>(true);
  const [showTC, setShowTC] = useState<boolean>(true);
  const [showET, setShowET] = useState<boolean>(true);

  // Windowing
  const [brightness, setBrightness] = useState<number>(1.0);
  const [contrast, setContrast] = useState<number>(1.0);

  // Layout View
  const [activeLayout, setActiveLayout] = useState<'mpr' | '3d'>('mpr');
  const [showCrosshairs, setShowCrosshairs] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    api.getVolumeInfo(runId)
      .then((info) => {
        if (!isMounted || !info) return;
        setVolInfo(info);
        const ax = info.planes?.axial?.default_slice ?? (info.planes?.axial?.count ? Math.floor(info.planes.axial.count / 2) : 64);
        const co = info.planes?.coronal?.default_slice ?? (info.planes?.coronal?.count ? Math.floor(info.planes.coronal.count / 2) : 64);
        const sa = info.planes?.sagittal?.default_slice ?? (info.planes?.sagittal?.count ? Math.floor(info.planes.sagittal.count / 2) : 64);
        setAxialSlice(ax);
        setCoronalSlice(co);
        setSagittalSlice(sa);
        if (Array.isArray(info.modalities) && info.modalities.length > 0) {
          setSelectedModality(info.modalities.includes('t1gd') ? 't1gd' : info.modalities[0]);
        }
      })
      .catch((err) => {
        console.error('Error fetching volume info:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingInfo(false);
      });

    return () => {
      isMounted = false;
    };
  }, [runId, hasPrediction]);

  const handleShowAllRegions = () => {
    setShowWT(true);
    setShowTC(true);
    setShowET(true);
  };

  const handleHideAllRegions = () => {
    setShowWT(false);
    setShowTC(false);
    setShowET(false);
  };

  const handleResetView = () => {
    setBrightness(1.0);
    setContrast(1.0);
    if (volInfo?.planes) {
      setAxialSlice(volInfo.planes.axial?.default_slice ?? (volInfo.planes.axial?.count ? Math.floor(volInfo.planes.axial.count / 2) : 64));
      setCoronalSlice(volInfo.planes.coronal?.default_slice ?? (volInfo.planes.coronal?.count ? Math.floor(volInfo.planes.coronal.count / 2) : 64));
      setSagittalSlice(volInfo.planes.sagittal?.default_slice ?? (volInfo.planes.sagittal?.count ? Math.floor(volInfo.planes.sagittal.count / 2) : 64));
    }
  };

  const maxAxial = volInfo?.planes?.axial?.max_slice ?? (volInfo?.planes?.axial?.count ? volInfo.planes.axial.count - 1 : 155);
  const maxCoronal = volInfo?.planes?.coronal?.max_slice ?? (volInfo?.planes?.coronal?.count ? volInfo.planes.coronal.count - 1 : 240);
  const maxSagittal = volInfo?.planes?.sagittal?.max_slice ?? (volInfo?.planes?.sagittal?.count ? volInfo.planes.sagittal.count - 1 : 240);

  // Build active regions parameter
  const activeRegionsList: string[] = [];
  if (showWT) activeRegionsList.push('WT');
  if (showTC) activeRegionsList.push('TC');
  if (showET) activeRegionsList.push('ET');
  const regionsParam = activeRegionsList.join(',');

  const axialUrl = api.getViewerSliceUrl(runId, {
    modality: selectedModality,
    plane: 'axial',
    index: axialSlice,
    regions: regionsParam,
    brightness,
    contrast,
  });

  const coronalUrl = api.getViewerSliceUrl(runId, {
    modality: selectedModality,
    plane: 'coronal',
    index: coronalSlice,
    regions: regionsParam,
    brightness,
    contrast,
  });

  const sagittalUrl = api.getViewerSliceUrl(runId, {
    modality: selectedModality,
    plane: 'sagittal',
    index: sagittalSlice,
    regions: regionsParam,
    brightness,
    contrast,
  });

  return (
    <div className="space-y-6 py-6 max-w-7xl mx-auto">
      {/* Workspace Banner */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-sky-50 text-cyan flex items-center justify-center shrink-0">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h3 className="text-base font-extrabold text-navy">Study Analysis Workspace</h3>
              <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                Run: {runId.slice(0, 8)}...
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  hasPrediction
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-sky-50 text-sky-800 border border-sky-200'
                }`}
              >
                {hasPrediction ? 'SEGMENTED' : 'VALIDATED'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {volInfo
                ? (() => {
                    const dims = Array.isArray(volInfo.shape)
                      ? volInfo.shape.join(' × ')
                      : Array.isArray(volInfo.dimensions)
                      ? volInfo.dimensions.join(' × ')
                      : volInfo.shape
                      ? `${volInfo.shape.x ?? 240} × ${volInfo.shape.y ?? 240} × ${volInfo.shape.z ?? 155}`
                      : '240 × 240 × 155';
                    const spc = Array.isArray(volInfo.spacing)
                      ? volInfo.spacing.join(' × ')
                      : Array.isArray(volInfo.voxel_spacing)
                      ? volInfo.voxel_spacing.join(' × ')
                      : volInfo.zooms
                      ? `${volInfo.zooms.x ?? 1.0} × ${volInfo.zooms.y ?? 1.0} × ${volInfo.zooms.z ?? 1.0}`
                      : '1.0 × 1.0 × 1.0';
                    return `Dimensions: ${dims} voxels • Spacing: ${spc} mm`;
                  })()
                : isLoadingInfo
                ? 'Reading volume geometry...'
                : 'Geometry details unavailable'}
            </p>
          </div>
        </div>

        {/* Action Button: Run Segmentation */}
        <div className="flex items-center gap-3">
          {!hasPrediction && onRunSegmentation && (
            <button
              type="button"
              onClick={onRunSegmentation}
              disabled={isSegmenting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-mint hover:bg-mint-dark text-white font-bold text-xs shadow-mint-glow transition-all disabled:opacity-50"
            >
              {isSegmenting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Segmenting ({elapsedSeconds}s)...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Run Segmentation</span>
                </>
              )}
            </button>
          )}

          {hasPrediction && (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <CheckCircle2 className="w-4 h-4 text-mint" />
              <span>Inference Complete</span>
            </div>
          )}
        </div>
      </div>

      {/* Viewport Controls Ribbon */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-card flex flex-wrap items-center justify-between gap-4">
        {/* Modality Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Modality:</span>
          {['t1', 't1gd', 't2', 'flair'].map((mod) => (
            <button
              key={mod}
              type="button"
              onClick={() => setSelectedModality(mod)}
              className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${
                selectedModality === mod
                  ? 'bg-navy text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:text-navy hover:bg-slate-200'
              }`}
            >
              {mod}
            </button>
          ))}
        </div>

        {/* Region Toggles */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Regions:</span>

          <button
            type="button"
            onClick={() => setShowWT(!showWT)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              showWT
                ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                : 'bg-white border-slate-200 text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-tumor-wt" />
            <span>WT</span>
            {showWT ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowTC(!showTC)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              showTC
                ? 'bg-amber-50 border-amber-300 text-amber-900'
                : 'bg-white border-slate-200 text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-tumor-tc" />
            <span>TC</span>
            {showTC ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setShowET(!showET)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border transition-all ${
              showET
                ? 'bg-rose-50 border-rose-300 text-rose-900'
                : 'bg-white border-slate-200 text-slate-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-tumor-et" />
            <span>ET</span>
            {showET ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={handleShowAllRegions}
            className="text-xs font-semibold text-cyan hover:underline ml-1"
          >
            All
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={handleHideAllRegions}
            className="text-xs font-semibold text-slate-500 hover:underline"
          >
            None
          </button>
        </div>

        {/* Layout Switcher & Reset */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveLayout(activeLayout === 'mpr' ? '3d' : 'mpr')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
              activeLayout === '3d'
                ? 'bg-sky-50 border-sky-300 text-sky-800'
                : 'bg-white border-slate-200 text-navy hover:bg-slate-50'
            }`}
          >
            {activeLayout === '3d' ? <LayoutGrid className="w-3.5 h-3.5" /> : <Box className="w-3.5 h-3.5" />}
            <span>{activeLayout === '3d' ? 'Toggle MPR View' : 'Toggle 3D View'}</span>
          </button>

          <button
            type="button"
            onClick={handleResetView}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all"
            title="Reset Brightness, Contrast & Slices"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* Windowing Sliders Ribbon */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-6 text-xs">
        {/* Brightness */}
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <Sun className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600 w-16">Brightness:</span>
          <input
            type="range"
            min="0.5"
            max="2.0"
            step="0.05"
            value={brightness}
            onChange={(e) => setBrightness(parseFloat(e.target.value))}
            aria-label="Adjust slice brightness"
            className="flex-1 accent-cyan cursor-pointer"
          />
          <span className="font-mono w-8 text-right text-slate-700">{brightness.toFixed(2)}</span>
        </div>

        {/* Contrast */}
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <Contrast className="w-4 h-4 text-slate-400" />
          <span className="font-semibold text-slate-600 w-16">Contrast:</span>
          <input
            type="range"
            min="0.5"
            max="2.5"
            step="0.05"
            value={contrast}
            onChange={(e) => setContrast(parseFloat(e.target.value))}
            aria-label="Adjust slice contrast"
            className="flex-1 accent-cyan cursor-pointer"
          />
          <span className="font-mono w-8 text-right text-slate-700">{contrast.toFixed(2)}</span>
        </div>

        {/* Coordinate Crosshairs */}
        <label className="flex items-center gap-2 cursor-pointer font-semibold text-navy ml-auto select-none">
          <input
            type="checkbox"
            checked={showCrosshairs}
            onChange={(e) => setShowCrosshairs(e.target.checked)}
            className="accent-cyan rounded"
          />
          <span>Show Coordinate Crosshairs</span>
        </label>
      </div>

      {/* Main Viewports */}
      {activeLayout === '3d' ? (
        <div className="h-[620px]">
          <MeshViewer3D
            runId={runId}
            hasPrediction={hasPrediction}
            showWT={showWT}
            showTC={showTC}
            showET={showET}
            onToggleRegion={(reg) => {
              if (reg === 'WT') setShowWT(!showWT);
              if (reg === 'TC') setShowTC(!showTC);
              if (reg === 'ET') setShowET(!showET);
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* 1. Axial View (Transverse) */}
          <div className="bg-slate-950 rounded-2xl overflow-hidden flex flex-col border border-slate-800 shadow-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
              <span className="text-xs font-extrabold text-cyan-light">Axial View (Z-Axis)</span>
              <span className="text-xs font-mono text-slate-400">
                Slice {axialSlice} / {maxAxial}
              </span>
            </div>

            <div className="relative flex-1 min-h-[300px] flex items-center justify-center bg-black overflow-hidden">
              <img
                src={axialUrl}
                alt={`Axial slice ${axialSlice}`}
                className="max-w-full max-h-[360px] object-contain select-none"
              />

              {showCrosshairs && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="absolute w-full h-[1px] bg-sky-400/35" />
                  <div className="absolute h-full w-[1px] bg-sky-400/35" />
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-800 bg-slate-900/60">
              <input
                type="range"
                min="0"
                max={maxAxial}
                value={axialSlice}
                onChange={(e) => setAxialSlice(parseInt(e.target.value, 10))}
                aria-label="Axial slice position"
                className="w-full accent-cyan cursor-pointer"
              />
            </div>
          </div>

          {/* 2. Coronal View (Frontal) */}
          <div className="bg-slate-950 rounded-2xl overflow-hidden flex flex-col border border-slate-800 shadow-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
              <span className="text-xs font-extrabold text-mint">Coronal View (Y-Axis)</span>
              <span className="text-xs font-mono text-slate-400">
                Slice {coronalSlice} / {maxCoronal}
              </span>
            </div>

            <div className="relative flex-1 min-h-[300px] flex items-center justify-center bg-black overflow-hidden">
              <img
                src={coronalUrl}
                alt={`Coronal slice ${coronalSlice}`}
                className="max-w-full max-h-[360px] object-contain select-none"
              />

              {showCrosshairs && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="absolute w-full h-[1px] bg-emerald-400/35" />
                  <div className="absolute h-full w-[1px] bg-emerald-400/35" />
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-800 bg-slate-900/60">
              <input
                type="range"
                min="0"
                max={maxCoronal}
                value={coronalSlice}
                onChange={(e) => setCoronalSlice(parseInt(e.target.value, 10))}
                aria-label="Coronal slice position"
                className="w-full accent-mint cursor-pointer"
              />
            </div>
          </div>

          {/* 3. Sagittal View (Lateral) */}
          <div className="bg-slate-950 rounded-2xl overflow-hidden flex flex-col border border-slate-800 shadow-card">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
              <span className="text-xs font-extrabold text-amber">Sagittal View (X-Axis)</span>
              <span className="text-xs font-mono text-slate-400">
                Slice {sagittalSlice} / {maxSagittal}
              </span>
            </div>

            <div className="relative flex-1 min-h-[300px] flex items-center justify-center bg-black overflow-hidden">
              <img
                src={sagittalUrl}
                alt={`Sagittal slice ${sagittalSlice}`}
                className="max-w-full max-h-[360px] object-contain select-none"
              />

              {showCrosshairs && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="absolute w-full h-[1px] bg-amber-400/35" />
                  <div className="absolute h-full w-[1px] bg-amber-400/35" />
                </div>
              )}
            </div>

            <div className="p-3.5 border-t border-slate-800 bg-slate-900/60">
              <input
                type="range"
                min="0"
                max={maxSagittal}
                value={sagittalSlice}
                onChange={(e) => setSagittalSlice(parseInt(e.target.value, 10))}
                aria-label="Sagittal slice position"
                className="w-full accent-amber cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default OrthogonalViewer;
