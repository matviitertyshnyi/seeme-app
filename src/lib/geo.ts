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

/**
 * Formats event creation date for clean visible display.
 */
export function formatEventCreationDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = new Date();
    const isToday =
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear();

    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (isToday) {
      return `Created today at ${timeStr}`;
    }
    const monthStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    return `Created ${monthStr} at ${timeStr}`;
  } catch {
    return '';
  }
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
  // 0: Sunset Clouds (Lo-Fi Atmospheric Peach & Violet Clouds)
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

  // 1: Cozy Café (Warm Walnut, Glowing Pendant Lamp & Steaming Cup)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lr-cover">
      <defs>
        <linearGradient id="c1-bg" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1e130c" />
          <stop offset="50%" stop-color="#140c07" />
          <stop offset="100%" stop-color="#0a0604" />
        </linearGradient>
        <radialGradient id="c1-lamp-glow" cx="50%" cy="10%" r="55%">
          <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.85" />
          <stop offset="25%" stop-color="#ea580c" stop-opacity="0.4" />
          <stop offset="70%" stop-color="#78350f" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#1e130c" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c1-bokeh1" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c1-bokeh2" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ea580c" stop-opacity="0.35" />
          <stop offset="100%" stop-color="#ea580c" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#c1-bg)" />
      <circle cx="400" cy="110" r="320" fill="url(#c1-lamp-glow)" />
      <!-- Warm Bokeh Circles -->
      <circle cx="160" cy="180" r="70" fill="url(#c1-bokeh1)" />
      <circle cx="650" cy="220" r="90" fill="url(#c1-bokeh2)" />
      <circle cx="280" cy="120" r="45" fill="url(#c1-bokeh2)" />
      <circle cx="560" cy="140" r="55" fill="url(#c1-bokeh1)" />
      <!-- Hanging Pendant Wire & Lamp -->
      <line x1="400" y1="0" x2="400" y2="85" stroke="#78350f" stroke-width="2.5" />
      <path d="M375,85 L425,85 L438,110 L362,110 Z" fill="#29180f" stroke="#ea580c" stroke-width="1.5" />
      <ellipse cx="400" cy="110" rx="38" ry="8" fill="#fde68a" />
      <circle cx="400" cy="114" r="12" fill="#fff" opacity="0.9" />
      <!-- Café Counter Silhouette -->
      <path d="M0,320 L800,320 L800,450 L0,450 Z" fill="#140a05" />
      <line x1="0" y1="320" x2="800" y2="320" stroke="#b45309" stroke-width="3" opacity="0.6" />
      <!-- Ceramic Cup & Saucer Silhouette -->
      <ellipse cx="400" cy="326" rx="42" ry="8" fill="#29180f" />
      <path d="M376,285 C376,316 424,316 424,285 Z" fill="#29180f" stroke="#b45309" stroke-width="2" />
      <path d="M424,292 C434,292 434,306 424,306" fill="none" stroke="#b45309" stroke-width="2.5" stroke-linecap="round" />
      <!-- Steam Wisps -->
      <path d="M392,275 Q386,255 394,240 Q400,225 396,210" fill="none" stroke="#fde68a" stroke-width="2" opacity="0.5" stroke-linecap="round" />
      <path d="M404,275 Q412,255 406,238 Q400,222 406,206" fill="none" stroke="#fed7aa" stroke-width="2" opacity="0.55" stroke-linecap="round" />
    </svg>
  `),

  // 2: Night City (Twilight Indigo Skyline with Warm Lit Windows & Crescent Moon)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lr-cover">
      <defs>
        <linearGradient id="c2-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0a0d18" />
          <stop offset="40%" stop-color="#14182e" />
          <stop offset="75%" stop-color="#241e3d" />
          <stop offset="100%" stop-color="#0f111a" />
        </linearGradient>
        <radialGradient id="c2-moon-aura" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#fef08a" stop-opacity="0.8" />
          <stop offset="35%" stop-color="#f59e0b" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#0a0d18" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#c2-sky)" />
      <!-- Distant Stars -->
      <g fill="#ffffff">
        <circle cx="85" cy="45" r="1.3" opacity="0.6" />
        <circle cx="160" cy="70" r="1.5" opacity="0.45" />
        <circle cx="280" cy="35" r="1.2" opacity="0.7" />
        <circle cx="410" cy="60" r="1.6" opacity="0.5" />
        <circle cx="510" cy="30" r="1.4" opacity="0.65" />
        <circle cx="720" cy="50" r="1.5" opacity="0.75" />
      </g>
      <!-- Crescent Moon -->
      <circle cx="640" cy="75" r="42" fill="url(#c2-moon-aura)" />
      <circle cx="640" cy="75" r="18" fill="#fef9c3" />
      <circle cx="646" cy="71" r="15" fill="#111528" />
      <!-- Background Buildings Layer -->
      <path d="M40,240 L80,240 L80,450 L40,450 Z M130,210 L180,210 L180,450 L130,450 Z M260,230 L310,230 L310,450 L260,450 Z M390,195 L440,195 L440,450 L390,450 Z M520,220 L580,220 L580,450 L520,450 Z M670,235 L730,235 L730,450 L670,450 Z" fill="#141726" />
      <!-- Foreground Skyline Silhouette -->
      <path d="M0,280 L40,280 L40,450 L0,450 Z M70,250 L125,250 L125,450 L70,450 Z M170,220 L240,220 L240,450 L170,450 Z M280,265 L350,265 L350,450 L280,450 Z M375,180 L425,180 L425,450 L375,450 Z M460,240 L530,240 L530,450 L460,450 Z M560,205 L625,205 L625,450 L560,450 Z M650,260 L710,260 L710,450 L650,450 Z M740,230 L800,230 L800,450 L740,450 Z" fill="#0c0e17" />
      <!-- Lit Window Grid Specks (Amber & Pale Gold) -->
      <g fill="#f59e0b" opacity="0.85">
        <rect x="85" y="270" width="6" height="7" rx="1" />
        <rect x="102" y="270" width="6" height="7" rx="1" />
        <rect x="85" y="295" width="6" height="7" rx="1" />
        <rect x="185" y="240" width="6" height="8" rx="1" />
        <rect x="205" y="240" width="6" height="8" rx="1" />
        <rect x="220" y="260" width="6" height="8" rx="1" fill="#fef08a" />
        <rect x="185" y="280" width="6" height="8" rx="1" />
        <rect x="390" y="200" width="6" height="9" rx="1" fill="#fef08a" />
        <rect x="405" y="200" width="6" height="9" rx="1" />
        <rect x="390" y="225" width="6" height="9" rx="1" />
        <rect x="480" y="260" width="7" height="8" rx="1" />
        <rect x="500" y="260" width="7" height="8" rx="1" fill="#fef08a" />
        <rect x="580" y="225" width="7" height="8" rx="1" />
        <rect x="600" y="245" width="7" height="8" rx="1" fill="#fef08a" />
        <rect x="580" y="270" width="7" height="8" rx="1" />
        <rect x="760" y="250" width="6" height="7" rx="1" />
      </g>
      <!-- Base Horizon Glow Gradient -->
      <rect y="360" width="800" height="90" fill="url(#c2-sky)" opacity="0.6" />
    </svg>
  `),

  // 3: Sports Court (Emerald Court Ground with Regulation Lines & Net)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lr-cover">
      <defs>
        <linearGradient id="c3-court" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#041f15" />
          <stop offset="45%" stop-color="#0b3827" />
          <stop offset="100%" stop-color="#04140e" />
        </linearGradient>
        <linearGradient id="c3-accent" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#ea580c" stop-opacity="0.8" />
          <stop offset="100%" stop-color="#f97316" stop-opacity="0.8" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#c3-court)" />
      <!-- Perspective Court Perimeter Lines -->
      <polygon points="120,400 680,400 580,120 220,120" fill="none" stroke="#34d399" stroke-width="2.5" opacity="0.4" />
      <!-- Service Box Lines -->
      <line x1="180" y1="260" x2="620" y2="260" stroke="#34d399" stroke-width="2" opacity="0.45" />
      <line x1="400" y1="120" x2="400" y2="400" stroke="#34d399" stroke-width="2" opacity="0.4" />
      <line x1="265" y1="120" x2="200" y2="400" stroke="#34d399" stroke-width="1.5" opacity="0.3" />
      <line x1="535" y1="120" x2="600" y2="400" stroke="#34d399" stroke-width="1.5" opacity="0.3" />
      <!-- Center Net Mesh Graphic -->
      <polygon points="180,258 620,258 620,285 180,285" fill="#05281b" stroke="#ffffff" stroke-width="1.5" opacity="0.75" />
      <line x1="175" y1="258" x2="625" y2="258" stroke="#ffffff" stroke-width="3" opacity="0.9" />
      <line x1="175" y1="252" x2="175" y2="290" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round" />
      <line x1="625" y1="252" x2="625" y2="290" stroke="#ea580c" stroke-width="3.5" stroke-linecap="round" />
      <!-- Dynamic Accent Flare -->
      <circle cx="400" cy="258" r="80" fill="#34d399" opacity="0.08" />
      <circle cx="400" cy="258" r="4" fill="#ffffff" opacity="0.9" />
    </svg>
  `),

  // 4: Pine Forest (Teal Aurora Sky, Mountain Ridge & Pine Trees)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lr-cover">
      <defs>
        <linearGradient id="c4-aurora-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#041214" />
          <stop offset="40%" stop-color="#082b2b" />
          <stop offset="70%" stop-color="#0d4239" />
          <stop offset="100%" stop-color="#051412" />
        </linearGradient>
        <radialGradient id="c4-glow" cx="50%" cy="30%" r="50%">
          <stop offset="0%" stop-color="#2dd4bf" stop-opacity="0.35" />
          <stop offset="60%" stop-color="#0f766e" stop-opacity="0.1" />
          <stop offset="100%" stop-color="#041214" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#c4-aurora-sky)" />
      <ellipse cx="400" cy="140" rx="360" ry="90" fill="url(#c4-glow)" />
      <!-- Night Stars -->
      <g fill="#ffffff">
        <circle cx="120" cy="40" r="1.2" opacity="0.6" />
        <circle cx="210" cy="70" r="1.5" opacity="0.5" />
        <circle cx="340" cy="35" r="1.3" opacity="0.75" />
        <circle cx="480" cy="55" r="1.4" opacity="0.4" />
        <circle cx="620" cy="40" r="1.6" opacity="0.7" />
        <circle cx="730" cy="65" r="1.2" opacity="0.5" />
      </g>
      <!-- Mountain Ridges -->
      <polygon points="0,280 180,180 340,250 490,165 640,240 800,190 800,450 0,450" fill="#08201d" />
      <polygon points="0,310 130,240 290,290 420,230 570,300 710,245 800,280 800,450 0,450" fill="#051715" />
      <!-- Layered Pine Trees Silhouettes -->
      <g fill="#020c0a">
        <!-- Tree 1 -->
        <polygon points="60,260 45,340 75,340" />
        <polygon points="60,235 48,290 72,290" />
        <polygon points="60,210 52,255 68,255" />
        <!-- Tree 2 -->
        <polygon points="140,250 120,350 160,350" />
        <polygon points="140,220 125,290 155,290" />
        <polygon points="140,195 130,245 150,245" />
        <!-- Tree 3 -->
        <polygon points="250,270 235,360 265,360" />
        <polygon points="250,240 238,300 262,300" />
        <!-- Tree 4 (Center tall) -->
        <polygon points="380,230 355,350 405,350" />
        <polygon points="380,195 362,280 398,280" />
        <polygon points="380,165 370,225 390,225" />
        <!-- Tree 5 -->
        <polygon points="510,255 490,360 530,360" />
        <polygon points="510,225 496,295 524,295" />
        <!-- Tree 6 -->
        <polygon points="640,240 615,350 665,350" />
        <polygon points="640,205 624,275 656,275" />
        <polygon points="640,180 630,230 650,230" />
        <!-- Tree 7 -->
        <polygon points="730,260 712,350 748,350" />
        <polygon points="730,230 718,290 742,290" />
      </g>
      <!-- Base Silhouette Fill -->
      <rect y="340" width="800" height="110" fill="#020c0a" />
    </svg>
  `),

  // 5: Modern Mesh (Tactile Dark Obsidian with Radiant Plum & Amber Spheres)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lr-cover">
      <defs>
        <radialGradient id="c5-orb1" cx="30%" cy="40%" r="55%">
          <stop offset="0%" stop-color="#c2410c" stop-opacity="0.8" />
          <stop offset="45%" stop-color="#ea580c" stop-opacity="0.4" />
          <stop offset="100%" stop-color="#0c0a09" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c5-orb2" cx="70%" cy="45%" r="60%">
          <stop offset="0%" stop-color="#7e22ce" stop-opacity="0.75" />
          <stop offset="50%" stop-color="#3b0764" stop-opacity="0.3" />
          <stop offset="100%" stop-color="#0c0a09" stop-opacity="0" />
        </radialGradient>
        <radialGradient id="c5-orb3" cx="50%" cy="85%" r="50%">
          <stop offset="0%" stop-color="#d97706" stop-opacity="0.5" />
          <stop offset="100%" stop-color="#0c0a09" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="#0c0a09" />
      <circle cx="260" cy="180" r="280" fill="url(#c5-orb1)" />
      <circle cx="560" cy="200" r="300" fill="url(#c5-orb2)" />
      <circle cx="400" cy="360" r="240" fill="url(#c5-orb3)" />
      <!-- Subtle Ambient Noise / Micro-grid -->
      <g stroke="#ffffff" stroke-width="0.8" opacity="0.04">
        <line x1="0" y1="150" x2="800" y2="150" />
        <line x1="0" y1="300" x2="800" y2="300" />
        <line x1="266" y1="0" x2="266" y2="450" />
        <line x1="533" y1="0" x2="533" y2="450" />
      </g>
    </svg>
  `),

  // 6: Cyber Horizon (Retro Synth Sun & Perspective Grid Lines)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lr-cover">
      <defs>
        <linearGradient id="c6-sky" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#0a0518" />
          <stop offset="55%" stop-color="#1f0a38" />
          <stop offset="85%" stop-color="#4c1d42" />
          <stop offset="100%" stop-color="#12051f" />
        </linearGradient>
        <linearGradient id="c6-sun" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#fde047" />
          <stop offset="50%" stop-color="#f97316" />
          <stop offset="100%" stop-color="#e11d48" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="url(#c6-sky)" />
      <!-- Sliced Retro Sun -->
      <g transform="translate(400, 230)">
        <circle cx="0" cy="0" r="110" fill="url(#c6-sun)" />
        <!-- Horizontal Laser Slice Cuts -->
        <rect x="-120" y="8" width="240" height="4" fill="#1f0a38" />
        <rect x="-120" y="24" width="240" height="6" fill="#1f0a38" />
        <rect x="-120" y="44" width="240" height="8" fill="#1f0a38" />
        <rect x="-120" y="68" width="240" height="10" fill="#1f0a38" />
        <rect x="-120" y="94" width="240" height="14" fill="#1f0a38" />
      </g>
      <!-- Horizon Floor Fill -->
      <rect y="230" width="800" height="220" fill="#0d0417" opacity="0.95" />
      <line x1="0" y1="230" x2="800" y2="230" stroke="#f97316" stroke-width="2.5" opacity="0.85" />
      <!-- Perspective Grid Receding to Horizon Center -->
      <g stroke="#ec4899" stroke-width="1.2" opacity="0.45">
        <line x1="400" y1="230" x2="-100" y2="450" />
        <line x1="400" y1="230" x2="80" y2="450" />
        <line x1="400" y1="230" x2="240" y2="450" />
        <line x1="400" y1="230" x2="350" y2="450" />
        <line x1="400" y1="230" x2="400" y2="450" stroke-width="1.5" />
        <line x1="400" y1="230" x2="450" y2="450" />
        <line x1="400" y1="230" x2="560" y2="450" />
        <line x1="400" y1="230" x2="720" y2="450" />
        <line x1="400" y1="230" x2="900" y2="450" />
        <!-- Horizontal Grid Steps -->
        <line x1="0" y1="242" x2="800" y2="242" stroke-width="0.8" />
        <line x1="0" y1="258" x2="800" y2="258" stroke-width="0.9" />
        <line x1="0" y1="280" x2="800" y2="280" stroke-width="1" />
        <line x1="0" y1="312" x2="800" y2="312" stroke-width="1.2" />
        <line x1="0" y1="358" x2="800" y2="358" stroke-width="1.5" />
        <line x1="0" y1="418" x2="800" y2="418" stroke-width="1.8" />
      </g>
    </svg>
  `),

  // 7: Minimal Arches (Bauhaus / Nordic Architectural Archways with Wall Wash)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lr-cover">
      <defs>
        <linearGradient id="c7-wall" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1f1d1a" />
          <stop offset="60%" stop-color="#151412" />
          <stop offset="100%" stop-color="#0c0b0a" />
        </linearGradient>
        <radialGradient id="c7-light" cx="50%" cy="10%" r="65%">
          <stop offset="0%" stop-color="#fed7aa" stop-opacity="0.65" />
          <stop offset="40%" stop-color="#ea580c" stop-opacity="0.25" />
          <stop offset="100%" stop-color="#151412" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="800" height="450" fill="url(#c7-wall)" />
      <circle cx="400" cy="80" r="340" fill="url(#c7-light)" />
      <!-- Repeating Bauhaus Geometric Archways -->
      <!-- Arch 1 (Outer) -->
      <path d="M180,450 L180,240 A220,220 0 0,1 620,240 L620,450 Z" fill="#171513" stroke="#292524" stroke-width="2" />
      <!-- Arch 2 (Mid) -->
      <path d="M250,450 L250,250 A150,150 0 0,1 550,250 L550,450 Z" fill="#13110f" stroke="#38322e" stroke-width="2" />
      <!-- Arch 3 (Inner focal) -->
      <path d="M320,450 L320,260 A80,80 0 0,1 480,260 L480,450 Z" fill="#0b0a08" stroke="#ea580c" stroke-width="2" />
      <!-- Minimalist Sphere on Pedestal -->
      <circle cx="400" cy="300" r="32" fill="#faf8f5" opacity="0.92" />
      <ellipse cx="400" cy="342" rx="36" ry="6" fill="#000000" opacity="0.6" />
      <!-- Warm Ambient Spotlight Floor Line -->
      <line x1="100" y1="420" x2="700" y2="420" stroke="#ea580c" stroke-width="1.5" opacity="0.5" />
    </svg>
  `),

  // 8: Obsidian Stone (Faceted Charcoal Geometry with Radiant Orange Edge)
  toSvgDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 450" data-theme="lr-cover">
      <defs>
        <linearGradient id="c8-facet1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#242220" />
          <stop offset="100%" stop-color="#141210" />
        </linearGradient>
        <linearGradient id="c8-facet2" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#1c1a17" />
          <stop offset="100%" stop-color="#0a0908" />
        </linearGradient>
        <linearGradient id="c8-facet3" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#181614" />
          <stop offset="100%" stop-color="#100e0d" />
        </linearGradient>
        <linearGradient id="c8-orange-edge" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#f97316" />
          <stop offset="50%" stop-color="#ea580c" />
          <stop offset="100%" stop-color="#9a3412" />
        </linearGradient>
      </defs>
      <rect width="800" height="450" fill="#0d0c0a" />
      <!-- Faceted Polygon Planes -->
      <polygon points="0,0 420,0 280,240 0,160" fill="url(#c8-facet1)" stroke="#292524" stroke-width="1.2" />
      <polygon points="420,0 800,0 800,210 520,260 280,240" fill="url(#c8-facet2)" stroke="#292524" stroke-width="1.2" />
      <polygon points="0,160 280,240 380,450 0,450" fill="url(#c8-facet2)" stroke="#292524" stroke-width="1.2" />
      <polygon points="280,240 520,260 480,450 380,450" fill="url(#c8-facet3)" stroke="#292524" stroke-width="1.2" />
      <polygon points="520,260 800,210 800,450 480,450" fill="url(#c8-facet1)" stroke="#292524" stroke-width="1.2" />
      <!-- Radiant Orange Accent Edge -->
      <line x1="280" y1="240" x2="520" y2="260" stroke="url(#c8-orange-edge)" stroke-width="3" stroke-linecap="round" />
      <circle cx="280" cy="240" r="5" fill="#ea580c" />
      <circle cx="520" cy="260" r="4" fill="#f97316" />
    </svg>
  `),
];

export function getDefaultCoverForCategory(category: ActivityCategory): string {
  switch (category) {
    case 'Chess':
      return VIBEY_BACKGROUNDS[0];
    case 'Coffee':
      return VIBEY_BACKGROUNDS[1];
    case 'Drinks':
    case 'Night Out':
      return VIBEY_BACKGROUNDS[2];
    case 'Tennis':
    case 'Ping Pong':
    case 'Pickleball':
    case 'Basketball':
      return VIBEY_BACKGROUNDS[3];
    case 'Run Club':
    case 'Park Walk':
    case 'Hiking':
      return VIBEY_BACKGROUNDS[4];
    case 'Co-work':
    case 'Study Session':
      return VIBEY_BACKGROUNDS[5];
    case 'Video Games':
    case 'Gaming':
      return VIBEY_BACKGROUNDS[6];
    case 'Museum':
    case 'Art Walk':
    case 'Board Games':
    case 'Card Games':
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
    (coverImage.startsWith('data:image/svg+xml') &&
      !coverImage.includes('lofi-cloudy') &&
      !coverImage.includes('lr-cover'))
  ) {
    return getDefaultCoverForCategory(category);
  }
  return coverImage;
}

/**
 * Parses an age range string into [minAge, maxAge].
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

