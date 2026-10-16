import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface StatusPillProps {
  status: 'online' | 'connecting' | 'warning' | 'error';
  label: string;
  className?: string;
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  const statusConfig = {
    online: {
      dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]',
      border: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-400',
    },
    connecting: {
      dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24] animate-pulse',
      border: 'border-amber-500/30 bg-amber-950/30 text-amber-400',
    },
    warning: {
      dot: 'bg-amber-400 shadow-[0_0_8px_#fbbf24]',
      border: 'border-amber-500/30 bg-amber-950/30 text-amber-400',
    },
    error: {
      dot: 'bg-red-400 shadow-[0_0_8px_#f87171]',
      border: 'border-red-500/30 bg-red-950/30 text-red-400',
    },
  };

  const current = statusConfig[status];

  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-[11px] font-mono border',
          current.border,
          className
        )
      )}
    >
      <span className={clsx('w-2 h-2 rounded-full shrink-0', current.dot)} />
      <span className="font-semibold">{label}</span>
    </div>
  );
}
