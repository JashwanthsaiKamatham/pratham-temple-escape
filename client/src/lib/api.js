const RAW_BASE = import.meta.env.VITE_API_BASE_URL || '';
export const API_BASE = RAW_BASE.replace(/\/$/, '');

const TOKEN_KEY = 'pratham_auth_token_v1';
const LOCAL_SAVE_KEY = 'pratham_guest_save_v1';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export function loadLocalProgress() {
  try {
    const raw = localStorage.getItem(LOCAL_SAVE_KEY);
    if (!raw) {
      return {
        high_score: 0,
        coins: 100,
        diamonds: 2,
        total_distance: 0,
        games_played: 0,
        equipped_outfit: 'classic',
        unlocked_outfits: ['classic']
      };
    }
    const parsed = JSON.parse(raw);
    return {
      high_score: Number(parsed.high_score || 0),
      coins: Number(parsed.coins ?? 100),
      diamonds: Number(parsed.diamonds ?? 2),
      total_distance: Number(parsed.total_distance || 0),
      games_played: Number(parsed.games_played || 0),
      equipped_outfit: parsed.equipped_outfit || 'classic',
      unlocked_outfits: Array.isArray(parsed.unlocked_outfits)
        ? Array.from(new Set(['classic', ...parsed.unlocked_outfits]))
        : ['classic']
    };
  } catch {
    return {
      high_score: 0,
      coins: 100,
      diamonds: 2,
      total_distance: 0,
      games_played: 0,
      equipped_outfit: 'classic',
      unlocked_outfits: ['classic']
    };
  }
}

export function saveLocalProgress(stats) {
  try {
    localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(stats));
  } catch {
    // ignore storage quota errors
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export const api = {
  health: () => request('/api/health'),

  signup: (payload) =>
    request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  login: (payload) =>
    request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  me: () => request('/api/auth/me'),

  leaderboard: () => request('/api/game/leaderboard'),

  syncGame: (payload) =>
    request('/api/game/sync', {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  unlockOutfit: (outfitId) =>
    request('/api/game/unlock-outfit', {
      method: 'POST',
      body: JSON.stringify({ outfitId })
    }),

  equipOutfit: (outfitId) =>
    request('/api/game/equip-outfit', {
      method: 'POST',
      body: JSON.stringify({ outfitId })
    }),

  listItems: () => request('/api/items'),

  createItem: (payload) =>
    request('/api/items', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  updateItem: (id, payload) =>
    request(`/api/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    }),

  deleteItem: (id) =>
    request(`/api/items/${id}`, {
      method: 'DELETE'
    }),

  generateAI: (payload) =>
    request('/api/ai/generate', {
      method: 'POST',
      body: JSON.stringify(payload)
    })
};
