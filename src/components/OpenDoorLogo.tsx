'use client';

import React from 'react';

interface OpenDoorLogoProps {
  className?: string;
  size?: number;
}

/**
 * Custom "Open Door into the Light" Mark
 * Represents leaving the room and stepping outside into the sun:
 * - 3D Perspective open doorway swinging into the golden outdoors
 * - Radiant sunbeams and warmth streaming across the threshold
 * - High-contrast warm orange and golden amber palette
 * - Absolutely zero badges, pure brand mark
 */
export function OpenDoorLogo({ className = 'w-7 h-7', size }: OpenDoorLogoProps) {
  const dimensionProps = size ? { width: size, height: size } : {};

  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...dimensionProps}
      aria-label="Leave The Room Logo"
    >
      <defs>
        <linearGradient id="doorSunlight" x1="13" y1="9" x2="31" y2="39" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset="0.4" stopColor="#FDE68A" />
          <stop offset="0.8" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>
      </defs>

      {/* Ambient warm glow */}
      <circle cx="24" cy="24" r="22" className="fill-orange-500/10 dark:fill-orange-400/15" />

      {/* Radiant sunbeams streaming from outdoors */}
      <path d="M24 14V6" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M33 17L39 11" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M15 17L9 11" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M36 26H44" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />

      {/* Door Frame (Warm Stone / Deep Orange) */}
      <path
        d="M11 41V11C11 9.89543 11.8954 9 13 9H33C34.1046 9 35 9.89543 35 11V41"
        stroke="#EA580C"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      {/* Light pouring through the open threshold */}
      <polygon
        points="13,9 29,14 29,38 13,41"
        fill="url(#doorSunlight)"
        stroke="#EA580C"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />

      {/* Perspective Door Ajar */}
      <polygon
        points="29,14 34,10 34,40 29,38"
        fill="#C2410C"
        stroke="#EA580C"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* Outdoor Steps / Threshold leading outside */}
      <path d="M6 41H42" stroke="#D97706" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M16 45H32" stroke="#EA580C" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

// Export LeaveTheRoomLogo as an alias for ergonomic imports
export { OpenDoorLogo as LeaveTheRoomLogo };
