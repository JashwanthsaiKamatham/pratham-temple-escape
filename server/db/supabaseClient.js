const path = require('path');
const { createClient } = require('@supabase/supabase-js');

let WebSocketImpl = null;
try {
  // Node < 22 has no global WebSocket; supabase-js's realtime transport needs one.
  // Passing `ws` keeps createClient() from throwing and lets us stay on Node 20.
  // eslint-disable-next-line global-require
  WebSocketImpl = require('ws');
} catch {
  WebSocketImpl = null;
}

const PLACEHOLDER_PATTERNS = [
  /your[-_]?supabase/i,
  /^https?:\/\/(xxxx|your)/i,
  /^sb_secret_?$/i,
  /^eyJhbGciOiJIUzI1NiJ9\.\./,
  /^changeme/i
];

function looksLikePlaceholder(value) {
  if (!value) return true;
  const trimmed = String(value).trim();
  if (!trimmed) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(trimmed));
}

function isSupabaseConfigured() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (looksLikePlaceholder(url) || looksLikePlaceholder(key)) return false;
  if (!/^https?:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(url).trim())) return false;
  // A service-role JWT always decodes to a payload containing role: service_role
  const parts = String(key).trim().split('.');
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
      return payload.role === 'service_role';
    } catch {
      return false;
    }
  }
  return true;
}

/**
 * Single factory used by every module so the realtime WebSocket transport is
 * always supplied on Node 20 and the client can never throw at startup.
 */
function createSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!isSupabaseConfigured()) return null;

  const options = {
    auth: { persistSession: false, autoRefreshToken: false }
  };
  if (WebSocketImpl) {
    options.realtime = { transport: WebSocketImpl };
  }

  return createClient(url.trim(), serviceKey.trim(), options);
}

module.exports = {
  createSupabaseAdmin,
  isSupabaseConfigured,
  looksLikePlaceholder,
  hasWsTransport: Boolean(WebSocketImpl),
  envPath: path.join(__dirname, '..', '.env')
};
