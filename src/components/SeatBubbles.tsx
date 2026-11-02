'use client';

import React from 'react';
import { Plus, Crown, Check } from 'lucide-react';
import { Participant } from '@/types/lobby';

interface SeatBubblesProps {
  participants: Participant[];
  maxParticipants: number;
  hostId?: string;
  activeUserId?: string;
  onEmptySeatClick?: (e: React.MouseEvent) => void;
  showSkillBadges?: boolean;
}

export function SeatBubbles({
  participants,
  maxParticipants,
  hostId,
  activeUserId,
  onEmptySeatClick,
  showSkillBadges = true,
}: SeatBubblesProps) {
  const actualHostId = hostId || participants[0]?.id || '';
  const openSeatsCount = Math.max(0, maxParticipants - participants.length);
  const openSeatsArray = Array.from({ length: openSeatsCount });

  return (
    <div className="flex flex-wrap items-start gap-2.5">
      {participants.map((person) => {
        const isHost = person.id === actualHostId;
        const isMe = person.id === activeUserId;
        const skillLabel = person.skillBadge || (isHost ? 'Host' : 'Active');
        const isArrived = person.arrivalStatus === 'ARRIVED';
        const isFiveMin = person.arrivalStatus === 'FIVE_MIN_OUT';

        return (
          <div
            key={person.id}
            className="group relative flex flex-col items-center"
            title={`${person.name}, ${person.age} · ${skillLabel}${
              isArrived ? ' · Arrived at venue' : isFiveMin ? ' · 5m away' : ''
            }${person.spotClue ? ` ("${person.spotClue}")` : ''}`}
          >
            {/* 44x44px (w-11 h-11) circular avatar bubble */}
            <div
              className={`relative w-11 h-11 rounded-full p-[2px] transition-transform duration-200 group-hover:scale-105 ${
                isArrived
                  ? 'bg-emerald-600 shadow-sm'
                  : isMe || isHost
                  ? 'bg-indigo-600 shadow-sm'
                  : 'bg-slate-400 dark:bg-slate-600'
              }`}
            >
              <img
                src={person.avatar}
                alt={person.name}
                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800"
              />
              {isHost && (
                <span
                  aria-label="Meetup Host"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
                >
                  <Crown className="w-2.5 h-2.5" />
                </span>
              )}
              {isArrived && (
                <span
                  aria-label="Arrived at venue"
                  title="Checked in: Arrived at venue"
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-slate-900"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>

            {showSkillBadges && (
              <span
                className={`mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-tight whitespace-nowrap border ${
                  isArrived
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700'
                    : isHost
                    ? 'bg-indigo-50 text-indigo-950 border-indigo-300 dark:bg-indigo-950/70 dark:text-indigo-200 dark:border-indigo-700'
                    : 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                }`}
              >
                {skillLabel}
              </span>
            )}
          </div>
        );
      })}

      {openSeatsArray.map((_, idx) => (
        <div key={`open-seat-${idx}`} className="flex flex-col items-center">
          <button
            type="button"
            onClick={onEmptySeatClick}
            aria-label={`Claim open seat ${idx + 1}`}
            title="Tap to claim open seat"
            className="w-11 h-11 rounded-full border-2 border-dashed border-indigo-400 dark:border-indigo-500 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 hover:border-indigo-600 active:scale-95 text-indigo-700 dark:text-indigo-300 flex items-center justify-center transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 dark:focus-visible:ring-indigo-400 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            <Plus className="w-4 h-4 stroke-[2.6]" />
          </button>
          {showSkillBadges && (
            <span className="mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-indigo-800 dark:text-indigo-200 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800">
              Open
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
