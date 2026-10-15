// DB rows (snake_case) -> API objects (camelCase, matching the front-end's shapes).
const iso = (d) => (d ? new Date(d).toISOString() : null);
const dateOnly = (d) => (d instanceof Date ? d.toISOString().slice(0, 10) : d);

export const customerOut = (r) => ({
  id: r.id, branchId: r.branch_id, firstName: r.first_name, lastName: r.last_name,
  name: `${r.first_name} ${r.last_name}`, contact: r.contact,
  address: r.address, deliveryAddress: r.delivery_address, area: r.area,
  createdAt: iso(r.created_at),
});

export const orderOut = (r, items = []) => ({
  id: r.id, branchId: r.branch_id, customerId: r.customer_id, status: r.status,
  packages: items.map((i) => ({ id: i.package, instruction: i.instruction })),
  weightKg: r.weight_kg, price: r.price, handover: r.handover, channel: r.channel, riderId: r.rider_id,
  pickupDate: dateOnly(r.pickup_date), pickupSlot: r.pickup_slot, notes: r.notes,
  returnReason: r.return_reason, cancelReason: r.cancel_reason,
  delay: r.delay_reason ? { reason: r.delay_reason, eta: r.delay_eta, notified: r.delay_notified } : null,
  paymentStatus: r.payment_status, paymentMethod: r.payment_method, gcashRef: r.gcash_ref,
  shortage: r.shortage, rejectReason: r.reject_reason,
  paymentLoggedAt: iso(r.payment_logged_at), verifiedAt: iso(r.verified_at), verifiedBy: r.verified_by,
  bagPhoto: r.bag_photo, refPhoto: r.ref_photo, proofPhotoUrl: r.proof_photo, receiptUrl: r.receipt_photo,
  photosPurged: r.photos_purged,
  createdAt: iso(r.created_at), updatedAt: iso(r.updated_at),
});

export const complaintOut = (r) => ({
  id: r.id, branchId: r.branch_id, orderId: r.order_id, kind: r.kind, channel: r.channel,
  message: r.message, photos: r.photos, status: r.status, assignedTo: r.assigned_to, response: r.response,
  createdAt: iso(r.created_at), updatedAt: iso(r.updated_at), resolvedAt: iso(r.resolved_at),
});

export const staffOut = (r) => ({ id: r.id, name: r.name, role: r.role, active: r.active });
