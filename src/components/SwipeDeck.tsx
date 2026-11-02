'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Info,
  Check,
  Navigation,
  MapPin,
  Zap,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { LobbyWithDistance, UserPersona } from '@/types/lobby';
import { CategoryIcon } from '@/components/CategoryIcon';
import { SeatBubbles } from '@/components/SeatBubbles';
import { StatusBadge } from '@/components/StatusBadge';

interface SwipeDeckProps {
  lobbies: LobbyWithDistance[];
  activeUser: UserPersona;
  onSelectLobby: (lobby: LobbyWithDistance) => void;
  onSwipeJoin: (lobby: LobbyWithDistance, note?: string) => Promise<void>;
}

export function SwipeDeck({
  lobbies,
  activeUser,
  onSelectLobby,
  onSwipeJoin,
}: SwipeDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [requestNote, setRequestNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCurrentIndex(0);
    setExitDirection(null);
    setRequestNote('');
  }, [lobbies.length]);

  const currentLobby = lobbies[currentIndex];
  const nextLobby = lobbies[currentIndex + 1];

  const handlePass = () => {
    if (!currentLobby || exitDirection) return;
    setExitDirection('left');
    setTimeout(() => {
      setCurrentIndex((prev) => prev + 1);
      setExitDirection(null);
      setRequestNote('');
    }, 220);
  };

  const handleJoinAction = async () => {
    if (!currentLobby || exitDirection || isSubmitting) return;
    const isAlreadyIn = currentLobby.participants.some((p) => p.id === activeUser.id);
    if (isAlreadyIn) {
      onSelectLobby(currentLobby);
      return;
    }

    setIsSubmitting(true);
    setExitDirection('right');
    try {
      await onSwipeJoin(currentLobby, requestNote);
    } finally {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setExitDirection(null);
        setRequestNote('');
        setIsSubmitting(false);
      }, 230);
    }
  };

  if (lobbies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center bg-white rounded-[28px] border border-slate-200">
        <div className="w-14 h-14 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <h3 className="text-lg font-extrabold text-slate-900">
          No nearby meetups match this filter
        </h3>
        <p className="text-sm text-slate-600 mt-1 max-w-sm">
          Try expanding your kilometer radius or selecting All Activities.
        </p>
      </div>
    );
  }

  if (!currentLobby) {
    return (
      <div className="max-w-md mx-auto my-8 bg-white rounded-[32px] p-8 text-center shadow-ambient border border-slate-200">
        <div className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 shadow-brand">
          <RotateCcw className="w-6 h-6" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900">
          You have reviewed all nearby meetups
        </h3>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          You flipped through all {lobbies.length} meetups in your area. Reset the deck to browse them again.
        </p>
        <button
          type="button"
          onClick={() => setCurrentIndex(0)}
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-extrabold shadow-brand transition-all"
        >
          <RotateCcw className="w-4 h-4" />
          Restart Deck
        </button>
      </div>
    );
  }

  const hostPerson =
    currentLobby.participants.find((p) => p.id === currentLobby.hostId) ||
    currentLobby.participants[0];
  const isParticipant = currentLobby.participants.some((p) => p.id === activeUser.id);
  const hasRequested = currentLobby.pendingRequests.some((r) => r.user.id === activeUser.id);
  const isFinished = currentLobby.computedStatus === 'FINISHED';
  const isFull =
    currentLobby.participants.length >= currentLobby.maxParticipants || isFinished;

  return (
    <div className="flex flex-col items-center justify-center py-1 select-none">
      {/* Counter Pill */}
      <div className="mb-3 flex items-center gap-2 text-xs font-extrabold text-slate-700 bg-white px-4 py-1.5 rounded-full shadow-sm border border-slate-200">
        <span>
          Meetup {currentIndex + 1} of {lobbies.length}
        </span>
        <span className="text-slate-300">•</span>
        <span className="text-indigo-600">{currentLobby.distanceLabel}</span>
      </div>

      <div className="relative w-full max-w-[430px]">
        {nextLobby && (
          <div
            aria-hidden="true"
            className="absolute inset-x-4 top-4 bottom-0 bg-white rounded-[32px] shadow-ambient border border-slate-200 scale-[0.96] opacity-60 translate-y-3 pointer-events-none"
          />
        )}

        <div
          className={`relative bg-white rounded-[32px] overflow-hidden shadow-ambient-lg border border-slate-200 transition-all duration-200 ${
            exitDirection === 'left'
              ? '-translate-x-24 -rotate-6 opacity-0'
              : exitDirection === 'right'
              ? 'translate-x-24 rotate-6 opacity-0'
              : 'translate-x-0 rotate-0 opacity-100'
          }`}
        >
          {/* Cover Photo */}
          <div className="relative h-60 sm:h-64 w-full bg-slate-900">
            <img
              src={currentLobby.coverImage}
              alt={currentLobby.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-slate-950/15" />

            <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
              <StatusBadge
                status={currentLobby.computedStatus}
                timeLabel={currentLobby.startTimeBadge}
                variant="solid"
              />

              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-slate-900/80 text-white backdrop-blur-md">
                {currentLobby.joinMode === 'OPEN' ? (
                  <>
                    <Zap className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                    Instant Join
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-300" />
                    Approval
                  </>
                )}
              </span>
            </div>

            <div className="absolute bottom-4 left-5 right-5 text-white">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-600 text-white text-xs font-extrabold">
                  <CategoryIcon category={currentLobby.category} className="w-3.5 h-3.5" />
                  {currentLobby.category}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-xs font-bold text-white">
                  <Navigation className="w-3 h-3 text-indigo-300" />
                  {currentLobby.distanceLabel}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold leading-tight">
                {currentLobby.title}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                <MapPin className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
                <span className="truncate">{currentLobby.venueName}</span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-100">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                Equipment & Details
              </div>
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                {currentLobby.equipmentNote}
              </p>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-2">
                  Players & Skill Levels ({currentLobby.participants.length}/
                  {currentLobby.maxParticipants})
                </div>
                <SeatBubbles
                  participants={currentLobby.participants}
                  maxParticipants={currentLobby.maxParticipants}
                  hostId={currentLobby.hostId}
                  activeUserId={activeUser.id}
                  showSkillBadges
                />
              </div>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${currentLobby.lat},${currentLobby.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-extrabold text-slate-800 transition-colors shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5 text-indigo-600" />
                Maps
              </a>
            </div>

            {currentLobby.joinMode === 'APPROVAL_REQUIRED' &&
              !isParticipant &&
              !hasRequested &&
              !isFull && (
                <input
                  type="text"
                  value={requestNote}
                  onChange={(e) => setRequestNote(e.target.value)}
                  placeholder={`Note for ${
                    hostPerson ? hostPerson.name.split(' ')[0] : 'host'
                  } (optional)...`}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-600"
                />
              )}

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-center gap-6">
              <button
                type="button"
                onClick={handlePass}
                title="Skip Meetup"
                className="w-14 h-14 rounded-full bg-white border-2 border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 shadow-sm flex items-center justify-center transition-all active:scale-95"
              >
                <X className="w-6 h-6 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={() => onSelectLobby(currentLobby)}
                title="View Details"
                className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center transition-all active:scale-95"
              >
                <Info className="w-5 h-5 stroke-[2.2]" />
              </button>

              <button
                type="button"
                disabled={(isFull && !isParticipant) || isSubmitting}
                onClick={handleJoinAction}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-95 ${
                  isParticipant
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : hasRequested
                    ? 'bg-amber-100 text-amber-900 border-2 border-amber-300'
                    : isFull
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-brand'
                }`}
              >
                {isParticipant ? (
                  <MessageCircle className="w-6 h-6 stroke-[2.4]" />
                ) : (
                  <Check className="w-6 h-6 stroke-[2.8]" />
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-8 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
              <span>Skip</span>
              <span>Details</span>
              <span className="text-indigo-600">
                {isParticipant
                  ? 'Chat'
                  : hasRequested
                  ? 'Requested'
                  : currentLobby.joinMode === 'OPEN'
                  ? 'Join'
                  : 'Request'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
