import { ActivityCategory, Lobby, LobbyWithDistance, RoomStatus } from '@/types/lobby';

export const DEFAULT_USER_COORDS = {
  lat: 40.7308,
  lng: -73.9973,
  label: 'Greenwich Village, NYC',
};

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates great-circle distance between two points on Earth using the Haversine formula.
 * Returns exact distance in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

/**
 * Formats a kilometer distance into a clean consumer-friendly badge string
 * such as "350 m" or "0.8 km".
 */
export function formatDistanceLabel(distanceKm: number): string {
  if (distanceKm < 0.1) {
    return 'Under 100 m';
  }
  if (distanceKm < 1) {
    const meters = Math.round((distanceKm * 1000) / 10) * 10;
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

export function deriveRoomStatus(lobby: Lobby): RoomStatus {
  if (lobby.roomStatus === 'FINISHED') {
    return 'FINISHED';
  }

  // Auto-expire stale meetups created more than 6 hours ago
  const isSeedLobby =
    lobby.id.startsWith('lobby-1') ||
    lobby.id.startsWith('lobby-2') ||
    lobby.id.startsWith('lobby-3') ||
    lobby.id.startsWith('lobby-4') ||
    lobby.id.startsWith('lobby-5') ||
    lobby.id.startsWith('lobby-6') ||
    lobby.id.startsWith('lobby-chess') ||
    lobby.id.startsWith('lobby-pong') ||
    lobby.id.startsWith('lobby-coffee') ||
    lobby.id.startsWith('lobby-board') ||
    lobby.id.startsWith('lobby-tennis') ||
    lobby.id.startsWith('lobby-hoops') ||
    lobby.id.startsWith('lobby-cowork') ||
    lobby.id.startsWith('lobby-run') ||
    lobby.id.startsWith('lobby-kyiv') ||
    lobby.id.startsWith('lobby-warsaw');

  if (!isSeedLobby && lobby.createdAt) {
    const createdTime = new Date(lobby.createdAt).getTime();
    if (!isNaN(createdTime) && Date.now() - createdTime > 6 * 60 * 60 * 1000) {
      if (
        lobby.startTime === 'Now' ||
        lobby.startTime === 'In 30 mins' ||
        lobby.startTime === 'In 1 hour' ||
        lobby.startTime === 'Later today'
      ) {
        return 'FINISHED';
      }
    }
  }

  if (lobby.roomStatus) {
    return lobby.roomStatus;
  }
  if (lobby.startTime === 'Now') {
    return 'LIVE';
  }
  return 'UPCOMING';
}

export function getCountdownLabel(lobby: Lobby): string | null {
  if (deriveRoomStatus(lobby) === 'FINISHED') {
    return null;
  }

  if (lobby.startTime === 'In 30 mins' || lobby.startTime === 'In 1 hour') {
    const totalMinutes = lobby.startTime === 'In 30 mins' ? 30 : 60;
    if (lobby.createdAt) {
      const createdTime = new Date(lobby.createdAt).getTime();
      if (!isNaN(createdTime)) {
        const elapsedMinutes = Math.floor((Date.now() - createdTime) / 60000);
        const remainingMinutes = totalMinutes - elapsedMinutes;
        if (remainingMinutes > 0 && remainingMinutes <= totalMinutes) {
          return `Starts in ${remainingMinutes}m`;
        }
      }
    }
    return lobby.startTime === 'In 30 mins' ? 'Starts in 30m' : 'Starts in 1h';
  }

  if (typeof lobby.startTime === 'string' && lobby.startTime.includes('at ')) {
    return lobby.startTimeBadge || lobby.startTime;
  }

  if (lobby.startTime === 'Now') {
    return 'Live Now';
  }

  return lobby.startTimeBadge || lobby.startTime || null;
}

/**
 * Attaches Haversine distance and standardized status to each meetup room,
 * sorting Live & Upcoming rooms first by nearest distance.
 */
export function attachAndSortByDistance(
  lobbies: Lobby[],
  userLat: number,
  userLng: number
): LobbyWithDistance[] {
  const statusPriority: Record<RoomStatus, number> = {
    LIVE: 0,
    UPCOMING: 1,
    FINISHED: 2,
  };

  return lobbies
    .map((lobby) => {
      const distanceKm = calculateHaversineDistanceKm(userLat, userLng, lobby.lat, lobby.lng);
      const computedStatus = deriveRoomStatus(lobby);
      return {
        ...lobby,
        distanceKm,
        distanceLabel: formatDistanceLabel(distanceKm),
        computedStatus,
      };
    })
    .sort((a, b) => {
      if (statusPriority[a.computedStatus] !== statusPriority[b.computedStatus]) {
        return statusPriority[a.computedStatus] - statusPriority[b.computedStatus];
      }
      return a.distanceKm - b.distanceKm;
    });
}

export function getMapPinLabelForCategory(category: ActivityCategory): string {
  switch (category) {
    case 'Chess':
      return 'CHESS';
    case 'Ping Pong':
      return 'PONG';
    case 'Tennis':
      return 'TENNIS';
    case 'Board Games':
      return 'BOARD';
    case 'Basketball':
      return 'HOOPS';
    case 'Run Club':
      return 'RUN';
    case 'Coffee':
      return 'COFFEE';
    case 'Co-work':
      return 'DESK';
    default:
      return 'MEET';
  }
}

const toSvgDataUrl = (svg: string) => `data:image/svg+xml;utf8,${encodeURIComponent(svg.trim())}`;

/**
 * Vibey Digital Art Backgrounds for meetups & categories.
 * Atmospheric SVG graphics encoded as data URLs with dark warm obsidian (#141210 / #0c0a09),
 * neon/amber/cyan/emerald/violet gradients, synth grids, and glowing light beams.
 */
export const VIBEY_BACKGROUNDS: string[] = [
  // 0: Chess (Obsidian & Ember Amber, Isometric perspective grid, diamond orbs)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="ch-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#141210" />
          <stop offset="50%" stop-color="#1c1613" />
          <stop offset="100%" stop-color="#0c0a09" />
        </linearGradient>
        <radialGradient id="ch-glow" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.3" />
          <stop offset="60%" stop-color="#ea580c" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="ch-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0" />
          <stop offset="50%" stop-color="#f59e0b" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#ch-bg)" />
      <circle cx="400" cy="180" r="280" fill="url(#ch-glow)" />
      <g stroke="#f59e0b" stroke-opacity="0.15" stroke-width="1.2">
        <line x1="400" y1="80" x2="100" y2="450" />
        <line x1="400" y1="80" x2="250" y2="450" />
        <line x1="400" y1="80" x2="400" y2="450" />
        <line x1="400" y1="80" x2="550" y2="450" />
        <line x1="400" y1="80" x2="700" y2="450" />
        <ellipse cx="400" cy="300" rx="220" ry="60" fill="none" stroke-dasharray="6 6" />
        <ellipse cx="400" cy="360" rx="320" ry="80" fill="none" />
        <ellipse cx="400" cy="220" rx="140" ry="38" fill="none" stroke-opacity="0.25" />
      </g>
      <polygon points="400,120 440,180 400,240 360,180" fill="#f59e0b" fill-opacity="0.08" stroke="#f59e0b" stroke-width="1.5" stroke-opacity="0.5" />
      <circle cx="400" cy="180" r="6" fill="#ea580c" />
      <circle cx="340" cy="210" r="3" fill="#f59e0b" opacity="0.6" />
      <circle cx="460" cy="210" r="3" fill="#f59e0b" opacity="0.6" />
      <polygon points="380,0 420,0 490,450 310,450" fill="url(#ch-line)" opacity="0.18" />
    </svg>
  `),

  // 1: Ping Pong (Midnight & Neon Orange / Cyan Duel, rapid velocity arcs)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="pp-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c0a09" />
          <stop offset="50%" stop-color="#141210" />
          <stop offset="100%" stop-color="#0f172a" />
        </linearGradient>
        <radialGradient id="pp-orange" cx="30%" cy="40%" r="50%">
          <stop offset="0%" stop-color="#ea580c" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="pp-cyan" cx="70%" cy="45%" r="50%">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.28" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#pp-bg)" />
      <circle cx="240" cy="180" r="260" fill="url(#pp-orange)" />
      <circle cx="560" cy="200" r="260" fill="url(#pp-cyan)" />
      <polygon points="120,380 680,380 560,240 240,240" fill="#1c1917" fill-opacity="0.5" stroke="#38bdf8" stroke-width="1.2" stroke-opacity="0.2" />
      <line x1="400" y1="230" x2="400" y2="380" stroke="#f97316" stroke-width="2" stroke-dasharray="4 4" stroke-opacity="0.7" />
      <path d="M 160 320 Q 400 100 640 290" fill="none" stroke="#f97316" stroke-width="3" stroke-linecap="round" opacity="0.85" />
      <path d="M 200 330 Q 400 130 600 300" fill="none" stroke="#38bdf8" stroke-width="1.5" stroke-dasharray="6 8" opacity="0.6" />
      <circle cx="400" cy="148" r="10" fill="#fed7aa" />
      <circle cx="400" cy="148" r="22" fill="#ea580c" fill-opacity="0.3" />
    </svg>
  `),

  // 2: Tennis (Dark Court Night & Neon Emerald / Lime glow, court geometry)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="tn-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#09140d" />
          <stop offset="50%" stop-color="#141210" />
          <stop offset="100%" stop-color="#0c0a09" />
        </linearGradient>
        <radialGradient id="tn-glow" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#10b981" stop-opacity="0.28" />
          <stop offset="50%" stop-color="#84cc16" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#tn-bg)" />
      <circle cx="400" cy="160" r="300" fill="url(#tn-glow)" />
      <polygon points="140,420 660,420 540,190 260,190" fill="none" stroke="#10b981" stroke-width="1.8" stroke-opacity="0.35" />
      <line x1="200" y1="305" x2="600" y2="305" stroke="#84cc16" stroke-width="1.5" stroke-opacity="0.4" />
      <line x1="400" y1="190" x2="400" y2="420" stroke="#10b981" stroke-width="1.5" stroke-opacity="0.4" />
      <ellipse cx="400" cy="190" rx="180" ry="50" fill="none" stroke="#10b981" stroke-width="1" stroke-dasharray="8 6" stroke-opacity="0.25" />
      <ellipse cx="400" cy="190" rx="300" ry="85" fill="none" stroke="#84cc16" stroke-width="1" stroke-opacity="0.15" />
      <circle cx="400" cy="190" r="8" fill="#bef264" />
      <circle cx="400" cy="190" r="24" fill="#10b981" fill-opacity="0.25" />
    </svg>
  `),

  // 3: Board Games (Mystic Violet & Warm Amber, floating hex mesh, constellation nodes)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="bg-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#141210" />
          <stop offset="50%" stop-color="#1d132b" />
          <stop offset="100%" stop-color="#0c0a09" />
        </linearGradient>
        <radialGradient id="bg-purple" cx="45%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#a855f7" stop-opacity="0.3" />
          <stop offset="60%" stop-color="#ea580c" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#bg-bg)" />
      <circle cx="360" cy="190" r="290" fill="url(#bg-purple)" />
      <g stroke="#c084fc" stroke-width="1.4" stroke-opacity="0.32" fill="#a855f7" fill-opacity="0.05">
        <polygon points="400,140 440,163 440,209 400,232 360,209 360,163" />
        <polygon points="440,163 480,186 480,232 440,255 400,232 400,186" />
        <polygon points="360,163 400,186 400,232 360,255 320,232 320,186" />
        <polygon points="400,232 440,255 440,301 400,324 360,301 360,255" />
        <polygon points="320,94 360,117 360,163 320,186 280,163 280,117" stroke-opacity="0.15" />
        <polygon points="480,94 520,117 520,163 480,186 440,163 440,117" stroke-opacity="0.15" />
      </g>
      <line x1="280" y1="140" x2="400" y2="186" stroke="#fb923c" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.4" />
      <line x1="520" y1="140" x2="400" y2="186" stroke="#fb923c" stroke-width="1" stroke-dasharray="4 4" stroke-opacity="0.4" />
      <circle cx="400" cy="186" r="5" fill="#f59e0b" />
      <circle cx="440" cy="209" r="4" fill="#c084fc" />
      <circle cx="360" cy="209" r="4" fill="#c084fc" />
      <circle cx="400" cy="280" r="3" fill="#fb923c" />
    </svg>
  `),

  // 4: Basketball (Blaze Orange & Crimson Glow, kinetic hoop perspective rim)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="bb-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#180e0a" />
          <stop offset="50%" stop-color="#141210" />
          <stop offset="100%" stop-color="#0c0a09" />
        </linearGradient>
        <radialGradient id="bb-fire" cx="50%" cy="30%" r="65%">
          <stop offset="0%" stop-color="#ea580c" stop-opacity="0.4" />
          <stop offset="50%" stop-color="#dc2626" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#bb-bg)" />
      <circle cx="400" cy="140" r="320" fill="url(#bb-fire)" />
      <ellipse cx="400" cy="190" rx="140" ry="42" fill="none" stroke="#ea580c" stroke-width="2.5" stroke-opacity="0.85" />
      <ellipse cx="400" cy="190" rx="220" ry="66" fill="none" stroke="#f97316" stroke-width="1.5" stroke-opacity="0.4" stroke-dasharray="10 8" />
      <ellipse cx="400" cy="190" rx="340" ry="102" fill="none" stroke="#ea580c" stroke-width="1" stroke-opacity="0.2" />
      <g stroke="#f97316" stroke-opacity="0.28" stroke-width="1.2">
        <line x1="330" y1="210" x2="370" y2="340" />
        <line x1="470" y1="210" x2="430" y2="340" />
        <line x1="365" y1="225" x2="400" y2="345" />
        <line x1="435" y1="225" x2="400" y2="345" />
        <line x1="400" y1="230" x2="400" y2="350" />
      </g>
      <circle cx="400" cy="190" r="9" fill="#ffedd5" />
      <circle cx="400" cy="190" r="28" fill="#ea580c" fill-opacity="0.35" />
    </svg>
  `),

  // 5: Run Club (Midnight Cyber Skyline, Tangerine & Cyan speed trails)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="rc-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0a0a0f" />
          <stop offset="50%" stop-color="#141210" />
          <stop offset="100%" stop-color="#17120e" />
        </linearGradient>
        <radialGradient id="rc-sun" cx="50%" cy="52%" r="45%">
          <stop offset="0%" stop-color="#f97316" stop-opacity="0.38" />
          <stop offset="50%" stop-color="#06b6d4" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
        <linearGradient id="rc-speed" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="0" />
          <stop offset="50%" stop-color="#f97316" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#06b6d4" stop-opacity="0" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#rc-bg)" />
      <circle cx="400" cy="220" r="220" fill="url(#rc-sun)" />
      <line x1="0" y1="240" x2="800" y2="240" stroke="url(#rc-speed)" stroke-width="2" />
      <polygon points="390,240 410,240 550,450 250,450" fill="#1c1917" fill-opacity="0.4" stroke="#f97316" stroke-width="1.2" stroke-opacity="0.3" />
      <line x1="400" y1="240" x2="400" y2="450" stroke="#f97316" stroke-width="2" stroke-dasharray="16 12" stroke-opacity="0.75" />
      <line x1="395" y1="240" x2="330" y2="450" stroke="#06b6d4" stroke-width="1" stroke-opacity="0.3" />
      <line x1="405" y1="240" x2="470" y2="450" stroke="#06b6d4" stroke-width="1" stroke-opacity="0.3" />
      <line x1="100" y1="220" x2="320" y2="220" stroke="#06b6d4" stroke-width="1.5" stroke-opacity="0.4" stroke-dasharray="24 16" />
      <line x1="480" y1="220" x2="700" y2="220" stroke="#f97316" stroke-width="1.5" stroke-opacity="0.4" stroke-dasharray="20 14" />
    </svg>
  `),

  // 6: Coffee (Warm Caramel Roast Night & Amber Glow, organic topo contour rings)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="cf-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#14100c" />
          <stop offset="50%" stop-color="#1a1410" />
          <stop offset="100%" stop-color="#0c0a09" />
        </linearGradient>
        <radialGradient id="cf-glow" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.35" />
          <stop offset="50%" stop-color="#d97706" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#cf-bg)" />
      <circle cx="400" cy="210" r="270" fill="url(#cf-glow)" />
      <g fill="none" stroke="#f59e0b" stroke-width="1.2">
        <ellipse cx="400" cy="220" rx="90" ry="50" stroke-opacity="0.55" />
        <ellipse cx="400" cy="220" rx="160" ry="85" stroke-opacity="0.3" stroke-dasharray="8 6" />
        <ellipse cx="400" cy="220" rx="250" ry="130" stroke-opacity="0.2" />
        <ellipse cx="400" cy="220" rx="350" ry="175" stroke-opacity="0.1" />
      </g>
      <path d="M 370 210 Q 350 140 380 90 Q 400 50 380 20" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4" />
      <path d="M 430 210 Q 450 140 420 90 Q 400 50 420 20" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-opacity="0.4" />
      <circle cx="400" cy="220" r="7" fill="#fbbf24" />
    </svg>
  `),

  // 7: Co-work (Deep Slate Midnight & Radiant Cyan / Violet synth grid)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="cw-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0c0e14" />
          <stop offset="50%" stop-color="#141210" />
          <stop offset="100%" stop-color="#111827" />
        </linearGradient>
        <radialGradient id="cw-glow" cx="50%" cy="35%" r="60%">
          <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.3" />
          <stop offset="50%" stop-color="#6366f1" stop-opacity="0.14" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#cw-bg)" />
      <circle cx="400" cy="180" r="300" fill="url(#cw-glow)" />
      <g stroke="#06b6d4" stroke-opacity="0.2" stroke-width="1.2">
        <line x1="400" y1="120" x2="80" y2="450" />
        <line x1="400" y1="120" x2="240" y2="450" />
        <line x1="400" y1="120" x2="400" y2="450" />
        <line x1="400" y1="120" x2="560" y2="450" />
        <line x1="400" y1="120" x2="720" y2="450" />
        <line x1="200" y1="280" x2="600" y2="280" />
        <line x1="140" y1="350" x2="660" y2="350" />
        <line x1="80" y1="420" x2="720" y2="420" />
      </g>
      <rect x="330" y="110" width="140" height="90" rx="12" fill="#1e293b" fill-opacity="0.4" stroke="#6366f1" stroke-width="1.6" stroke-opacity="0.6" />
      <circle cx="400" cy="155" r="5" fill="#38bdf8" />
      <circle cx="355" cy="130" r="3" fill="#6366f1" />
      <circle cx="445" cy="130" r="3" fill="#6366f1" />
    </svg>
  `),

  // 8: Spontaneous / Default (Atmospheric Obsidian & Dual Warm Amber / Violet nebula waves)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450">
      <defs>
        <linearGradient id="df-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#141210" />
          <stop offset="50%" stop-color="#1c1917" />
          <stop offset="100%" stop-color="#0c0a09" />
        </linearGradient>
        <radialGradient id="df-glow1" cx="35%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#ea580c" stop-opacity="0.32" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="df-glow2" cx="65%" cy="45%" r="55%">
          <stop offset="0%" stop-color="#8b5cf6" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#141210" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#df-bg)" />
      <circle cx="280" cy="190" r="280" fill="url(#df-glow1)" />
      <circle cx="520" cy="210" r="280" fill="url(#df-glow2)" />
      <ellipse cx="400" cy="225" rx="110" ry="45" fill="none" stroke="#ea580c" stroke-width="2" stroke-opacity="0.65" />
      <ellipse cx="400" cy="225" rx="210" ry="85" fill="none" stroke="#ea580c" stroke-width="1.5" stroke-opacity="0.35" stroke-dasharray="10 8" />
      <ellipse cx="400" cy="225" rx="330" ry="135" fill="none" stroke="#8b5cf6" stroke-width="1" stroke-opacity="0.2" />
      <polygon points="370,50 430,50 480,400 320,400" fill="#ea580c" fill-opacity="0.05" />
      <circle cx="400" cy="225" r="9" fill="#f97316" />
      <circle cx="400" cy="225" r="24" fill="#ea580c" fill-opacity="0.25" />
    </svg>
  `),
];

export function getDefaultCoverForCategory(category: ActivityCategory): string {
  switch (category) {
    case 'Chess':
      return VIBEY_BACKGROUNDS[0];
    case 'Ping Pong':
      return VIBEY_BACKGROUNDS[1];
    case 'Tennis':
    case 'Pickleball':
      return VIBEY_BACKGROUNDS[2];
    case 'Board Games':
    case 'Card Games':
      return VIBEY_BACKGROUNDS[3];
    case 'Basketball':
      return VIBEY_BACKGROUNDS[4];
    case 'Run Club':
    case 'Park Walk':
      return VIBEY_BACKGROUNDS[5];
    case 'Coffee':
      return VIBEY_BACKGROUNDS[6];
    case 'Co-work':
    case 'Study Session':
    case 'Video Games':
      return VIBEY_BACKGROUNDS[7];
    default:
      return VIBEY_BACKGROUNDS[8];
  }
}

/**
 * Resolves meetup cover image: returns default vibey background if cover is missing or from Unsplash.
 */
export function resolveCoverImage(
  coverImage: string | undefined,
  category: ActivityCategory
): string {
  if (!coverImage || coverImage.includes('unsplash.com')) {
    return getDefaultCoverForCategory(category);
  }
  return coverImage;
}

/**
 * Parses an age range string (such as "18–24", "20s & 30s", "30+", "All Ages (18+)")
 * into a numeric closed interval [minAge, maxAge].
 */
export function parseAgeRangeToInterval(rangeStr?: string): [number, number] {
  if (!rangeStr || rangeStr.includes('All Ages') || rangeStr.includes('No preference') || rangeStr === 'Any') {
    return [18, 99];
  }

  const normalized = rangeStr.replace(/\u2013/g, '-').trim();

  if (/20s?\s*&\s*30s?/i.test(normalized)) {
    return [20, 39];
  }

  const plusMatch = normalized.match(/(\d+)\+/);
  if (plusMatch) {
    return [parseInt(plusMatch[1], 10), 99];
  }

  const rangeMatch = normalized.match(/(\d+)\s*-\s*(\d+)/);
  if (rangeMatch) {
    return [parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10)];
  }

  return [18, 99];
}

/**
 * Checks if a meetup's age preference overlaps with any of the selected age filter ranges.
 * If no filters are selected, or the meetup is open to "All Ages (18+)", returns true.
 */
export function doesMeetupMatchAgeFilters(
  meetupRangeStr: string | undefined,
  selectedFilterIds: string[]
): boolean {
  if (!selectedFilterIds || selectedFilterIds.length === 0 || selectedFilterIds.includes('all')) {
    return true;
  }

  if (!meetupRangeStr || meetupRangeStr.includes('All Ages') || meetupRangeStr.includes('No preference') || meetupRangeStr === 'Any') {
    return true;
  }

  const meetupInterval = parseAgeRangeToInterval(meetupRangeStr);

  return selectedFilterIds.some((filterId) => {
    let filterInterval: [number, number];
    switch (filterId) {
      case '18-24':
      case '18–25':
        filterInterval = [18, 24];
        break;
      case '25-34':
      case '20s & 30s':
        filterInterval = [25, 34];
        break;
      case '35-44':
      case '25–35':
        filterInterval = [35, 44];
        break;
      case '45+':
      case '30+':
      case '40+':
        filterInterval = [45, 99];
        break;
      default:
        filterInterval = parseAgeRangeToInterval(filterId);
    }

    return (
      Math.max(meetupInterval[0], filterInterval[0]) <=
      Math.min(meetupInterval[1], filterInterval[1])
    );
  });
}

