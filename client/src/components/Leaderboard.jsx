import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { OUTFITS } from '../game/constants';
import { useSession } from '../lib/SessionContext';

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const { user, progress } = useSession();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await api.leaderboard();
        if (!cancelled) setRows(data.leaderboard || []);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const youRow = {
    id: user?.id || 'guest',
    full_name: user?.full_name || 'You (guest)',
    high_score: progress.high_score,
    total_distance: progress.total_distance,
    equipped_outfit: progress.equipped_outfit,
    isYou: true
  };

  const merged = [...rows];
  if (!merged.some((r) => r.id === youRow.id)) merged.push(youRow);
  merged.sort((a, b) => Number(b.high_score || 0) - Number(a.high_score || 0));

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-sky-600">Hall of legends</p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Global Leaderboard</h2>
          <p className="mt-1 text-sm text-slate-500">
            Live from <span className="font-mono text-[12px] text-slate-600">GET /api/game/leaderboard</span> — ranking
            every adventurer by high score and total distance.
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-200">
          Top {merged.length}
        </span>
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 ring-1 ring-rose-100">
          {error}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        {loading ? (
          <div className="space-y-3 p-5">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {merged.map((row, idx) => {
              const outfit = OUTFITS.find((o) => o.id === row.equipped_outfit) || OUTFITS[0];
              return (
                <li
                  key={`${row.id}-${idx}`}
                  className={`flex items-center gap-3 px-4 py-3 sm:px-5 ${
                    row.isYou ? 'bg-amber-50/70' : 'bg-white'
                  }`}
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-50 text-sm font-black text-slate-500 ring-1 ring-slate-200">
                    {MEDALS[idx] || idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {row.full_name || 'Adventurer'}
                      {row.isYou ? (
                        <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                          You
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                      {outfit.name} • {fmt(row.total_distance)} m travelled
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">{fmt(row.high_score)}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">pts</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
