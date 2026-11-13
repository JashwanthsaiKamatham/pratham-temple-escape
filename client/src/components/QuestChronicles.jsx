import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { useSession } from '../lib/SessionContext';

const CATEGORIES = ['quest', 'milestone', 'artifact', 'strategy'];

const emptyForm = { title: '', description: '', category: 'quest', score: '', distance: '' };

function fmt(n) {
  return Number(n || 0).toLocaleString('en-IN');
}

export default function QuestChronicles({ onRequireAuth, flash }) {
  const { isAuthed, progress } = useSession();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!isAuthed) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.listItems();
      setItems(data.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthed]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setOpen(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError('Give your chronicle a title.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category,
        score: Number(form.score || 0),
        distance: Number(form.distance || 0)
      };
      if (editingId) {
        const data = await api.updateItem(editingId, payload);
        setItems((prev) => prev.map((i) => (i.id === editingId ? data.item : i)));
        flash?.('Chronicle updated');
      } else {
        const data = await api.createItem(payload);
        setItems((prev) => [data.item, ...prev]);
        flash?.('New chronicle recorded');
      }
      resetForm();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    setBusy(true);
    setError('');
    try {
      await api.deleteItem(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
      flash?.('Chronicle deleted');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      description: item.description || '',
      category: item.category || 'quest',
      score: item.score || '',
      distance: item.distance || ''
    });
    setOpen(true);
  };

  const generateSummary = async (item) => {
    setAiBusy(item.id);
    setError('');
    try {
      const data = await api.generateAI({
        mode: 'summarize',
        prompt: `${item.title}. ${item.description}`,
        context: {
          title: item.title,
          description: item.description,
          score: item.score,
          distance: item.distance,
          high_score: progress.high_score
        }
      });
      const updated = await api.updateItem(item.id, { ai_summary: data.result });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated.item : i)));
      flash?.('AI Oracle summarised your chronicle');
    } catch (err) {
      setError(err.message);
    } finally {
      setAiBusy(null);
    }
  };

  const stats = useMemo(
    () => ({
      total: items.length,
      quests: items.filter((i) => i.category === 'quest').length,
      summaries: items.filter((i) => i.ai_summary).length
    }),
    [items]
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-emerald-600">Cloud CRUD</p>
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Quest Chronicles</h2>
          <p className="mt-1 max-w-xl text-sm text-slate-500">
            Save your temple runs, artifacts and strategies to your cloud profile. Each entry is a private row in
            the <span className="font-semibold text-slate-700">items</span> table with full create, read, update and
            delete support.
          </p>
        </div>
        {isAuthed ? (
          <button
            type="button"
            onClick={() => {
              if (open && !editingId) setOpen(false);
              else {
                setEditingId(null);
                setForm(emptyForm);
                setOpen(true);
              }
            }}
            className="rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800"
          >
            {open ? 'Close editor' : '+ New chronicle'}
          </button>
        ) : null}
      </div>

      {!isAuthed ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
          <p className="text-3xl">📜</p>
          <h3 className="mt-2 text-lg font-black text-slate-800">Log in to use cloud chronicles</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Chronicled quests live in your own private rows, guarded by Postgres row-level security. Sign in to start
            writing your legend.
          </p>
          <button
            type="button"
            onClick={onRequireAuth}
            className="mt-4 rounded-2xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-amber-600"
          >
            Log in / Sign up
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Chronicles</p>
              <p className="text-2xl font-black text-slate-900">{stats.total}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Quest entries</p>
              <p className="text-2xl font-black text-slate-900">{stats.quests}</p>
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">AI summaries</p>
              <p className="text-2xl font-black text-slate-900">{stats.summaries}</p>
            </div>
          </div>

          {open ? (
            <form
              onSubmit={submit}
              className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">
                {editingId ? 'Edit chronicle' : 'New chronicle'}
              </h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Title</span>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Escape from the Gopuram of Hampi"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Description</span>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    rows={3}
                    placeholder="Dodged 14 boulder traps, chained two magnet power-ups and outran the Guardian at 32 km/h."
                    className="mt-1 w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Category</span>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Score</span>
                    <input
                      type="number"
                      min="0"
                      value={form.score}
                      onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
                      placeholder="12450"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Distance</span>
                    <input
                      type="number"
                      min="0"
                      value={form.distance}
                      onChange={(e) => setForm((f) => ({ ...f, distance: e.target.value }))}
                      placeholder="860"
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-amber-400 focus:bg-white"
                    />
                  </label>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-60"
                >
                  {busy ? 'Saving…' : editingId ? 'Save changes' : 'Create chronicle'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}

          {error ? (
            <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 ring-1 ring-rose-100">
              {error}
            </div>
          ) : null}

          {loading ? (
            <p className="text-sm text-slate-400">Loading your chronicles…</p>
          ) : items.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-8 text-center">
              <p className="text-3xl">🗿</p>
              <h3 className="mt-2 text-base font-black text-slate-800">No chronicles yet</h3>
              <p className="mt-1 text-sm text-slate-500">
                Record your first run or artifact — then ask the AI Oracle to summarise it.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 md:grid-cols-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-col rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-glass"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
                        {item.category}
                      </span>
                      <h3 className="mt-2 text-base font-black leading-snug tracking-tight text-slate-900">
                        {item.title}
                      </h3>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold text-slate-400">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : ''}
                    </span>
                  </div>

                  {item.description ? (
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">{item.description}</p>
                  ) : null}

                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-slate-600">
                    {Number(item.score) > 0 ? (
                      <span className="rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
                        {fmt(item.score)} pts
                      </span>
                    ) : null}
                    {Number(item.distance) > 0 ? (
                      <span className="rounded-full bg-slate-50 px-2.5 py-1 ring-1 ring-slate-200">
                        {fmt(item.distance)} m
                      </span>
                    ) : null}
                  </div>

                  {item.ai_summary ? (
                    <div className="mt-3 rounded-2xl bg-gradient-to-br from-violet-50 to-sky-50 p-3 ring-1 ring-violet-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-violet-500">AI Oracle summary</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-600">{item.ai_summary}</p>
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <button
                      type="button"
                      onClick={() => generateSummary(item)}
                      disabled={aiBusy === item.id}
                      className="rounded-xl bg-violet-50 px-3 py-2 text-[11px] font-bold text-violet-700 ring-1 ring-violet-200 transition hover:bg-violet-100 disabled:opacity-60"
                    >
                      {aiBusy === item.id ? 'Consulting Oracle…' : item.ai_summary ? 'Regenerate summary' : 'AI summary'}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(item)}
                      className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(item.id)}
                      disabled={busy}
                      className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-bold text-rose-600 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
