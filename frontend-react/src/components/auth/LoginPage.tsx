import React, { useState } from 'react';
import { BrainVisualization } from './BrainVisualization';
import { authService } from '../../services/authService';
import { useStudyStore } from '../../store/studyStore';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  ArrowLeft,
  ShieldAlert,
  Terminal
} from 'lucide-react';

export function LoginPage() {
  const { setActiveTab } = useStudyStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic client validation
    if (!email || !password) {
      setErrorMessage('Please enter both your email address and research passcode.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.login(email, password);
    } catch (err: any) {
      // Honestly present that backend authentication provider is unconfigured
      setErrorMessage(
        err.message || 'Authentication provider unconfigured on current backend.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 rounded-2xl overflow-hidden glass-panel border-cyan-500/20 shadow-glow-cyan/20">
        
        {/* Left Column (45%): 3D Brain & Branding */}
        <div className="md:col-span-5 bg-gradient-to-b from-slate-950 to-slate-900/90 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 mb-6">
              <Terminal className="w-5 h-5" />
              <span className="font-mono text-xs tracking-wider uppercase font-semibold">
                NeuroScan Auth Terminal
              </span>
            </div>

            <h2 className="text-2xl font-bold text-white mb-2">
              Clinical & Lab Access
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Authenticate session to unlock patient archive exports, custom SegResNet inference fine-tuning, and audit logs.
            </p>
          </div>

          <div className="my-4 h-48 w-full flex items-center justify-center">
            <BrainVisualization />
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
            NeuroScope-3D v1.0.0-rc2 • Node Auth Protocol
          </div>
        </div>

        {/* Right Column (55%): Login Form with Explicit Status */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setActiveTab('landing')}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Overview</span>
              </button>

              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Auth Status: Standalone Mode
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Sign in to NeuroScan</h3>
            <p className="text-xs text-slate-400 mb-6">
              Enter your credential profile or proceed directly to open workspace.
            </p>

            {/* Backend Unconfigured Notice */}
            <div className="p-3.5 mb-6 rounded-lg bg-slate-900/80 border border-amber-500/30 flex items-start space-x-3">
              <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-slate-300">
                <p className="font-medium text-amber-300 mb-0.5">Authentication Boundary Notice</p>
                <p className="text-slate-400 leading-normal">
                  The backend FastAPI instance is running in open-access academic mode without a persistent user directory. All segmentation and volumetric tools are directly accessible.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 mb-6 rounded-lg bg-red-950/40 border border-red-500/40 flex items-start space-x-2.5 text-xs text-red-300">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="researcher@hospital.org"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Passcode / API Key
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-900/90 border border-slate-700/80 rounded-lg pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-semibold text-xs transition-all shadow-glow-cyan flex items-center justify-center space-x-2"
              >
                <span>{isSubmitting ? 'Authenticating...' : 'Sign In to Workspace'}</span>
              </button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800 text-center">
            <button
              onClick={() => setActiveTab('workspace')}
              className="text-xs text-cyan-400 hover:underline font-medium"
            >
              Continue without authentication → Open Academic Workspace
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
