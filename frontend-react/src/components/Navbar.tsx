import React from 'react';
import { useStudyStore } from '../store/studyStore';
import { ActiveTab } from '../types/api';
import { Brain, Layers, BarChart2, FileText, UploadCloud, Plus, Menu, X, Lock } from 'lucide-react';

interface NavbarProps {
  onOpenAuth: () => void;
  onRefreshHealth?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth, onRefreshHealth }) => {
  const { activeTab, setActiveTab, currentRunId, hasPrediction, health, resetViewer, mobileMenuOpen, setMobileMenuOpen } = useStudyStore();
  // FastAPI /health returns status="healthy"; older frontend code expected "online".
  const isOnline = health?.status === 'healthy' || health?.status === 'online';
  const isModelReady = health?.model?.ready_for_inference ?? health?.data?.model?.ready_for_inference ?? false;
  const tabs: { id: ActiveTab; label: string; icon: React.ReactNode; requiresPrediction?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <Brain className="w-4 h-4" /> },
    { id: 'upload', label: 'New Study', icon: <UploadCloud className="w-4 h-4" /> },
    { id: 'viewer', label: 'MRI Viewer', icon: <Layers className="w-4 h-4" /> },
    { id: 'results', label: 'Results', icon: <BarChart2 className="w-4 h-4" />, requiresPrediction: true },
    { id: 'reports', label: 'Reports', icon: <FileText className="w-4 h-4" />, requiresPrediction: true },
  ];
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
        <div onClick={() => setActiveTab('dashboard')} className="flex items-center space-x-3 cursor-pointer group select-none">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0b192c] to-[#0284c7] flex items-center justify-center text-white shadow-md group-hover:scale-105 transition-transform"><Brain className="w-5 h-5 text-cyan-300" /></div>
          <div><div className="flex items-center space-x-1.5"><span className="text-base font-extrabold tracking-tight text-navy">NeuroScope</span><span className="text-xs px-1.5 py-0.5 rounded-full bg-cyan-50 text-cyan-700 font-bold border border-cyan-200">3D</span></div><p className="text-[10px] text-slate-500 font-medium tracking-wide">BraTS SegResNet Protocol</p></div>
        </div>
        <nav className="hidden md:flex items-center p-1 rounded-full bg-slate-100 border border-slate-200/80">
          {tabs.map((tab) => { const disabled = !!tab.requiresPrediction && !hasPrediction; return <button key={tab.id} onClick={() => !disabled && setActiveTab(tab.id)} disabled={disabled} className={`relative px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center space-x-1.5 select-none ${activeTab === tab.id ? 'bg-navy text-white shadow-sm' : disabled ? 'text-slate-400 cursor-not-allowed opacity-60' : 'text-slate-600 hover:text-navy hover:bg-white/60'}`}><span>{tab.label}</span>{tab.id === 'viewer' && currentRunId && <span className="w-2 h-2 rounded-full bg-mint shadow-[0_0_6px_#00d690]" />}</button>; })}
        </nav>
        <div className="hidden sm:flex items-center space-x-3">
          <button type="button" onClick={onRefreshHealth} title="Click to refresh health latency" className={`flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-mono font-medium border cursor-pointer hover:opacity-90 transition-opacity ${isOnline ? (isModelReady ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200') : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-mint animate-pulse' : 'bg-slate-400'}`} />
            <span>{isOnline ? `Online (${health?.latencyMs ?? 0}ms)` : 'Connecting…'}</span>
          </button>
          <button onClick={resetViewer} className="px-4 py-2 rounded-full bg-navy hover:bg-navy-dark text-white text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center space-x-1.5 active:scale-95"><Plus className="w-3.5 h-3.5" /><span>New Analysis</span></button>
          <button onClick={onOpenAuth} className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors border border-slate-200" title="Sign In"><Lock className="w-4 h-4 text-slate-600" /></button>
        </div>
        <div className="flex md:hidden items-center space-x-2"><button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 rounded-xl bg-slate-100 text-slate-700" aria-label="Toggle Navigation">{mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}</button></div>
      </div>
      {mobileMenuOpen && <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2 shadow-lg">{tabs.map((tab) => { const disabled = !!tab.requiresPrediction && !hasPrediction; return <button key={tab.id} onClick={() => { if (!disabled) { setActiveTab(tab.id); setMobileMenuOpen(false); } }} disabled={disabled} className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-semibold flex items-center justify-between ${activeTab === tab.id ? 'bg-navy text-white' : disabled ? 'text-slate-400 opacity-60' : 'text-slate-700 hover:bg-slate-50'}`}><div className="flex items-center space-x-2.5">{tab.icon}<span>{tab.label}</span></div>{tab.id === 'viewer' && currentRunId && <span className="w-2 h-2 rounded-full bg-mint" />}</button>; })}<div className="pt-3 border-t border-slate-100 flex flex-col gap-2"><button onClick={() => { resetViewer(); setMobileMenuOpen(false); }} className="w-full py-2.5 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center space-x-1.5"><Plus className="w-4 h-4" /><span>Start New Analysis</span></button><button onClick={() => { onOpenAuth(); setMobileMenuOpen(false); }} className="w-full py-2 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 border border-slate-200"><Lock className="w-3.5 h-3.5" /><span>Sign In / Access Controls</span></button></div></div>}
    </header>
  );
};
