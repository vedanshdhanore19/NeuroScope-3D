import React, { useEffect, useRef, useState } from 'react';
import { useStudyStore } from './store/studyStore';
import { api } from './services/api';
import { ValidationResponse } from './types/api';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { Toast, ToastMessage } from './components/ui/Toast';
import { HeroSection } from './components/landing/HeroSection';
import { StudyUpload } from './components/upload/StudyUpload';
import { OrthogonalViewer } from './components/viewer/OrthogonalViewer';
import { ResultsDashboard } from './components/results/ResultsDashboard';
import { ReportExport } from './components/reports/ReportExport';
import {
  UploadCloud,
  BarChart2,
  FileText,
  Play,
  ArrowRight,
} from 'lucide-react';

export const App: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    currentRunId,
    setRunId,
    setActiveFilenames,
    setStudyDetails,
    segmentationResults,
    setSegmentationResults,
    hasPrediction,
    setHasPrediction,
    setHealth,
    isSegmenting,
    setIsSegmenting,
    segmentElapsedSeconds,
    setSegmentElapsedSeconds,
  } = useStudyStore();

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const segmentTimerRef = useRef<number | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
  };

  // Poll backend health status with latency every 15s
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const h = await api.checkHealthWithLatency();
        setHealth(h);
      } catch {
        setHealth({ status: 'offline', latencyMs: 0 });
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, [setHealth]);

  // Restore study details on mount if currentRunId is saved in localStorage
  useEffect(() => {
    if (!currentRunId) return;

    api.getStudy(currentRunId)
      .then((details) => {
        setStudyDetails(details);
        if (details.volumes && Object.keys(details.volumes).length > 0) {
          setHasPrediction(true);
          setSegmentationResults({
            run_id: details.run_id,
            status: details.status,
            inference_time_seconds: details.inference_time_seconds || 0,
            volumes: details.volumes,
            metrics: details.metrics ?? null,
            prediction_download_url: api.getPredictionDownloadUrl(details.run_id),
            report_download_url: api.getReportDownloadUrl(details.run_id),
          });
        }
      })
      .catch((err: any) => {
        if (err.response?.status === 404) {
          setRunId(null);
          setStudyDetails(null);
          setSegmentationResults(null);
          setHasPrediction(false);
          showToast('info', 'Previous study session expired or was cleared.');
        } else {
          console.warn('Could not restore previous study:', err);
        }
      });
  }, [currentRunId, setHasPrediction, setRunId, setSegmentationResults, setStudyDetails]);

  // Validation success callback
  const handleValidationSuccess = (result: ValidationResponse, filenames: Record<string, string>) => {
    setRunId(result.run_id);
    setActiveFilenames(filenames);
    setSegmentationResults(null);
    setHasPrediction(false);

    showToast('success', `Study validated successfully! Provenance SHA-256 registered.`);
    setActiveTab('viewer');
  };

  // Run Segmentation action
  const handleRunSegmentation = async () => {
    if (!currentRunId || isSegmenting) return;

    setIsSegmenting(true);
    setSegmentElapsedSeconds(0);
    const startTimestamp = Date.now();

    segmentTimerRef.current = window.setInterval(() => {
      setSegmentElapsedSeconds(Math.round((Date.now() - startTimestamp) / 1000));
    }, 500);

    try {
      const results = await api.runSegmentation(currentRunId);
      setSegmentationResults(results);
      setHasPrediction(true);

      // Refresh study record
      const updatedDetails = await api.getStudy(currentRunId);
      setStudyDetails(updatedDetails);

      showToast(
        'success',
        `Segmentation completed in ${results.inference_time_seconds.toFixed(2)}s!`
      );
      setActiveTab('viewer');
    } catch (err: any) {
      console.error('Segmentation error:', err);
      const detail = err.response?.data?.detail;
      const msg = typeof detail === 'string' ? detail : detail?.message || err.message || 'Inference error';
      showToast('error', `Segmentation failed: ${msg}`);
    } finally {
      setIsSegmenting(false);
      if (segmentTimerRef.current) {
        clearInterval(segmentTimerRef.current);
        segmentTimerRef.current = null;
      }
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-bg-primary text-navy font-sans antialiased selection:bg-cyan/15 selection:text-cyan">
      {/* Top Clinical Navbar */}
      <Navbar onOpenAuth={() => setActiveTab('dashboard')} />

      {/* Toast Notification */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {/* TAB 1: DASHBOARD */}
        {activeTab === 'dashboard' && (
          <HeroSection
            onStartUpload={() => setActiveTab('upload')}
            onExploreViewer={() => setActiveTab('viewer')}
            onRunSegmentation={handleRunSegmentation}
            isSegmenting={isSegmenting}
            segmentElapsed={segmentElapsedSeconds}
          />
        )}

        {/* TAB 2: UPLOAD */}
        {activeTab === 'upload' && (
          <StudyUpload
            onValidationSuccess={handleValidationSuccess}
            onErrorToast={(msg) => showToast('error', msg)}
          />
        )}

        {/* TAB 3: VIEWER */}
        {activeTab === 'viewer' &&
          (currentRunId ? (
            <OrthogonalViewer
              runId={currentRunId}
              hasPrediction={hasPrediction}
              onRunSegmentation={handleRunSegmentation}
              isSegmenting={isSegmenting}
              elapsedSeconds={segmentElapsedSeconds}
            />
          ) : (
            <div className="py-24 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-sky-50 text-cyan flex items-center justify-center mx-auto shadow-sm">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-navy">No Active Study Loaded</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Please upload 4 MRI sequences (T1, T1Gd, T2, FLAIR) or an MSD Task01 dataset case to
                start orthogonal multiplanar inspection.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-bold shadow-md transition-all"
              >
                <span>Upload MRI Study</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ))}

        {/* TAB 4: RESULTS */}
        {activeTab === 'results' &&
          (segmentationResults ? (
            <ResultsDashboard
              results={segmentationResults}
              onStartNewStudy={() => setActiveTab('upload')}
              onExploreViewer={() => setActiveTab('viewer')}
            />
          ) : (
            <div className="py-24 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-sm">
                <BarChart2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-navy">No Volumetric Results Yet</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Run deep learning segmentation on a validated study to quantify Whole Tumor (WT),
                Tumor Core (TC), and Enhancing Tumor (ET) physical volumes.
              </p>
              {currentRunId ? (
                <button
                  type="button"
                  onClick={handleRunSegmentation}
                  disabled={isSegmenting}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-mint hover:bg-mint-dark text-white text-xs font-bold shadow-mint-glow transition-all disabled:opacity-50"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {isSegmenting
                      ? `Segmenting (${segmentElapsedSeconds}s)...`
                      : 'Run Segmentation Now'}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-bold shadow-md transition-all"
                >
                  <span>Upload Study Ingestion</span>
                </button>
              )}
            </div>
          ))}

        {/* TAB 5: REPORTS */}
        {activeTab === 'reports' &&
          (currentRunId ? (
            <ReportExport
              runId={currentRunId}
              hasPrediction={hasPrediction}
              onStartNewStudy={() => setActiveTab('upload')}
              onExploreViewer={() => setActiveTab('viewer')}
            />
          ) : (
            <div className="py-24 text-center max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-sm">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-extrabold text-navy">No Active Study for Reports</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Clinical PDF dossiers and NIfTI prediction exports require an active study run.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('upload')}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-bold shadow-md transition-all"
              >
                <span>Start New Study</span>
              </button>
            </div>
          ))}
      </main>

      {/* Clinical Footer */}
      <Footer />
    </div>
  );
};
export default App;
