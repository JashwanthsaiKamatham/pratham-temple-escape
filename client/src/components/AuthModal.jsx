import React, { useState } from 'react';
import { useSession } from '../lib/SessionContext';

export default function AuthModal({ open, onClose, onAuthed }) {
  const { login, signup } = useSession();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'login') {
        await login({ email: email.trim(), password });
      } else {
        await signup({ email: email.trim(), password, full_name: fullName.trim() });
      }
      onAuthed?.();
      onClose?.();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
        <div className="relative bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 px-6 py-5 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/25 text-sm font-bold text-white transition hover:bg-white/40"
            aria-label="Close"
          >
            ✕
          </button>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-amber-100">Cloud profile</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight">
            {mode === 'login' ? 'Return to the Temple' : 'Join the Expedition'}
          </h2>
          <p className="mt-1 text-xs font-medium text-amber-50/90">
            {mode === 'login'
              ? 'Sync your coins, outfits & high scores across devices.'
              : 'Create your adventurer profile — progress saves to the cloud.'}
          </p>
        </div>

        <form onSubmit={submit} className="p-6">
          <div className="mb-4 grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
            {['login', 'signup'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setError('');
                }}
                className={`rounded-xl py-2 text-xs font-bold transition ${
                  mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m === 'login' ? 'Log in' : 'Sign up'}
              </button>
            ))}
          </div>

          {mode === 'signup' ? (
            <label className="mb-3 block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Adventurer name</span>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Pratham the Trailblazer"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
              />
            </label>
          ) : null}

          <label className="mb-3 block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
            />
          </label>

          <label className="mb-2 block">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Password</span>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
            />
          </label>

          {error ? (
            <p className="mt-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{error}</p>
          ) : null}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-2xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Connecting…' : mode === 'login' ? 'Log in & restore save' : 'Create my profile'}
          </button>

          <p className="mt-3 text-center text-[11px] text-slate-400">
            Passwords are bcrypt-hashed on the server. Sessions last 30 days.
          </p>
        </form>
      </div>
    </div>
  );
}
