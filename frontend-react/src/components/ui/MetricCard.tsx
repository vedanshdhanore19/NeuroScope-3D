import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sublabel?: string;
  color?: string;
  className?: string;
  tooltip?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  sublabel,
  color,
  className,
  tooltip,
}: MetricCardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'bg-surface p-3.5 rounded-xl border border-surface-border flex flex-col justify-between relative group',
          className
        )
      )}
      title={tooltip}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-400 truncate flex items-center gap-1.5">
          {color && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
          )}
          {label}
        </span>
        {tooltip && (
          <span className="text-[10px] text-slate-500 font-mono cursor-help">ℹ</span>
        )}
      </div>

      <div className="mt-2.5 flex items-baseline gap-1">
        <span className="text-xl font-bold font-mono text-white tracking-tight">
          {value}
        </span>
        {unit && (
          <span className="text-xs font-mono text-slate-400">
            {unit}
          </span>
        )}
      </div>

      {sublabel && (
        <span className="text-[10px] text-slate-500 mt-1 line-clamp-1">
          {sublabel}
        </span>
      )}
    </div>
  );
}
