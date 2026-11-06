'use client';

import React, { useEffect } from 'react';
import { X, ShieldCheck, MapPin } from 'lucide-react';

export interface PhotoLightboxModalProps {
  isOpen: boolean;
  imageUrl: string | null;
  name?: string;
  age?: number;
  verified?: boolean;
  photoVerified?: boolean;
  neighborhood?: string;
  onClose: () => void;
}

export function PhotoLightboxModal({
  isOpen,
  imageUrl,
  name,
  age,
  verified = false,
  photoVerified = false,
  neighborhood,
  onClose,
}: PhotoLightboxModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  const isHumanVerified = Boolean(photoVerified);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={name ? `${name}'s photo` : 'Photo view'}
      className="fixed inset-0 z-[1200] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-fade-in"
      onClick={onClose}
    >
      {/* Top Bar with Close button */}
      <div className="w-full max-w-4xl flex items-center justify-between text-white/80 py-2">
        <span className="text-xs font-semibold tracking-wider uppercase text-white/60">
          Full-Screen Photo
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close photo view"
          className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-white flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Center Image */}
      <div
        className="flex-1 flex items-center justify-center w-full max-w-4xl py-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt={name ? `${name}'s profile photo` : 'Full profile photo'}
          className="max-h-[78vh] max-w-[92vw] rounded-3xl object-contain shadow-2xl border border-white/10 select-none transition-transform"
        />
      </div>

      {/* Bottom Caption Bar */}
      <div
        className="w-full max-w-xl bg-stone-900/80 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 shadow-xl flex items-center justify-between gap-3 text-white text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="font-bold truncate text-stone-100">
              {name || 'Player'}{age ? `, ${age}` : ''}
            </span>
            {isHumanVerified && (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" aria-label="Verified Human Photo" />
            )}
          </div>

          {isHumanVerified && (
            <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
              Verified Human Photo
            </span>
          )}
        </div>

        {neighborhood && (
          <div className="flex items-center gap-1 text-xs text-stone-400 shrink-0">
            <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="truncate max-w-[140px] sm:max-w-[200px]">{neighborhood}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PhotoLightboxModal;
