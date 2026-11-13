import React, { useEffect, useRef, useState } from 'react';

// Full-surface swipe + on-screen D-pad for Android / iOS touch play.
// Uses Pointer Events only (a single code path for touch, pen and mouse) so a
// tap can never fire the same action twice.
export default function TouchControls({ engineRef, enabled, showHints }) {
  const surfaceRef = useRef(null);
  const [hint, setHint] = useState(null);
  const gesture = useRef(null);
  const hintTimer = useRef(null);

  const flash = (dir) => {
    setHint(dir);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(null), 480);
  };

  const fire = (action) => {
    const engine = engineRef?.current;
    if (!engine) return;
    engine.input(action);
    flash(action);
  };

  useEffect(() => {
    const el = surfaceRef.current;
    if (!el || !enabled) return;

    const onDown = (e) => {
      gesture.current = { x: e.clientX, y: e.clientY, time: Date.now(), id: e.pointerId };
    };

    const onUp = (e) => {
      const start = gesture.current;
      if (!start) return;
      // ignore moves from a different pointer (multi-touch chaos)
      if (start.id !== undefined && e.pointerId !== undefined && e.pointerId !== start.id) return;
      gesture.current = null;

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const elapsed = Date.now() - start.time;
      if (elapsed > 900) return;

      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      const threshold = 22;

      if (absX < threshold && absY < threshold) {
        fire('up'); // tap = jump
        return;
      }
      if (absX > absY) fire(dx > 0 ? 'right' : 'left');
      else fire(dy > 0 ? 'down' : 'up');
    };

    const onCancel = () => {
      gesture.current = null;
    };

    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onCancel);
    el.addEventListener('pointerleave', onCancel);

    return () => {
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onCancel);
      el.removeEventListener('pointerleave', onCancel);
    };
  }, [enabled, engineRef]);

  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const btn =
    'pointer-events-auto grid h-14 w-14 place-items-center rounded-2xl bg-white/85 text-lg font-bold text-slate-700 shadow-glass ring-1 ring-slate-900/10 backdrop-blur transition active:scale-95 active:bg-white select-none touch-none';

  return (
    <>
      {/* Swipe surface */}
      <div
        ref={surfaceRef}
        className="game-touch-surface pointer-events-auto absolute inset-0 z-10"
        aria-hidden="true"
      />

      {enabled ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-4 pb-6">
          <div className="mx-auto grid max-w-[15rem] grid-cols-3 items-end justify-items-center gap-2">
            <div />
            <button type="button" className={btn} onPointerDown={() => fire('up')} aria-label="Jump">
              ▲
            </button>
            <div />
            <button type="button" className={btn} onPointerDown={() => fire('left')} aria-label="Move left">
              ◀
            </button>
            <button type="button" className={btn} onPointerDown={() => fire('down')} aria-label="Slide">
              ▼
            </button>
            <button type="button" className={btn} onPointerDown={() => fire('right')} aria-label="Move right">
              ▶
            </button>
          </div>
          {showHints ? (
            <p className="mt-3 text-center text-[11px] font-medium text-slate-500">
              Swipe anywhere to move • Swipe ⬅️/➡️ at junctions • ⬆️ jump • ⬇️ slide
            </p>
          ) : null}
        </div>
      ) : null}

      {hint ? (
        <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center">
          <span className="animate-popup text-6xl opacity-70">
            {hint === 'left' ? '⬅️' : hint === 'right' ? '➡️' : hint === 'up' ? '⬆️' : '⬇️'}
          </span>
        </div>
      ) : null}
    </>
  );
}
