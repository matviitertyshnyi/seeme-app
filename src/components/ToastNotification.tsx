'use client';

import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastNotificationProps {
  message: string | null;
}

export function ToastNotification({ message }: ToastNotificationProps) {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[900] bg-stone-900 text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2.5 text-xs font-semibold border border-white/10 max-w-[90vw]"
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
      <span className="truncate">{message}</span>
    </div>
  );
}

export default ToastNotification;
