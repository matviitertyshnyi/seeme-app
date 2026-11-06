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
  const containerStyle =
    variant === 'solid'
      ? 'bg-stone-950/80 text-white border border-white/15 backdrop-blur-md'
      : 'bg-stone-100 dark:bg-stone-800/90 text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-700/80';

  if (status === 'LIVE') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight ${containerStyle}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        <span>{timeLabel && timeLabel !== 'Live Now' ? timeLabel : 'Live'}</span>
      </span>
    );
  }

  if (status === 'UPCOMING') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight ${containerStyle}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
        <span>{timeLabel || 'Upcoming'}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-tight ${containerStyle}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-stone-500" />
      <span>Ended</span>
    </span>
  );
}
