import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { OUTFITS, POWERUPS, BIOMES } from '../game/constants';
import { useSession } from '../lib/SessionContext';
import PrathamPortrait from './PrathamPortrait';
import { CoinIcon, DiamondIcon, TrophyIcon } from './Icons';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

function StatCard({ label, value, sub, accent = 'amber' }) {
  const ring = {
    amber: 'ring-amber-100 bg-amber-50/60',
    emerald: 'ring-emerald-100 bg-emerald-50/60',
    sky: 'ring-sky-100 bg-sky-50/60',
    violet: 'ring-violet-100 bg-violet-50/60'
  }[accent];
  return (
    <div className={`rounded-3xl p-4 ring-1 ${ring}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black tracking-tight text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-[11px] font-medium text-slate-500">{sub}</p> : null}
    </div>
  );
}

export default function Dashboard({ onPlay, onOpenAuth, flash }) {
  const { user, progress, isAuthed, isGuest, logout } = useSession();
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState('');
  const [coach, setCoach] = useState('');
  const [coachBusy, setCoachBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .health()
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err) => {
        if (!cancelled) setHealthError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const equipped = OUTFITS.find((o) => o.id === progress.equipped_outfit) || OUTFITS[0];
  const nextOutfit = OUTFITS.find((o) => !progress.unlocked_outfits.includes(o.id));

  const askCoach = async () => {
    setCoachBusy(true);
    setCoach('');
    try {
      const data = await api.generateAI({
        mode: 'coach',
        prompt: 'Give me three sharp tactical tips for my next temple run.',
        context: {
          high_score: progress.high_score,
          coins: progress.coins,
          diamonds: progress.diamonds,
          total_distance: progress.total_distance,
          equipped_outfit: progress.equipped_outfit
        }
      });
      setCoach(data.result);
    } catch (err) {
      setCoach(`The Oracle is silent: ${err.message}`);
    } finally {
      setCoachBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero card */}
      <section className="relative overflow-hidden rounded-[28px] border border-white/70 bg-white p-6 shadow-glass sm:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-amber-200/70 via-orange-200/50 to-rose-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-sky-200/60 via-emerald-200/40 to-transparent blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-3xl bg-gradient-to-br from-slate-50 to-white p-2 shadow-sm ring-1 ring-slate-900/5">
              <PrathamPortrait colors={equipped.colors} size={86} />
            </div>
            <div>
              <p className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700 ring-1 ring-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Adventurer Hub
              </p>
              <h1 className="mt-2 text-3xl font-black leading-none tracking-tight text-slate-900 sm:text-4xl">
                PRATHAM
                <span className="mt-1 block bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 bg-clip-text text-transparent">
                  THE TEMPLE ESCAPE
                </span>
              </h1>
              <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
                {isAuthed
                  ? `Welcome back, ${user?.full_name?.split(' ')[0] || 'adventurer'}. Your cloud save is live — coins, outfits and high scores follow you to every device.`
                  : 'You are in guest mode. Play instantly, then log in to sync your coins, outfits and high scores to the cloud.'}
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <button
              type="button"
              onClick={() => onPlay(progress.equipped_outfit)}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-4 text-sm font-black uppercase tracking-wider text-white shadow-lg shadow-amber-500/25 transition hover:brightness-105 active:scale-[0.99]"
            >
              <span className="relative z-10">▶ Start Running</span>
              <span className="absolute inset-0 -translate-x-full bg-white/25 transition-transform duration-500 group-hover:translate-x-0" />
            </button>
            {!isAuthed ? (
              <button
                type="button"
                onClick={onOpenAuth}
                className="rounded-2xl bg-slate-900 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white transition hover:bg-slate-800"
              >
                Log in / Sign up
              </button>
            ) : (
              <button
                type="button"
                onClick={logout}
                className="rounded-2xl bg-white px-6 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200 transition hover:bg-slate-50"
              >
                Log out
              </button>
            )}
            <p className="text-center text-[11px] font-medium text-slate-400">
              {isGuest ? 'Guest save: this device' : `Cloud save: ${user?.email}`}
            </p>
          </div>
        </div>

        {/* stats */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="High score" value={fmt(progress.high_score)} sub="points" accent="amber" />
          <StatCard label="Gold coins" value={fmt(progress.coins)} sub="spendable" accent="emerald" />
          <StatCard label="Diamonds" value={fmt(progress.diamonds)} sub="rare currency" accent="sky" />
          <StatCard label="Total distance" value={`${fmt(progress.total_distance)} m`} sub={`${fmt(progress.games_played)} runs`} accent="violet" />
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Next unlock + coach */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm lg:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-600">Progression</p>
              <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {nextOutfit ? (
                  `Next unlock: ${nextOutfit.name}`
                ) : (
                  <span className="inline-flex items-center gap-2">
                    Every outfit unlocked <TrophyIcon size={18} />
                  </span>
                )}
              </h2>
            </div>
            {nextOutfit ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-3 py-1.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200">
                <CoinIcon size={13} /> {nextOutfit.coins}
                {nextOutfit.diamonds ? (
                  <>
                    <span className="text-slate-300">+</span>
                    <DiamondIcon size={13} /> {nextOutfit.diamonds}
                  </>
                ) : null}
              </span>
            ) : null}
          </div>

          {nextOutfit ? (
            <div className="mt-4">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                <span>{fmt(progress.coins)} coins saved</span>
                <span>
                  {Math.min(100, Math.round((progress.coins / Math.max(1, nextOutfit.coins)) * 100))}%
                </span>
              </div>
              <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all"
                  style={{
                    width: `${Math.min(100, (progress.coins / Math.max(1, nextOutfit.coins)) * 100)}%`
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-slate-500">{nextOutfit.tagline}</p>
            </div>
          ) : null}

          <div className="mt-5 rounded-2xl bg-gradient-to-br from-violet-50 via-sky-50 to-white p-4 ring-1 ring-violet-100">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-500">AI run coach</p>
                <p className="text-sm font-bold text-slate-800">Get three tactical tips for your next run</p>
              </div>
              <button
                type="button"
                onClick={askCoach}
                disabled={coachBusy}
                className="shrink-0 rounded-xl bg-violet-600 px-4 py-2 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:opacity-60"
              >
                {coachBusy ? 'Consulting…' : 'Ask Oracle'}
              </button>
            </div>
            {coach ? (
              <p className="mt-3 whitespace-pre-wrap rounded-xl bg-white/80 p-3 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-100">
                {coach}
              </p>
            ) : null}
          </div>
        </section>

        {/* System status */}
        <section className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-600">Live status</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Platform</h2>

          <ul className="mt-4 space-y-3 text-sm">
            <li className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Backend API</span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  health?.ok ? 'bg-emerald-50 text-emerald-700' : healthError ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-500'
                }`}
              >
                {health?.ok ? 'Online' : healthError ? 'Offline' : 'Checking'}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Database</span>
              <span className="rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-600">
                {health?.mode === 'supabase' ? 'Supabase Postgres' : 'Local JSON'}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Gemini AI</span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  health?.geminiConfigured ? 'bg-violet-50 text-violet-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {health?.geminiConfigured ? 'Connected' : 'Fallback'}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Cache</span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  health?.redisReady ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-500'
                }`}
              >
                {health?.redisReady ? 'Redis' : health?.redisConfigured ? 'Unreachable' : 'Not set'}
              </span>
            </li>
            <li className="flex items-center justify-between gap-3">
              <span className="text-slate-500">Cloud save</span>
              <span
                className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                  isAuthed ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'
                }`}
              >
                {isAuthed ? 'Syncing' : 'Guest'}
              </span>
            </li>
          </ul>

          {health?.message ? (
            <p className="mt-4 rounded-2xl bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-500">
              {health.message}
            </p>
          ) : null}

          <div className="mt-4 rounded-2xl bg-amber-50 p-3 ring-1 ring-amber-100">
            <p className="text-[10px] font-black uppercase tracking-wider text-amber-700">Controls</p>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-800">
              Desktop: <b>← →</b> lanes / junctions · <b>↑</b> jump · <b>↓</b> slide · <b>P</b> pause · <b>M</b> mute
            </p>
            <p className="mt-1 text-[11px] font-medium leading-relaxed text-amber-800">
              Mobile: swipe anywhere to move, tap to jump.
            </p>
          </div>
        </section>
      </div>

      {/* Powerups + biomes */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-rose-600">Inventory</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Special powers</h2>
          <ul className="mt-4 space-y-3">
            {Object.values(POWERUPS).map((p) => (
              <li key={p.id} className="flex items-start gap-3">
                <span
                  className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm"
                  style={{ backgroundColor: `${p.color}1a`, color: p.color }}
                >
                  ✦
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {p.name}
                    <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {Math.round(p.duration)}s
                    </span>
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-500">{p.desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-600">Worlds</p>
          <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">Six temple environments</h2>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {BIOMES.map((b, i) => (
              <li key={b.id} className="rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Zone {i + 1}
                </p>
                <p className="text-sm font-bold leading-snug text-slate-800">{b.name}</p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11px] leading-relaxed text-slate-500">
            The world rotates biomes every few segments and raises speed as your distance grows. Junction turns keep
            you alert — swipe the correct direction before the bend.
          </p>
        </div>
      </section>
    </div>
  );
}
