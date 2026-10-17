import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  border?: boolean;
}

export function Card({
  className,
  elevated = false,
  border = true,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'rounded-xl p-4 transition-all',
          elevated ? 'bg-surface-elevated' : 'bg-surface',
          border ? 'border border-surface-border' : '',
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}
