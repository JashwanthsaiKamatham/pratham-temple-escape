# Deploying PRATHAM

Everything is committed and ready to push. Two services, one repo.

## 0. Push the repo to GitHub

The local repo already exists at `/home/user` with a single clean commit
(`8980a8f`, 47 tracked files, no `.env`).

Create an empty GitHub repo, then:

```bash
cd /home/user
git remote add origin https://<TOKEN>@github.com/<user>/pratham-temple-escape.git
git branch -M main
git push -u origin main
```

## 1. Backend → Render

### Option A — one click with the blueprint (recommended)

`render.yaml` in the repo root declares the web service **and** the Key Value
instance. Render wires `REDIS_URL` automatically from the cache's internal
connection string, so you never paste that URL.

1. Render Dashboard → **New** → **Blueprint**
2. Pick `JashwanthsaiKamatham/pratham-temple-escape`
3. Render prompts for the 8 secrets (`SUPABASE_*`, `GEMINI_API_KEY`,
   `JWT_SECRET`, `CLIENT_URL`) — paste the values from `server/.env`
4. Apply

### Option B — configure by hand

| Setting | Value |
| --- | --- |
| Root directory | `server` |
| Build command | `npm install` |
| Start command | `node index.js` |
| Health check path | `/api/health` |
| Instance | Free tier is fine |

Environment variables:

```
SUPABASE_URL=https://frocjukoxbiufzenpnxf.supabase.co
SUPABASE_ANON_KEY=<from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<from Supabase dashboard>
DATABASE_URL=postgresql://postgres.frocjukoxbiufzenpnxf:<DBPASSWORD>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
SUPABASE_DB_PASSWORD=<DBPASSWORD>
SUPABASE_REGION=ap-south-1
SUPABASE_ACCESS_TOKEN=<sbp_ token>
GEMINI_API_KEY=<gemini key>
GEMINI_MODELS=gemini-3.5-flash,gemini-3.1-flash-lite,gemini-flash-latest,gemini-3.8-flash,gemini-3.7-flash
JWT_SECRET=<openssl rand -hex 32>
CLIENT_URL=https://<vercel app>.vercel.app
REDIS_URL=redis://red-dbr83b5g1s2s73fn8kq0:6379
PORT=10000
```

> `REDIS_URL` is the **internal** URL from your Render Key Value instance. It only
> resolves from services inside your Render account — that is expected, and it is
> why it could not be tested from the build sandbox. Use the *external* URL
> (`rediss://…`) only if you need to reach the cache from your own machine.

Notes:
- Render can reach Supabase over Postgres directly, so `DATABASE_URL` should let the
  boot migration apply `schema.sql` by itself. The sandbox here could not resolve the
  pooler hostname; that restriction does not apply to Render. If it fails anyway, the
  Management API path (`SUPABASE_ACCESS_TOKEN`) still provisions the tables.
- Verify with `curl https://<service>.onrender.com/api/health` — expect
  `{"ok":true,"mode":"supabase","supabaseReady":true,"geminiConfigured":true}`.

## 2. Frontend → Vercel

| Setting | Value |
| --- | --- |
| Root directory | `client` |
| Framework preset | Vite |
| Build command | `npm run build` |
| Output directory | `dist` |
| Env var | `VITE_API_BASE_URL=https://<service>.onrender.com` |

`client/vercel.json` already rewrites SPA routes.

## 3. Close the loop

1. Set `CLIENT_URL` on Render to the Vercel domain (CORS), redeploy if needed.
2. Redeploy Vercel so `VITE_API_BASE_URL` is baked into the new bundle.
3. Open the Vercel URL: the Hub "Platform" panel should read
   **Backend API: connected**, **Database: Supabase Postgres**, **Gemini AI: connected**.

## 4. Rotate exposed secrets

The Supabase DB password and the `sbp_` access token were pasted in chat. Before or
right after the first deploy:

1. Supabase → Project Settings → Database → **Reset database password**, then update
   `SUPABASE_DB_PASSWORD` / `DATABASE_URL` on Render.
2. Supabase → Account → Access Tokens → revoke the old token, create a new one.
3. Rotate the Gemini key in Google AI Studio if it was ever shared.
