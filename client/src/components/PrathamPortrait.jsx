import React, { useMemo } from 'react';

// Lightweight inline SVG adventurer portrait used in the hub, shop and HUD.
// Uses the same palette values as the 3D character so outfits stay consistent.
export default function PrathamPortrait({ colors, size = 96, className = '' }) {
  const c = useMemo(
    () => ({
      jacket: `#${(colors?.jacket ?? 0x9a7b4f).toString(16).padStart(6, '0')}`,
      shirt: `#${(colors?.shirt ?? 0xf8fafc).toString(16).padStart(6, '0')}`,
      scarf: `#${(colors?.scarf ?? 0xd9480f).toString(16).padStart(6, '0')}`,
      pants: `#${(colors?.pants ?? 0x2b3a4a).toString(16).padStart(6, '0')}`,
      shoes: `#${(colors?.shoes ?? 0xdc2626).toString(16).padStart(6, '0')}`,
      backpack: `#${(colors?.backpack ?? 0x6b4423).toString(16).padStart(6, '0')}`,
      accent: `#${(colors?.accent ?? 0xf59e0b).toString(16).padStart(6, '0')}`,
      headband: `#${(colors?.headband ?? 0xd9480f).toString(16).padStart(6, '0')}`
    }),
    [colors]
  );

  return (
    <svg
      viewBox="0 0 120 160"
      width={size}
      height={(size * 160) / 120}
      className={className}
      role="img"
      aria-label="Pratham adventurer portrait"
    >
      <defs>
        <linearGradient id="pgGlow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c.accent} stopOpacity="0.28" />
          <stop offset="100%" stopColor={c.accent} stopOpacity="0" />
        </linearGradient>
      </defs>

      <ellipse cx="60" cy="148" rx="34" ry="8" fill="#0f172a" opacity="0.07" />
      <circle cx="60" cy="70" r="52" fill="url(#pgGlow)" />

      {/* Backpack */}
      <rect x="22" y="58" width="18" height="46" rx="8" fill={c.backpack} />
      <rect x="24" y="66" width="14" height="16" rx="5" fill={c.jacket} opacity="0.85" />

      {/* Legs */}
      <rect x="44" y="104" width="14" height="30" rx="6" fill={c.pants} />
      <rect x="63" y="104" width="14" height="30" rx="6" fill={c.pants} />

      {/* Shoes */}
      <rect x="40" y="132" width="20" height="10" rx="5" fill={c.shoes} />
      <rect x="61" y="132" width="20" height="10" rx="5" fill={c.shoes} />
      <rect x="40" y="139" width="20" height="3" rx="1.5" fill="#ffffff" opacity="0.9" />
      <rect x="61" y="139" width="20" height="3" rx="1.5" fill="#ffffff" opacity="0.9" />

      {/* Torso */}
      <rect x="38" y="54" width="44" height="54" rx="12" fill={c.shirt} />
      <path d="M38 60 Q38 54 46 54 L50 54 L50 108 L46 108 Q38 108 38 100 Z" fill={c.jacket} />
      <path d="M82 60 Q82 54 74 54 L70 54 L70 108 L74 108 Q82 108 82 100 Z" fill={c.jacket} />

      {/* Scarf */}
      <rect x="44" y="50" width="32" height="10" rx="5" fill={c.scarf} />
      <path d="M74 56 L82 76 L76 78 L70 58 Z" fill={c.scarf} opacity="0.9" />

      {/* Belt */}
      <rect x="38" y="98" width="44" height="7" rx="3.5" fill={c.backpack} />
      <rect x="56" y="98" width="9" height="7" rx="2" fill={c.accent} />

      {/* Arms */}
      <rect x="30" y="60" width="11" height="34" rx="5.5" fill={c.jacket} />
      <rect x="79" y="60" width="11" height="34" rx="5.5" fill={c.jacket} />
      <circle cx="35.5" cy="98" r="6" fill="#d99b72" />
      <circle cx="84.5" cy="98" r="6" fill="#d99b72" />

      {/* Head */}
      <rect x="48" y="22" width="24" height="26" rx="9" fill="#d99b72" />
      <path d="M47 26 Q47 16 60 16 Q73 16 73 26 L73 27 L47 27 Z" fill="#1a1615" />
      <rect x="47" y="27" width="26" height="5" rx="2.5" fill={c.headband} />
      <circle cx="55.5" cy="36" r="1.8" fill="#111827" />
      <circle cx="64.5" cy="36" r="1.8" fill="#111827" />

      {/* Accent spark */}
      <circle cx="96" cy="34" r="4" fill={c.accent} opacity="0.8" />
      <circle cx="24" cy="42" r="2.5" fill={c.accent} opacity="0.55" />
    </svg>
  );
}
