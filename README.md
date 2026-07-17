# Rewaya Hygiene Log Manager

Food-safety (HACCP / CCP) log manager for the Rewaya hotel group. Staff record
buffet temperatures, thawing, goods-received, and disinfection checks; directors
review compliance analytics and manage managers.

## Stack

- **API** — `artifacts/api-server` (Express 5, Node 24, Drizzle ORM, PostgreSQL)
- **Web app** — `artifacts/web-app` (React + Vite + TypeScript + Tailwind)
- **Mobile** — `artifacts/mobile` (Expo, optional)
- Monorepo managed with **pnpm workspaces**

## Local development

```bash
corepack enable            # enables pnpm
pnpm install

# 1) Start Postgres locally and set DATABASE_URL
export DATABASE_URL=postgres://user:pass@localhost:5432/hygiene

# 2) Push schema + run API (port 5000)
pnpm --filter @workspace/db run push
pnpm --filter @workspace/api-server run dev

# 3) In another terminal, run the web app (port 3000)
cd artifacts/web-app
pnpm dev                   # proxies /api -> http://localhost:5000
```

First run auto-creates a **Director** account:
- Username: `director`
- Password: `Rewaya@2024`  (you'll be forced to change it on first login)

## Deploy (free / low-cost)

Target: **Render** (API + DB) + **Netlify** (web app).

### 1. API on Render
- Push this repo to GitHub and create a **Blueprint** deploy using `render.yaml`.
- Render provisions the free Postgres DB and sets `DATABASE_URL` automatically.
- After the first deploy, run the schema migration once:
  ```bash
  pnpm --filter @workspace/db run push
  ```
  (or add it as a one-off job / run it locally against the Render DB URL).
- Note the API URL, e.g. `https://rewaya-hygiene-api.onrender.com`.

### 2. Web app on Netlify
- New site from Git → set **base directory** `artifacts/web-app`.
- Build command `pnpm install && pnpm run build`, publish `dist`.
- Set env var **`VITE_API_URL`** = your Render API URL (no trailing slash).
- `netlify.toml` already configures the SPA redirect.

> Free Render web services spin down after inactivity (cold start ~30–60s).
> For an always-on option, Railway or a $5 Render instance removes the delay.

## Using Supabase Postgres instead of Render DB
1. Create a free Supabase project, copy the **URI** connection string.
2. In Render, set `DATABASE_URL` manually instead of `fromDatabase`.
3. Run `pnpm --filter @workspace/db run push` against that URI.

## Mobile app (Expo) — alternative client

`artifacts/mobile` is a complete native client for iOS/Android (and web) with
login, hotel picker, the 4 CCP log screens, PDF export, a director dashboard,
and manager management. It talks to the same API as the web app.

It writes logs to local storage **and** pushes them to the API, and on launch
it pulls the selected hotel's logs from the API so they appear on any device.

### Point it at your API
The API URL is resolved in order:
1. `EXPO_PUBLIC_API_URL` env var (set in `artifacts/mobile/.env` or EAS build)
2. `extra.apiUrl` baked into `app.json`
3. dev fallback `/api-server/api` (Replit/local only)

The `.env` and `app.json` already default to
`https://rewaya-hygiene-api.onrender.com` — change if your API URL differs.

### Run / build (low-cost options)

**Option A — free, no build (recommended to start):**
```bash
cd artifacts/mobile
pnpm install
pnpm exec expo start          # scan QR with Expo Go (Android) / Camera (iOS)
```
The app connects to the live Render API via `EXPO_PUBLIC_API_URL`.

**Option B — internal APK/IPA for the team (EAS, free tier):**
```bash
pnpm exec eas login
pnpm exec eas build --profile preview --platform android   # APK for sideload
# or --platform ios (needs an Apple account; internal distribution)
```

**Option C — production store build:**
```bash
pnpm exec eas build --profile production --platform all
pnpm exec eas submit --platform all
```

> Expo's free plan covers EAS Build/Submit quotas. For a small team, Option A
> (Expo Go) or Option B (sideloaded preview APK) costs nothing.

## Project layout

```
artifacts/
  api-server/   Express API (auth, logs x4, users, analytics)
  web-app/      Staff + director web UI
  mobile/       Expo mobile app (native iOS/Android/web client)
  mockup-sandbox/  Original Replit component preview (not the live app)
lib/db/         Drizzle schema + migrations
```

## Notes
- CORS is open (`origin: true`) so both the Netlify UI and the mobile app can call the Render API.
- Sessions last 30 days; log out clears the token.
- Manager accounts are created by the director (web or mobile director dashboard).
- Logs are cached on-device and synced with the server so they show on every device.
