'use client';

import React from 'react';
import { Plus, Crown, Check, ShieldCheck } from 'lucide-react';
import { Participant } from '@/types/lobby';

interface SeatBubblesProps {
  participants: Participant[];
  maxParticipants: number;
  hostId?: string;
  activeUserId?: string;
  onEmptySeatClick?: (e: React.MouseEvent) => void;
  showSkillBadges?: boolean;
  onParticipantClick?: (person: Participant) => void;
}

export function SeatBubbles({
  participants,
  maxParticipants,
  hostId,
  activeUserId,
  onEmptySeatClick,
  showSkillBadges = true,
  onParticipantClick,
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
            role={onParticipantClick ? 'button' : undefined}
            tabIndex={onParticipantClick ? 0 : undefined}
            onClick={
              onParticipantClick
                ? (e) => {
                    e.stopPropagation();
                    onParticipantClick(person);
                  }
                : undefined
            }
            onKeyDown={
              onParticipantClick
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      onParticipantClick(person);
                    }
                  }
                : undefined
            }
            className={`group relative flex flex-col items-center ${
              onParticipantClick ? 'cursor-pointer hover:opacity-90 transition-opacity' : ''
            }`}
            title={`${person.name}, ${person.age} · ${skillLabel}${
              isArrived ? ' · Arrived at venue' : isFiveMin ? ' · 5m away' : ''
            }${person.spotClue ? ` ("${person.spotClue}")` : ''}`}
          >
            {/* 44x44px (w-11 h-11) circular avatar bubble */}
            <div
              className={`relative w-11 h-11 rounded-full p-[2px] transition-transform duration-200 group-hover:scale-105 ${
                isArrived
                  ? 'bg-emerald-600 shadow-sm'
                  : isHost
                  ? 'bg-gradient-to-r from-orange-600 to-amber-600 shadow-[0_0_10px_rgba(234,88,12,0.4)]'
                  : isMe
                  ? 'bg-orange-500 shadow-[0_0_8px_rgba(234,88,12,0.3)]'
                  : 'bg-stone-300 dark:bg-stone-700'
              }`}
            >
              <img
                src={person.avatar}
                alt={person.name}
                className="w-full h-full rounded-full object-cover border-2 border-white dark:border-stone-900 bg-stone-100 dark:bg-stone-800"
              />
              {isHost && (
                <span
                  aria-label="Meetup Host"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-gradient-to-r from-orange-600 to-amber-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-stone-900 shadow-xs"
                >
                  <Crown className="w-2.5 h-2.5" />
                </span>
              )}
              {isArrived && (
                <span
                  aria-label="Arrived at venue"
                  title="Checked in: Arrived at venue"
                  className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-2 ring-white dark:ring-stone-900 shadow-xs"
                >
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </span>
              )}
            </div>

            {showSkillBadges && (
              <span
                className={`mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-tight whitespace-nowrap border inline-flex items-center ${
                  isArrived
                    ? 'bg-emerald-50 text-emerald-950 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700'
                    : isHost
                    ? 'bg-orange-50 text-orange-950 border-orange-300 dark:bg-orange-950/70 dark:text-orange-200 dark:border-orange-700'
                    : isMe
                    ? 'bg-amber-50 text-amber-950 border-amber-300 dark:bg-amber-950/70 dark:text-amber-200 dark:border-amber-700'
                    : 'bg-stone-100 text-stone-800 border-stone-300 dark:bg-stone-800 dark:text-stone-200 dark:border-stone-700'
                }`}
              >
                <span>{person.name.split(' ')[0]}</span>
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-500 shrink-0 inline ml-0.5" />
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
            className="w-11 h-11 rounded-full border-2 border-dashed border-orange-500/50 dark:border-orange-500/60 bg-orange-500/10 dark:bg-orange-500/15 hover:bg-orange-500/20 hover:border-orange-500 active:scale-95 text-orange-600 dark:text-orange-400 flex items-center justify-center transition-all duration-150 shadow-[0_0_10px_rgba(234,88,12,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 dark:focus-visible:ring-offset-stone-900"
          >
            <Plus className="w-4 h-4 stroke-[2.6]" />
          </button>
          {showSkillBadges && (
            <span className="mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold text-orange-600 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800/60">
              Open
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
