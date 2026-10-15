# TEL Laundry — Pick-up, Delivery & Complaint Handling

Two independent packages, each with its own `package.json` and `node_modules`:

| Folder | What | Stack |
|---|---|---|
| [frontend/](frontend/) | Staff + customer web app | React 18, Vite, Tailwind |
| [backend/](backend/) | REST API and database schema | Express 5, PostgreSQL (`pg`), Supabase-ready |
| [doc/](doc/) | Process flow, requirements and project documents | — |

## Two ways to run the frontend

| Mode | Data | Backend needed | Use for |
|---|---|---|---|
| **prototype** (default) | Sample data kept in the visitor's browser (localStorage) | No | Client demos — this is what Netlify deploys |
| **api** | PostgreSQL through the Express API; refreshes every 15 s | Yes | Real use / development of the backend |

```bash
cd frontend && npm install

npm run dev            # prototype mode  -> http://localhost:5173
npm run dev:api        # api mode        -> needs the backend running (below)

npm run build:prototype   # static bundle for Netlify
npm run build:api         # bundle that calls the API (set VITE_API_URL in frontend/.env.api)
```

A small badge in the corner of every screen says which mode is running
("Prototype · sample data saved in this browser only" or "Live · connected to server").
Staff area: open `/#staff` (it is not linked from the customer pages).

## Backend (api mode)

```bash
cd backend && npm install
cp .env.example .env                  # set the postgres password
npm run db:migrate && npm run db:seed
npm run dev                           # http://localhost:3001
npm test                              # API regression tests (needs the server + a seeded DB)
```

Details, data model and the local-Postgres → Supabase steps: [backend/README.md](backend/README.md).

## Deploying the prototype to Netlify

[netlify.toml](netlify.toml) is already set up: connect the repository and deploy — it builds
`frontend/` with `npm run build:prototype` and publishes `frontend/dist` with an SPA fallback.
No environment variables or backend are needed. Every visitor gets their own copy of the demo
data; "Reset demo data" in the staff sidebar restores it.

## Tests

```bash
cd frontend
npx playwright install chromium       # once (or set PW_CHANNEL=msedge to use installed Edge)
npm run test:e2e                      # prototype-mode UI tests
npm run test:e2e:api                  # backend-mode UI tests (backend + seeded DB running)
```

Root helpers (no dependencies of their own): `npm run install:all`, `dev:frontend`,
`dev:frontend:api`, `dev:backend`, `build:frontend`, `db:migrate`, `db:seed`, `test:backend`, `test:e2e`.
