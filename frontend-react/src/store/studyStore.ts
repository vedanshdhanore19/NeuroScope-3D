import { create } from 'zustand';

interface StudyState {
  activeTab: 'dashboard' | 'upload' | 'viewer' | 'results' | 'reports';
  currentRunId: string | null;
  activeFilenames: Record<string, string>;
  studyDetails: any | null;
  segmentationResults: any | null;
  hasPrediction: boolean;
  health: any | null;
  isSegmenting: boolean;
  segmentElapsedSeconds: number;
  setActiveTab: (tab: StudyState['activeTab']) => void;
  setRunId: (id: string | null) => void;
  setActiveFilenames: (files: Record<string, string>) => void;
  setStudyDetails: (details: any | null) => void;
  setSegmentationResults: (results: any | null) => void;
  setHasPrediction: (value: boolean) => void;
  setHealth: (health: any) => void;
  setIsSegmenting: (value: boolean) => void;
  setSegmentElapsedSeconds: (value: number) => void;
}

const persistedRun = typeof window !== 'undefined' ? localStorage.getItem('neuroscope.currentRunId') : null;

export const useStudyStore = create<StudyState>((set) => ({
  activeTab: 'dashboard',
  currentRunId: persistedRun,
  activeFilenames: {},
  studyDetails: null,
  segmentationResults: null,
  hasPrediction: false,
  health: null,
  isSegmenting: false,
  segmentElapsedSeconds: 0,
  setActiveTab: (activeTab) => set({ activeTab }),
  setRunId: (currentRunId) => {
    if (typeof window !== 'undefined') {
      if (currentRunId) localStorage.setItem('neuroscope.currentRunId', currentRunId);
      else localStorage.removeItem('neuroscope.currentRunId');
    }
    set({ currentRunId });
  },
  setActiveFilenames: (activeFilenames) => set({ activeFilenames }),
  setStudyDetails: (studyDetails) => set({ studyDetails }),
  setSegmentationResults: (segmentationResults) => set({ segmentationResults }),
  setHasPrediction: (hasPrediction) => set({ hasPrediction }),
  setHealth: (health) => set({ health }),
  setIsSegmenting: (isSegmenting) => set({ isSegmenting }),
  setSegmentElapsedSeconds: (segmentElapsedSeconds) => set({ segmentElapsedSeconds }),
}));
