import React, { useState } from 'react';
import { BrainVisualization } from './BrainVisualization';
import { authService } from '../../services/authService';
import { useStudyStore } from '../../store/studyStore';
import { Button } from '../ui/Button';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Info
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

    if (!email || !password) {
      setErrorMessage('Please enter both your email address and research passcode.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.login(email, password);
    } catch (_err) {
      // Surface honest explanation that backend authentication is unconfigured
      setErrorMessage(
        "Account sign-in isn't enabled on this server — continue in open workspace mode."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 rounded-2xl overflow-hidden bg-surface border border-surface-border shadow-card">
        
        {/* Left Column (45%): 3D Brain & Real Platform Identity */}
        <div className="md:col-span-5 bg-surface-elevated p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-surface-border">
          <div>
            <div className="flex items-center space-x-2 text-cyan-400 mb-4">
              <ShieldCheck className="w-5 h-5" />
              <span className="font-mono text-xs tracking-wider uppercase font-semibold">
                NeuroScan Platform
              </span>
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Clinical & Lab Workstation
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Standardized deep learning environment for multi-sequence brain MRI segmentation, physical volumetrics, and clinical report downloads.
            </p>
          </div>

          <div className="my-4 h-48 w-full flex items-center justify-center">
            <BrainVisualization />
          </div>

          <div className="pt-4 border-t border-surface-border text-[11px] text-slate-500 font-mono">
            NeuroScope-3D • MONAI SegResNet Engine
          </div>
        </div>

        {/* Right Column (55%): Login Form with Honest Status */}
        <div className="md:col-span-7 p-8 md:p-10 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setActiveTab('landing')}
                className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-cyan-400 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Overview</span>
              </button>

              <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/30">
                Server Mode: Open Academic
              </span>
            </div>

            <h3 className="text-xl font-bold text-white mb-1">Sign in to NeuroScan</h3>
            <p className="text-xs text-slate-400 mb-6">
              Enter your credential profile or proceed directly to open workspace.
            </p>

            {/* Honest Server Notice */}
            <div className="p-3.5 mb-5 rounded-lg bg-surface-elevated border border-amber-500/30 flex items-start space-x-3 text-xs text-slate-300">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-amber-300 mb-0.5">Authentication Boundary Notice</p>
                <p className="text-slate-400 leading-normal text-[11px]">
                  The backend FastAPI instance is running in open-access academic mode without a persistent user directory. All MRI validation, AI inference, and volumetric tools are directly accessible.
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 mb-5 rounded-lg bg-amber-950/40 border border-amber-500/40 flex items-start space-x-2.5 text-xs text-amber-200">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
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
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-10 pr-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Passcode
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-10 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
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

              <div className="pt-2 flex flex-col gap-2.5">
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={() => setActiveTab('workspace')}
                  className="w-full flex items-center justify-center space-x-1.5"
                >
                  <span>Continue to Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </form>
          </div>

          <div className="pt-4 border-t border-surface-border text-center">
            <p className="text-[11px] text-slate-500">
              Open Academic Mode • Zero registration required
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
export default LoginPage;
