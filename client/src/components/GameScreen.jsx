import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GameEngine } from '../game/engine/GameEngine';
import { OUTFITS } from '../game/constants';
import Hud from './Hud';
import TouchControls from './TouchControls';
import { CoinIcon, DiamondIcon, TrophyIcon } from './Icons';

const CRASH_COPY = {
  barrier: 'A wooden barrier slammed you down.',
  beam: 'A low temple beam clipped your head.',
  spikes: 'Ancient spike traps caught your stride.',
  boulder: 'A falling boulder crushed the path.',
  rockfall: 'Rockfall! You needed a lane change.',
  fire: 'The fire trap singed your boots.',
  pit: 'You leapt too late into the pit.',
  brokenbridge: 'The broken bridge gave way beneath you.',
  pendulum: 'The pendulum blade found you standing.',
  'missed-turn': 'You missed the junction — the Guardian caught you!'
};

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

export default function GameScreen({ outfitId, onExit, onRunEnd, bestScore, playerName }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const [phase, setPhase] = useState('playing');
  const [hud, setHud] = useState(null);
  const [muted, setMuted] = useState(false);
  const [toast, setToast] = useState(null);
  const [result, setResult] = useState(null);
  const [biomeLabel, setBiomeLabel] = useState('Ancient Gopuram Temple');
  const toastTimer = useRef(null);
  const outfit = useMemo(
    () => OUTFITS.find((o) => o.id === outfitId) || OUTFITS[0],
    [outfitId]
  );

  const pushToast = useCallback((text, tone = 'default') => {
    setToast({ text, tone, id: Date.now() });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 1700);
  }, []);

  useEffect(() => {
    const engine = new GameEngine(mountRef.current, {
      outfitId,
      onHud: (data) => setHud(data),
      onStateChange: (state) => {
        if (state === 'running') setPhase('playing');
        if (state === 'paused') setPhase('paused');
        if (state === 'gameover') setPhase('gameover');
      },
      onBiome: (name) => setBiomeLabel(name),
      onJunction: (info) => {
        if (info.armed) pushToast(`Junction locked • ${info.dir.toUpperCase()}`, 'success');
        else if (info.wrong) pushToast(`Wrong way! Swipe ${info.dir.toUpperCase()}`, 'warn');
      },
      onEvent: (evt) => {
        if (evt.type === 'powerup') pushToast(`${evt.name} activated!`, 'success');
        if (evt.type === 'powerup-end') pushToast('Power-up faded', 'default');
        if (evt.type === 'shield-break') pushToast('Sacred Shield absorbed the hit!', 'success');
        if (evt.type === 'smash') pushToast('Speed Boost smash!', 'success');
        if (evt.type === 'diamond') pushToast('+1 Diamond 💎', 'success');
        if (evt.type === 'junction-warning') pushToast('Missed the turn window!', 'warn');
      },
      onGameOver: (data) => {
        setResult(data);
        setPhase('gameover');
        onRunEnd?.(data);
      }
    });

    engine.init();
    engineRef.current = engine;
    if (typeof window !== 'undefined' && import.meta.env.DEV) {
      // Debug handle for local play-testing; never shipped in production builds.
      window.__PRATHAM_ENGINE__ = engine;
    }
    engine.startRun();
    setPhase('playing');

    return () => {
      engine.dispose();
      engineRef.current = null;
      if (typeof window !== 'undefined' && window.__PRATHAM_ENGINE__ === engine) {
        delete window.__PRATHAM_ENGINE__;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard controls
  useEffect(() => {
    const handler = (e) => {
      const engine = engineRef.current;
      if (!engine) return;
      const key = e.key.toLowerCase();
      let action = null;
      if (['arrowleft', 'a'].includes(key)) action = 'left';
      else if (['arrowright', 'd'].includes(key)) action = 'right';
      else if (['arrowup', 'w', ' '].includes(key)) action = 'up';
      else if (['arrowdown', 's'].includes(key)) action = 'down';
      else if (key === 'p' || key === 'escape') {
        if (engine.state === 'running') {
          engine.pause();
          setPhase('paused');
        } else if (engine.state === 'paused') {
          engine.resume();
          setPhase('playing');
        }
        e.preventDefault();
        return;
      } else if (key === 'm') {
        engine.toggleMute();
        setMuted(engine.muted);
        return;
      }
      if (action) {
        if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' '].includes(key)) e.preventDefault();
        engine.input(action);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Pause automatically when the tab loses focus
  useEffect(() => {
    const onBlur = () => {
      const engine = engineRef.current;
      if (engine && engine.state === 'running') {
        engine.pause();
        setPhase('paused');
      }
    };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) onBlur();
    });
    return () => window.removeEventListener('blur', onBlur);
  }, []);

  const handlePause = () => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.pause();
    setPhase('paused');
  };

  const handleResume = () => {
    engineRef.current?.resume();
    setPhase('playing');
  };

  const handleMute = () => {
    const engine = engineRef.current;
    if (!engine) return;
    const m = engine.toggleMute();
    setMuted(m);
  };

  const handleRestart = () => {
    setResult(null);
    engineRef.current?.restart();
    setPhase('playing');
  };

  return (
    <div className="relative h-full w-full overflow-hidden bg-slate-900">
      <div ref={mountRef} className="absolute inset-0" />

      {phase === 'playing' ? (
        <>
          <Hud hud={hud} muted={muted} onPause={handlePause} onMute={handleMute} />
          <TouchControls engineRef={engineRef} enabled showHints />
        </>
      ) : null}

      {/* biome + outfit ribbon */}
      {phase === 'playing' ? (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 hidden rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-semibold text-slate-600 shadow-glass ring-1 ring-slate-900/5 backdrop-blur sm:block">
          {biomeLabel} • {outfit.name}
        </div>
      ) : null}

      {/* toast */}
      {toast ? (
        <div className="pointer-events-none absolute left-1/2 top-24 z-30 -translate-x-1/2">
          <div
            className={`rounded-full px-4 py-2 text-xs font-bold shadow-lg backdrop-blur ${
              toast.tone === 'success'
                ? 'bg-emerald-500/90 text-white'
                : toast.tone === 'warn'
                  ? 'bg-amber-500/90 text-white'
                  : 'bg-slate-900/85 text-white'
            }`}
          >
            {toast.text}
          </div>
        </div>
      ) : null}

      {/* PAUSE */}
      {phase === 'paused' ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-slate-900/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-600">Run paused</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Catch your breath</h2>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Score</p>
                <p className="text-lg font-black text-slate-800">{fmt(hud?.score)}</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distance</p>
                <p className="text-lg font-black text-slate-800">{fmt(hud?.distance)}m</p>
              </div>
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Coins</p>
                <p className="text-lg font-black text-slate-800">{fmt(hud?.coins)}</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleResume}
                className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Resume Run
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="rounded-2xl bg-amber-50 py-3 text-sm font-bold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={onExit}
                  className="rounded-2xl bg-slate-50 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100"
                >
                  Exit to Hub
                </button>
              </div>
              <button
                type="button"
                onClick={handleMute}
                className="mt-1 text-xs font-semibold text-slate-400 hover:text-slate-600"
              >
                {muted ? 'Unmute sound' : 'Mute sound'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* GAME OVER */}
      {phase === 'gameover' && result ? (
        <div className="absolute inset-0 z-40 grid place-items-center bg-slate-900/55 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-6 py-4 text-white">
              <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-100">The Guardian wins</p>
              <h2 className="mt-0.5 text-2xl font-black tracking-tight">Run Ended</h2>
              <p className="mt-1 text-xs font-medium text-amber-50/90">{CRASH_COPY[result.reason] || 'The temple traps got you.'}</p>
            </div>

            <div className="p-6">
              <div className="rounded-2xl bg-slate-50 p-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400">Final Score</p>
                <p className="text-4xl font-black tracking-tight text-slate-900">{fmt(result.score)}</p>
                {result.score >= bestScore ? (
                  <p className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                    <span className="inline-flex items-center gap-1">
                      <TrophyIcon size={13} /> New personal best!
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] font-semibold text-slate-400">Best: {fmt(bestScore)}</p>
                )}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl ring-1 ring-slate-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Distance</p>
                  <p className="text-base font-black text-slate-800">{fmt(result.distance)}m</p>
                </div>
                <div className="rounded-2xl ring-1 ring-slate-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Coins</p>
                  <p className="inline-flex items-center gap-1 text-base font-black text-slate-800">
                    <CoinIcon size={14} /> {fmt(result.coins)}
                  </p>
                </div>
                <div className="rounded-2xl ring-1 ring-slate-100 p-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Diamonds</p>
                  <p className="inline-flex items-center gap-1 text-base font-black text-slate-800">
                    <DiamondIcon size={14} /> {fmt(result.diamonds)}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleRestart}
                  className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  Run Again
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={onExit}
                    className="rounded-2xl bg-slate-50 py-3 text-sm font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100"
                  >
                    Adventurer Hub
                  </button>
                  <button
                    type="button"
                    onClick={onExit}
                    className="rounded-2xl bg-amber-50 py-3 text-sm font-bold text-amber-700 ring-1 ring-amber-200 transition hover:bg-amber-100"
                  >
                    Change Outfit
                  </button>
                </div>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400">
                Progress saved to {playerName ? `${playerName}'s cloud profile` : 'this device'}.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {/* top-left exit during play */}
      {phase === 'playing' ? (
        <button
          type="button"
          onClick={onExit}
          className="absolute right-3 top-[7.5rem] z-30 hidden rounded-full bg-white/85 px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-glass ring-1 ring-slate-900/5 backdrop-blur transition hover:bg-white sm:block"
        >
          Exit
        </button>
      ) : null}
    </div>
  );
}
