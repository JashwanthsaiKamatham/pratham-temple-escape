import React, { useCallback, useEffect, useState } from 'react';
import { SessionProvider, useSession } from './lib/SessionContext';
import Dashboard from './components/Dashboard';
import GameScreen from './components/GameScreen';
import AuthModal from './components/AuthModal';
import OutfitShop from './components/OutfitShop';
import QuestChronicles from './components/QuestChronicles';
import Leaderboard from './components/Leaderboard';
import AiOracle from './components/AiOracle';
import { CoinIcon, DiamondIcon } from './components/Icons';

const NAV = [
  { id: 'hub', label: 'Hub', icon: '🏛️' },
  { id: 'outfits', label: 'Outfits', icon: '👕' },
  { id: 'chronicles', label: 'Chronicles', icon: '📜' },
  { id: 'leaderboard', label: 'Ranks', icon: '🏆' },
  { id: 'oracle', label: 'Oracle', icon: '🔮' }
];

function Shell() {
  const { booting, user, progress, finishRun, isAuthed } = useSession();
  const [tab, setTab] = useState('hub');
  const [authOpen, setAuthOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [activeOutfit, setActiveOutfit] = useState(progress.equipped_outfit || 'classic');
  const [flash, setFlash] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setActiveOutfit(progress.equipped_outfit || 'classic');
  }, [progress.equipped_outfit]);

  const showFlash = useCallback((text) => {
    setFlash({ text, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 2600);
    return () => clearTimeout(t);
  }, [flash]);

  const startPlay = (outfitId) => {
    setActiveOutfit(outfitId || progress.equipped_outfit || 'classic');
    setPlaying(true);
    setMobileNavOpen(false);
  };

  const handleRunEnd = useCallback(
    async (result) => {
      const res = await finishRun(result);
      if (res?.synced) showFlash('Run saved to your cloud profile ☁️');
      else if (res?.guest) showFlash('Run saved on this device — log in to sync ☁️');
      else if (res?.error) showFlash(`Cloud sync failed: ${res.error}`);
    },
    [finishRun, showFlash]
  );

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-500" />
          <p className="text-sm font-bold text-slate-500">Waking the temple…</p>
        </div>
      </div>
    );
  }

  if (playing) {
    return (
      <div className="fixed inset-0 h-[100dvh] w-full">
        <GameScreen
          outfitId={activeOutfit}
          bestScore={progress.high_score}
          playerName={user?.full_name}
          onRunEnd={handleRunEnd}
          onExit={() => setPlaying(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Decorative light wash */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute right-0 top-40 h-96 w-96 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-emerald-200/20 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 sm:px-6">
        {/* Header */}
        <header className="sticky top-0 z-30 -mx-4 border-b border-white/60 bg-[#F8FAFC]/80 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-lg shadow-lg shadow-amber-500/20">
                🏛️
              </div>
              <div className="leading-tight">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-900">Pratham</p>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  The Temple Escape
                </p>
              </div>
            </div>

            <nav className="hidden items-center gap-1 lg:flex">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-bold transition ${
                    tab === item.id
                      ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-900/5'
                      : 'text-slate-500 hover:bg-white/70 hover:text-slate-800'
                  }`}
                >
                  <span className="mr-1.5">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 shadow-sm ring-1 ring-slate-900/5 sm:flex">
                <CoinIcon size={15} />
                <span className="text-xs font-black text-slate-800">
                  {progress.coins.toLocaleString('en-IN')}
                </span>
                <span className="mx-1 h-3 w-px bg-slate-200" />
                <DiamondIcon size={14} />
                <span className="text-xs font-black text-slate-800">{progress.diamonds}</span>
              </div>

              <button
                type="button"
                onClick={() => startPlay(progress.equipped_outfit)}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-slate-800"
              >
                Play
              </button>

              {isAuthed ? (
                <button
                  type="button"
                  onClick={() => setTab('hub')}
                  className="hidden items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-900/5 sm:flex"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-amber-400 to-rose-400 text-[10px] font-black text-white">
                    {(user?.full_name || 'P').slice(0, 1).toUpperCase()}
                  </span>
                  {user?.full_name?.split(' ')[0] || 'Profile'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthOpen(true)}
                  className="hidden rounded-2xl bg-amber-500 px-4 py-2.5 text-xs font-black uppercase tracking-wider text-white transition hover:bg-amber-600 sm:block"
                >
                  Log in
                </button>
              )}

              <button
                type="button"
                onClick={() => setMobileNavOpen((v) => !v)}
                className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-600 shadow-sm ring-1 ring-slate-900/5 lg:hidden"
                aria-label="Open navigation"
              >
                ☰
              </button>
            </div>
          </div>

          {mobileNavOpen ? (
            <nav className="mt-3 grid gap-1 rounded-2xl bg-white p-2 shadow-glass ring-1 ring-slate-900/5 lg:hidden">
              {NAV.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setTab(item.id);
                    setMobileNavOpen(false);
                  }}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-bold transition ${
                    tab === item.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              ))}
              {!isAuthed ? (
                <button
                  type="button"
                  onClick={() => {
                    setAuthOpen(true);
                    setMobileNavOpen(false);
                  }}
                  className="rounded-xl bg-amber-500 px-3 py-2.5 text-left text-sm font-bold text-white"
                >
                  Log in / Sign up
                </button>
              ) : null}
            </nav>
          ) : null}
        </header>

        {/* Main content */}
        <main className="flex-1 py-6">
          {tab === 'hub' ? (
            <Dashboard onPlay={startPlay} onOpenAuth={() => setAuthOpen(true)} flash={showFlash} />
          ) : null}
          {tab === 'outfits' ? <OutfitShop onPlay={startPlay} flash={showFlash} /> : null}
          {tab === 'chronicles' ? (
            <QuestChronicles onRequireAuth={() => setAuthOpen(true)} flash={showFlash} />
          ) : null}
          {tab === 'leaderboard' ? <Leaderboard /> : null}
          {tab === 'oracle' ? <AiOracle flash={showFlash} /> : null}
        </main>

        <footer className="border-t border-slate-200/70 py-5 text-center text-[11px] font-medium text-slate-400">
          PRATHAM – THE TEMPLE ESCAPE · React + Three.js · Express + Supabase + Gemini ·{' '}
          <span className="font-semibold text-slate-500">Full-stack cloud adventure</span>
        </footer>
      </div>

      {/* Flash toast */}
      {flash ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
          <div className="animate-popup-none rounded-2xl bg-slate-900/90 px-5 py-3 text-xs font-bold text-white shadow-xl backdrop-blur">
            {flash.text}
          </div>
        </div>
      ) : null}

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} onAuthed={() => showFlash('Welcome, adventurer!')} />
    </div>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <Shell />
    </SessionProvider>
  );
}
