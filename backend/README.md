# TEL Laundry — backend

Express 5 + PostgreSQL (`pg`). Plain SQL migrations, so the same schema runs on local
PostgreSQL 12+ and on Supabase.

## Setup (local PostgreSQL)

Run everything from the `backend/` folder:

```bash
npm install
cp .env.example .env          # then put your postgres password in DATABASE_URL
npm run db:migrate            # creates the database if missing, applies db/migrations/*.sql
npm run db:seed               # demo data from db/seed-data.js  (db:reset wipes and reseeds)
npm run dev                   # API on http://localhost:3001 (the frontend dev server proxies /api to it)
npm test                      # API regression tests; needs the server running on a seeded DB
```

## Moving to Supabase

1. Create the project, then set in `.env`:
   ```
   DATABASE_URL=postgres://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:6543/postgres
   DB_SSL=true
   ```
2. `npm run db:migrate` — the migration file is Supabase-compatible as is (or paste it into the SQL editor).
3. Things deliberately left for that step:
   - **Auth**: `staff` has no `auth_user_id` yet; the API trusts an `x-actor` header for the audit trail.
   - **Storage**: photos are stored as data URLs in `orders.*_photo` / `complaints.photos`. Move to
     Supabase Storage and keep only paths.
   - **RLS**: not enabled — the Express API is the only client. Enable RLS if the browser ever talks
     to Supabase directly.
   - **Scheduler**: call `POST /api/maintenance/purge-photos` daily (photos are removed 30 days after
     payment verification).

## Data model

| Table | Notes |
|---|---|
| `branches` | `main` only today; every customer/order/ticket carries `branch_id` |
| `staff` | owner / attendant / rider |
| `customers` | structured `address` + optional `delivery_address` (jsonb), `pin_hash` (scrypt), unique contact per branch |
| `orders` | id `TEL-MMDDYY-XXXX` issued by the database (`order_seq`, Manila date), status, handover, payment, photos |
| `order_items` | one row per package, each with its own instruction (≤150 chars) |
| `order_events` | audit trail of status/payment/rider changes |
| `complaints` | Issue / Follow-up tickets linked to an order, with photos and assignee |

## API

| Method & path | Purpose |
|---|---|
| `GET /api/health` · `GET /api/staff?role=` · `GET /api/dashboard` | meta + owner exception queue |
| `GET/POST /api/customers` · `GET/PATCH /api/customers/:id` · `POST /api/customers/login` | directory, PIN sign-in |
| `GET/POST /api/orders` · `GET /api/orders/:id` | list (FIFO, filters), create, detail + events |
| `POST /api/orders/:id/assign` `{riderId}` | dispatch a rider |
| `POST /api/orders/:id/advance` `{weightKg?, price?}` | next status, enforcing the gates below |
| `POST /api/orders/:id/cancel` · `/abort` `{reason}` · `/return` `{reason}` · `/resume` | outcomes |
| `POST /api/orders/:id/payment` `{method, gcashRef?, receiptUrl?}` | log a payment / upload a receipt |
| `POST /api/orders/:id/verify-payment` · `/reject-cash` `{shortage}` · `/reject-receipt` `{reason}` | verification |
| `PUT/DELETE /api/orders/:id/delay` · `POST …/delay/notified` | next-day exception |
| `PUT /api/orders/:id/photos/:kind` `{dataUrl}` | `bag` · `ref` · `proof` · `receipt` |
| `GET/POST /api/complaints` · `PATCH /api/complaints/:id` | tickets |
| `POST /api/maintenance/purge-photos` | 30-day photo retention |

Rules enforced by `advance` (see `domain.js`, mirrors `frontend/src/utils/helpers.js`):
a Picked Up order must be weighed; Leave-at-Lobby orders must be paid and verified before they go
out for delivery; Delivered orders need a logged payment before verification; Completed needs a
verified payment.

Errors are `{ "error": "message" }` with 400 (validation), 401, 404, 409 (rule violated) or 500.
