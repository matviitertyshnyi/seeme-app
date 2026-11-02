export type ActivityGroup =
  | 'Sports'
  | 'Gaming'
  | 'Hanging Out'
  | 'Co-working';

export type ActivityCategory =
  | 'Chess'
  | 'Ping Pong'
  | 'Tennis'
  | 'Board Games'
  | 'Basketball'
  | 'Run Club'
  | 'Coffee'
  | 'Co-work'
  | 'Pickleball'
  | 'Card Games'
  | 'Video Games'
  | 'Park Walk'
  | 'Study Session'
  | string;

export type StartTimeOption = 'Now' | 'In 30 mins' | 'In 1 hour' | 'Later today';

export type RoomStatus = 'LIVE' | 'UPCOMING' | 'FINISHED';

export type ArrivalStatus = 'ON_MY_WAY' | 'FIVE_MIN_OUT' | 'ARRIVED' | 'LATE';

export type SkillCompatibility = 'ALL_LEVELS' | 'CASUAL' | 'COMPETITIVE';

export type JoinMode = 'OPEN' | 'APPROVAL_REQUIRED';

export type DiscoveryViewMode = 'GRID' | 'SWIPE' | 'MAP';

export interface RadarBeacon {
  active: boolean;
  categories: ActivityCategory[];
  radiusKm: number;
  note?: string;
  updatedAt: string;
}

export interface UserSettings {
  iosAndroidPush: boolean;
  soundEffects: boolean;
  hapticFeedback: boolean;
  distanceUnit: 'km' | 'mi';
  profileVisible: boolean;
  showReliabilityScore: boolean;
  darkMode?: boolean;
}

export interface PlayerRating {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  lobbyId: string;
  lobbyTitle: string;
  stars: number;
  showedUp: boolean;
  comment: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'REQUEST' | 'APPROVED' | 'CHECK_IN' | 'BEACON_MATCH' | 'RATING' | 'INVITE' | 'SYSTEM';
  title: string;
  body: string;
  lobbyId?: string;
  read: boolean;
  createdAt: string;
}

export interface UserPersona {
  id: string;
  email?: string;
  name: string;
  age: number;
  avatar: string;
  skillBadge: string;
  tagline: string;
  neighborhood: string;
  verified: boolean;
  favoriteActivities: ActivityCategory[];
  reliabilityScore: number;
  meetupsAttended: number;
  hoursPlayed: number;
  ratingAvg: number;
  ratingCount: number;
  streakWeeks: number;
  bannedUserIds: string[];
  regularPartnerIds: string[];
  beacon?: RadarBeacon;
  settings: UserSettings;
  authProvider?: 'google' | 'email' | 'demo';
}

export interface Participant {
  id: string;
  name: string;
  age: number;
  avatar: string;
  skillBadge?: string;
  tagline?: string;
  joinedAt: string;
  arrivalStatus?: ArrivalStatus;
  spotClue?: string;
  reliabilityScore?: number;
  ratingAvg?: number;
}

export interface JoinRequest {
  id: string;
  user: Participant;
  note: string;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  lobbyId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  createdAt: string;
  isSystem?: boolean;
}

export interface Lobby {
  id: string;
  category: ActivityCategory;
  mapPinLabel: string;
  title: string;
  equipmentNote: string;
  coverImage: string;
  venueName: string;
  venueAddress: string;
  lat: number;
  lng: number;
  startTime: StartTimeOption;
  startTimeBadge: string;
  roomStatus?: RoomStatus;
  skillCompatibility?: SkillCompatibility;
  maxParticipants: number;
  joinMode: JoinMode;
  hostId: string;
  participants: Participant[];
  pendingRequests: JoinRequest[];
  bannedUserIds?: string[];
  createdAt: string;
}

export interface LobbyWithDistance extends Lobby {
  distanceKm: number;
  distanceLabel: string;
  computedStatus: RoomStatus;
}

export interface DatabaseSchema {
  personas: UserPersona[];
  lobbies: Lobby[];
  messages: ChatMessage[];
  ratings?: PlayerRating[];
  notifications?: AppNotification[];
}
