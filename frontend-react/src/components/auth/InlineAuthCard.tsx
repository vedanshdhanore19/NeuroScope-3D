import React, { useState } from 'react';
import { authService } from '../../services/authService';
import { useStudyStore } from '../../store/studyStore';
import { Button } from '../ui/Button';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Info
} from 'lucide-react';

export function InlineAuthCard() {
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
      setErrorMessage('Please enter both email and passcode.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authService.login(email, password);
    } catch (_err) {
      // Surface honest error notice without fake credentials
      setErrorMessage(
        "Account sign-in isn't enabled on this server — continue in open workspace mode."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-surface p-5 rounded-2xl border border-surface-border shadow-card space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-surface-border">
        <div className="flex items-center space-x-2">
          <Lock className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-bold text-white tracking-wide uppercase">
            Workstation Sign-In
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-surface-elevated px-2 py-0.5 rounded border border-surface-border">
          Academic Mode
        </span>
      </div>

      {errorMessage && (
        <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 flex items-start space-x-2 text-xs text-amber-200">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">Server Authentication Notice</p>
            <p className="text-[11px] text-slate-300">{errorMessage}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="block text-[11px] font-medium text-slate-300 mb-1">
            Institutional Email
          </label>
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="radiology@hospital.org"
              className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-300 mb-1">
            Passcode
          </label>
          <div className="relative">
            <Lock className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-surface-elevated border border-surface-border rounded-lg pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="pt-1 flex flex-col gap-2">
          <Button
            type="submit"
            variant="secondary"
            size="md"
            disabled={isSubmitting}
            className="w-full text-xs"
          >
            {isSubmitting ? 'Verifying...' : 'Sign In'}
          </Button>

          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => setActiveTab('workspace')}
            className="w-full text-xs flex items-center justify-center space-x-1.5"
          >
            <span>Continue to Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </form>
    </div>
  );
}
