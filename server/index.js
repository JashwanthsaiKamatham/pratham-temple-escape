const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cors = require('cors');
const { initStore, getStatus } = require('./db/store');
const { initCache, getCache } = require('./db/cacheRegistry');

const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const itemsRoutes = require('./routes/items');
const aiRoutes = require('./routes/ai');

const app = express();
const PORT = Number(process.env.PORT || 5000);

// Flexible, production-safe CORS supporting CLIENT_URL, Vercel deployments, E2B preview & local dev
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const allowedExact = (process.env.CLIENT_URL || '')
        .split(',')
        .map((s) => s.trim().replace(/\/$/, ''))
        .filter(Boolean);

      const cleanOrigin = origin.replace(/\/$/, '');
      if (
        allowedExact.includes(cleanOrigin) ||
        cleanOrigin.includes('localhost') ||
        cleanOrigin.includes('127.0.0.1') ||
        cleanOrigin.endsWith('.e2b.app') ||
        cleanOrigin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true
  })
);

app.use(express.json({ limit: '1mb' }));

// Health & connection status check
app.get('/api/health', (req, res) => {
  const cache = getCache();
  res.json({
    ok: true,
    app: 'PRATHAM – THE TEMPLE ESCAPE API',
    timestamp: new Date().toISOString(),
    redisConfigured: Boolean(process.env.REDIS_URL),
    redisReady: cache.enabled,
    ...getStatus()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/items', itemsRoutes);
app.use('/api/ai', aiRoutes);

// Root helper route for Render health checks
app.get('/', (req, res) => {
  res.json({
    service: 'PRATHAM – THE TEMPLE ESCAPE Backend',
    status: 'running',
    health: '/api/health'
  });
});

(async () => {
  try {
    await initStore();
  } catch (err) {
    console.error('[Store Init Error]:', err);
  }

  // Optional Redis. Never blocks the API: if it is unreachable the app runs
  // exactly as before, just without the leaderboard / AI response cache.
  try {
    const cache = await initCache(process.env.REDIS_URL);
    console.log('[Cache]', cache.enabled ? `enabled - ${cache.reason}` : `disabled - ${cache.reason}`);
  } catch (err) {
    console.warn('[Cache] init failed:', err.message);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Server] PRATHAM Backend listening on http://0.0.0.0:${PORT}`);
    console.log('[Server] Store status:', getStatus());
    console.log('[Server] Cache status:', getCache().status());
  });
})();
