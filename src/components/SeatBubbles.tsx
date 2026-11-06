'use client';

import React from 'react';
import { Plus, Crown } from 'lucide-react';
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
            <div className="relative w-10 h-10 rounded-full ring-1 ring-stone-300 dark:ring-stone-700 bg-stone-100 dark:bg-stone-800 transition-transform duration-200 group-hover:scale-105">
              <img
                src={person.avatar}
                alt={person.name}
                className="w-full h-full rounded-full object-cover"
              />
              {isHost && (
                <span
                  aria-label="Meetup Host"
                  title="Host"
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-950 flex items-center justify-center ring-2 ring-white dark:ring-stone-900 shadow-xs"
                >
                  <Crown className="w-2.5 h-2.5" />
                </span>
              )}
            </div>

            {showSkillBadges && (
              <span className="mt-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200/80 dark:border-stone-700/80 inline-flex items-center gap-1">
                <span>{person.name.split(' ')[0]}</span>
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
            className="w-10 h-10 rounded-full border border-dashed border-stone-300 dark:border-stone-700 bg-stone-100/50 dark:bg-stone-800/40 hover:border-stone-400 dark:hover:border-stone-500 text-stone-400 dark:text-stone-500 flex items-center justify-center transition-colors"
          >
            <Plus className="w-4 h-4 stroke-[2]" />
          </button>
          {showSkillBadges && (
            <span className="mt-1 text-[10px] font-medium text-stone-400 dark:text-stone-500">
              Open
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
