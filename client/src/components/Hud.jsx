import React from 'react';
import { POWERUPS } from '../game/constants';
import { CoinIcon, DiamondIcon, PauseIcon, SoundOnIcon, SoundOffIcon } from './Icons';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function PowerPill({ id, remaining, duration }) {
  const cfg = POWERUPS[id];
  if (!cfg) return null;
  const pct = Math.max(0, Math.min(100, (remaining / duration) * 100));
  return (
    <div className="flex items-center gap-2 rounded-full bg-white/90 px-3 py-1.5 shadow-sm ring-1 ring-slate-900/5">
      <span className="relative flex h-2.5 w-2.5">
        <span
          className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
          style={{ backgroundColor: cfg.color }}
        />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cfg.color }} />
      </span>
      <span className="text-[11px] font-semibold text-slate-700">{cfg.name}</span>
      <span className="h-1.5 w-10 overflow-hidden rounded-full bg-slate-200">
        <span
          className="block h-full rounded-full transition-[width] duration-150"
          style={{ width: `${pct}%`, backgroundColor: cfg.color }}
        />
      </span>
    </div>
  );
}

export default function Hud({ hud, muted, onPause, onMute }) {
  const junction = hud?.junction;

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex flex-col gap-2 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        {/* Score & distance */}
        <div className="glass-hud rounded-2xl px-3 py-2 shadow-glass sm:px-4">
          <div className="flex items-end gap-1">
            <span className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              {fmt(hud?.score)}
            </span>
            <span className="pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">pts</span>
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-[11px] font-semibold text-slate-500">
            <span>{fmt(hud?.distance)} m</span>
            <span className="text-slate-300">|</span>
            <span>{fmt(hud?.speed)} km/h</span>
          </div>
        </div>

        {/* Currency */}
        <div className="flex items-center gap-2">
          <div className="glass-hud flex items-center gap-1.5 rounded-2xl px-3 py-2 shadow-glass">
            <CoinIcon size={16} />
            <span className="text-sm font-bold text-slate-800">{fmt(hud?.coins)}</span>
          </div>
          <div className="glass-hud flex items-center gap-1.5 rounded-2xl px-3 py-2 shadow-glass">
            <DiamondIcon size={16} />
            <span className="text-sm font-bold text-slate-800">{fmt(hud?.diamonds)}</span>
          </div>
          <button
            type="button"
            onClick={onMute}
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-2xl bg-white/90 text-slate-600 shadow-glass ring-1 ring-slate-900/5 transition hover:bg-white"
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          >
            {muted ? <SoundOffIcon size={17} /> : <SoundOnIcon size={17} />}
          </button>
          <button
            type="button"
            onClick={onPause}
            className="pointer-events-auto grid h-10 w-10 place-items-center rounded-2xl bg-white/90 text-slate-600 shadow-glass ring-1 ring-slate-900/5 transition hover:bg-white"
            aria-label="Pause game"
          >
            <PauseIcon size={16} />
          </button>
        </div>
      </div>

      {/* Active power-ups */}
      {hud?.powerups?.length ? (
        <div className="flex flex-wrap gap-2">
          {hud.powerups.map((p) => (
            <PowerPill key={p.id} id={p.id} remaining={p.remaining} duration={p.duration} />
          ))}
        </div>
      ) : null}

      {/* Junction turn prompt */}
      {junction ? (
        <div className="mx-auto flex animate-pulse items-center gap-3 rounded-2xl bg-slate-900/85 px-4 py-2 text-white shadow-xl backdrop-blur">
          <span className="text-lg">{junction.dir === 'left' ? '⬅️' : '➡️'}</span>
          <div className="leading-tight">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">
              {junction.urgent ? 'Turn now!' : 'Junction ahead'}
            </p>
            <p className="text-xs font-semibold">
              Swipe {junction.dir.toUpperCase()} {junction.remaining > 0 ? `• ${Math.round(junction.remaining)}m` : ''}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
