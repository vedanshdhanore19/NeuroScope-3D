import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface Option<T extends string | number> {
  value: T;
  label: React.ReactNode;
}

export interface SegmentedControlProps<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (val: T) => void;
  size?: 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      className={twMerge(
        clsx(
          'inline-flex items-center bg-surface-subtle p-1 rounded-lg border border-surface-border',
          className
        )
      )}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => onChange(opt.value)}
            className={clsx(
              'rounded font-medium transition-all select-none',
              size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-xs',
              isSelected
                ? 'bg-surface-elevated text-cyan-300 font-semibold shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
