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
 * Atmospheric lowkey lo-fi cloudy colorful skyscapes with multi-stop twilight/dusk gradients,
 * soft billowy cloud banks, glowing celestial orbs, and deep dark bases for optimal text legibility.
 */
export const VIBEY_BACKGROUNDS: string[] = [
  // 0: Chess (Twilight Violet & Warm Sunset Peach Clouds)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lofi-cloudy">
      <defs>
        <linearGradient id="c0-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1a162b" />
          <stop offset="38%" stop-color="#3b234a" />
          <stop offset="68%" stop-color="#d97757" />
          <stop offset="100%" stop-color="#18131e" />
        </linearGradient>
        <linearGradient id="c0-cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e89d82" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#7a4263" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#2a1a36" />
        </linearGradient>
        <linearGradient id="c0-cloud-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f6ad85" />
          <stop offset="45%" stop-color="#8c4768" />
          <stop offset="100%" stop-color="#21152a" />
        </linearGradient>
        <linearGradient id="c0-cloud-fore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#673656" />
          <stop offset="40%" stop-color="#2b1a32" />
          <stop offset="100%" stop-color="#141018" />
        </linearGradient>
        <linearGradient id="c0-bottom-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#18131e" stop-opacity="0" />
          <stop offset="50%" stop-color="#18131e" stop-opacity="0.75" />
          <stop offset="100%" stop-color="#141018" />
        </linearGradient>
        <radialGradient id="c0-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fed7aa" stop-opacity="0.8" />
          <stop offset="40%" stop-color="#d97757" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#3b234a" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c0-aurora" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#f59e82" stop-opacity="0.4" />
          <stop offset="60%" stop-color="#9333ea" stop-opacity="0.15" />
          <stop offset="100%" stop-color="#1a162b" stop-opacity="0" />
        </radialGradient>
        <filter id="blur-lg"><feGaussianBlur stdDeviation="32" /></filter>
        <filter id="blur-sm"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="800" height="450" fill="url(#c0-sky)" />
      <ellipse cx="420" cy="220" rx="360" ry="140" fill="url(#c0-aurora)" filter="url(#blur-lg)" />
      <g fill="#ffffff">
        <circle cx="110" cy="55" r="1.5" opacity="0.5" />
        <circle cx="190" cy="85" r="1.2" opacity="0.4" />
        <circle cx="280" cy="40" r="1.6" opacity="0.65" />
        <circle cx="370" cy="70" r="1.3" opacity="0.35" />
        <circle cx="490" cy="45" r="1.8" opacity="0.55" />
        <circle cx="560" cy="75" r="1.2" opacity="0.4" />
        <circle cx="680" cy="35" r="1.5" opacity="0.6" />
        <circle cx="740" cy="65" r="1.2" opacity="0.45" />
      </g>
      <circle cx="630" cy="90" r="45" fill="url(#c0-moon-glow)" filter="url(#blur-sm)" />
      <g transform="translate(630, 90)">
        <circle cx="0" cy="0" r="22" fill="#fff5ea" opacity="0.92" />
        <circle cx="8" cy="-5" r="19" fill="#1f1830" />
      </g>
      <g fill="url(#c0-cloud-back)">
        <circle cx="140" cy="245" r="60" />
        <circle cx="220" cy="230" r="75" />
        <circle cx="310" cy="240" r="65" />
        <circle cx="480" cy="235" r="70" />
        <circle cx="560" cy="225" r="80" />
        <circle cx="650" cy="240" r="65" />
        <path d="M-20,250 C70,225 150,220 220,230 C300,215 390,225 460,235 C540,215 640,220 720,235 C760,245 800,250 820,255 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c0-cloud-mid)">
        <circle cx="80" cy="285" r="65" />
        <circle cx="170" cy="275" r="80" />
        <circle cx="270" cy="290" r="70" />
        <circle cx="380" cy="270" r="90" />
        <circle cx="480" cy="280" r="80" />
        <circle cx="610" cy="270" r="85" />
        <circle cx="720" cy="285" r="75" />
        <path d="M-20,300 C60,270 160,265 240,285 C330,260 430,260 520,280 C600,260 700,265 820,295 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c0-cloud-fore)">
        <circle cx="110" cy="355" r="85" />
        <circle cx="220" cy="345" r="95" />
        <circle cx="340" cy="355" r="85" />
        <circle cx="460" cy="340" r="100" />
        <circle cx="580" cy="350" r="90" />
        <circle cx="700" cy="345" r="95" />
        <path d="M-20,360 C80,335 180,330 290,355 C390,325 500,330 610,350 C710,335 770,345 820,360 L820,450 L-20,450 Z" />
      </g>
      <rect y="310" width="800" height="140" fill="url(#c0-bottom-dark)" />
    </svg>
  `),

  // 1: Ping Pong (Electric Dusk Coral & Periwinkle Clouds)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lofi-cloudy">
      <defs>
        <linearGradient id="c1-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#161b33" />
          <stop offset="40%" stop-color="#353a66" />
          <stop offset="70%" stop-color="#c85a7c" />
          <stop offset="100%" stop-color="#14121f" />
        </linearGradient>
        <linearGradient id="c1-cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e8799e" stop-opacity="0.85" />
          <stop offset="50%" stop-color="#64487b" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#241e3d" />
        </linearGradient>
        <linearGradient id="c1-cloud-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f492b3" />
          <stop offset="50%" stop-color="#7e497a" />
          <stop offset="100%" stop-color="#221830" />
        </linearGradient>
        <linearGradient id="c1-cloud-fore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#5a315e" />
          <stop offset="45%" stop-color="#27182f" />
          <stop offset="100%" stop-color="#12101b" />
        </linearGradient>
        <linearGradient id="c1-bottom-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#14121f" stop-opacity="0" />
          <stop offset="50%" stop-color="#14121f" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#100f1a" />
        </linearGradient>
        <radialGradient id="c1-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fecdd3" stop-opacity="0.85" />
          <stop offset="45%" stop-color="#fb7185" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#353a66" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c1-aurora" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stop-color="#f472b6" stop-opacity="0.35" />
          <stop offset="50%" stop-color="#6366f1" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#161b33" stop-opacity="0" />
        </radialGradient>
        <filter id="blur-lg"><feGaussianBlur stdDeviation="32" /></filter>
        <filter id="blur-sm"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="800" height="450" fill="url(#c1-sky)" />
      <ellipse cx="400" cy="210" rx="380" ry="130" fill="url(#c1-aurora)" filter="url(#blur-lg)" />
      <g fill="#ffffff">
        <circle cx="95" cy="50" r="1.5" opacity="0.5" />
        <circle cx="170" cy="75" r="1.3" opacity="0.45" />
        <circle cx="260" cy="45" r="1.6" opacity="0.6" />
        <circle cx="340" cy="80" r="1.2" opacity="0.35" />
        <circle cx="480" cy="35" r="1.8" opacity="0.65" />
        <circle cx="570" cy="65" r="1.3" opacity="0.4" />
        <circle cx="690" cy="45" r="1.5" opacity="0.5" />
        <circle cx="730" cy="85" r="1.2" opacity="0.4" />
      </g>
      <circle cx="370" cy="205" r="60" fill="url(#c1-sun-glow)" filter="url(#blur-sm)" />
      <circle cx="370" cy="205" r="28" fill="#fff1f2" opacity="0.9" />
      <g fill="url(#c1-cloud-back)">
        <circle cx="160" cy="240" r="70" />
        <circle cx="250" cy="225" r="85" />
        <circle cx="350" cy="235" r="75" />
        <circle cx="510" cy="230" r="80" />
        <circle cx="600" cy="220" r="85" />
        <circle cx="680" cy="240" r="70" />
        <path d="M-20,245 C80,220 180,225 260,230 C350,215 440,220 530,230 C620,215 710,225 820,245 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c1-cloud-mid)">
        <circle cx="90" cy="285" r="75" />
        <circle cx="190" cy="270" r="85" />
        <circle cx="300" cy="285" r="75" />
        <circle cx="420" cy="265" r="95" />
        <circle cx="530" cy="280" r="85" />
        <circle cx="640" cy="270" r="90" />
        <circle cx="740" cy="285" r="75" />
        <path d="M-20,295 C70,265 170,260 270,280 C360,255 470,260 560,275 C650,255 740,265 820,290 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c1-cloud-fore)">
        <circle cx="120" cy="355" r="85" />
        <circle cx="240" cy="340" r="100" />
        <circle cx="360" cy="350" r="90" />
        <circle cx="490" cy="335" r="105" />
        <circle cx="610" cy="345" r="95" />
        <circle cx="720" cy="340" r="95" />
        <path d="M-20,355 C90,330 190,325 310,350 C410,325 520,325 630,345 C720,330 780,340 820,355 L820,450 L-20,450 Z" />
      </g>
      <rect y="315" width="800" height="135" fill="url(#c1-bottom-dark)" />
    </svg>
  `),

  // 2: Tennis / Pickleball (Lo-Fi Golden Hour & Sage Twilight Clouds)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lofi-cloudy">
      <defs>
        <linearGradient id="c2-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#132226" />
          <stop offset="36%" stop-color="#264649" />
          <stop offset="68%" stop-color="#d4845a" />
          <stop offset="100%" stop-color="#101819" />
        </linearGradient>
        <linearGradient id="c2-cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f0a579" stop-opacity="0.88" />
          <stop offset="50%" stop-color="#556c60" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#192829" />
        </linearGradient>
        <linearGradient id="c2-cloud-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f5b88a" />
          <stop offset="45%" stop-color="#6e6d5e" />
          <stop offset="100%" stop-color="#162223" />
        </linearGradient>
        <linearGradient id="c2-cloud-fore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#464e47" />
          <stop offset="40%" stop-color="#202b2a" />
          <stop offset="100%" stop-color="#0e1516" />
        </linearGradient>
        <linearGradient id="c2-bottom-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#101819" stop-opacity="0" />
          <stop offset="50%" stop-color="#101819" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#0c1314" />
        </linearGradient>
        <radialGradient id="c2-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fed7aa" stop-opacity="0.85" />
          <stop offset="50%" stop-color="#f97316" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#264649" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c2-aurora" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#fb923c" stop-opacity="0.38" />
          <stop offset="55%" stop-color="#2dd4bf" stop-opacity="0.14" />
          <stop offset="100%" stop-color="#132226" stop-opacity="0" />
        </radialGradient>
        <filter id="blur-lg"><feGaussianBlur stdDeviation="32" /></filter>
        <filter id="blur-sm"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="800" height="450" fill="url(#c2-sky)" />
      <ellipse cx="440" cy="220" rx="370" ry="135" fill="url(#c2-aurora)" filter="url(#blur-lg)" />
      <g fill="#ffffff">
        <circle cx="120" cy="60" r="1.4" opacity="0.45" />
        <circle cx="210" cy="35" r="1.6" opacity="0.6" />
        <circle cx="290" cy="85" r="1.2" opacity="0.35" />
        <circle cx="430" cy="45" r="1.8" opacity="0.65" />
        <circle cx="530" cy="70" r="1.3" opacity="0.4" />
        <circle cx="650" cy="40" r="1.5" opacity="0.55" />
        <circle cx="720" cy="80" r="1.2" opacity="0.4" />
      </g>
      <circle cx="450" cy="195" r="55" fill="url(#c2-sun-glow)" filter="url(#blur-sm)" />
      <circle cx="450" cy="195" r="26" fill="#fff7ed" opacity="0.9" />
      <g fill="url(#c2-cloud-back)">
        <circle cx="150" cy="245" r="65" />
        <circle cx="240" cy="230" r="80" />
        <circle cx="340" cy="240" r="70" />
        <circle cx="500" cy="230" r="80" />
        <circle cx="590" cy="225" r="85" />
        <circle cx="680" cy="245" r="70" />
        <path d="M-20,250 C80,225 170,225 250,235 C340,215 440,220 530,230 C620,215 720,225 820,250 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c2-cloud-mid)">
        <circle cx="90" cy="285" r="70" />
        <circle cx="180" cy="275" r="85" />
        <circle cx="290" cy="290" r="75" />
        <circle cx="400" cy="270" r="90" />
        <circle cx="510" cy="285" r="80" />
        <circle cx="630" cy="275" r="85" />
        <circle cx="730" cy="290" r="75" />
        <path d="M-20,295 C70,265 170,265 260,285 C350,260 450,265 540,280 C630,260 720,270 820,295 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c2-cloud-fore)">
        <circle cx="110" cy="355" r="85" />
        <circle cx="230" cy="340" r="100" />
        <circle cx="350" cy="355" r="85" />
        <circle cx="470" cy="340" r="100" />
        <circle cx="590" cy="350" r="90" />
        <circle cx="710" cy="345" r="95" />
        <path d="M-20,360 C80,335 190,330 300,355 C400,330 510,330 620,350 C710,335 770,345 820,360 L820,450 L-20,450 Z" />
      </g>
      <rect y="310" width="800" height="140" fill="url(#c2-bottom-dark)" />
    </svg>
  `),

  // 3: Board Games / Card Games (Dreamy Lavender & Dusty Rose Nightfall Clouds)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lofi-cloudy">
      <defs>
        <linearGradient id="c3-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#181224" />
          <stop offset="38%" stop-color="#3d2652" />
          <stop offset="70%" stop-color="#9e4770" />
          <stop offset="100%" stop-color="#140f1c" />
        </linearGradient>
        <linearGradient id="c3-cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#d88ca5" stop-opacity="0.88" />
          <stop offset="50%" stop-color="#693c6f" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#241733" />
        </linearGradient>
        <linearGradient id="c3-cloud-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e8a2b8" />
          <stop offset="45%" stop-color="#7e4175" />
          <stop offset="100%" stop-color="#1f142b" />
        </linearGradient>
        <linearGradient id="c3-cloud-fore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#552752" />
          <stop offset="40%" stop-color="#27152c" />
          <stop offset="100%" stop-color="#110c17" />
        </linearGradient>
        <linearGradient id="c3-bottom-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#140f1c" stop-opacity="0" />
          <stop offset="50%" stop-color="#140f1c" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#0f0b15" />
        </linearGradient>
        <radialGradient id="c3-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f5d0fe" stop-opacity="0.85" />
          <stop offset="45%" stop-color="#c084fc" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#3d2652" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c3-aurora" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#f472b6" stop-opacity="0.35" />
          <stop offset="55%" stop-color="#a855f7" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#181224" stop-opacity="0" />
        </radialGradient>
        <filter id="blur-lg"><feGaussianBlur stdDeviation="32" /></filter>
        <filter id="blur-sm"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="800" height="450" fill="url(#c3-sky)" />
      <ellipse cx="400" cy="215" rx="360" ry="135" fill="url(#c3-aurora)" filter="url(#blur-lg)" />
      <g fill="#ffffff">
        <circle cx="100" cy="45" r="1.4" opacity="0.5" />
        <circle cx="180" cy="70" r="1.2" opacity="0.4" />
        <circle cx="310" cy="40" r="1.7" opacity="0.65" />
        <circle cx="420" cy="75" r="1.3" opacity="0.4" />
        <circle cx="510" cy="45" r="1.8" opacity="0.6" />
        <circle cx="620" cy="65" r="1.2" opacity="0.4" />
        <circle cx="710" cy="35" r="1.6" opacity="0.55" />
        <circle cx="760" cy="80" r="1.2" opacity="0.4" />
      </g>
      <circle cx="210" cy="85" r="46" fill="url(#c3-moon-glow)" filter="url(#blur-sm)" />
      <g transform="translate(210, 85)">
        <circle cx="0" cy="0" r="21" fill="#faf5ff" opacity="0.92" />
        <circle cx="-7" cy="-4" r="18" fill="#241735" />
      </g>
      <g fill="url(#c3-cloud-back)">
        <circle cx="130" cy="240" r="65" />
        <circle cx="220" cy="225" r="80" />
        <circle cx="320" cy="235" r="70" />
        <circle cx="480" cy="230" r="80" />
        <circle cx="570" cy="220" r="85" />
        <circle cx="670" cy="240" r="70" />
        <path d="M-20,245 C70,220 160,220 240,230 C330,215 430,220 520,230 C610,215 710,225 820,245 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c3-cloud-mid)">
        <circle cx="80" cy="285" r="70" />
        <circle cx="170" cy="270" r="85" />
        <circle cx="280" cy="285" r="75" />
        <circle cx="390" cy="265" r="95" />
        <circle cx="500" cy="280" r="85" />
        <circle cx="620" cy="270" r="90" />
        <circle cx="730" cy="285" r="75" />
        <path d="M-20,295 C70,265 160,260 260,280 C350,255 450,260 550,275 C640,255 730,265 820,290 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c3-cloud-fore)">
        <circle cx="110" cy="355" r="85" />
        <circle cx="230" cy="340" r="100" />
        <circle cx="350" cy="355" r="90" />
        <circle cx="480" cy="335" r="105" />
        <circle cx="600" cy="345" r="95" />
        <circle cx="710" cy="340" r="95" />
        <path d="M-20,355 C80,330 190,325 300,350 C400,325 510,325 620,345 C710,330 770,340 820,355 L820,450 L-20,450 Z" />
      </g>
      <rect y="310" width="800" height="140" fill="url(#c3-bottom-dark)" />
    </svg>
  `),

  // 4: Basketball (Sunset Crimson, Amber & Deep Indigo Clouds)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lofi-cloudy">
      <defs>
        <linearGradient id="c4-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#19121c" />
          <stop offset="36%" stop-color="#4f1d35" />
          <stop offset="68%" stop-color="#d96b38" />
          <stop offset="100%" stop-color="#150f17" />
        </linearGradient>
        <linearGradient id="c4-cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f5945c" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#7c2847" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#281525" />
        </linearGradient>
        <linearGradient id="c4-cloud-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fba76d" />
          <stop offset="45%" stop-color="#903051" />
          <stop offset="100%" stop-color="#231222" />
        </linearGradient>
        <linearGradient id="c4-cloud-fore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#641e3d" />
          <stop offset="40%" stop-color="#2a1020" />
          <stop offset="100%" stop-color="#130d14" />
        </linearGradient>
        <linearGradient id="c4-bottom-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#150f17" stop-opacity="0" />
          <stop offset="50%" stop-color="#150f17" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#100b12" />
        </linearGradient>
        <radialGradient id="c4-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fde047" stop-opacity="0.85" />
          <stop offset="45%" stop-color="#ea580c" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#4f1d35" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c4-aurora" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#f97316" stop-opacity="0.4" />
          <stop offset="55%" stop-color="#dc2626" stop-opacity="0.18" />
          <stop offset="100%" stop-color="#19121c" stop-opacity="0" />
        </radialGradient>
        <filter id="blur-lg"><feGaussianBlur stdDeviation="32" /></filter>
        <filter id="blur-sm"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="800" height="450" fill="url(#c4-sky)" />
      <ellipse cx="480" cy="210" rx="370" ry="130" fill="url(#c4-aurora)" filter="url(#blur-lg)" />
      <g fill="#ffffff">
        <circle cx="110" cy="50" r="1.5" opacity="0.5" />
        <circle cx="190" cy="80" r="1.2" opacity="0.4" />
        <circle cx="280" cy="35" r="1.6" opacity="0.6" />
        <circle cx="410" cy="65" r="1.3" opacity="0.35" />
        <circle cx="540" cy="40" r="1.8" opacity="0.65" />
        <circle cx="660" cy="60" r="1.4" opacity="0.45" />
        <circle cx="730" cy="40" r="1.2" opacity="0.4" />
      </g>
      <circle cx="500" cy="200" r="58" fill="url(#c4-sun-glow)" filter="url(#blur-sm)" />
      <circle cx="500" cy="200" r="27" fill="#fffbeb" opacity="0.9" />
      <g fill="url(#c4-cloud-back)">
        <circle cx="150" cy="240" r="70" />
        <circle cx="240" cy="225" r="85" />
        <circle cx="340" cy="235" r="75" />
        <circle cx="500" cy="225" r="85" />
        <circle cx="600" cy="220" r="85" />
        <circle cx="690" cy="240" r="70" />
        <path d="M-20,245 C80,220 170,220 250,230 C340,215 440,220 530,230 C620,215 720,225 820,245 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c4-cloud-mid)">
        <circle cx="90" cy="285" r="70" />
        <circle cx="180" cy="270" r="85" />
        <circle cx="290" cy="285" r="75" />
        <circle cx="410" cy="265" r="95" />
        <circle cx="520" cy="280" r="85" />
        <circle cx="630" cy="270" r="90" />
        <circle cx="730" cy="285" r="75" />
        <path d="M-20,295 C70,265 170,260 270,280 C360,255 460,260 550,275 C640,255 730,265 820,290 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c4-cloud-fore)">
        <circle cx="120" cy="355" r="85" />
        <circle cx="240" cy="340" r="100" />
        <circle cx="360" cy="355" r="90" />
        <circle cx="480" cy="335" r="105" />
        <circle cx="600" cy="345" r="95" />
        <circle cx="720" cy="340" r="95" />
        <path d="M-20,355 C90,330 190,325 310,350 C410,325 520,325 630,345 C720,330 780,340 820,355 L820,450 L-20,450 Z" />
      </g>
      <rect y="310" width="800" height="140" fill="url(#c4-bottom-dark)" />
    </svg>
  `),

  // 5: Run Club / Park Walk (Early Dawn Pastel Sky & Misty Horizon Clouds)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lofi-cloudy">
      <defs>
        <linearGradient id="c5-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#151c2e" />
          <stop offset="38%" stop-color="#383b66" />
          <stop offset="68%" stop-color="#cf7663" />
          <stop offset="100%" stop-color="#121622" />
        </linearGradient>
        <linearGradient id="c5-cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e89885" stop-opacity="0.88" />
          <stop offset="50%" stop-color="#675578" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#22233b" />
        </linearGradient>
        <linearGradient id="c5-cloud-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f5ae9c" />
          <stop offset="45%" stop-color="#745c7b" />
          <stop offset="100%" stop-color="#1e1e32" />
        </linearGradient>
        <linearGradient id="c5-cloud-fore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#4e3f5c" />
          <stop offset="40%" stop-color="#241e30" />
          <stop offset="100%" stop-color="#10141d" />
        </linearGradient>
        <linearGradient id="c5-bottom-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#121622" stop-opacity="0" />
          <stop offset="50%" stop-color="#121622" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#0e111a" />
        </linearGradient>
        <radialGradient id="c5-dawn-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fde68a" stop-opacity="0.8" />
          <stop offset="45%" stop-color="#f43f5e" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#383b66" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c5-aurora" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#fb7185" stop-opacity="0.35" />
          <stop offset="55%" stop-color="#38bdf8" stop-opacity="0.14" />
          <stop offset="100%" stop-color="#151c2e" stop-opacity="0" />
        </radialGradient>
        <filter id="blur-lg"><feGaussianBlur stdDeviation="32" /></filter>
        <filter id="blur-sm"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="800" height="450" fill="url(#c5-sky)" />
      <ellipse cx="400" cy="220" rx="380" ry="135" fill="url(#c5-aurora)" filter="url(#blur-lg)" />
      <g fill="#ffffff">
        <circle cx="105" cy="55" r="1.5" opacity="0.55" />
        <circle cx="185" cy="35" r="1.3" opacity="0.4" />
        <circle cx="270" cy="75" r="1.6" opacity="0.6" />
        <circle cx="410" cy="45" r="1.8" opacity="0.65" />
        <circle cx="530" cy="65" r="1.2" opacity="0.35" />
        <circle cx="640" cy="35" r="1.6" opacity="0.55" />
        <circle cx="730" cy="70" r="1.3" opacity="0.4" />
      </g>
      <circle cx="390" cy="205" r="56" fill="url(#c5-dawn-glow)" filter="url(#blur-sm)" />
      <circle cx="390" cy="205" r="26" fill="#fffbeb" opacity="0.88" />
      <g fill="url(#c5-cloud-back)">
        <circle cx="140" cy="245" r="65" />
        <circle cx="230" cy="230" r="80" />
        <circle cx="330" cy="240" r="70" />
        <circle cx="490" cy="230" r="80" />
        <circle cx="580" cy="225" r="85" />
        <circle cx="680" cy="240" r="70" />
        <path d="M-20,250 C80,225 170,225 250,235 C340,215 440,220 530,230 C620,215 720,225 820,250 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c5-cloud-mid)">
        <circle cx="90" cy="285" r="70" />
        <circle cx="180" cy="275" r="85" />
        <circle cx="290" cy="290" r="75" />
        <circle cx="400" cy="270" r="90" />
        <circle cx="510" cy="285" r="80" />
        <circle cx="630" cy="275" r="85" />
        <circle cx="730" cy="290" r="75" />
        <path d="M-20,295 C70,265 170,265 260,285 C350,260 450,265 540,280 C630,260 720,270 820,295 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c5-cloud-fore)">
        <circle cx="110" cy="355" r="85" />
        <circle cx="230" cy="340" r="100" />
        <circle cx="350" cy="355" r="85" />
        <circle cx="470" cy="340" r="100" />
        <circle cx="590" cy="350" r="90" />
        <circle cx="710" cy="345" r="95" />
        <path d="M-20,360 C80,335 190,330 300,355 C400,330 510,330 620,350 C710,335 770,345 820,360 L820,450 L-20,450 Z" />
      </g>
      <rect y="310" width="800" height="140" fill="url(#c5-bottom-dark)" />
    </svg>
  `),

  // 6: Coffee (Cozy Lo-Fi Café Dusk — Warm Caramel, Cinnamon Rose & Twilight Violet Clouds)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lofi-cloudy">
      <defs>
        <linearGradient id="c6-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1c141d" />
          <stop offset="38%" stop-color="#4a2839" />
          <stop offset="68%" stop-color="#c97a53" />
          <stop offset="100%" stop-color="#161017" />
        </linearGradient>
        <linearGradient id="c6-cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e29b7a" stop-opacity="0.9" />
          <stop offset="50%" stop-color="#734354" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#2a1924" />
        </linearGradient>
        <linearGradient id="c6-cloud-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f0ae8c" />
          <stop offset="45%" stop-color="#8a4d62" />
          <stop offset="100%" stop-color="#22141f" />
        </linearGradient>
        <linearGradient id="c6-cloud-fore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#5a2d3e" />
          <stop offset="40%" stop-color="#291421" />
          <stop offset="100%" stop-color="#130d13" />
        </linearGradient>
        <linearGradient id="c6-bottom-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#161017" stop-opacity="0" />
          <stop offset="50%" stop-color="#161017" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#110b12" />
        </linearGradient>
        <radialGradient id="c6-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fde68a" stop-opacity="0.85" />
          <stop offset="45%" stop-color="#f97316" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#4a2839" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c6-aurora" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.38" />
          <stop offset="55%" stop-color="#e11d48" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#1c141d" stop-opacity="0" />
        </radialGradient>
        <filter id="blur-lg"><feGaussianBlur stdDeviation="32" /></filter>
        <filter id="blur-sm"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="800" height="450" fill="url(#c6-sky)" />
      <ellipse cx="420" cy="210" rx="370" ry="135" fill="url(#c6-aurora)" filter="url(#blur-lg)" />
      <g fill="#ffffff">
        <circle cx="115" cy="50" r="1.4" opacity="0.5" />
        <circle cx="195" cy="80" r="1.2" opacity="0.4" />
        <circle cx="295" cy="35" r="1.6" opacity="0.6" />
        <circle cx="425" cy="70" r="1.3" opacity="0.35" />
        <circle cx="535" cy="45" r="1.8" opacity="0.65" />
        <circle cx="655" cy="65" r="1.3" opacity="0.4" />
        <circle cx="735" cy="35" r="1.5" opacity="0.55" />
      </g>
      <circle cx="410" cy="190" r="56" fill="url(#c6-sun-glow)" filter="url(#blur-sm)" />
      <circle cx="410" cy="190" r="27" fill="#fffbeb" opacity="0.9" />
      <g fill="url(#c6-cloud-back)">
        <circle cx="140" cy="245" r="65" />
        <circle cx="230" cy="230" r="80" />
        <circle cx="330" cy="240" r="70" />
        <circle cx="490" cy="230" r="80" />
        <circle cx="580" cy="225" r="85" />
        <circle cx="680" cy="240" r="70" />
        <path d="M-20,250 C80,225 170,225 250,235 C340,215 440,220 530,230 C620,215 720,225 820,250 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c6-cloud-mid)">
        <circle cx="90" cy="285" r="70" />
        <circle cx="180" cy="275" r="85" />
        <circle cx="290" cy="290" r="75" />
        <circle cx="400" cy="270" r="90" />
        <circle cx="510" cy="285" r="80" />
        <circle cx="630" cy="275" r="85" />
        <circle cx="730" cy="290" r="75" />
        <path d="M-20,295 C70,265 170,265 260,285 C350,260 450,265 540,280 C630,260 720,270 820,295 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c6-cloud-fore)">
        <circle cx="110" cy="355" r="85" />
        <circle cx="230" cy="340" r="100" />
        <circle cx="350" cy="355" r="85" />
        <circle cx="470" cy="340" r="100" />
        <circle cx="590" cy="350" r="90" />
        <circle cx="710" cy="345" r="95" />
        <path d="M-20,360 C80,335 190,330 300,355 C400,330 510,330 620,350 C710,335 770,345 820,360 L820,450 L-20,450 Z" />
      </g>
      <rect y="310" width="800" height="140" fill="url(#c6-bottom-dark)" />
    </svg>
  `),

  // 7: Co-work / Study / Video Games (Midnight Lo-Fi Beats — Deep Indigo, Cyan-Violet Aurora & Soft Night Clouds)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lofi-cloudy">
      <defs>
        <linearGradient id="c7-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#111629" />
          <stop offset="38%" stop-color="#282c54" />
          <stop offset="68%" stop-color="#6c3b6e" />
          <stop offset="100%" stop-color="#0e111d" />
        </linearGradient>
        <linearGradient id="c7-cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#937ec8" stop-opacity="0.88" />
          <stop offset="50%" stop-color="#463768" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#1b1c36" />
        </linearGradient>
        <linearGradient id="c7-cloud-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#a78bfa" />
          <stop offset="45%" stop-color="#553a70" />
          <stop offset="100%" stop-color="#18182d" />
        </linearGradient>
        <linearGradient id="c7-cloud-fore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#3d2c56" />
          <stop offset="40%" stop-color="#1c1a2e" />
          <stop offset="100%" stop-color="#0c0f18" />
        </linearGradient>
        <linearGradient id="c7-bottom-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0e111d" stop-opacity="0" />
          <stop offset="50%" stop-color="#0e111d" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#0a0c16" />
        </linearGradient>
        <radialGradient id="c7-moon-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#bae6fd" stop-opacity="0.85" />
          <stop offset="45%" stop-color="#818cf8" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#282c54" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c7-aurora" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35" />
          <stop offset="50%" stop-color="#818cf8" stop-opacity="0.2" />
          <stop offset="100%" stop-color="#111629" stop-opacity="0" />
        </radialGradient>
        <filter id="blur-lg"><feGaussianBlur stdDeviation="32" /></filter>
        <filter id="blur-sm"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="800" height="450" fill="url(#c7-sky)" />
      <ellipse cx="420" cy="210" rx="380" ry="135" fill="url(#c7-aurora)" filter="url(#blur-lg)" />
      <g fill="#ffffff">
        <circle cx="90" cy="45" r="1.4" opacity="0.5" />
        <circle cx="170" cy="75" r="1.2" opacity="0.4" />
        <circle cx="260" cy="35" r="1.7" opacity="0.65" />
        <circle cx="360" cy="70" r="1.3" opacity="0.35" />
        <circle cx="480" cy="40" r="1.8" opacity="0.6" />
        <circle cx="550" cy="80" r="1.2" opacity="0.4" />
        <circle cx="680" cy="40" r="1.5" opacity="0.55" />
        <circle cx="750" cy="70" r="1.3" opacity="0.4" />
      </g>
      <circle cx="620" cy="90" r="45" fill="url(#c7-moon-glow)" filter="url(#blur-sm)" />
      <g transform="translate(620, 90)">
        <circle cx="0" cy="0" r="21" fill="#f0f9ff" opacity="0.92" />
        <circle cx="7" cy="-5" r="18" fill="#181c34" />
      </g>
      <g fill="url(#c7-cloud-back)">
        <circle cx="140" cy="245" r="65" />
        <circle cx="230" cy="230" r="80" />
        <circle cx="330" cy="240" r="70" />
        <circle cx="490" cy="230" r="80" />
        <circle cx="580" cy="225" r="85" />
        <circle cx="680" cy="240" r="70" />
        <path d="M-20,250 C80,225 170,225 250,235 C340,215 440,220 530,230 C620,215 720,225 820,250 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c7-cloud-mid)">
        <circle cx="90" cy="285" r="70" />
        <circle cx="180" cy="275" r="85" />
        <circle cx="290" cy="290" r="75" />
        <circle cx="400" cy="270" r="90" />
        <circle cx="510" cy="285" r="80" />
        <circle cx="630" cy="275" r="85" />
        <circle cx="730" cy="290" r="75" />
        <path d="M-20,295 C70,265 170,265 260,285 C350,260 450,265 540,280 C630,260 720,270 820,295 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c7-cloud-fore)">
        <circle cx="110" cy="355" r="85" />
        <circle cx="230" cy="340" r="100" />
        <circle cx="350" cy="355" r="85" />
        <circle cx="470" cy="340" r="100" />
        <circle cx="590" cy="350" r="90" />
        <circle cx="710" cy="345" r="95" />
        <path d="M-20,360 C80,335 190,330 300,355 C400,330 510,330 620,350 C710,335 770,345 820,360 L820,450 L-20,450 Z" />
      </g>
      <rect y="310" width="800" height="140" fill="url(#c7-bottom-dark)" />
    </svg>
  `),

  // 8: Spontaneous / Default (Velvet Sunset & Cotton-Candy Dusk Clouds)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lofi-cloudy">
      <defs>
        <linearGradient id="c8-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#171426" />
          <stop offset="38%" stop-color="#45274d" />
          <stop offset="68%" stop-color="#c96f53" />
          <stop offset="100%" stop-color="#14101d" />
        </linearGradient>
        <linearGradient id="c8-cloud-back" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#e89283" stop-opacity="0.88" />
          <stop offset="50%" stop-color="#724164" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#26172e" />
        </linearGradient>
        <linearGradient id="c8-cloud-mid" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#f6a492" />
          <stop offset="45%" stop-color="#82476d" />
          <stop offset="100%" stop-color="#211227" />
        </linearGradient>
        <linearGradient id="c8-cloud-fore" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#58294e" />
          <stop offset="40%" stop-color="#261327" />
          <stop offset="100%" stop-color="#120e18" />
        </linearGradient>
        <linearGradient id="c8-bottom-dark" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#14101d" stop-opacity="0" />
          <stop offset="50%" stop-color="#14101d" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#0f0b16" />
        </linearGradient>
        <radialGradient id="c8-sun-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fed7aa" stop-opacity="0.85" />
          <stop offset="45%" stop-color="#f43f5e" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#45274d" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c8-aurora" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#fb7185" stop-opacity="0.38" />
          <stop offset="55%" stop-color="#c084fc" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#171426" stop-opacity="0" />
        </radialGradient>
        <filter id="blur-lg"><feGaussianBlur stdDeviation="32" /></filter>
        <filter id="blur-sm"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <rect width="800" height="450" fill="url(#c8-sky)" />
      <ellipse cx="400" cy="215" rx="380" ry="135" fill="url(#c8-aurora)" filter="url(#blur-lg)" />
      <g fill="#ffffff">
        <circle cx="110" cy="50" r="1.5" opacity="0.5" />
        <circle cx="190" cy="80" r="1.2" opacity="0.4" />
        <circle cx="280" cy="35" r="1.6" opacity="0.6" />
        <circle cx="410" cy="70" r="1.3" opacity="0.35" />
        <circle cx="520" cy="45" r="1.8" opacity="0.65" />
        <circle cx="640" cy="65" r="1.3" opacity="0.4" />
        <circle cx="730" cy="35" r="1.5" opacity="0.55" />
      </g>
      <circle cx="380" cy="205" r="56" fill="url(#c8-sun-glow)" filter="url(#blur-sm)" />
      <circle cx="380" cy="205" r="27" fill="#fff7ed" opacity="0.9" />
      <g fill="url(#c8-cloud-back)">
        <circle cx="140" cy="245" r="65" />
        <circle cx="230" cy="230" r="80" />
        <circle cx="330" cy="240" r="70" />
        <circle cx="490" cy="230" r="80" />
        <circle cx="580" cy="225" r="85" />
        <circle cx="680" cy="240" r="70" />
        <path d="M-20,250 C80,225 170,225 250,235 C340,215 440,220 530,230 C620,215 720,225 820,250 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c8-cloud-mid)">
        <circle cx="90" cy="285" r="70" />
        <circle cx="180" cy="275" r="85" />
        <circle cx="290" cy="290" r="75" />
        <circle cx="400" cy="270" r="90" />
        <circle cx="510" cy="285" r="80" />
        <circle cx="630" cy="275" r="85" />
        <circle cx="730" cy="290" r="75" />
        <path d="M-20,295 C70,265 170,265 260,285 C350,260 450,265 540,280 C630,260 720,270 820,295 L820,450 L-20,450 Z" />
      </g>
      <g fill="url(#c8-cloud-fore)">
        <circle cx="110" cy="355" r="85" />
        <circle cx="230" cy="340" r="100" />
        <circle cx="350" cy="355" r="85" />
        <circle cx="470" cy="340" r="100" />
        <circle cx="590" cy="350" r="90" />
        <circle cx="710" cy="345" r="95" />
        <path d="M-20,360 C80,335 190,330 300,355 C400,330 510,330 620,350 C710,335 770,345 820,360 L820,450 L-20,450 Z" />
      </g>
      <rect y="310" width="800" height="140" fill="url(#c8-bottom-dark)" />
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
  if (
    !coverImage ||
    coverImage.includes('unsplash.com') ||
    (coverImage.startsWith('data:image/svg+xml') && !coverImage.includes('lofi-cloudy'))
  ) {
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

