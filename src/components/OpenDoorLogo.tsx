'use client';

import React from 'react';

interface OpenDoorLogoProps {
  className?: string;
  size?: number;
}

/**
 * Modern "Leave The Room" Brand Mark & App Icon
 * - High-contrast #14151C dark squircle canvas
 * - Brand warm orange (#EA580C / orange-600) radar waves and outer pulses
 * - Location map pin framing the open door
 * - Clean geometric vector icon
 */
export function OpenDoorLogo({ className = 'w-16 h-16', size }: OpenDoorLogoProps) {
  const dimensionProps = size ? { width: size, height: size } : {};

  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...dimensionProps}
      aria-label="Leave The Room Logo"
    >
      {/* App Icon Base (Rich Dark Navy/Black Background) */}
      <rect width="512" height="512" rx="115" fill="#14151C" />

      {/* Animated-style Radar Waves (Brand Page Orange #EA580C) */}
      <circle
        cx="256"
        cy="220"
        r="170"
        fill="none"
        stroke="#EA580C"
        strokeWidth="2"
        opacity="0.25"
        strokeDasharray="8 12"
      />
      <circle
        cx="256"
        cy="220"
        r="230"
        fill="none"
        stroke="#EA580C"
        strokeWidth="1.5"
        opacity="0.15"
        strokeDasharray="4 16"
      />

      {/* Outer Radar Pulse (Brand Page Orange #EA580C) */}
      <path
        d="M 106 220 A 150 150 0 0 1 406 220"
        fill="none"
        stroke="#EA580C"
        strokeWidth="6"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        d="M 146 220 A 110 110 0 0 1 366 220"
        fill="none"
        stroke="#EA580C"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.8"
      />

      {/* Core Location Map Pin */}
      <path
        d="M 256 70 C 173 70 106 137 106 220 C 106 335 256 450 256 450 C 256 450 406 335 406 220 C 406 137 339 70 256 70 Z"
        fill="#1C1E29"
        stroke="#EA580C"
        strokeWidth="14"
        strokeLinejoin="round"
      />

      {/* Inside Icon (Leaving The Room - Door) Perfectly Centered */}
      <g transform="translate(178.5, 130)">
        {/* Doorway Frame (Brand Page Orange #EA580C) */}
        <path
          d="M 60 40 L 130 40 L 130 140 L 60 140 Z"
          fill="none"
          stroke="#EA580C"
          strokeWidth="10"
          strokeLinejoin="round"
        />

        {/* Swinging Open Door (Brand Page Orange #EA580C) */}
        <path
          d="M 60 40 L 25 20 L 25 160 L 60 140 Z"
          fill="#EA580C"
        />
      </g>
    </svg>
  );
}

export { OpenDoorLogo as LeaveTheRoomLogo };
