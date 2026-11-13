import React from 'react';

// Crisp inline SVG glyphs so currency/UI icons render identically on every
// device (some Android builds ship without colour emoji fonts).

export function CoinIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="coinGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE68A" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="9.2" fill="url(#coinGrad)" stroke="#92400E" strokeWidth="1.2" />
      <circle cx="12" cy="12" r="6" fill="none" stroke="#FFFBEB" strokeOpacity="0.65" strokeWidth="1.1" />
      <path d="M12 8.4v7.2M9.7 10.2h3.6a1.6 1.6 0 0 1 0 3.2H10a1.4 1.4 0 0 0 0 2.8h4" fill="none" stroke="#7C2D12" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

export function DiamondIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="diaGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#CFFAFE" />
          <stop offset="45%" stopColor="#22D3EE" />
          <stop offset="100%" stopColor="#0E7490" />
        </linearGradient>
      </defs>
      <path d="M7.2 3.5h9.6l3.4 5.1L12 20.8 3.8 8.6z" fill="url(#diaGrad)" stroke="#0E7490" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M3.8 8.6h16.4M9.4 8.6 12 20.8 14.6 8.6M7.2 3.5l2.2 5.1M16.8 3.5l-2.2 5.1" fill="none" stroke="#ECFEFF" strokeOpacity="0.75" strokeWidth="0.9" />
    </svg>
  );
}

export function FlameIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#F97316" />
          <stop offset="60%" stopColor="#FB923C" />
          <stop offset="100%" stopColor="#FDE68A" />
        </linearGradient>
      </defs>
      <path d="M12 2.5c3.6 4 6.2 6.6 6.2 10.4A6.2 6.2 0 0 1 12 21.5a6.2 6.2 0 0 1-6.2-8.6c.9.6 1.7.8 2.5.6-.6-3 .9-5.6 3.7-11Z" fill="url(#flameGrad)" />
      <path d="M12 12.4c1.5 1.7 2.3 2.6 2.3 4a2.3 2.3 0 1 1-4.6 0c0-1.4.8-2.3 2.3-4Z" fill="#FFF7ED" fillOpacity="0.85" />
    </svg>
  );
}

export function TrophyIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M8 3.6h8v4.6a4 4 0 0 1-8 0V3.6Z" fill="#F59E0B" stroke="#B45309" strokeWidth="1.1" />
      <path d="M8 5.2H5.6v1.6A3.2 3.2 0 0 0 8.9 10M16 5.2h2.4v1.6a3.2 3.2 0 0 1-3.3 3.2" fill="none" stroke="#B45309" strokeWidth="1.1" strokeLinecap="round" />
      <path d="M12 12.6v3.4M8.6 19.4h6.8l-.9-3.4H9.5z" fill="#FBBF24" stroke="#B45309" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

export function ShieldIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M12 2.8 4.8 5.6v6.2c0 4.4 3 7.9 7.2 9.4 4.2-1.5 7.2-5 7.2-9.4V5.6L12 2.8Z" fill="#10B981" fillOpacity="0.18" stroke="#059669" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="m8.6 12 2.4 2.4 4.4-4.6" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function PauseIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <rect x="7" y="5" width="3.6" height="14" rx="1.4" fill="currentColor" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.4" fill="currentColor" />
    </svg>
  );
}

export function SoundOnIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 9.6h3.2L12 5.6v12.8L7.2 14.4H4z" fill="currentColor" />
      <path d="M15.4 8.6a4.8 4.8 0 0 1 0 6.8M18 6.2a8.2 8.2 0 0 1 0 11.6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export function SoundOffIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M4 9.6h3.2L12 5.6v12.8L7.2 14.4H4z" fill="currentColor" />
      <path d="m16 9.6 5 4.8M21 9.6l-5 4.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}
