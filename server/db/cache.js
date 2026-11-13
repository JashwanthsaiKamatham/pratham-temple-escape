/**
 * Minimal RESP2 Redis client.
 *
 * The backend only needs a handful of commands (GET / SET / DEL / PING), so a
 * ~150 line client beats pulling a dependency tree. Works with plain
 * `redis://` links as well as `rediss://` (TLS) ones — Render's *external*
 * Key Value URLs are TLS, while the internal form is plain.
 *
 * Everything degrades gracefully: if REDIS_URL is unset or the server is
 * unreachable, `cache` reports `enabled: false` and every call becomes a no-op
 * so the API keeps working.
 */

const net = require('net');
const tls = require('tls');
const { URL } = require('url');

const CONNECT_TIMEOUT_MS = 4000;
const COMMAND_TIMEOUT_MS = 2500;

class RedisLink {
  constructor(urlString) {
    const u = new URL(urlString);
    if (u.protocol !== 'redis:' && u.protocol !== 'rediss:') {
      throw new Error(`Unsupported Redis protocol: ${u.protocol}`);
    }
    this.useTls = u.protocol === 'rediss:';
    this.host = u.hostname;
    this.port = Number(u.port || 6379);
    this.username = decodeURIComponent(u.username || '');
    this.password = decodeURIComponent(u.password || '');
    this.db = u.pathname && u.pathname.length > 1 ? Number(u.pathname.slice(1)) || 0 : 0;

    this.socket = null;
    this.connected = false;
    this.connecting = null;
    this.buffer = Buffer.alloc(0);
    this.pending = [];
    this.lastError = null;
  }

  get label() {
    return `${this.host}:${this.port}${this.useTls ? ' (tls)' : ''}`;
  }

  connect() {
    if (this.connected) return Promise.resolve(true);
    if (this.connecting) return this.connecting;

    this.connecting = new Promise((resolve) => {
      const onReady = async () => {
        this.connected = true;
        try {
          if (this.password) {
            const authArgs = this.username ? ['AUTH', this.username, this.password] : ['AUTH', this.password];
            await this.command(authArgs);
          }
          if (this.db) await this.command(['SELECT', String(this.db)]);
          resolve(true);
        } catch (err) {
          this.lastError = err.message;
          this.destroy();
          resolve(false);
        }
      };

      const socket = this.useTls
        ? tls.connect({ host: this.host, port: this.port, servername: this.host, rejectUnauthorized: false })
        : net.connect({ host: this.host, port: this.port });

      socket.setNoDelay(true);

      // socket.setTimeout() only fires on an *idle* socket, so a host that
      // never resolves would hang forever. Use an explicit deadline instead.
      const deadline = setTimeout(() => {
        if (!this.connected) {
          this.lastError = 'connect timeout';
          this.connecting = null;
          socket.removeListener('error', onError);
          socket.destroy();
          resolve(false);
        }
      }, CONNECT_TIMEOUT_MS);

      const clearDeadline = () => clearTimeout(deadline);

      const onError = (err) => {
        clearDeadline();
        this.lastError = err.message;
        this.connected = false;
        this.connecting = null;
        this.failAllPending(err);
        resolve(false);
      };

      socket.once('error', onError);
      socket.on('close', () => {
        clearDeadline();
        const wasConnecting = this.connecting !== null;
        this.connected = false;
        this.connecting = null;
        this.failAllPending(new Error('connection closed'));
        if (wasConnecting) resolve(false);
      });
      socket.on('data', (chunk) => this.onData(chunk));
      socket.once(this.useTls ? 'secureConnect' : 'connect', () => {
        clearDeadline();
        onReady();
      });

      this.socket = socket;
    });

    return this.connecting;
  }

  failAllPending(err) {
    const queued = this.pending;
    this.pending = [];
    queued.forEach((p) => p.reject(err));
  }

  destroy() {
    this.connected = false;
    this.connecting = null;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
  }

  onData(chunk) {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    for (;;) {
      const parsed = parseReply(this.buffer, 0);
      if (!parsed) return;
      this.buffer = this.buffer.slice(parsed.offset);
      const p = this.pending.shift();
      if (!p) return;
      if (parsed.error) p.reject(parsed.error);
      else p.resolve(parsed.value);
    }
  }

  send(args) {
    const parts = [`*${args.length}\r\n`];
    for (const a of args) {
      const s = String(a);
      parts.push(`$${Buffer.byteLength(s)}\r\n${s}\r\n`);
    }
    this.socket.write(parts.join(''));
  }

  command(args) {
    return this.connect().then((ok) => {
      if (!ok) throw new Error(this.lastError || 'not connected');
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          const idx = this.pending.findIndex((p) => p.resolve === resolve);
          if (idx >= 0) this.pending.splice(idx, 1);
          reject(new Error('command timeout'));
        }, COMMAND_TIMEOUT_MS);

        this.pending.push({
          resolve: (v) => {
            clearTimeout(timer);
            resolve(v);
          },
          reject: (e) => {
            clearTimeout(timer);
            reject(e);
          }
        });
        try {
          this.send(args);
        } catch (err) {
          clearTimeout(timer);
          reject(err);
        }
      });
    });
  }
}

function parseReply(buf, offset) {
  if (offset >= buf.length) return null;
  const type = String.fromCharCode(buf[offset]);
  const eol = buf.indexOf('\r\n', offset);
  if (eol === -1) return null;
  const line = buf.slice(offset + 1, eol).toString('utf8');
  const next = eol + 2;

  if (type === '+') return { value: line, offset: next };
  if (type === '-') return { error: new Error(line), offset: next };
  if (type === ':') return { value: Number(line), offset: next };
  if (type === '$') {
    const len = Number(line);
    if (len === -1) return { value: null, offset: next };
    if (buf.length < next + len + 2) return null;
    return { value: buf.slice(next, next + len).toString('utf8'), offset: next + len + 2 };
  }
  if (type === '*') {
    const count = Number(line);
    if (count === -1) return { value: null, offset: next };
    let cursor = next;
    const arr = [];
    for (let i = 0; i < count; i++) {
      const item = parseReply(buf, cursor);
      if (!item) return null;
      if (item.error) return { error: item.error, offset: item.offset };
      arr.push(item.value);
      cursor = item.offset;
    }
    return { value: arr, offset: cursor };
  }
  return { value: line, offset: next };
}

/**
 * Public cache facade used by the routes/store.
 */
class Cache {
  constructor() {
    this.link = null;
    this.enabled = false;
    this.reason = 'REDIS_URL is not set';
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
  }

  async init(urlString) {
    if (!urlString) return this;
    try {
      this.link = new RedisLink(urlString);
      const ok = await this.link.connect();
      if (ok) {
        await this.link.command(['PING']);
        this.enabled = true;
        this.reason = `Connected to ${this.link.label}`;
      } else {
        this.enabled = false;
        this.reason = `Unreachable: ${this.link.lastError || 'unknown error'}`;
        this.link.destroy();
        this.link = null;
      }
    } catch (err) {
      this.enabled = false;
      this.reason = err.message;
      this.link = null;
    }
    return this;
  }

  async get(key) {
    if (!this.enabled || !this.link) return null;
    try {
      const v = await this.link.command(['GET', key]);
      if (v === null) this.misses += 1;
      else this.hits += 1;
      return v;
    } catch {
      this.errors += 1;
      return null;
    }
  }

  async set(key, value, ttlSeconds) {
    if (!this.enabled || !this.link) return false;
    try {
      if (ttlSeconds) await this.link.command(['SET', key, value, 'EX', String(ttlSeconds)]);
      else await this.link.command(['SET', key, value]);
      return true;
    } catch {
      this.errors += 1;
      return false;
    }
  }

  async del(...keys) {
    if (!this.enabled || !this.link || !keys.length) return false;
    try {
      await this.link.command(['DEL', ...keys]);
      return true;
    } catch {
      this.errors += 1;
      return false;
    }
  }

  async getJson(key) {
    const raw = await this.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async setJson(key, obj, ttlSeconds) {
    try {
      return await this.set(key, JSON.stringify(obj), ttlSeconds);
    } catch {
      return false;
    }
  }

  status() {
    return {
      enabled: this.enabled,
      reason: this.reason,
      hits: this.hits,
      misses: this.misses,
      errors: this.errors
    };
  }
}

module.exports = { Cache, RedisLink, parseReply };
