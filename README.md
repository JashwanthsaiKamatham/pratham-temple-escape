# PRATHAM – THE TEMPLE ESCAPE

A playable **3D endless runner** plus a **full-stack cloud platform**: React + Tailwind + Three.js on the
front end, Node.js + Express + Supabase on the back end, and Google Gemini for the in-app Temple Oracle.

```
client/   React + Vite + Tailwind + Three.js  (everything the player sees)
server/   Express API, bcrypt auth, Supabase persistence, Gemini proxy (all secrets live here)
```

## Run locally

```bash
# 1. backend
cd server
npm install
cp .env.example .env      # fill in keys when you have them
node index.js             # http://localhost:5000

# 2. frontend (new terminal)
cd client
npm install
npx vite --host 0.0.0.0 --port 5173   # http://localhost:5173
```

The dev server proxies `/api/*` to `http://127.0.0.1:5000`, so no CORS setup is needed locally.
Without Supabase keys the API automatically falls back to a local JSON store
(`server/data/local_db.json`) so the whole app is playable immediately.

## Controls

| Action | Desktop | Mobile |
| --- | --- | --- |
| Switch lane | `←` `→` | swipe left / right |
| Junction turn | `←` `→` when the prompt appears | swipe left / right |
| Jump | `↑` / `W` / `Space` | tap or swipe up |
| Slide | `↓` / `S` | swipe down |
| Pause | `P` / `Esc` | pause button |
| Mute | `M` | speaker button |

## Game systems

* **PRATHAM**, a fully rigged low-poly hero — jacket panels, scarf, running shoes, trekking backpack,
  and 5 unlockable outfits (Classic, Royal, Shadow, Jungle, Solar) that recolour the live 3D model.
* **Six biomes** streamed as the run progresses: ancient gopuram temple, sacred jungle, chasm bridges,
  waterfalls and river, crystal caverns, and ruined tunnels — each with its own sky, fog, lighting and props.
* **Obstacles**: wooden barriers, low beams, spike pits, falling boulders, fire traps, rockfalls,
  pendulum blades, broken bridges and bottomless gaps.
* **Junction turns** with a 90° arc; swipe the correct direction before the bend or the temple guardian
  catches you.
* **Power-ups**: Coin Magnet, Speed Boost, Sacred Shield, 2× Gold and Garuda Flight.
* **Rewards**: gold coins, diamonds, score, distance and outfit unlocks, all synced to the cloud.
* **Audio** is synthesised with the Web Audio API (tabla + bansuri-inspired loop, coin chimes,
  jump/slide whooshes, guardian roars) — no audio files to download.

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | status + which store/Gemini mode is active |
| `POST` | `/api/auth/signup` | create profile (bcrypt hash, 30-day JWT) |
| `POST` | `/api/auth/login` | log in |
| `GET` | `/api/auth/me` | restore session across devices |
| `GET` | `/api/game/leaderboard` | public high-score board |
| `PUT` | `/api/game/sync` | save a finished run |
| `POST` | `/api/game/unlock-outfit` | buy an outfit with coins/diamonds |
| `POST` | `/api/game/equip-outfit` | equip an owned outfit |
| `GET/POST` | `/api/items` | list / create the user's own chronicles |
| `PUT/DELETE` | `/api/items/:id` | update / delete own chronicle |
| `POST` | `/api/ai/generate` | Gemini call (server-side key only), with hedging + local fallback |

Every `/api/items` query is scoped by `user_id`, and Supabase RLS policies enforce the same rule in the
database.

### How the Oracle stays fast and always answers

Google's Flash models swing between ~4 s and >60 s depending on load, and bursty
free-tier traffic returns `503` / `429` for minutes at a time. A sequential fallback
chain therefore either feels broken or takes ~50 s. Instead `routes/ai.js` runs a
**hedged race**:

* the first model in `GEMINI_MODELS` starts immediately;
* if it has not answered after 2.4 s, the next model starts **alongside** it;
* a `503` / `429` / `500` triggers the next model in 120 ms rather than waiting;
* the first successful answer wins and the rest are abandoned;
* a hard `401` / `403` aborts straight away (the key is bad);
* if nothing answers within 16 s, the deterministic local Temple Oracle replies, so
  the UI never hangs or shows an error.

Typical observed latency: **4–11 s** with a live model, **<100 ms** on fallback.

## Environment (`server/.env`)

```
PORT=5000
CLIENT_URL=http://localhost:5173
JWT_SECRET=change-me
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
# either of these lets the server create the tables/RLS automatically:
DATABASE_URL=
SUPABASE_ACCESS_TOKEN=
GEMINI_API_KEY=
```

`server/db/migrate.js` runs the idempotent DDL in `server/db/schema.sql` (uuid-ossp, `profiles`, `items`,
RLS policies) on boot as soon as Supabase credentials are present — no manual SQL needed.

## Deploy

Two independent services, one repo.

**1. Backend → Render**

| Setting | Value |
| --- | --- |
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `node index.js` |
| Health check | `/api/health` |

Environment variables (Render → Environment):

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
SUPABASE_DB_PASSWORD=...
SUPABASE_REGION=ap-south-1
SUPABASE_ACCESS_TOKEN=sbp_...
GEMINI_API_KEY=...
GEMINI_MODELS=gemini-3.5-flash,gemini-3.1-flash-lite,gemini-flash-latest,gemini-3.8-flash,gemini-3.7-flash
JWT_SECRET=<long random string>
CLIENT_URL=https://<your-app>.vercel.app
PORT=10000
```

> Render can reach Supabase over Postgres directly, unlike some restricted sandboxes —
> set `DATABASE_URL` and the boot migration applies `schema.sql` itself. If the pooler
> hostname fails to resolve, fall back to the Management API by supplying
> `SUPABASE_ACCESS_TOKEN` (already supported).

**2. Frontend → Vercel**

| Setting | Value |
| --- | --- |
| Root directory | `client` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Env var | `VITE_API_BASE_URL=https://<your-service>.onrender.com` |

`client/vercel.json` rewrites the SPA routes so deep links work.

**3. Wire them together**

Deploy Render first (Vercel needs its URL), then set `CLIENT_URL` on Render to the
Vercel domain so CORS allows the browser calls. Finally redeploy Vercel so
`VITE_API_BASE_URL` is baked into the bundle.

`.gitignore` excludes `.env`, `node_modules` and `dist` — no secret ever ships to the
front end, and the Gemini key never reaches the browser (all AI calls proxy through
`POST /api/ai/generate`).
