# TEL Laundry — Ops Prototype

A front-end-only clickable prototype for the laundry shop's pickup, delivery, and
complaint-handling workflow. No backend, no database — all data is seed data held
in React state for the session (see `src/data/seedData.js`). Its purpose is to
validate the workflow and screens with the owner/staff before investing in a real
backend.

See `TEL_Laundry_Ops_Requirements.md` (delivered alongside this project) for the
full requirements this prototype implements.

## Stack

- React 18 + Vite
- Tailwind CSS (utility classes only, no custom config)
- lucide-react for icons

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL Vite prints (defaults to http://localhost:5173).

To build a static production bundle:

```bash
npm run build
npm run preview
```

## Project structure

```
tel-laundry-ops/
├── index.html
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── src/
    ├── main.jsx              # React entry point
    ├── App.jsx                # Top-level state + view routing
    ├── index.css               # Tailwind directives
    ├── data/
    │   └── seedData.js         # All mock data: customers, orders, riders, complaints
    ├── utils/
    │   └── helpers.js          # nextStatus(), personName()
    └── components/
        ├── Nav.jsx                   # Responsive nav: desktop sidebar, mobile drawer + bottom bar
        ├── Toast.jsx                 # Lightweight success feedback toast
        ├── Badge.jsx                 # Small status pill
        ├── StatCard.jsx              # Dashboard KPI card
        ├── Dashboard.jsx             # Owner monitoring view
        ├── DispatchBoard.jsx         # Kanban (desktop) / filtered list (mobile) order board
        ├── NewOrder.jsx              # Customer lookup + order intake, supports prefill from registration
        ├── CustomerRegistration.jsx  # Standalone customer registration form with validation
        ├── Customers.jsx             # Searchable customer directory (table on desktop, cards on mobile)
        ├── RiderView.jsx             # Per-rider job list, proof photo, payment collection
        ├── Payments.jsx              # Cash/GCash log with manual verification
        └── Complaints.jsx            # Complaint tickets linked to orders
```

## Responsive design

- **Desktop (md and up, ≥768px):** fixed left sidebar navigation, dispatch board renders as a full Kanban with horizontal scroll, directory/payments render as tables.
- **Mobile (<768px):** sticky top bar with a slide-in drawer for full navigation, plus a 5-item bottom quick-access bar (Dashboard, Board, New order, Rider, Complaints); dispatch board becomes a status filter + single-column list; directory/payments render as stacked cards instead of tables. All primary actions (buttons, selects) use larger tap targets on mobile.

## Customer registration

`CustomerRegistration.jsx` is a dedicated, validated intake form (required name/contact/pick-up address, duplicate-contact check) separate from placing an order. After saving, staff can jump straight into creating that customer's first order (pre-filled) or register another customer. It's reachable from the sidebar/drawer nav and from a "Register customer" button on the Customers directory page.

## Where this plugs into a real backend later

Every state mutation lives in `App.jsx` as a plain function
(`advanceOrder`, `assignRider`, `markVerified`, `addOrder`, `addComplaint`,
`updateComplaint`). To connect a real backend, these become API calls
(e.g. `PATCH /orders/:id/status`) instead of `setOrders(...)`, and
`src/data/seedData.js` is replaced by an initial fetch. The component tree
and props don't need to change.

## Known simplifications (see requirements doc §9–10)

- No authentication or real per-role login — "Rider view" lets you switch
  between riders with a dropdown to simulate different phones/logins.
- GCash payment verification is a manual "Mark verified" button, not a real
  API/webhook check.
- Route optimization for delivery grouping is not implemented — orders are
  just listed per rider.
