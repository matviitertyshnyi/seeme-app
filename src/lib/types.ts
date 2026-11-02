import { z, type ZodType, type ZodSchema } from 'zod';
import type {
  ActivityCategory as LegacyActivityCategory,
  ArrivalStatus as LegacyArrivalStatus,
  JoinMode as LegacyJoinMode,
  RoomStatus as LegacyRoomStatus,
  SkillCompatibility as LegacySkillCompatibility,
  StartTimeOption as LegacyStartTimeOption,
  UserRole as LegacyUserRole,
  VerificationStatus as LegacyVerificationStatus,
} from '@/types/lobby';

// -------------------------------------------------------------
// Validation Helper
// -------------------------------------------------------------
export type ValidationResult<T> =
  | { success: true; data: T; error?: never }
  | { success: false; error: string; data?: never };

/**
 * Validates unknown input data against a Zod schema.
 * Returns { data: T } if valid, or { error: string } detailing issues.
 */
export function validatePayload<T>(
  schema: ZodSchema<T> | ZodType<T>,
  data: unknown
): { data: T; error?: never } | { error: string; data?: never } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues || (result.error as any).errors || [];
    const errorMsg = issues
      .map((issue: any) => {
        const field = issue.path && issue.path.length > 0 ? issue.path.join('.') : 'payload';
        return `${field}: ${issue.message}`;
      })
      .join('; ');
    return { error: errorMsg };
  }
  return { data: result.data };
}

// -------------------------------------------------------------
// Activity & Status Schemas
// -------------------------------------------------------------
export const ActivityCategorySchema = z.string().min(1, 'Category is required');
export type ActivityCategory = z.infer<typeof ActivityCategorySchema>;

export const StartTimeOptionSchema = z.enum([
  'Now',
  'In 30 mins',
  'In 1 hour',
  'Later today',
]);
export type StartTimeOption = z.infer<typeof StartTimeOptionSchema>;

export const RoomStatusSchema = z.enum(['LIVE', 'UPCOMING', 'FINISHED']);
export type RoomStatus = z.infer<typeof RoomStatusSchema>;

export const ArrivalStatusSchema = z.enum([
  'ON_MY_WAY',
  'FIVE_MIN_OUT',
  'ARRIVED',
  'LATE',
]);
export type ArrivalStatus = z.infer<typeof ArrivalStatusSchema>;

export const SkillCompatibilitySchema = z.enum([
  'ALL_LEVELS',
  'CASUAL',
  'COMPETITIVE',
]);
export type SkillCompatibility = z.infer<typeof SkillCompatibilitySchema>;

export const JoinModeSchema = z.enum(['OPEN', 'APPROVAL_REQUIRED']);
export type JoinMode = z.infer<typeof JoinModeSchema>;

export const UserRoleSchema = z.enum(['ADMIN', 'USER']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const VerificationStatusSchema = z.enum([
  'UNVERIFIED',
  'PENDING',
  'VERIFIED',
]);
export type VerificationStatus = z.infer<typeof VerificationStatusSchema>;

// -------------------------------------------------------------
// User Settings & Beacon Schemas
// -------------------------------------------------------------
export const UserSettingsSchema = z.object({
  iosAndroidPush: z.boolean().default(true),
  soundEffects: z.boolean().default(true),
  hapticFeedback: z.boolean().default(true),
  distanceUnit: z.enum(['km', 'mi']).default('km'),
  profileVisible: z.boolean().default(true),
  showReliabilityScore: z.boolean().default(true),
  darkMode: z.boolean().optional(),
});
export type UserSettings = z.infer<typeof UserSettingsSchema>;

export const RadarBeaconSchema = z.object({
  active: z.boolean().default(false),
  categories: z.array(z.string()).default([]),
  radiusKm: z.number().min(1).max(100).default(5),
  note: z.string().max(200).optional(),
  updatedAt: z.string().default(() => new Date().toISOString()),
});
export type RadarBeacon = z.infer<typeof RadarBeaconSchema>;

// -------------------------------------------------------------
// Participant & Join Request Schemas
// -------------------------------------------------------------
export const ParticipantSchema = z.object({
  id: z.string().min(1, 'Participant ID is required'),
  name: z.string().min(1, 'Name is required'),
  age: z.number().int().min(18).max(99).default(25),
  avatar: z.string().default(
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'
  ),
  skillBadge: z.string().optional(),
  tagline: z.string().optional(),
  joinedAt: z.string().default(() => new Date().toISOString()),
  arrivalStatus: ArrivalStatusSchema.optional(),
  spotClue: z.string().max(200).optional(),
  reliabilityScore: z.number().min(0).max(100).optional().default(98),
  ratingAvg: z.number().min(0).max(5).optional().default(4.9),
});
export type Participant = z.infer<typeof ParticipantSchema>;

export const JoinRequestSchema = z.object({
  id: z.string().min(1),
  user: ParticipantSchema,
  note: z.string().max(300).default(''),
  status: z.enum(['PENDING', 'ACCEPTED', 'DECLINED']).default('PENDING'),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type JoinRequest = z.infer<typeof JoinRequestSchema>;

// -------------------------------------------------------------
// User / Persona Schemas
// -------------------------------------------------------------
export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(60),
  age: z.number().int().min(18).max(99).default(25),
  avatar: z.string(),
  skillBadge: z.string().default('New Member'),
  tagline: z.string().default(''),
  neighborhood: z.string().default('Greenwich Village'),
  verified: z.boolean().default(false),
  verificationStatus: VerificationStatusSchema.default('UNVERIFIED'),
  verificationRequestedAt: z.string().optional(),
  verificationNote: z.string().optional(),
  role: UserRoleSchema.default('USER'),
  isBanned: z.boolean().default(false),
  banReason: z.string().optional(),
  favoriteActivities: z.array(z.string()).default([]),
  reliabilityScore: z.number().min(0).max(100).default(95),
  meetupsAttended: z.number().int().nonnegative().default(0),
  hoursPlayed: z.number().int().nonnegative().default(0),
  ratingAvg: z.number().min(0).max(5).default(5.0),
  ratingCount: z.number().int().nonnegative().default(0),
  streakWeeks: z.number().int().nonnegative().default(1),
  bannedUserIds: z.array(z.string()).default([]),
  regularPartnerIds: z.array(z.string()).default([]),
  beacon: RadarBeaconSchema.optional(),
  settings: UserSettingsSchema.default({
    iosAndroidPush: true,
    soundEffects: true,
    hapticFeedback: true,
    distanceUnit: 'km',
    profileVisible: true,
    showReliabilityScore: true,
  }),
  authProvider: z.enum(['google', 'apple', 'email', 'demo']).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});
export type User = z.infer<typeof UserSchema>;
export type UserPersona = User; // Backward-compatible alias

export const UpdateProfileInputSchema = z.object({
  userId: z.string().optional(),
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60).optional(),
  age: z.number().int().min(18, 'Age must be at least 18').max(99).optional(),
  avatar: z.string().min(1).optional(),
  skillBadge: z.string().trim().max(50).optional(),
  tagline: z.string().trim().max(200).optional(),
  neighborhood: z.string().trim().max(80).optional(),
  favoriteActivities: z.array(z.string()).max(20).optional(),
  settings: UserSettingsSchema.partial().optional(),
  beacon: RadarBeaconSchema.optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileInputSchema>;

// -------------------------------------------------------------
// Age Preference Schema
// -------------------------------------------------------------
export const AgeRangeOptionSchema = z.enum([
  'All Ages (18+)',
  '18–25',
  '20s & 30s',
  '25–35',
  '30+',
  '40+',
]);
export type AgeRangeOption = z.infer<typeof AgeRangeOptionSchema>;

export const AGE_RANGE_OPTIONS: AgeRangeOption[] = [
  'All Ages (18+)',
  '18–25',
  '20s & 30s',
  '25–35',
  '30+',
  '40+',
];

// -------------------------------------------------------------
// Meetup Schemas
// -------------------------------------------------------------
export const CreateMeetupInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  category: ActivityCategorySchema,
  preferredAgeRange: z.string().optional().default('All Ages (18+)'),
  equipmentNote: z
    .string()
    .trim()
    .max(500)
    .optional()
    .default('All equipment ready. Drop a message in chat when you arrive.'),
  venueName: z.string().trim().min(2, 'Venue name is required').max(120),
  venueAddress: z.string().trim().max(200).optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  startTime: StartTimeOptionSchema.default('Now'),
  maxParticipants: z.number().int().min(2).max(16).default(4),
  joinMode: JoinModeSchema.default('OPEN'),
  skillCompatibility: SkillCompatibilitySchema.default('ALL_LEVELS'),
  spotClue: z.string().trim().max(200).optional(),
  coverImage: z.string().optional(),
  host: ParticipantSchema.optional(),
  hostId: z.string().optional(),
  coHost: ParticipantSchema.nullable().optional(),
  coHostId: z.string().nullable().optional(),
});
export type CreateMeetupInput = z.infer<typeof CreateMeetupInputSchema>;

export const UpdateMeetupInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title cannot exceed 100 characters')
    .optional(),
  equipmentNote: z.string().trim().max(500).optional(),
  venueName: z.string().trim().min(2, 'Venue name is required').max(120).optional(),
  venueAddress: z.string().trim().max(200).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  startTime: StartTimeOptionSchema.optional(),
  maxParticipants: z.number().int().min(2, 'Minimum 2 participants').max(16, 'Maximum 16 participants').optional(),
  joinMode: JoinModeSchema.optional(),
  skillCompatibility: SkillCompatibilitySchema.optional(),
  preferredAgeRange: z.string().optional(),
  roomStatus: RoomStatusSchema.optional(),
  status: RoomStatusSchema.optional(),
  spotClue: z.string().trim().max(200).optional(),
  coverImage: z.string().optional(),
});
export type UpdateMeetupInput = z.infer<typeof UpdateMeetupInputSchema>;

export const MeetupSchema = z.object({
  id: z.string().min(1),
  category: ActivityCategorySchema,
  mapPinLabel: z.string().default('MEETUP'),
  title: z.string().min(1),
  preferredAgeRange: z.string().optional().default('All Ages (18+)'),
  equipmentNote: z.string().default(''),
  coverImage: z.string(),
  venueName: z.string().min(1),
  venueAddress: z.string().default(''),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  startTime: StartTimeOptionSchema,
  startTimeBadge: z.string(),
  roomStatus: RoomStatusSchema.default('LIVE'),
  skillCompatibility: SkillCompatibilitySchema.default('ALL_LEVELS'),
  maxParticipants: z.number().int().min(2).max(16),
  joinMode: JoinModeSchema.default('OPEN'),
  hostId: z.string().min(1),
  participants: z.array(ParticipantSchema),
  pendingRequests: z.array(JoinRequestSchema).default([]),
  bannedUserIds: z.array(z.string()).default([]),
  coHostIds: z.array(z.string()).optional(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});
export type Meetup = z.infer<typeof MeetupSchema>;
export type Lobby = Meetup; // Backward-compatible alias

// -------------------------------------------------------------
// Join Action Schema
// -------------------------------------------------------------
export const JoinActionTypeSchema = z.enum([
  'JOIN_OR_REQUEST',
  'JOIN',
  'REQUEST_JOIN',
  'ACCEPT_REQUEST',
  'DECLINE_REQUEST',
  'LEAVE',
  'CHECK_IN',
  'BAN_FROM_LOBBY',
  'KICK_OR_BAN',
]);
export type JoinActionType = z.infer<typeof JoinActionTypeSchema>;

export const JoinActionSchema = z.object({
  action: JoinActionTypeSchema,
  user: ParticipantSchema.optional(),
  note: z.string().trim().max(300).optional(),
  requestId: z.string().optional(),
  targetUserId: z.string().optional(),
  arrivalStatus: ArrivalStatusSchema.optional(),
  spotClue: z.string().trim().max(200).optional(),
});
export type JoinActionInput = z.infer<typeof JoinActionSchema>;

// -------------------------------------------------------------
// Message Schemas
// -------------------------------------------------------------
export const SendMessageInputSchema = z
  .object({
    text: z.string().trim().max(1000, 'Message cannot exceed 1000 characters').optional(),
    content: z.string().trim().max(1000).optional(),
    senderId: z.string().optional(),
    senderName: z.string().optional(),
    senderAvatar: z.string().optional(),
  })
  .refine(
    (data) => Boolean((data.text && data.text.trim()) || (data.content && data.content.trim())),
    {
      message: 'Message text or content is required',
    }
  );
export type SendMessageInput = z.infer<typeof SendMessageInputSchema>;

export const MessageSchema = z.object({
  id: z.string().min(1),
  lobbyId: z.string().min(1),
  meetupId: z.string().optional(),
  senderId: z.string().min(1),
  senderName: z.string().min(1),
  senderAvatar: z.string().default(''),
  text: z.string().min(1).max(1000),
  isSystem: z.boolean().optional(),
  createdAt: z.string().default(() => new Date().toISOString()),
});
export type Message = z.infer<typeof MessageSchema>;
export type ChatMessage = Message; // Backward-compatible alias
