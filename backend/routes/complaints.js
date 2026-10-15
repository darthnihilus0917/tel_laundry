import { Router } from "express";
import { query } from "../db/pool.js";
import { CHANNELS, DEFAULT_BRANCH, HttpError } from "../domain.js";
import { complaintOut } from "../serialize.js";
import { oneOf, parseDataUrl, requireText, requireUuid } from "../validate.js";

const router = Router();
const MAX_PHOTOS = 10;

router.get("/", async (req, res) => {
  const where = [];
  const vals = [];
  for (const [param, col] of [["status", "status"], ["orderId", "order_id"], ["assignedTo", "assigned_to"]]) {
    if (req.query[param]) { vals.push(req.query[param]); where.push(`${col} = $${vals.length}`); }
  }
  const { rows } = await query(
    `select * from complaints ${where.length ? "where " + where.join(" and ") : ""} order by created_at desc`, vals);
  res.json(rows.map(complaintOut));
});

// POST /api/complaints — ticket linked to its order (FR-6.1): an Issue, or a status Follow-up
router.post("/", async (req, res) => {
  const b = req.body ?? {};
  const photos = Array.isArray(b.photos) ? b.photos : [];
  if (photos.length > MAX_PHOTOS) throw new HttpError(400, `At most ${MAX_PHOTOS} photos per ticket`);
  const { rows } = await query(
    `insert into complaints (branch_id, order_id, kind, channel, message, photos)
     values ($1,$2,$3,$4,$5,$6) returning *`,
    [
      DEFAULT_BRANCH,
      requireText(b.orderId, "orderId"),
      oneOf(b.kind ?? "Issue", ["Issue", "Follow-up"], "kind"),
      oneOf(b.channel ?? "App", CHANNELS, "channel"),
      requireText(b.message, "message"),
      JSON.stringify(photos.map((p, i) => parseDataUrl(p, `photos[${i}]`))),
    ]).catch((err) => {
      if (err.code === "23503") throw new HttpError(400, "Unknown order");
      throw err;
    });
  res.status(201).json(complaintOut(rows[0]));
});

// PATCH /api/complaints/:id {assignedTo?, response?, status?}
// Assigning an Open ticket moves it to In Progress; Resolved requires a resolution note (FR-6.2/6.3).
router.patch("/:id", async (req, res) => {
  const b = req.body ?? {};
  const cur = (await query("select * from complaints where id = $1", [req.params.id])).rows[0];
  if (!cur) throw new HttpError(404, "Ticket not found");

  let assignedTo = cur.assigned_to;
  let response = cur.response;
  let status = cur.status;

  if (b.assignedTo !== undefined) {
    assignedTo = requireUuid(b.assignedTo, "assignedTo");
    const s = (await query("select id from staff where id = $1 and active", [assignedTo])).rows[0];
    if (!s) throw new HttpError(400, "Unknown staff member");
    if (status === "Open") status = "In Progress";
  }
  if (b.response !== undefined) response = String(b.response).trim();
  if (b.status !== undefined) status = oneOf(b.status, ["Open", "In Progress", "Resolved"], "status");
  if (status === "Resolved" && !response) throw new HttpError(400, "A resolution note is required");
  if (status === "In Progress" && !assignedTo) throw new HttpError(400, "Assign the ticket before working it");

  const { rows } = await query(
    `update complaints set assigned_to = $1, response = $2, status = $3,
       resolved_at = case when $3 = 'Resolved' then coalesce(resolved_at, now()) else null end
     where id = $4 returning *`,
    [assignedTo, response, status, req.params.id]);
  res.json(complaintOut(rows[0]));
});

export default router;
