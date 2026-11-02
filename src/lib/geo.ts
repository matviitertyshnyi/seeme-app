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
  if (lobby.roomStatus) {
    return lobby.roomStatus;
  }
  if (lobby.startTime === 'Now') {
    return 'LIVE';
  }
  return 'UPCOMING';
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

export function getDefaultCoverForCategory(category: ActivityCategory): string {
  switch (category) {
    case 'Chess':
      return 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=1000&q=80';
    case 'Ping Pong':
      return 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1000&q=80';
    case 'Tennis':
      return 'https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&w=1000&q=80';
    case 'Board Games':
      return 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=1000&q=80';
    case 'Basketball':
      return 'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1000&q=80';
    case 'Run Club':
      return 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=1000&q=80';
    case 'Coffee':
      return 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80';
    case 'Co-work':
      return 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=1000&q=80';
  }
}
