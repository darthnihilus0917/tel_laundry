import { Router } from "express";
import { query } from "../db/pool.js";
import { staffOut } from "../serialize.js";

const router = Router();

router.get("/health", async (_req, res) => {
  const { rows } = await query("select now() as now, current_database() as db");
  res.json({ ok: true, db: rows[0].db, time: rows[0].now });
});

router.get("/staff", async (req, res) => {
  const role = req.query.role;
  const { rows } = role
    ? await query("select * from staff where active and role = $1 order by name", [role])
    : await query("select * from staff where active order by role, name");
  res.json(rows.map(staffOut));
});

// Owner monitoring view (FR-7.1/7.2): counts plus the exception queue.
router.get("/dashboard", async (_req, res) => {
  const counts = (await query(`
    select
      count(*) filter (where status in ('New Request','Assigned for Pickup'))      as pending_pickups,
      count(*) filter (where status = 'In Shop')                                   as in_shop,
      count(*) filter (where status in ('Ready for Delivery','Out for Delivery'))  as out_for_delivery,
      count(*) filter (where status = 'Rider Will Return')                         as rider_will_return,
      count(*) filter (where delay_reason is not null and status not in ('Completed','Cancelled')) as delayed,
      count(*) filter (where payment_status = 'Pending Verification')              as payments_to_verify
    from orders`)).rows[0];
  const open = (await query("select count(*)::int as n from complaints where status <> 'Resolved'")).rows[0].n;

  const exceptions = [];
  const overdueTickets = await query(
    `select id, order_id, message, created_at from complaints
     where status <> 'Resolved' and created_at < now() - interval '4 hours' order by created_at`);
  for (const t of overdueTickets.rows) {
    exceptions.push({ type: "ticket_overdue", id: t.id, orderId: t.order_id, message: t.message, since: t.created_at.toISOString() });
  }

  const stalePayments = await query(
    `select id, payment_logged_at from orders
     where payment_status = 'Pending Verification' and payment_logged_at < now() - interval '24 hours'`);
  for (const o of stalePayments.rows) exceptions.push({ type: "payment_stale", orderId: o.id, since: o.payment_logged_at.toISOString() });

  const unnotified = await query(
    `select id from orders where delay_reason is not null and not delay_notified
       and status not in ('Completed','Cancelled')`);
  for (const o of unnotified.rows) exceptions.push({ type: "delay_not_notified", orderId: o.id });

  const backlog = await query(
    `select id, created_at from orders
     where status in ('Ready for Delivery','Out for Delivery') and created_at < now() - interval '48 hours'`);
  for (const o of backlog.rows) exceptions.push({ type: "delivery_backlog", orderId: o.id, since: o.created_at.toISOString() });

  res.json({
    pendingPickups: counts.pending_pickups, inShop: counts.in_shop, outForDelivery: counts.out_for_delivery,
    riderWillReturn: counts.rider_will_return, delayed: counts.delayed,
    paymentsToVerify: counts.payments_to_verify, openComplaints: open,
    exceptions,
  });
});

// POST /api/maintenance/purge-photos — retention: photos are deleted 30 days after payment verification.
// Call from a scheduler (cron / Supabase pg_cron / scheduled function).
router.post("/maintenance/purge-photos", async (_req, res) => {
  const orders = await query(
    `update orders set bag_photo = null, ref_photo = null, proof_photo = null, receipt_photo = null, photos_purged = true
     where payment_status = 'Verified' and verified_at < now() - interval '30 days' and not photos_purged
     returning id`);
  const tickets = await query(
    `update complaints set photos = '[]'::jsonb
     where jsonb_array_length(photos) > 0 and order_id in (
       select id from orders where payment_status = 'Verified' and verified_at < now() - interval '30 days')
     returning id`);
  res.json({ ordersPurged: orders.rowCount, ticketsPurged: tickets.rowCount });
});

export default router;
