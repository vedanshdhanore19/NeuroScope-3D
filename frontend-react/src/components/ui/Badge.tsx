import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'cyan' | 'emerald' | 'amber' | 'red' | 'neutral';
}

export function Badge({
  className,
  variant = 'neutral',
  children,
  ...props
}: BadgeProps) {
  const variantStyles = {
    cyan: 'bg-cyan-950/40 text-cyan-400 border-cyan-500/30',
    emerald: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30',
    amber: 'bg-amber-950/40 text-amber-400 border-amber-500/30',
    red: 'bg-red-950/40 text-red-400 border-red-500/30',
    neutral: 'bg-slate-800 text-slate-300 border-slate-700/60',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono border uppercase tracking-wider',
          variantStyles[variant],
          className
        )
      )}
      {...props}
    >
      {children}
    </span>
  );
}
