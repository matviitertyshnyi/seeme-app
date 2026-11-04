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

export type AgeRangeOption =
  | 'All Ages (18+)'
  | '18–25'
  | '20s & 30s'
  | '25–35'
  | '30+'
  | '40+';

export interface PlayerRating {
  id: string;
  fromUserId: string;
  fromUserName: string;
  fromUserAvatar: string;
  toUserId: string;
  lobbyId: string;
  lobbyTitle: string;
  role?: 'HOST_RATING_GUEST' | 'GUEST_RATING_HOST' | 'PEER_RATING';
  stars: number;
  showedUp: boolean;
  tags?: string[];
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

export type UserRole = 'ADMIN' | 'USER';
export type VerificationStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED';

export interface UserPersona {
  id: string;
  email?: string;
  password?: string;
  name: string;
  age: number;
  avatar: string;
  skillBadge: string;
  tagline: string;
  neighborhood: string;
  verified: boolean;
  verificationStatus?: VerificationStatus;
  verificationRequestedAt?: string;
  verificationNote?: string;
  role?: UserRole;
  isBanned?: boolean;
  banReason?: string;
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
  authProvider?: 'google' | 'apple' | 'email' | 'demo';
  createdAt?: string;
  updatedAt?: string;
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
  meetupId?: string;
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
  preferredAgeRange?: string; // e.g., 'All Ages', '18-25', '20s & 30s', '25-35', '30+'
  isRecurring?: boolean;
  recurringSchedule?: string; // e.g., 'Every Friday at 20:00'
  maxParticipants: number;
  joinMode: JoinMode;
  hostId: string;
  participants: Participant[];
  pendingRequests: JoinRequest[];
  bannedUserIds?: string[];
  coHostIds?: string[];
  createdAt: string;
  updatedAt?: string;
}

export type Meetup = Lobby;
export type User = UserPersona;
export type Message = ChatMessage;

export interface LobbyWithDistance extends Lobby {
  distanceKm: number;
  distanceLabel: string;
  computedStatus: RoomStatus;
}

export interface DatabaseSchema {
  personas: UserPersona[];
  lobbies: Lobby[];
  messages: ChatMessage[];
  ratings: PlayerRating[];
  notifications: AppNotification[];
}
