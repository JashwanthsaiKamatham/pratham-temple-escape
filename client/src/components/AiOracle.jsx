import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { useSession } from '../lib/SessionContext';

const QUICK_PROMPTS = [
  { mode: 'coach', label: 'Coach me', prompt: 'Give me a personalised strategy to beat my high score this run.' },
  { mode: 'challenge', label: 'Daily quest', prompt: 'Create a sacred daily quest challenge for Pratham.' },
  { mode: 'lore', label: 'Temple lore', prompt: 'Tell me a short mythic legend about this temple guardian and the treasures inside.' }
];

export default function AiOracle({ flash }) {
  const { progress, isAuthed } = useSession();
  const [messages, setMessages] = useState([
    {
      role: 'oracle',
      text: 'Namaste, traveller. I am the Temple Oracle. Ask me for run strategy, outfit farming plans or the legends of the temple guardian.',
      provider: null
    }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [geminiLive, setGeminiLive] = useState(null);
  const scrollerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    api
      .health()
      .then((h) => alive && setGeminiLive(Boolean(h?.geminiConfigured)))
      .catch(() => alive && setGeminiLive(false));
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (scrollerRef.current) {
      scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
    }
  }, [messages, busy]);

  const send = async (text, mode = 'coach') => {
    const prompt = (text || '').trim();
    if (!prompt || busy) return;
    setError('');
    setMessages((m) => [...m, { role: 'user', text: prompt }]);
    setInput('');
    setBusy(true);
    try {
      const data = await api.generateAI({
        prompt,
        mode,
        context: {
          high_score: progress.high_score,
          coins: progress.coins,
          diamonds: progress.diamonds,
          total_distance: progress.total_distance,
          equipped_outfit: progress.equipped_outfit,
          unlocked_outfits: progress.unlocked_outfits,
          signed_in: isAuthed
        }
      });
      setMessages((m) => [...m, { role: 'oracle', text: data.result, provider: data.provider }]);
    } catch (err) {
      setError(err.message);
      setMessages((m) => [
        ...m,
        {
          role: 'oracle',
          text: 'The temple mist blocks my sight right now. Check the server connection and ask again.',
          provider: null
        }
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-violet-600">Gemini powered</p>
        <h2 className="text-2xl font-black tracking-tight text-slate-900">AI Temple Oracle</h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Server-side only: your browser never touches the Gemini key. The Express backend at
          <span className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
            POST /api/ai/generate
          </span>
          calls Google Gemini and returns the answer.
        </p>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-violet-50 via-sky-50 to-amber-50 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-70" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-violet-500" />
            </span>
            <p className="text-xs font-bold text-slate-700">Oracle channel</p>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {progress.high_score > 0 ? `reading ${progress.high_score.toLocaleString('en-IN')} pt profile` : 'guest aura'}
          </p>
        </div>

        <div ref={scrollerRef} className="max-h-[380px] space-y-3 overflow-y-auto p-5">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-50 text-slate-700 ring-1 ring-slate-200'
                }`}
              >
                {m.text}
                {m.provider ? (
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    via {m.provider}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
          {busy ? (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500 ring-1 ring-slate-200">
                <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-sky-400 [animation-delay:120ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-amber-400 [animation-delay:240ms]" />
                Consulting the temple spirits…
              </div>
            </div>
          ) : null}
        </div>

        <div className="border-t border-slate-100 p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q.mode}
                type="button"
                disabled={busy}
                onClick={() => send(q.prompt, q.mode)}
                className="rounded-full bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 disabled:opacity-50"
              >
                {q.label}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input, 'coach');
            }}
            className="flex gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask the Oracle anything about your run…"
              className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-violet-300 focus:bg-white focus:ring-2 focus:ring-violet-100"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="rounded-2xl bg-gradient-to-r from-violet-600 to-sky-500 px-5 py-3 text-sm font-bold text-white transition hover:from-violet-700 hover:to-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Ask
            </button>
          </form>
          {error ? <p className="mt-2 text-xs font-semibold text-rose-500">{error}</p> : null}
          <p className="mt-2 text-[11px] text-slate-400">
            {geminiLive
              ? 'Live Gemini answers, generated on the server — your browser never sees the API key.'
              : 'Answered instantly by the local Temple Oracle. Add GEMINI_API_KEY to the server to enable live Gemini answers.'}
          </p>
        </div>
      </div>
    </section>
  );
}
