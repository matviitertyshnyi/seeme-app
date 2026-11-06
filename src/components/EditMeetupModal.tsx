'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  Users,
  Radio,
  FileText,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Lobby, RoomStatus, StartTimeOption, UserPersona } from '@/types/lobby';

export interface EditMeetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lobby: Lobby;
  activeUser: UserPersona;
  onUpdated?: () => void;
}

const PRESET_START_TIMES: StartTimeOption[] = ['Now', 'In 30 mins', 'In 1 hour'];
const ROOM_STATUS_OPTIONS: { status: RoomStatus; label: string; desc: string }[] = [
  { status: 'LIVE', label: 'Live Now', desc: 'Happening right now, open for arrivals' },
  { status: 'UPCOMING', label: 'Upcoming', desc: 'Scheduled to start soon' },
  { status: 'FINISHED', label: 'Finished', desc: 'Meetup concluded' },
];

export function EditMeetupModal({
  isOpen,
  onClose,
  lobby,
  activeUser,
  onUpdated,
}: EditMeetupModalProps) {
  const [title, setTitle] = useState(lobby?.title || '');
  const [startTime, setStartTime] = useState<StartTimeOption>(lobby?.startTime || 'Now');
  const [customTime, setCustomTime] = useState('');
  const [isCustomTime, setIsCustomTime] = useState(false);
  const [venueName, setVenueName] = useState(lobby?.venueName || '');
  const [equipmentNote, setEquipmentNote] = useState(lobby?.equipmentNote || '');
  const [maxParticipants, setMaxParticipants] = useState<number>(lobby?.maxParticipants || 4);
  const [roomStatus, setRoomStatus] = useState<RoomStatus>(lobby?.roomStatus || 'LIVE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync state when lobby changes
  useEffect(() => {
    if (isOpen && lobby) {
      setTitle(lobby.title || '');
      const isPreset = PRESET_START_TIMES.includes(lobby.startTime);
      if (isPreset) {
        setStartTime(lobby.startTime);
        setIsCustomTime(false);
        setCustomTime('');
      } else {
        setIsCustomTime(true);
        setCustomTime(lobby.startTime || '');
        setStartTime(lobby.startTime);
      }
      setVenueName(lobby.venueName || '');
      setEquipmentNote(lobby.equipmentNote || '');
      setMaxParticipants(lobby.maxParticipants || 4);
      setRoomStatus(lobby.roomStatus || 'LIVE');
      setErrorMsg('');
    }
  }, [isOpen, lobby]);

  // Escape key handler
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

  if (!isOpen || !lobby) return null;

  const currentCount = lobby.participants?.length || 1;
  const minAllowedCapacity = Math.max(2, currentCount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3) {
      setErrorMsg('Meetup title must be at least 3 characters');
      return;
    }

    const trimmedVenue = venueName.trim();
    if (!trimmedVenue) {
      setErrorMsg('Location / Venue name is required');
      return;
    }

    const finalStartTime = isCustomTime ? customTime.trim() || 'Now' : startTime;

    if (maxParticipants < currentCount) {
      setErrorMsg(`Capacity cannot be lower than existing attendees (${currentCount})`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/lobbies/${lobby.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': activeUser.id,
          Authorization: 'Bearer ' + activeUser.id,
        },
        body: JSON.stringify({
          title: trimmedTitle,
          startTime: finalStartTime,
          venueName: trimmedVenue,
          equipmentNote: equipmentNote.trim(),
          maxParticipants,
          roomStatus,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error || data?.message || 'Failed to update meetup');
      }

      onUpdated?.();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Something went wrong updating meetup');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit Meetup"
      className="fixed inset-0 z-[1050] bg-stone-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-black text-stone-950 dark:text-white">
              Edit Meetup Details
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              Update room status, start time, description, and group capacity
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close edit meetup"
            className="w-9 h-9 rounded-full bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Room Status */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-2 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-orange-500" />
              <span>Room Status</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ROOM_STATUS_OPTIONS.map((opt) => {
                const isSelected = roomStatus === opt.status;
                return (
                  <button
                    key={opt.status}
                    type="button"
                    onClick={() => setRoomStatus(opt.status)}
                    className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                      isSelected
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 ring-2 ring-orange-500/20'
                        : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    <span className="text-xs font-black">{opt.label}</span>
                    <span className="text-[10px] text-stone-500 leading-tight">
                      {opt.status === 'LIVE'
                        ? 'Active now'
                        : opt.status === 'UPCOMING'
                        ? 'Starting soon'
                        : 'Concluded'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Meetup Title */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-orange-500" />
              <span>Meetup Title</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Casual Ping Pong & Chill"
              className="w-full min-h-[44px] px-4 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-600 font-semibold"
            />
          </div>

          {/* 3. Start Time */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>Start Time</span>
            </label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PRESET_START_TIMES.map((timeOption) => {
                const isSelected = !isCustomTime && startTime === timeOption;
                return (
                  <button
                    key={timeOption}
                    type="button"
                    onClick={() => {
                      setIsCustomTime(false);
                      setStartTime(timeOption);
                    }}
                    className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-orange-500 bg-orange-600 text-white'
                        : 'border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                    }`}
                  >
                    {timeOption}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setIsCustomTime(true)}
                className={`py-2 px-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                  isCustomTime
                    ? 'border-orange-500 bg-orange-600 text-white'
                    : 'border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200'
                }`}
              >
                Custom...
              </button>
            </div>

            {isCustomTime && (
              <input
                type="text"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                placeholder="e.g. Tonight at 7:30 PM, or Saturday 14:00"
                className="w-full min-h-[42px] px-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-600 font-medium"
              />
            )}
          </div>

          {/* 4. Meetup Location Name */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              <span>Location / Venue Name</span>
            </label>
            <input
              type="text"
              required
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder="e.g. Washington Square Park North Tables"
              className="w-full min-h-[44px] px-4 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-600 font-semibold"
            />
          </div>

          {/* 5. Description */}
          <div>
            <label className="block text-xs font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 mb-1.5 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-orange-500" />
              <span>Description</span>
            </label>
            <textarea
              rows={2}
              value={equipmentNote}
              onChange={(e) => setEquipmentNote(e.target.value)}
              placeholder="Meetup description, what to bring, or spot details..."
              className="w-full p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-xs sm:text-sm text-stone-900 dark:text-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-600 font-medium"
            />
          </div>

          {/* 6. Max Group Size (2 to 16) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-extrabold uppercase tracking-wider text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-orange-500" />
                <span>Max Group Size</span>
              </label>
              <span className="text-xs font-black text-orange-600 dark:text-orange-400 px-2.5 py-0.5 rounded-full bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800">
                {maxParticipants} Players
              </span>
            </div>
            <input
              type="range"
              min={minAllowedCapacity}
              max={16}
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value, 10))}
              className="w-full accent-orange-600 cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-stone-500 mt-1">
              <span>Min: {minAllowedCapacity} (currently {currentCount} joined)</span>
              <span>Max: 16</span>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full min-h-[48px] rounded-2xl bg-orange-600 hover:bg-orange-500 active:scale-[0.99] text-white text-sm font-black flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Updates...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Meetup Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditMeetupModal;
