import { create } from 'zustand';
import type { ActiveTab } from '../types/api';

interface StudyState {
  activeTab: ActiveTab;
  currentRunId: string | null;
  activeFilenames: Record<string, string>;
  studyDetails: any | null;
  segmentationResults: any | null;
  hasPrediction: boolean;
  health: any | null;
  isSegmenting: boolean;
  segmentElapsedSeconds: number;
  mobileMenuOpen: boolean;
  setActiveTab: (tab: ActiveTab) => void;
  setRunId: (id: string | null) => void;
  setActiveFilenames: (files: Record<string, string>) => void;
  setStudyDetails: (details: any | null) => void;
  setSegmentationResults: (results: any | null) => void;
  setHasPrediction: (value: boolean) => void;
  setHealth: (health: any) => void;
  setIsSegmenting: (value: boolean) => void;
  setSegmentElapsedSeconds: (value: number) => void;
  setMobileMenuOpen: (value: boolean) => void;
  resetViewer: () => void;
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
  mobileMenuOpen: false,
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
  setMobileMenuOpen: (mobileMenuOpen) => set({ mobileMenuOpen }),
  resetViewer: () => {
    if (typeof window !== 'undefined') localStorage.removeItem('neuroscope.currentRunId');
    set({
      activeTab: 'upload',
      currentRunId: null,
      activeFilenames: {},
      studyDetails: null,
      segmentationResults: null,
      hasPrediction: false,
      isSegmenting: false,
      segmentElapsedSeconds: 0,
      mobileMenuOpen: false,
    });
  },
}));
