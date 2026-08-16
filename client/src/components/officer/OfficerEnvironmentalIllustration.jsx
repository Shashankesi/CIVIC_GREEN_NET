import React from 'react'

/**
 * Lightweight inline SVG environmental illustration for the Officer Portal.
 * Shows trees, wind turbines, buildings, solar panels, hills, and clouds.
 * Used in the sidebar footer and hero section.
 */
export default function OfficerEnvironmentalIllustration({ className = '', variant = 'sidebar' }) {
  if (variant === 'hero') {
    return (
      <svg className={className} viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {/* Sky gradient */}
        <defs>
          <linearGradient id="heroSky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0" />
            <stop offset="100%" stopColor="white" stopOpacity="0.06" />
          </linearGradient>
        </defs>

        {/* Clouds */}
        <ellipse cx="60" cy="30" rx="30" ry="10" fill="white" opacity="0.08" />
        <ellipse cx="50" cy="28" rx="20" ry="8" fill="white" opacity="0.06" />
        <ellipse cx="200" cy="20" rx="35" ry="12" fill="white" opacity="0.07" />
        <ellipse cx="330" cy="35" rx="25" ry="9" fill="white" opacity="0.06" />

        {/* Hills */}
        <path d="M0 180 Q80 120 160 160 Q240 130 320 155 Q360 140 400 160 L400 200 L0 200Z" fill="white" opacity="0.06" />
        <path d="M0 190 Q100 150 200 175 Q300 155 400 175 L400 200 L0 200Z" fill="white" opacity="0.04" />

        {/* Smart City Buildings */}
        <rect x="260" y="120" width="18" height="55" rx="2" fill="white" opacity="0.1" />
        <rect x="282" y="135" width="14" height="40" rx="2" fill="white" opacity="0.08" />
        <rect x="300" y="110" width="20" height="65" rx="2" fill="white" opacity="0.12" />
        <rect x="324" y="130" width="16" height="45" rx="2" fill="white" opacity="0.09" />
        <rect x="344" y="140" width="22" height="35" rx="2" fill="white" opacity="0.07" />

        {/* Building windows */}
        <rect x="264" y="128" width="4" height="3" rx="0.5" fill="white" opacity="0.15" />
        <rect x="270" y="128" width="4" height="3" rx="0.5" fill="white" opacity="0.15" />
        <rect x="264" y="138" width="4" height="3" rx="0.5" fill="white" opacity="0.12" />
        <rect x="270" y="138" width="4" height="3" rx="0.5" fill="white" opacity="0.12" />
        <rect x="304" y="118" width="5" height="3" rx="0.5" fill="white" opacity="0.15" />
        <rect x="311" y="118" width="5" height="3" rx="0.5" fill="white" opacity="0.15" />
        <rect x="304" y="128" width="5" height="3" rx="0.5" fill="white" opacity="0.12" />
        <rect x="311" y="128" width="5" height="3" rx="0.5" fill="white" opacity="0.12" />
        <rect x="304" y="138" width="5" height="3" rx="0.5" fill="white" opacity="0.1" />

        {/* Wind Turbine */}
        <rect x="220" y="100" width="2" height="75" fill="white" opacity="0.12" />
        <path d="M221 100 L221 70 L225 98Z" fill="white" opacity="0.15" />
        <path d="M221 100 L240 110 L223 103Z" fill="white" opacity="0.12" />
        <path d="M221 100 L200 108 L219 103Z" fill="white" opacity="0.12" />
        <circle cx="221" cy="100" r="2.5" fill="white" opacity="0.2" />

        {/* Trees */}
        <circle cx="160" cy="155" r="12" fill="white" opacity="0.07" />
        <circle cx="150" cy="150" r="10" fill="white" opacity="0.06" />
        <circle cx="170" cy="150" r="9" fill="white" opacity="0.06" />
        <rect x="158" y="165" width="4" height="12" rx="1" fill="white" opacity="0.08" />

        <circle cx="380" cy="145" r="10" fill="white" opacity="0.06" />
        <circle cx="372" cy="142" r="8" fill="white" opacity="0.05" />
        <rect x="378" y="153" width="3" height="10" rx="1" fill="white" opacity="0.07" />

        {/* Solar Panels */}
        <g transform="translate(100, 160) rotate(-15)">
          <rect x="0" y="0" width="20" height="12" rx="1" fill="white" opacity="0.1" stroke="white" strokeOpacity="0.15" strokeWidth="0.5" />
          <line x1="10" y1="0" x2="10" y2="12" stroke="white" strokeOpacity="0.12" strokeWidth="0.5" />
          <line x1="0" y1="6" x2="20" y2="6" stroke="white" strokeOpacity="0.12" strokeWidth="0.5" />
        </g>
        <rect x="108" y="170" width="2" height="10" fill="white" opacity="0.08" />

        {/* Sun rays */}
        <circle cx="370" cy="25" r="15" fill="white" opacity="0.06" />
        <circle cx="370" cy="25" r="25" fill="white" opacity="0.03" />
      </svg>
    )
  }

  // Sidebar variant (compact)
  return (
    <svg className={className} viewBox="0 0 220 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* Hills */}
      <path d="M0 65 Q40 40 80 55 Q120 35 160 50 Q190 40 220 55 L220 80 L0 80Z" fill="white" opacity="0.06" />
      <path d="M0 70 Q60 50 110 62 Q160 48 220 60 L220 80 L0 80Z" fill="white" opacity="0.04" />

      {/* Trees */}
      <circle cx="30" cy="52" r="8" fill="white" opacity="0.08" />
      <circle cx="23" cy="49" r="6" fill="white" opacity="0.06" />
      <circle cx="37" cy="49" r="5.5" fill="white" opacity="0.06" />
      <rect x="28" y="58" width="3" height="8" rx="1" fill="white" opacity="0.07" />

      <circle cx="180" cy="48" r="7" fill="white" opacity="0.07" />
      <circle cx="174" cy="45" r="5.5" fill="white" opacity="0.05" />
      <rect x="178" y="53" width="3" height="7" rx="1" fill="white" opacity="0.06" />

      {/* Small building */}
      <rect x="90" y="42" width="12" height="25" rx="1.5" fill="white" opacity="0.08" />
      <rect x="106" y="48" width="10" height="19" rx="1.5" fill="white" opacity="0.06" />
      <rect x="120" y="38" width="14" height="29" rx="1.5" fill="white" opacity="0.09" />

      {/* Building windows */}
      <rect x="93" y="46" width="3" height="2" rx="0.5" fill="white" opacity="0.12" />
      <rect x="97" y="46" width="3" height="2" rx="0.5" fill="white" opacity="0.12" />
      <rect x="93" y="52" width="3" height="2" rx="0.5" fill="white" opacity="0.1" />
      <rect x="123" y="42" width="3" height="2" rx="0.5" fill="white" opacity="0.12" />
      <rect x="128" y="42" width="3" height="2" rx="0.5" fill="white" opacity="0.12" />

      {/* Wind turbine */}
      <rect x="150" y="30" width="1.5" height="37" fill="white" opacity="0.1" />
      <path d="M150.75 30 L150.75 15 L153 29Z" fill="white" opacity="0.12" />
      <path d="M150.75 30 L162 35 L151.5 31.5Z" fill="white" opacity="0.1" />
      <path d="M150.75 30 L140 34 L150 31.5Z" fill="white" opacity="0.1" />
      <circle cx="150.75" cy="30" r="1.5" fill="white" opacity="0.15" />

      {/* Small recycling symbol */}
      <circle cx="65" cy="60" r="5" fill="white" opacity="0.05" stroke="white" strokeOpacity="0.08" strokeWidth="0.8" />

      {/* Cloud */}
      <ellipse cx="50" cy="18" rx="16" ry="6" fill="white" opacity="0.05" />
      <ellipse cx="160" cy="14" rx="12" ry="5" fill="white" opacity="0.04" />
    </svg>
  )
}
