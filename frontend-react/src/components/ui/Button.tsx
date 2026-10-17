import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/40 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const sizeStyles = {
    sm: 'text-xs px-2.5 py-1.5 gap-1.5',
    md: 'text-xs px-3.5 py-2 gap-2 font-semibold',
    lg: 'text-sm px-5 py-2.5 gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary: 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-sm active:scale-[0.98]',
    secondary: 'bg-surface-elevated hover:bg-surface-subtle text-slate-200 border border-surface-border active:scale-[0.98]',
    ghost: 'text-slate-400 hover:text-white hover:bg-white/5',
    danger: 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30',
  };

  return (
    <button
      className={twMerge(clsx(baseStyles, sizeStyles[size], variantStyles[variant], className))}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
