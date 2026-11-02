'use client';

import React from 'react';
import { RoomStatus } from '@/types/lobby';

interface StatusBadgeProps {
  status: RoomStatus;
  timeLabel?: string;
  variant?: 'solid' | 'subtle';
}

export function StatusBadge({
  status,
  timeLabel,
  variant = 'solid',
}: StatusBadgeProps) {
  if (status === 'LIVE') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide ${
          variant === 'solid'
            ? 'bg-emerald-700 text-white shadow-sm'
            : 'bg-emerald-50 text-emerald-900 border border-emerald-300 dark:bg-emerald-950/80 dark:text-emerald-200 dark:border-emerald-700'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            variant === 'solid' ? 'bg-emerald-200' : 'bg-emerald-500'
          }`}
        />
        <span>
          LIVE{timeLabel && timeLabel !== 'Live Now' ? ` · ${timeLabel}` : ' NOW'}
        </span>
      </span>
    );
  }

  if (status === 'UPCOMING') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide ${
          variant === 'solid'
            ? 'bg-amber-400 text-slate-950 shadow-sm'
            : 'bg-amber-50 text-amber-950 border border-amber-300 dark:bg-amber-950/80 dark:text-amber-200 dark:border-amber-700'
        }`}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            variant === 'solid' ? 'bg-slate-950' : 'bg-amber-500'
          }`}
        />
        <span>UPCOMING{timeLabel ? ` · ${timeLabel}` : ''}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide ${
        variant === 'solid'
          ? 'bg-rose-700 text-white shadow-sm'
          : 'bg-rose-50 text-rose-900 border border-rose-300 dark:bg-rose-950/80 dark:text-rose-200 dark:border-rose-700'
      }`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          variant === 'solid' ? 'bg-rose-200' : 'bg-rose-500'
        }`}
      />
      <span>
        FINISHED
        {timeLabel && timeLabel !== 'Completed' ? ` · ${timeLabel}` : ''}
      </span>
    </span>
  );
}
