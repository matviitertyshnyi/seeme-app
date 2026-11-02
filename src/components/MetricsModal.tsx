'use client';

import React, { useState } from 'react';
import {
  X,
  BarChart3,
  Star,
  ShieldCheck,
  Flame,
  Users,
  ThumbsUp,
  UserPlus,
  BookmarkCheck,
  CheckCircle2,
} from 'lucide-react';
import {
  LobbyWithDistance,
  PlayerRating,
  UserPersona,
} from '@/types/lobby';
import { CategoryIcon } from '@/components/CategoryIcon';

interface MetricsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUser: UserPersona;
  personas: UserPersona[];
  lobbies: LobbyWithDistance[];
  ratings: PlayerRating[];
  onRatePlayer: (
    toUserId: string,
    lobbyId: string,
    stars: number,
    showedUp: boolean,
    comment: string
  ) => Promise<void>;
  onCoHostWithPartner: (partner: UserPersona) => void;
}

export function MetricsModal({
  isOpen,
  onClose,
  activeUser,
  personas,
  lobbies,
  ratings,
  onRatePlayer,
  onCoHostWithPartner,
}: MetricsModalProps) {
  const [selectedPlayerToRate, setSelectedPlayerToRate] = useState<string>(
    personas.find((p) => p.id !== activeUser.id)?.id || ''
  );
  const [stars, setStars] = useState<number>(5);
  const [showedUp, setShowedUp] = useState<boolean>(true);
  const [comment, setComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  if (!isOpen) return null;

  const myReceivedRatings = ratings.filter((r) => r.toUserId === activeUser.id);
  const regularPartners = personas.filter((p) =>
    activeUser.regularPartnerIds?.includes(p.id)
  );
  const rateablePlayers = personas.filter((p) => p.id !== activeUser.id);

  // Live Platform Pulse Metrics
  const liveRoomsCount = lobbies.filter((l) => l.computedStatus === 'LIVE').length;
  const upcomingRoomsCount = lobbies.filter(
    (l) => l.computedStatus === 'UPCOMING'
  ).length;
  const totalOpenSeats = lobbies
    .filter((l) => l.computedStatus !== 'FINISHED')
    .reduce(
      (acc, l) => acc + Math.max(0, l.maxParticipants - l.participants.length),
      0
    );

  // Activity breakdown counts across live/upcoming lobbies
  const categoryBreakdown = lobbies.reduce<Record<string, number>>((acc, l) => {
    acc[l.category] = (acc[l.category] || 0) + 1;
    return acc;
  }, {});

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlayerToRate || isSubmittingRating) return;
    setIsSubmittingRating(true);
    try {
      await onRatePlayer(
        selectedPlayerToRate,
        lobbies[0]?.id || 'lobby-chess-1',
        stars,
        showedUp,
        comment
      );
      setComment('');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Player Metrics, Reliability and Ratings"
        className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-t-[28px] sm:rounded-[28px] shadow-ambient-lg border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-950 dark:text-white">
                Metrics, Reputation & Ratings
              </h2>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Stats and verified player reviews for {activeUser.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close metrics modal"
            className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. Personal KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-emerald-900 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
                Reliability
              </div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-950 dark:text-emerald-100">
                {activeUser.reliabilityScore}%
              </div>
              <div className="text-[11px] font-bold text-emerald-800 dark:text-emerald-400">
                Shows up on time
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-950 dark:text-amber-300">
                <Star className="w-4 h-4 fill-amber-400 text-amber-600 dark:text-amber-400" />
                Avg Rating
              </div>
              <div className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">
                {activeUser.ratingAvg} <span className="text-xs font-bold text-slate-500">/ 5.0</span>
              </div>
              <div className="text-[11px] font-bold text-amber-900 dark:text-amber-400">
                {activeUser.ratingCount} player reviews
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-indigo-950 dark:text-indigo-300">
                <Users className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                Attended
              </div>
              <div className="mt-1 text-2xl font-extrabold text-indigo-950 dark:text-indigo-100">
                {activeUser.meetupsAttended}
              </div>
              <div className="text-[11px] font-bold text-indigo-800 dark:text-indigo-400">
                {activeUser.hoursPlayed} hrs played
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-slate-200">
                <Flame className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                Weekly Streak
              </div>
              <div className="mt-1 text-2xl font-extrabold text-slate-950 dark:text-white">
                {activeUser.streakWeeks} wks
              </div>
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-400">
                Consistent player
              </div>
            </div>
          </div>

          {/* 2. Live Community Radar Pulse & Activity Breakdown */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                Live City Activity Pulse
              </h3>
              <div className="flex items-center gap-3 text-xs font-extrabold">
                <span className="text-emerald-800 dark:text-emerald-400">{liveRoomsCount} Live Now</span>
                <span className="text-amber-900 dark:text-amber-400">{upcomingRoomsCount} Upcoming</span>
                <span className="text-indigo-700 dark:text-indigo-400">{totalOpenSeats} Open Seats</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {Object.entries(categoryBreakdown).map(([cat, count]) => (
                <div
                  key={cat}
                  className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <span className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-900 dark:text-slate-100">
                    <CategoryIcon
                      category={cat as never}
                      className="w-3.5 h-3.5 text-indigo-700 dark:text-indigo-400"
                    />
                    {cat}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 text-xs font-extrabold">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Regular Partners ("Play Again" List) */}
          {regularPartners.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <BookmarkCheck className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                Your Regular Partners ({regularPartners.length})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {regularPartners.map((partner) => (
                  <div
                    key={partner.id}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={partner.avatar}
                        alt={partner.name}
                        className="w-11 h-11 rounded-full object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-extrabold text-slate-950 dark:text-white truncate">
                          {partner.name}, {partner.age}
                        </div>
                        <div className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                          {partner.skillBadge} · {partner.reliabilityScore}% Reliable
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onCoHostWithPartner(partner);
                      }}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold inline-flex items-center gap-1 shrink-0"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Play Again
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Submit a Player Rating & Fist-Bump Review */}
          <form
            onSubmit={handleSubmitReview}
            className="p-5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-slate-950 dark:text-white flex items-center gap-2">
                <ThumbsUp className="w-4 h-4 text-indigo-700 dark:text-indigo-400" />
                Rate a Meetup Partner & Give a Fist Bump
              </h3>
              <span className="text-xs font-bold text-indigo-800 dark:text-indigo-300">
                Boosts Reliability Score
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Select Player
                </label>
                <select
                  value={selectedPlayerToRate}
                  onChange={(e) => setSelectedPlayerToRate(e.target.value)}
                  aria-label="Select player to rate"
                  className="min-h-[44px] w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-extrabold text-slate-950 dark:text-white"
                >
                  {rateablePlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.skillBadge})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Star Rating ({stars}/5)
                </label>
                <div className="min-h-[44px] flex items-center gap-1 bg-white dark:bg-slate-900 px-3 rounded-xl border border-slate-300 dark:border-slate-700">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setStars(num)}
                      aria-label={`Rate ${num} stars`}
                      className="p-1.5 focus:outline-none"
                    >
                      <Star
                        className={`w-5 h-5 ${
                          num <= stars
                            ? 'fill-amber-400 text-amber-500'
                            : 'text-slate-300 dark:text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-700 dark:text-slate-300 mb-1">
                  Attendance
                </label>
                <button
                  type="button"
                  onClick={() => setShowedUp((prev) => !prev)}
                  className={`min-h-[44px] w-full px-3 py-2 rounded-xl text-xs font-extrabold border flex items-center justify-center gap-1.5 ${
                    showedUp
                      ? 'bg-emerald-700 text-white border-emerald-700'
                      : 'bg-rose-700 text-white border-rose-700'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {showedUp ? 'Showed Up On Time' : 'Flaked / Late'}
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                aria-label="Player review comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write a quick review (e.g., Great rally partner, brought extra balls!)"
                className="min-h-[44px] flex-1 px-4 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-950 dark:text-white placeholder:text-slate-500"
              />
              <button
                type="submit"
                disabled={isSubmittingRating}
                className="min-h-[44px] px-6 py-2.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-sm shrink-0"
              >
                {isSubmittingRating ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </form>

          {/* 5. Recent Player Reviews */}
          <div className="space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Recent Reviews Received ({myReceivedRatings.length})
            </h3>
            {myReceivedRatings.length === 0 ? (
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                No reviews recorded for this account yet.
              </p>
            ) : (
              <div className="space-y-2.5">
                {myReceivedRatings.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <img
                        src={rev.fromUserAvatar}
                        alt={rev.fromUserName}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold text-slate-950 dark:text-white">
                            {rev.fromUserName}
                          </span>
                          <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
                            · {rev.lobbyTitle}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 dark:text-slate-200 font-medium mt-1">
                          &ldquo;{rev.comment}&rdquo;
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-200 text-xs font-extrabold shrink-0">
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-600" />
                      {rev.stars}.0
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
