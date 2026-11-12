'use client';

import { UserSettings } from '@/types/lobby';

type SoundCue = 'JOIN' | 'CHECK_IN' | 'NOTIFICATION' | 'SUCCESS' | 'TAP';

let sharedAudioCtx: AudioContext | null = null;

function getSharedAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtx) return null;
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    try {
      sharedAudioCtx = new AudioCtx();
    } catch {
      return null;
    }
  }
  if (sharedAudioCtx.state === 'suspended') {
    sharedAudioCtx.resume().catch(() => {});
  }
  return sharedAudioCtx;
}

export function triggerSensoryFeedback(
  cue: SoundCue,
  settings?: Partial<UserSettings>
) {
  if (typeof window === 'undefined') return;

  const enableSound = settings?.soundEffects ?? true;
  const enableHaptics = settings?.hapticFeedback ?? true;

  // 1. Micro-haptics via Vibration API (Android / supported mobile browsers)
  if (enableHaptics && 'vibrate' in navigator) {
    try {
      switch (cue) {
        case 'JOIN':
        case 'CHECK_IN':
          navigator.vibrate([18, 30, 25]);
          break;
        case 'NOTIFICATION':
          navigator.vibrate([25, 40, 25]);
          break;
        case 'SUCCESS':
          navigator.vibrate(20);
          break;
        case 'TAP':
        default:
          navigator.vibrate(10);
          break;
      }
    } catch {
      // Ignore vibration errors on unsupported devices
    }
  }

  // 2. Clean Web Audio API synthesized chime (zero external audio files required)
  if (enableSound) {
    try {
      const ctx = getSharedAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (cue === 'JOIN' || cue === 'SUCCESS') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.09); // E5
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
        osc.start(now);
        osc.stop(now + 0.22);
      } else if (cue === 'CHECK_IN') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (cue === 'NOTIFICATION') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now); // E5
        osc.frequency.setValueAtTime(783.99, now + 0.08); // G5
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
        osc.start(now);
        osc.stop(now + 0.24);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        gain.gain.setValueAtTime(0.04, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        osc.start(now);
        osc.stop(now + 0.08);
      }
    } catch {
      // Ignore Web Audio restriction if user hasn't interacted yet
    }
  }
}

export async function requestMobilePushPermission(): Promise<'granted' | 'denied' | 'unsupported'> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  if (Notification.permission === 'granted') {
    return 'granted';
  }
  try {
    const result = await Notification.requestPermission();
    return result === 'granted' ? 'granted' : 'denied';
  } catch {
    return 'denied';
  }
}

export function fireNativeNotificationIfPermitted(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
      });
    } catch {
      // Fallback handled by in-app iOS/Android banner
    }
  }
}
