import React, { useState } from 'react';
import { OUTFITS } from '../game/constants';
import { useSession } from '../lib/SessionContext';
import PrathamPortrait from './PrathamPortrait';
import { CoinIcon, DiamondIcon } from './Icons';

function Pill({ children, tone = 'slate' }) {
  const tones = {
    amber: 'bg-amber-50 text-amber-700 ring-amber-200',
    emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    slate: 'bg-slate-50 text-slate-600 ring-slate-200',
    sky: 'bg-sky-50 text-sky-700 ring-sky-200'
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${tones[tone]}`}>
      {children}
    </span>
  );
}

export default function OutfitShop({ onPlay, flash }) {
  const { progress, unlockOutfit, equipOutfit } = useSession();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');

  const handleUnlock = async (outfit) => {
    setBusy(outfit.id);
    setError('');
    try {
      await unlockOutfit(outfit.id);
      flash?.(`${outfit.name} unlocked & equipped!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const handleEquip = async (outfit) => {
    setBusy(outfit.id);
    setError('');
    try {
      await equipOutfit(outfit.id);
      flash?.(`Now wearing ${outfit.name}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-600">Wardrobe</p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Outfit Shop</h2>
          <p className="mt-1 text-sm text-slate-500">
            Spend run coins on new gear. Every outfit changes Pratham&apos;s 3D model instantly.
          </p>
        </div>
        <div className="flex gap-2">
          <Pill tone="amber">
            <CoinIcon size={13} /> {progress.coins.toLocaleString('en-IN')} coins
          </Pill>
          <Pill tone="sky">
            <DiamondIcon size={13} /> {progress.diamonds} diamonds
          </Pill>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 ring-1 ring-rose-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {OUTFITS.map((outfit) => {
          const unlocked = progress.unlocked_outfits.includes(outfit.id);
          const equipped = progress.equipped_outfit === outfit.id;
          const canAfford =
            progress.coins >= outfit.coins && progress.diamonds >= outfit.diamonds;

          return (
            <article
              key={outfit.id}
              className={`group relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition hover:shadow-glass ${
                equipped ? 'border-amber-300 ring-2 ring-amber-100' : 'border-slate-200/80'
              }`}
            >
              <div
                className={`absolute inset-x-0 top-0 h-24 bg-gradient-to-br ${outfit.badgeBg} opacity-90`}
              />
              <div className="relative flex items-start justify-between">
                <div className="rounded-2xl bg-white/90 p-1.5 shadow-sm ring-1 ring-slate-900/5">
                  <PrathamPortrait colors={outfit.colors} size={64} />
                </div>
                <div className="flex flex-col items-end gap-1">
                  {equipped ? <Pill tone="emerald">Equipped</Pill> : unlocked ? <Pill tone="amber">Owned</Pill> : null}
                </div>
              </div>

              <div className="relative mt-4">
                <h3 className="text-base font-black tracking-tight text-slate-900">{outfit.name}</h3>
                <p className="mt-1 min-h-[40px] text-xs leading-relaxed text-slate-500">{outfit.tagline}</p>

                <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-600">
                  {outfit.coins > 0 ? (
                    <span className="inline-flex items-center gap-1">
                      <CoinIcon size={14} /> {outfit.coins}
                    </span>
                  ) : (
                    <span>Free starter</span>
                  )}
                  {outfit.diamonds > 0 ? (
                    <span className="inline-flex items-center gap-1 text-sky-600">
                      + <DiamondIcon size={13} /> {outfit.diamonds}
                    </span>
                  ) : null}
                </div>

                <div className="mt-4 flex gap-2">
                  {!unlocked ? (
                    <button
                      type="button"
                      disabled={busy === outfit.id || !canAfford}
                      onClick={() => handleUnlock(outfit)}
                      className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition ${
                        canAfford
                          ? 'bg-slate-900 text-white hover:bg-slate-800'
                          : 'cursor-not-allowed bg-slate-100 text-slate-400'
                      }`}
                    >
                      {busy === outfit.id ? 'Unlocking…' : canAfford ? 'Unlock outfit' : 'Not enough coins'}
                    </button>
                  ) : equipped ? (
                    <button
                      type="button"
                      onClick={() => onPlay?.(outfit.id)}
                      className="flex-1 rounded-xl bg-amber-500 py-2.5 text-xs font-bold text-white transition hover:bg-amber-600"
                    >
                      Play in this outfit
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy === outfit.id}
                      onClick={() => handleEquip(outfit)}
                      className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                    >
                      {busy === outfit.id ? 'Equipping…' : 'Equip'}
                    </button>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
