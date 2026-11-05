import { DatabaseSchema, UserPersona } from '@/types/lobby';

export const DEMO_PERSONAS: UserPersona[] = [];

export const INITIAL_SEED_DATA: DatabaseSchema = {
  personas: [],
  lobbies: [],
  messages: [],
  ratings: [],
  notifications: [],
  directMessages: [],
};
