'use client';

import React from 'react';
import {
  Crown,
  CircleDot,
  Trophy,
  Dices,
  Flame,
  Footprints,
  Coffee,
  Laptop,
  Sparkles,
  Gamepad2,
  BookOpen,
  Utensils,
  GlassWater,
  Compass,
  SlidersHorizontal,
} from 'lucide-react';
import { ActivityCategory, ActivityGroup } from '@/types/lobby';

export const BROAD_CATEGORIES = [
  'Sports & Fitness',
  'Gaming & Strategy',
  'Social & Hangout',
  'Co-Working',
] as const;

export type BroadCategory = (typeof BROAD_CATEGORIES)[number];

export const ACTIVITY_GROUPS: ActivityGroup[] = [
  'Hanging Out',
  'Sports',
  'Gaming',
  'Co-working',
];

export const GROUPED_ACTIVITIES: Record<string, string[]> = {
  'Sports & Fitness': ['Tennis', 'Basketball', 'Run Club', 'Ping Pong', 'Pickleball'],
  'Gaming & Strategy': ['Board Games', 'Chess', 'Video Games'],
  'Social & Hangout': ['Coffee', 'Park Walk'],
  'Co-Working': ['Study Session'],
  'Hanging Out': ['Coffee', 'Park Walk'],
  Sports: ['Tennis', 'Basketball', 'Run Club', 'Ping Pong', 'Pickleball'],
  Gaming: ['Board Games', 'Chess', 'Video Games'],
  'Co-working': ['Study Session'],
};

export function getBroadCategory(category: string): BroadCategory {
  const c = category.toLowerCase();
  if (
    ['sports', 'fitness', 'ping pong', 'tennis', 'basketball', 'run club', 'pickleball', 'soccer', 'volleyball'].some(
      (k) => c.includes(k)
    )
  ) {
    return 'Sports & Fitness';
  }
  if (
    ['gaming', 'strategy', 'chess', 'board games', 'card games', 'video games', 'poker', 'catan'].some(
      (k) => c.includes(k)
    )
  ) {
    return 'Gaming & Strategy';
  }
  if (
    ['co-work', 'cowork', 'co-working', 'study', 'study session', 'coding', 'quiet focus'].some(
      (k) => c.includes(k)
    )
  ) {
    return 'Co-Working';
  }
  return 'Social & Hangout';
}

export const ALL_CATEGORIES: ActivityCategory[] = [
  'Chess',
  'Ping Pong',
  'Tennis',
  'Board Games',
  'Basketball',
  'Run Club',
  'Coffee',
  'Co-work',
  'Pickleball',
  'Card Games',
  'Video Games',
  'Park Walk',
  'Study Session',
];

export function getActivityGroup(category: string): ActivityGroup {
  const c = category.toLowerCase();
  if (
    ['ping pong', 'tennis', 'basketball', 'run club', 'pickleball', 'soccer', 'volleyball', 'sports'].some(
      (k) => c.includes(k)
    )
  ) {
    return 'Sports';
  }
  if (
    ['chess', 'board games', 'card games', 'video games', 'gaming', 'poker', 'catan'].some(
      (k) => c.includes(k)
    )
  ) {
    return 'Gaming';
  }
  if (
    ['co-work', 'cowork', 'study', 'study session', 'coding', 'quiet focus'].some(
      (k) => c.includes(k)
    )
  ) {
    return 'Co-working';
  }
  return 'Hanging Out';
}

interface CategoryIconProps {
  category: ActivityCategory | ActivityGroup | 'All Rooms' | string;
  className?: string;
}

export function CategoryIcon({
  category,
  className = 'w-4 h-4',
}: CategoryIconProps) {
  switch (category) {
    case 'Sports':
    case 'Tennis':
    case 'Pickleball':
      return <Trophy className={className} />;
    case 'Ping Pong':
      return <CircleDot className={className} />;
    case 'Basketball':
      return <Flame className={className} />;
    case 'Run Club':
    case 'Park Walk':
      return <Footprints className={className} />;
    case 'Gaming':
    case 'Video Games':
      return <Gamepad2 className={className} />;
    case 'Chess':
      return <Crown className={className} />;
    case 'Board Games':
      return <Dices className={className} />;
    case 'Card Games':
      return <Sparkles className={className} />;
    case 'Hanging Out':
    case 'Coffee':
      return <Coffee className={className} />;
    case 'Food & Bites':
      return <Utensils className={className} />;
    case 'Drinks & Chat':
      return <GlassWater className={className} />;
    case 'Co-working':
    case 'Co-work':
    case 'Quiet Focus':
      return <Laptop className={className} />;
    case 'Study Session':
      return <BookOpen className={className} />;
    case 'Filter by Type':
    case 'Filter':
      return <SlidersHorizontal className={className} />;
    case 'All Rooms':
    case 'All Categories':
    case 'All Activities':
    case 'All':
    default:
      return <Compass className={className} />;
  }
}
