import React from 'react';

/**
 * CivicGreenNetSymbol
 * 
 * Standalone high-precision SVG Emblem.
 * Communicates:
 * 1. CIVIC: Modern municipal structure / civic arch geometry
 * 2. GREEN: Ascending organic leaf growth curvature
 * 3. NETWORK: Interconnected smart city telemetry nodes & conduits
 * 
 * @param {Object} props
 * @param {number} [props.size=36]
 * @param {string} [props.className='']
 * @param {'color'|'white'|'mono'} [props.theme='color']
 * @param {boolean} [props.ariaHidden=true]
 */
export function CivicGreenNetSymbol({
  size = 36,
  className = '',
  theme = 'color', // 'color' | 'white' | 'mono'
  ariaHidden = true
}) {
  const gradientId = React.useId();

  // Color mapping
  let bgFill = `url(#${gradientId}-bg)`;
  let leafFill = `url(#${gradientId}-leaf)`;
  let nodeFill = '#38BDF8';
  let lineStroke = '#A7F3D0';
  let accentNode = '#34D399';

  if (theme === 'white') {
    bgFill = 'rgba(255, 255, 255, 0.18)';
    leafFill = '#FFFFFF';
    nodeFill = '#FFFFFF';
    lineStroke = 'rgba(255, 255, 255, 0.75)';
    accentNode = '#FFFFFF';
  } else if (theme === 'mono') {
    bgFill = 'currentColor';
    leafFill = 'currentColor';
    nodeFill = 'currentColor';
    lineStroke = 'currentColor';
    accentNode = 'currentColor';
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 transition-transform duration-300 ease-out ${className}`}
      aria-hidden={ariaHidden}
      role={ariaHidden ? undefined : 'img'}
      aria-label={ariaHidden ? undefined : 'Civic GreenNet Emblem'}
    >
      <defs>
        {/* Main Shield / Civic Base Rich Emerald Gradient */}
        <linearGradient id={`${gradientId}-bg`} x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="42%" stopColor="#059669" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Dynamic Sustainable Leaf Gradient */}
        <linearGradient id={`${gradientId}-leaf`} x1="14" y1="12" x2="34" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#A7F3D0" />
          <stop offset="55%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>

        {/* Top-Lit Rim Highlight Gradient */}
        <linearGradient id={`${gradientId}-rim`} x1="24" y1="4" x2="24" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#10B981" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#064E3B" stopOpacity="0.2" />
        </linearGradient>

        {/* Ambient Glow Filter */}
        <filter id={`${gradientId}-shadow`} x="-15%" y="-10%" width="130%" height="130%" filterUnits="userSpaceOnUse">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2" floodColor="#064E3B" floodOpacity="0.32" />
        </filter>
      </defs>

      {/* Outer Civic Hex-Shield Structure */}
      <path
        d="M24 4L40 10.5V23.5C40 33.2 33.2 41.8 24 44C14.8 41.8 8 33.2 8 23.5V10.5L24 4Z"
        fill={bgFill}
        stroke={theme === 'color' ? `url(#${gradientId}-rim)` : undefined}
        strokeWidth={theme === 'color' ? '1.25' : '0'}
        filter={theme === 'color' ? `url(#${gradientId}-shadow)` : undefined}
      />

      {/* Network Connection Lines (Connecting Civic Grid to Central Leaf) */}
      <path
        d="M16 28L24 21L32 28M24 21V12M15 17L24 21L33 17"
        stroke={lineStroke}
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity={theme === 'color' ? '0.85' : '0.9'}
      />

      {/* Organic Center Leaf Form (Ascending Sustainable Growth) */}
      <path
        d="M24 12C24 12 34 18 34 27C34 32.52 29.52 37 24 37C18.48 37 14 32.52 14 27C14 18 24 12 24 12Z"
        fill={leafFill}
        fillOpacity={theme === 'white' ? '0.95' : '0.92'}
      />

      {/* Central Leaf Vein & Civic Network Spine */}
      <path
        d="M24 14V34M24 22L29 19M24 26L19 23M24 28L28 26"
        stroke={theme === 'white' ? '#047857' : '#FFFFFF'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Connected Network Nodes (Citizen, Field Officer, Admin Hub) */}
      <circle cx="24" cy="12" r="2.2" fill={accentNode} stroke="#FFFFFF" strokeWidth="1" />
      <circle cx="15" cy="17" r="1.8" fill={nodeFill} stroke="#FFFFFF" strokeWidth="0.8" />
      <circle cx="33" cy="17" r="1.8" fill={nodeFill} stroke="#FFFFFF" strokeWidth="0.8" />
      <circle cx="16" cy="28" r="1.8" fill={accentNode} stroke="#FFFFFF" strokeWidth="0.8" />
      <circle cx="32" cy="28" r="1.8" fill={accentNode} stroke="#FFFFFF" strokeWidth="0.8" />
      <circle cx="24" cy="37" r="2" fill="#FFFFFF" stroke={theme === 'color' ? '#059669' : '#0F172A'} strokeWidth="1" />
    </svg>
  );
}

/**
 * CivicGreenNetLogo
 * 
 * Master Reusable Logo Component.
 * Supports:
 * - variants: 'full' | 'horizontal' | 'compact' | 'symbol' | 'white' | 'monochrome'
 * - sizes: 'xs' (22px) | 'sm' (30px) | 'md' (36px) | 'lg' (44px) | 'xl' (56px) | custom number
 * - contextual role/descriptor: 'CITIZEN PORTAL' | 'CIVIC TECH PLATFORM' | 'OFFICER OPERATIONS' | etc.
 * 
 * @param {Object} props
 * @param {'full'|'horizontal'|'compact'|'symbol'|'white'|'monochrome'} [props.variant='horizontal']
 * @param {'xs'|'sm'|'md'|'lg'|'xl'|number} [props.size='md']
 * @param {string|null} [props.descriptor='CIVIC TECH PLATFORM']
 * @param {'auto'|'light'|'dark'|'white'|'mono'} [props.theme='auto']
 * @param {string} [props.className='']
 * @param {string} [props.symbolClassName='']
 * @param {string} [props.textClassName='']
 * @param {boolean} [props.showDescriptor=true]
 * @param {Function} [props.onClick]
 * @param {string} [props.ariaLabel='Civic GreenNet']
 */
export default function CivicGreenNetLogo({
  variant = 'horizontal',
  size = 'md',
  descriptor = 'CIVIC TECH PLATFORM',
  theme = 'auto', // 'auto' | 'light' | 'dark' | 'white' | 'mono'
  className = '',
  symbolClassName = '',
  textClassName = '',
  showDescriptor = true,
  onClick = undefined,
  ariaLabel = 'Civic GreenNet'
}) {
  // Compute pixel dimension from size prop
  const sizeMap = {
    xs: 22,
    sm: 30,
    md: 36,
    lg: 44,
    xl: 56
  };

  const symbolSize = typeof size === 'number' ? size : sizeMap[size] || 36;

  // Sizing styles for typography
  const textStyles = {
    xs: { main: 'text-sm font-black', sub: 'text-[7.5px] font-bold tracking-[0.18em]', gap: 'gap-1.5' },
    sm: { main: 'text-[17px] sm:text-[18px] font-black', sub: 'text-[8.5px] sm:text-[9px] font-bold tracking-[0.22em]', gap: 'gap-2.5' },
    md: { main: 'text-lg sm:text-xl font-black tracking-tight', sub: 'text-[9.5px] sm:text-[10px] font-bold uppercase tracking-[0.22em]', gap: 'gap-3' },
    lg: { main: 'text-2xl font-black tracking-tight', sub: 'text-xs font-bold uppercase tracking-[0.22em]', gap: 'gap-3.5' },
    xl: { main: 'text-3xl font-black tracking-tight', sub: 'text-sm font-bold uppercase tracking-[0.25em]', gap: 'gap-4' }
  };

  const currentStyle = textStyles[size] || textStyles.md;

  // Resolve theme
  let symbolTheme = 'color';
  // Deep navy or dark charcoal for "Civic"
  let civicTextColor = 'text-[#0F172A] dark:text-white';
  // Rich civic green for "GreenNet"
  let greenNetTextColor = 'text-[#138808] dark:text-[#34D399]';
  // Subtitle styling
  let descriptorColor = 'text-slate-500 dark:text-slate-400';

  if (variant === 'white' || theme === 'white') {
    symbolTheme = 'white';
    civicTextColor = 'text-white';
    greenNetTextColor = 'text-emerald-300';
    descriptorColor = 'text-emerald-200/80';
  } else if (variant === 'monochrome' || theme === 'mono') {
    symbolTheme = 'mono';
    civicTextColor = 'text-current';
    greenNetTextColor = 'text-current';
    descriptorColor = 'text-current opacity-70';
  } else if (theme === 'dark') {
    civicTextColor = 'text-white';
    greenNetTextColor = 'text-emerald-400';
    descriptorColor = 'text-slate-400';
  } else if (theme === 'light') {
    civicTextColor = 'text-[#0F172A]';
    greenNetTextColor = 'text-[#138808]';
    descriptorColor = 'text-slate-500';
  }

  // Symbol only variant
  if (variant === 'symbol') {
    return (
      <div
        className={`group inline-flex items-center justify-center ${className}`}
        onClick={onClick}
        role="img"
        aria-label={ariaLabel}
      >
        <CivicGreenNetSymbol
          size={symbolSize}
          theme={symbolTheme}
          className={`group-hover:scale-105 transition-transform duration-300 ${symbolClassName}`}
          ariaHidden={true}
        />
      </div>
    );
  }

  // Full / Horizontal / Compact
  return (
    <div
      className={`group inline-flex items-center ${currentStyle.gap} select-none transition-all duration-200 ${className}`}
      onClick={onClick}
      role="img"
      aria-label={ariaLabel}
    >
      <CivicGreenNetSymbol
        size={symbolSize}
        theme={symbolTheme}
        className={`group-hover:scale-105 group-hover:-translate-y-0.5 transition-transform duration-300 ${symbolClassName}`}
        ariaHidden={true}
      />

      <div className={`flex flex-col justify-center min-w-0 ${textClassName}`}>
        <span className={`leading-none tracking-tight truncate ${currentStyle.main}`}>
          <span className={`${civicTextColor} font-extrabold`}>Civic</span>
          <span className={`${greenNetTextColor} font-black ml-0.5`}>GreenNet</span>
        </span>

        {showDescriptor && descriptor && (
          <span className={`truncate mt-0.5 leading-tight ${currentStyle.sub} ${descriptorColor}`}>
            {descriptor}
          </span>
        )}
      </div>
    </div>
  );
}
