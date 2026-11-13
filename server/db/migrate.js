const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const { createSupabaseAdmin, isSupabaseConfigured } = require('./supabaseClient');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

// Build a Postgres connection string from a bare database password so the
// migration can run with nothing but the password from the Supabase dashboard.
function buildDatabaseUrlFromPassword(password) {
  const ref = extractProjectRef(process.env.SUPABASE_URL);
  if (!ref || !password) return null;
  const region = (process.env.SUPABASE_REGION || 'ap-south-1').trim();
  const encoded = encodeURIComponent(password);
  return {
    pooler: `postgresql://postgres.${ref}:${encoded}@aws-0-${region}.pooler.supabase.com:6543/postgres`,
    direct: `postgresql://postgres:${encoded}@db.${ref}.supabase.co:5432/postgres`
  };
}

function extractProjectRef(supabaseUrl) {
  if (!supabaseUrl) return null;
  const match = supabaseUrl.match(/https?:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match ? match[1] : null;
}

async function verifyTablesViaServiceRole() {
  if (!isSupabaseConfigured()) {
    return { ready: false, reason: 'Missing or invalid SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' };
  }

  try {
    const supabase = createSupabaseAdmin();

    const { error: pErr } = await supabase.from('profiles').select('id').limit(1);
    const { error: iErr } = await supabase.from('items').select('id').limit(1);

    if (!pErr && !iErr) {
      return { ready: true };
    }
    return {
      ready: false,
      reason: (pErr && pErr.message) || (iErr && iErr.message) || 'Tables do not exist yet'
    };
  } catch (err) {
    return { ready: false, reason: err.message };
  }
}

async function runSqlOverPool(connectionString, sql) {
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 12000
  });
  try {
    await pool.query(sql);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  } finally {
    await pool.end().catch(() => {});
  }
}

async function ensureSupabaseTables() {
  const sql = fs.readFileSync(SCHEMA_PATH, 'utf8');

  // Strategy 1: Postgres connection string (DATABASE_URL)
  let connectionStrings = [];
  if (process.env.DATABASE_URL) connectionStrings.push(process.env.DATABASE_URL);
  if (process.env.SUPABASE_DB_PASSWORD) {
    const built = buildDatabaseUrlFromPassword(process.env.SUPABASE_DB_PASSWORD);
    if (built) connectionStrings.push(built.pooler, built.direct);
  }

  for (const connectionString of connectionStrings) {
    const result = await runSqlOverPool(connectionString, sql);
    if (result.ok) {
      const via = connectionString === process.env.DATABASE_URL
        ? 'DATABASE_URL'
        : connectionString.includes('pooler') ? 'SUPABASE_DB_PASSWORD (pooler)' : 'SUPABASE_DB_PASSWORD (direct)';
      console.log(`[DB] Automatically provisioned Supabase tables & RLS via ${via}.`);
      return { ok: true, method: via };
    }
    console.warn('[DB] Postgres migration attempt failed:', result.error);
  }

  // Strategy 2: Supabase Management API using SUPABASE_ACCESS_TOKEN (sbp_...)
  const projectRef = extractProjectRef(process.env.SUPABASE_URL);
  if (process.env.SUPABASE_ACCESS_TOKEN && projectRef) {
    try {
      const res = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ query: sql })
        }
      );
      if (res.ok) {
        console.log('[DB] Automatically provisioned Supabase tables & RLS via Management API.');
        return { ok: true, method: 'management_api' };
      } else {
        const body = await res.text();
        console.warn('[DB] Management API DDL response:', res.status, body);
      }
    } catch (err) {
      console.warn('[DB] Management API migration warning:', err.message);
    }
  }

  // Strategy 3: tables may already exist (created manually in the SQL editor)
  // Check if tables already exist in Supabase
  const verification = await verifyTablesViaServiceRole();
  if (verification.ready) {
    console.log('[DB] Verified existing Supabase tables (profiles & items).');
    return { ok: true, method: 'verified_existing' };
  }

  return { ok: false, reason: verification.reason };
}

if (require.main === module) {
  ensureSupabaseTables()
    .then((res) => {
      console.log('Migration result:', res);
      process.exit(res.ok ? 0 : 1);
    })
    .catch((err) => {
      console.error('Migration error:', err);
      process.exit(1);
    });
}

module.exports = { ensureSupabaseTables, verifyTablesViaServiceRole };
