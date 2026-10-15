# TEL Laundry — Pick-Up, Delivery & Complaint Handling System
## Business & Functional Requirements Document (v1.0 — Prototype Phase)

---

## 1. Purpose

This document translates the current-state process review (owner-as-dispatcher model) into a requirements baseline for a system that removes the owner from the daily transaction loop. The end state is an operation that runs without the owner's direct intervention — the owner monitors, does not dispatch.

---

## 2. Problem Statement

The shop currently runs on three messaging channels (Text, Viber, FB Messenger) funneled entirely through the owner, who works a full-time job on the side. Every pickup, every delivery, every complaint, and every payment verification passes through one person, manually, in a group chat. This is not a staffing problem — the attendant and rider are capable — it's an **information-routing problem**: nobody but the owner has a system of record, so nobody but the owner can answer "where is this order" or "did this payment clear."

The system must give the attendant, the rider, and (eventually) the customer direct access to the same order record, so status updates and payment confirmations no longer require the owner as a relay.

---

## 3. Goals & Success Criteria

| Goal | Success looks like |
|---|---|
| Remove owner as manual dispatcher | New/existing customer requests create an order record directly — no retyping into a group chat |
| Remove owner as status middleman | Rider/attendant update order status themselves; customer-visible status doesn't require the owner to relay it |
| Remove owner as payment verifier-in-the-loop | Cash and GCash payments are logged at point of collection, with a lightweight verify step anyone with access can perform |
| Survive the owner going offline | Order data lives in a system, not a phone's chat thread — the shop keeps functioning if the owner has no signal |
| Give the owner a monitoring view | A dashboard replaces "scrolling through group chat" for checking on the day |
| Standardize the delay/complaint path | Same-day → next-day exceptions and complaints follow a defined workflow instead of an ad hoc reply |

Out of scope for this phase: real backend/database, real-time push notifications, actual GCash API integration, native rider mobile app, multi-branch support. These are Phase 2+ once the workflow itself is validated. This prototype is a **clickable, seed-data-driven front end** to validate the workflow and screens before investing in backend engineering.

---

## 4. Stakeholders / User Roles

| Role | Current burden | Target interaction |
|---|---|---|
| **Owner** | Dispatcher, payment verifier, complaint middleman, typist | Dashboard viewer, exception handler, payment auditor |
| **Attendant** | Weighs/logs by hand, relies on owner for job info | Sees intake queue directly, updates shop-processing status |
| **Rider** | Waits for group chat instructions, texts owner for backlog reminders | Sees own job list (pickups + deliveries) directly, marks handover/proof/payment |
| **Customer** | Must message the owner for every question | (Phase 2) Self-service status check; for now, staff answer from the system instead of relaying through owner |

---

## 5. Functional Requirements

### 5.1 Customer Management
- FR-1.1: System shall support **customer lookup by name or contact number** before creating an order (existing vs. new).
- FR-1.2: For a **new customer**, system shall capture: Full Name, Contact Number, Pick-up Address, Delivery Address (if different), Payment Mode preference (Cash/GCash), and Default Package.
- FR-1.3: For an **existing customer**, system shall auto-fill saved details into a new order, editable per order.
- FR-1.4: System shall maintain a searchable customer directory (replaces "digging through old chat history").

### 5.2 Order Intake & Pickup Dispatch
- FR-2.1: System shall support creating an order with: customer, package (Premium ₱235 / Deluxe ₱210), handover method (Personal / Condo-Lobby), requested pickup window, and channel the request came in on (Text/Viber/Messenger — for traceability).
- FR-2.2: On creation, an order enters status **New Request** and appears on a shared dispatch board — no manual retyping into a group chat.
- FR-2.3: System shall let staff **assign a rider** to a pickup, moving the order to **Assigned for Pickup**.
- FR-2.4: For **Condo/Lobby pickups**, the order record shall support attaching a **reference photo** of the laundry bag, visible to whoever is assigned the pickup — removing the "owner must be online to relay the photo" dependency.
- FR-2.5: Rider marks pickup **Picked Up** from their own job list; no need to wait for the owner to confirm.

### 5.3 Shop Processing
- FR-3.1: Attendant shall log, per order: weight (max 8kg/load flagged if exceeded), computed price, and move the order into the **wash → dry → fold** queue.
- FR-3.2: Orders are processed **FIFO**; the board shall reflect processing order/age so nothing silently sits.
- FR-3.3: If shop volume prevents same-day completion, staff shall be able to flag an order **Delayed → Next-Day**, which is a defined state (not an "optional" text message) and is visible to the customer-facing status.

### 5.4 Delivery Dispatch
- FR-4.1: System shall support **grouping ready orders by area/route** for a rider's delivery run.
- FR-4.2: For **Personal Handover**, rider marks **Delivered** after handoff.
- FR-4.3: For **Condo/Lobby drop-off**, rider shall attach a **proof-of-delivery photo** directly to the order — no relaying through the owner to the customer.
- FR-4.4: Delayed/next-day orders shall carry their delay reason and new ETA on the record so any staff member (not just the owner) can answer a status question.

### 5.5 Payments
- FR-5.1: For **Cash**, rider logs amount collected against the order at handover; this replaces the paper logbook with a digital entry (still reconciled physically for now, but with a record the owner can review remotely).
- FR-5.2: For **GCash**, whoever collects payment (rider or, for lobby drop-offs, the customer directly) logs the **reference number (last 4 digits)** and payment date against the order.
- FR-5.3: Orders shall carry a payment status: **Unpaid → Pending Verification → Verified**. Any authorized staff (not only the owner) can mark **Verified** once checked — this is the hook where real GCash API verification plugs in later.
- FR-5.4: A **cash/GCash log view** shall let the owner audit the day's collections remotely, replacing "physically checking the logbook."

### 5.6 Complaint & Follow-up Handling
- FR-6.1: A customer inquiry or complaint (regardless of source channel) shall be logged as a **ticket linked to its order** — not just a forwarded chat message.
- FR-6.2: Tickets carry a status: **Open → In Progress → Resolved**, and can be assigned to the rider or attendant directly, removing the owner's tag-and-wait-and-relay role.
- FR-6.3: Whoever is assigned can post a status update/resolution note directly on the ticket, viewable by the owner without a chat search.
- FR-6.4: The owner's dashboard shall surface **open/overdue tickets** as an exception queue — this is where the owner's attention should go, instead of every message.

### 5.7 Owner Dashboard & Monitoring
- FR-7.1: System shall show, at a glance: orders by status today, pending pickups, orders out for delivery, open complaints, and payments pending verification.
- FR-7.2: Dashboard shall flag exceptions requiring owner attention (e.g., delayed orders with no customer notice logged, complaints open > SLA, payments pending verification > 24h).
- FR-7.3: The dashboard is a **monitoring view, not an action queue** — day-to-day actions belong to attendant/rider, by design.

---

## 6. Non-Functional Requirements

- NFR-1 (Resilience): Order data must not live solely in a phone chat thread — the record must be accessible to staff even if the owner has no signal. *(In this prototype: seed data lives in the front end; production would move this to a shared backend/DB.)*
- NFR-2 (Role clarity): Each role sees only what's actionable for them (rider sees jobs, attendant sees queue, owner sees everything + exceptions) — prevents reverting to "everything goes through one inbox."
- NFR-3 (Traceability): Every order retains its intake channel, handover method, and payment trail for audit.
- NFR-4 (Usability): Screens must be usable by non-technical staff (attendant, rider) with minimal training — mirrors how simple the group-chat workflow felt to use, but structured.
- NFR-5 (Scalability path): Data model should not hard-code a single shop — supports the stated goal of scaling to multiple branches later.

---

## 7. Proposed Order Status Lifecycle

```
New Request → Assigned for Pickup → Picked Up → In Shop (Wash/Dry/Fold)
→ Ready for Delivery → Out for Delivery → Delivered → Payment Verification → Completed
```
Exception branches: **Delayed → Next-Day** (from In Shop), **Complaint/Follow-up** (attachable at any status).

*(See the accompanying process flow diagrams for the visual pickup, delivery, and complaint-handling flows.)*

---

## 8. Core Data Entities (for the prototype's seed data)

- **Customer**: id, name, contact, pickup address, delivery address, payment mode, default package, customer since
- **Order**: id, customer id, status, package, weight, price, handover method, pickup/delivery channel, assigned rider, proof photo flag, payment status, payment method, GCash ref (last 4), delay flag/reason, timestamps
- **Rider**: id, name, active job count
- **Complaint/Ticket**: id, linked order id, channel, message, status, assigned to, response, timestamps

---

## 9. Assumptions & Constraints

- Package pricing is fixed for this phase: Premium ₱235 / Deluxe ₱210, max 8kg/load.
- This is a **front-end-only clickable prototype** — no persistence beyond the session, no real authentication, no real payment verification. It exists to validate the workflow with the owner/staff before backend investment.
- GCash verification remains a manual "mark as verified" action in this phase; real-time API verification is a Phase 2 item.
- Multi-channel intake (Text/Viber/Messenger) is logged as metadata on the order in this phase; actual chat-platform integration (auto-creating orders from a Messenger message) is Phase 2.

---

## 10. Phase 2 Candidates (explicitly deferred)

- Backend + database, multi-user auth per role
- Customer self-service status check (SMS/chat bot or portal)
- Real GCash payment verification via API/webhook
- Automated route optimization for riders
- Push/SMS notifications to customers at each status change
- Multi-branch support and cross-branch reporting
