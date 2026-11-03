'use client';

import React from 'react';

interface OpenDoorLogoProps {
  className?: string;
  size?: number;
}

/**
 * Modern "Leave The Room" Brand Mark & App Icon
 * - Architectural open doorway stepping out from dark indoors into radiant morning light
 * - Perspective door swinging open with golden sunlight projection
 * - High-contrast warm stone, glowing amber, and vibrant orange palette
 * - Perfectly balanced geometry, zero awkward clip-art sticks or cartoon borders
 */
export function OpenDoorLogo({ className = 'w-16 h-16', size }: OpenDoorLogoProps) {
  const dimensionProps = size ? { width: size, height: size } : {};

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...dimensionProps}
      aria-label="Leave The Room Logo"
    >
      <defs>
        {/* Ambient Dark Stone Background Gradient */}
        <linearGradient id="ltrIconBg" x1="12" y1="6" x2="52" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#292524" />
          <stop offset="0.6" stopColor="#1C1917" />
          <stop offset="1" stopColor="#141210" />
        </linearGradient>

        {/* Ambient Warm Radial Backlight */}
        <radialGradient id="ltrBackGlow" cx="30" cy="28" r="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="#EA580C" stopOpacity="0.4" />
          <stop offset="0.65" stopColor="#F59E0B" stopOpacity="0.12" />
          <stop offset="1" stopColor="#EA580C" stopOpacity="0" />
        </radialGradient>

        {/* Radiant Sunlight pouring through doorway */}
        <linearGradient id="ltrSunlight" x1="22" y1="16" x2="36" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEF08A" />
          <stop offset="0.35" stopColor="#FDE047" />
          <stop offset="0.75" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#EA580C" />
        </linearGradient>

        {/* Door Surface Gradient (Warm Rich Terracotta) */}
        <linearGradient id="ltrDoorFace" x1="36" y1="16" x2="48" y2="46" gradientUnits="userSpaceOnUse">
          <stop stopColor="#F97316" />
          <stop offset="0.7" stopColor="#EA580C" />
          <stop offset="1" stopColor="#C2410C" />
        </linearGradient>

        {/* Projected Light Beam on Floor */}
        <linearGradient id="ltrFloorBeam" x1="28" y1="36" x2="30" y2="54" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FDE047" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#F59E0B" stopOpacity="0.5" />
          <stop offset="1" stopColor="#EA580C" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* App Icon Squircle Container */}
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="16"
        fill="url(#ltrIconBg)"
        stroke="#44403C"
        strokeWidth="1.2"
      />

      {/* Ambient Warm Glow behind the doorway */}
      <circle cx="30" cy="28" r="20" fill="url(#ltrBackGlow)" />

      {/* Projected Light Beam spilling forward onto threshold */}
      <polygon
        points="19,42 41,42 48,53 12,53"
        fill="url(#ltrFloorBeam)"
      />

      {/* Door Frame (Warm Stone Architectural Arch) */}
      <rect
        x="17"
        y="13"
        width="22"
        height="29"
        rx="3"
        stroke="#EA580C"
        strokeWidth="2.4"
        strokeLinejoin="round"
      />

      {/* Radiant Golden Light (The outdoor world opening up) */}
      <polygon
        points="19.5,15.5 35,15.5 35,39.5 19.5,39.5"
        fill="url(#ltrSunlight)"
      />

      {/* Open Door Swinging Ajar (Precise Perspective Geometry) */}
      <polygon
        points="35,15.5 45,12 45,43 35,39.5"
        fill="url(#ltrDoorFace)"
        stroke="#EA580C"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />

      {/* Door Outer Edge Highlight (Catches the sun) */}
      <line
        x1="45"
        y1="12"
        x2="45"
        y2="43"
        stroke="#FED7AA"
        strokeWidth="1.4"
        strokeLinecap="round"
      />

      {/* Minimal Handle / Touch Affordance */}
      <circle cx="43" cy="27.5" r="1.2" fill="#FEF08A" />

      {/* Clean Welcome Threshold Line */}
      <path
        d="M14 42H44"
        stroke="#F59E0B"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.9"
      />
    </svg>
  );
}

// Export LeaveTheRoomLogo as an alias for ergonomic imports
export { OpenDoorLogo as LeaveTheRoomLogo };
