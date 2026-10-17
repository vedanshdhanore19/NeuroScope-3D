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
  isAuthenticated: boolean;
  userEmail: string | null;
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
  login: (email: string) => void;
  logout: () => void;
  resetViewer: () => void;
}

const persistedRun = typeof window !== 'undefined' ? localStorage.getItem('neuroscope.currentRunId') : null;
const persistedAuthRaw = typeof window !== 'undefined' ? localStorage.getItem('neuroscope.auth') : null;
let initialAuth = false;
let initialEmail: string | null = null;
if (persistedAuthRaw) {
  try {
    const parsed = JSON.parse(persistedAuthRaw);
    initialAuth = !!parsed?.email;
    initialEmail = parsed?.email ?? null;
  } catch {
    initialAuth = false;
  }
}

// Check if pathname requests /login explicitly or if unauthenticated on entry
const isLoginPath = typeof window !== 'undefined' && (
  window.location.pathname === '/login' ||
  window.location.pathname.endsWith('/login.html') ||
  window.location.hash === '#/login'
);
const initialTab: ActiveTab = isLoginPath || !initialAuth ? 'login' : 'dashboard';

export const useStudyStore = create<StudyState>((set) => ({
  activeTab: initialTab,
  currentRunId: persistedRun,
  activeFilenames: {},
  studyDetails: null,
  segmentationResults: null,
  hasPrediction: false,
  health: null,
  isSegmenting: false,
  segmentElapsedSeconds: 0,
  mobileMenuOpen: false,
  isAuthenticated: initialAuth,
  userEmail: initialEmail,
  setActiveTab: (activeTab) => {
    if (typeof window !== 'undefined') {
      if (activeTab === 'login') {
        if (window.location.pathname !== '/login') {
          window.history.pushState({}, '', '/login');
        }
      } else if (window.location.pathname === '/login') {
        window.history.pushState({}, '', '/');
      }
    }
    set({ activeTab });
  },
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
  login: (email: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('neuroscope.auth', JSON.stringify({ email, timestamp: Date.now() }));
      if (window.location.pathname === '/login') {
        window.history.pushState({}, '', '/');
      }
    }
    set({ isAuthenticated: true, userEmail: email, activeTab: 'dashboard' });
  },
  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('neuroscope.auth');
      window.history.pushState({}, '', '/login');
    }
    set({ isAuthenticated: false, userEmail: null, activeTab: 'login' });
  },
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
