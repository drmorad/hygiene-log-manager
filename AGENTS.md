# AGENTS.md

Compact guidance for working in the Rewaya Hygiene Log Manager repo. Trust the
executable config/scripts over prose when they conflict.

## Stack & layout
- pnpm workspace (Node 24). Packages live under `artifacts/*` and `lib/*`.
- Real app pieces (deployable):
  - `artifacts/api-server` — Express 5 API, needs PostgreSQL + Drizzle. Listens on `PORT` (required). Entry `dist/index.mjs`.
  - `artifacts/web-app` — React + Vite + TS staff/director UI. Points at API via `VITE_API_URL`.
  - `artifacts/mobile` — Expo app (iOS/Android/web). Native client for the same API.
- Non-app pieces:
  - `artifacts/mockup-sandbox` — Replit component-preview gallery, NOT the live app. Ignore for features.
  - `lib/db` — Drizzle schema (`src/schema/index.ts`) + `drizzle.config.ts`. `pnpm --filter @workspace/db run push` migrates.
  - `lib/api-spec`, `lib/api-zod`, `lib/api-client-react` — OpenAPI/codegen libs.

## Commands
- Install (must use pnpm, NOT npm/yarn):
  `pnpm install`  (root has a `preinstall` that enforces pnpm via a cross-platform node script)
- API: `pnpm --filter @workspace/api-server run dev` (port 5000); `build` runs esbuild bundle to `dist/index.mjs`.
- Web: `cd artifacts/web-app && pnpm dev` (port 3000, proxies `/api` -> localhost:5000). `pnpm run build` -> `dist/`.
- Mobile: `cd artifacts/mobile && pnpm exec expo start`. API URL resolves from `EXPO_PUBLIC_API_URL` -> `app.json` `extra.apiUrl` -> dev fallback `/api-server/api`.
- DB migrate (required before API works): `pnpm --filter @workspace/db run push`.
- Typecheck: root `pnpm run typecheck` (builds libs then typechecks artifacts/scripts).

## Deployment (verified configs present)
- `render.yaml` — Render Blueprint: API web service + free Postgres. Build runs `corepack enable && pnpm install --frozen-lockfile && pnpm --filter @workspace/api-server run build`; start `node artifacts/api-server/dist/index.mjs`. After first deploy, run the DB `push` once (Render Shell or locally with `DATABASE_URL`).
- `netlify.toml` — web-app: base `artifacts/web-app`, publish `dist`, sets `VITE_API_URL`. SPA redirect `/* -> /index.html` included.
- `artifacts/mobile/eas.json` — EAS build profiles (preview/production) inject `EXPO_PUBLIC_API_URL`. `artifacts/mobile/.env` is gitignored but the URL is also baked into `app.json`, so builds connect without it.
- See `DEPLOY.md` for the full click-by-click flow.

## Quirks & gotchas
- API CORS is open (`origin: true`) so both the web UI and mobile app can call it cross-origin.
- First run auto-seeds a Director: username `director`, password `Rewaya@2024` (forced password change on first login).
- Mobile `AppContext` is the source of truth for logs: it writes to AsyncStorage AND pushes to the API (`apiPost`/`apiDelete`), and pulls the selected hotel's logs on launch via `syncFromServer()`. Don't assume logs live only server-side.
- The API `build.mjs` externalizes many native modules; `pg` is pure-JS and bundles fine.
- PowerShell on the dev machine blocks `*.ps1` (npm/pnpm) by default — run
  `Set-ExecutionPolicy -Scope Process Bypass -Force` in the SAME command line as any pnpm/npm call, or it errors with "running scripts is disabled".
- `pnpm install` on a full workspace can take several minutes; use a long timeout.

## First-login credentials (for testing)
director / Rewaya@2024 — then change password. Create managers from the Director dashboard.
