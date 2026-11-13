const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { ensureSupabaseTables } = require('./migrate');
const { createSupabaseAdmin, isSupabaseConfigured } = require('./supabaseClient');
const { getCache } = require('./cacheRegistry');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOCAL_DB_FILE = path.join(DATA_DIR, 'local_db.json');

let supabaseAdmin = null;
let supabaseReady = false;
let lastStatusReason = 'Using local persistence until Supabase keys are configured';

const SEED_LEGENDS = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    full_name: 'Aarav Hampi',
    high_score: 28450,
    total_distance: 4120,
    equipped_outfit: 'solar'
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    full_name: 'Meera Konark',
    high_score: 21900,
    total_distance: 3290,
    equipped_outfit: 'royal'
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    full_name: 'Kabir WesternGhats',
    high_score: 16400,
    total_distance: 2480,
    equipped_outfit: 'shadow'
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    full_name: 'Diya Ellora',
    high_score: 11850,
    total_distance: 1850,
    equipped_outfit: 'jungle'
  }
];

function ensureLocalDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LOCAL_DB_FILE)) {
    const initial = { profiles: [], items: [] };
    fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(initial, null, 2), 'utf8');
  }
}

function readLocalDb() {
  ensureLocalDb();
  try {
    return JSON.parse(fs.readFileSync(LOCAL_DB_FILE, 'utf8'));
  } catch {
    return { profiles: [], items: [] };
  }
}

function writeLocalDb(data) {
  ensureLocalDb();
  fs.writeFileSync(LOCAL_DB_FILE, JSON.stringify(data, null, 2), 'utf8');
}

async function initStore() {
  if (isSupabaseConfigured()) {
    supabaseAdmin = createSupabaseAdmin();
    const res = await ensureSupabaseTables();
    if (res.ok) {
      supabaseReady = true;
      lastStatusReason = `Connected to Supabase Postgres (${res.method})`;
      return;
    } else {
      supabaseReady = false;
      lastStatusReason = `Supabase configured, awaiting table provisioning: ${res.reason}`;
      return;
    }
  }

  supabaseAdmin = null;
  supabaseReady = false;
  ensureLocalDb();
  lastStatusReason = 'Local persistent JSON DB active (ready for Supabase keys)';
}

function getStatus() {
  return {
    mode: supabaseReady ? 'supabase' : 'local',
    supabaseConfigured: isSupabaseConfigured(),
    supabaseReady,
    geminiConfigured: Boolean((process.env.GEMINI_API_KEY || '').trim()),
    message: lastStatusReason
  };
}

function sanitizeProfile(p) {
  if (!p) return null;
  const unlocked = Array.isArray(p.unlocked_outfits)
    ? p.unlocked_outfits
    : ['classic'];
  return {
    id: p.id,
    email: p.email,
    full_name: p.full_name || 'Adventurer',
    high_score: Number(p.high_score || 0),
    coins: Number(p.coins || 0),
    diamonds: Number(p.diamonds || 0),
    total_distance: Number(p.total_distance || 0),
    games_played: Number(p.games_played || 0),
    equipped_outfit: p.equipped_outfit || 'classic',
    unlocked_outfits: unlocked.includes('classic') ? unlocked : ['classic', ...unlocked],
    created_at: p.created_at
  };
}

// ---------- PROFILES ----------

async function findProfileByEmail(email) {
  const normalized = String(email).trim().toLowerCase();
  if (supabaseReady) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('email', normalized)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  }

  const db = readLocalDb();
  return db.profiles.find((p) => p.email === normalized) || null;
}

async function findProfileById(id) {
  if (supabaseReady) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data || null;
  }

  const db = readLocalDb();
  return db.profiles.find((p) => p.id === id) || null;
}

async function createProfile({ email, full_name, password_hash, initialStats = {} }) {
  const normalized = String(email).trim().toLowerCase();
  const newProfile = {
    id: crypto.randomUUID(),
    email: normalized,
    full_name: (full_name || 'Pratham Explorer').trim(),
    password_hash,
    high_score: Number(initialStats.high_score || 0),
    coins: Number(initialStats.coins || 0),
    diamonds: Number(initialStats.diamonds || 0),
    total_distance: Number(initialStats.total_distance || 0),
    games_played: Number(initialStats.games_played || 0),
    equipped_outfit: initialStats.equipped_outfit || 'classic',
    unlocked_outfits: Array.isArray(initialStats.unlocked_outfits)
      ? Array.from(new Set(['classic', ...initialStats.unlocked_outfits]))
      : ['classic'],
    created_at: new Date().toISOString()
  };

  if (supabaseReady) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .insert([newProfile])
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return sanitizeProfile(data);
  }

  const db = readLocalDb();
  db.profiles.push(newProfile);
  writeLocalDb(db);
  return sanitizeProfile(newProfile);
}

async function updateProfile(id, updates) {
  if (supabaseReady) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return sanitizeProfile(data);
  }

  const db = readLocalDb();
  const idx = db.profiles.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error('Profile not found');
  db.profiles[idx] = { ...db.profiles[idx], ...updates };
  writeLocalDb(db);
  return sanitizeProfile(db.profiles[idx]);
}

const LEADERBOARD_TTL = 20;

async function getLeaderboard(limit = 10) {
  const cache = getCache();
  const key = `pratham:leaderboard:${limit}`;

  if (cache.enabled) {
    const hit = await cache.getJson(key);
    if (Array.isArray(hit)) return hit;
  }

  let players = [];
  if (supabaseReady) {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, high_score, total_distance, equipped_outfit')
      .order('high_score', { ascending: false })
      .limit(limit);
    if (!error && Array.isArray(data)) {
      players = data;
    }
  } else {
    const db = readLocalDb();
    players = db.profiles.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      high_score: Number(p.high_score || 0),
      total_distance: Number(p.total_distance || 0),
      equipped_outfit: p.equipped_outfit || 'classic'
    }));
  }

  const merged = [...players, ...SEED_LEGENDS]
    .sort((a, b) => Number(b.high_score || 0) - Number(a.high_score || 0))
    .slice(0, limit);

  if (cache.enabled) await cache.setJson(key, merged, LEADERBOARD_TTL);
  return merged;
}

/** Drop cached leaderboards after any write that could change the ranking. */
async function invalidateLeaderboard() {
  const cache = getCache();
  if (!cache.enabled) return;
  await cache.del('pratham:leaderboard:10', 'pratham:leaderboard:5', 'pratham:leaderboard:20');
}

// ---------- ITEMS (CRUD) ----------

async function listItems(userId) {
  if (supabaseReady) {
    const { data, error } = await supabaseAdmin
      .from('items')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return data || [];
  }

  const db = readLocalDb();
  return db.items
    .filter((item) => item.user_id === userId)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

async function createItem(userId, payload) {
  const newItem = {
    id: crypto.randomUUID(),
    user_id: userId,
    title: String(payload.title || 'Temple Run Milestone').trim(),
    description: String(payload.description || '').trim(),
    ai_summary: String(payload.ai_summary || '').trim(),
    category: String(payload.category || 'quest').trim(),
    score: Number(payload.score || 0),
    distance: Number(payload.distance || 0),
    created_at: new Date().toISOString()
  };

  if (supabaseReady) {
    const { data, error } = await supabaseAdmin
      .from('items')
      .insert([newItem])
      .select('*')
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  const db = readLocalDb();
  db.items.push(newItem);
  writeLocalDb(db);
  return newItem;
}

async function updateItem(userId, itemId, updates) {
  const allowed = {};
  if (Object.keys(updates || {}).length === 0) {
    throw new Error('No valid fields to update');
  }
  if (updates.title !== undefined) allowed.title = String(updates.title).trim();
  if (updates.description !== undefined) allowed.description = String(updates.description).trim();
  if (updates.ai_summary !== undefined) allowed.ai_summary = String(updates.ai_summary).trim();
  if (updates.category !== undefined) allowed.category = String(updates.category).trim();
  if (updates.score !== undefined) allowed.score = Number(updates.score || 0);
  if (updates.distance !== undefined) allowed.distance = Number(updates.distance || 0);

  if (supabaseReady) {
    const { data, error } = await supabaseAdmin
      .from('items')
      .update(allowed)
      .eq('id', itemId)
      .eq('user_id', userId)
      .select('*');
    if (error) throw new Error(error.message);
    // Zero rows updated means the item is missing or owned by another user.
    if (!data || data.length === 0) {
      throw new Error('Item not found or unauthorized');
    }
    return data[0];
  }

  const db = readLocalDb();
  const idx = db.items.findIndex((i) => i.id === itemId && i.user_id === userId);
  if (idx === -1) throw new Error('Item not found or unauthorized');
  db.items[idx] = { ...db.items[idx], ...allowed };
  writeLocalDb(db);
  return db.items[idx];
}

async function deleteItem(userId, itemId) {
  if (supabaseReady) {
    // .select() is required: a DELETE that matches 0 rows is not an error in
    // PostgREST, so without it we would report success for someone else's row.
    const { data, error } = await supabaseAdmin
      .from('items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId)
      .select('id');
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) {
      throw new Error('Item not found or unauthorized');
    }
    return { deleted: true };
  }

  const db = readLocalDb();
  const before = db.items.length;
  db.items = db.items.filter((i) => !(i.id === itemId && i.user_id === userId));
  if (db.items.length === before) {
    throw new Error('Item not found or unauthorized');
  }
  writeLocalDb(db);
  return { deleted: true };
}

module.exports = {
  initStore,
  getStatus,
  sanitizeProfile,
  findProfileByEmail,
  findProfileById,
  createProfile,
  updateProfile,
  getLeaderboard,
  listItems,
  createItem,
  updateItem,
  deleteItem
,
  invalidateLeaderboard
};
