import { useEffect, useRef, useState } from "react";
import Nav from "./components/Nav.jsx";
import Dashboard from "./components/Dashboard.jsx";
import DispatchBoard from "./components/DispatchBoard.jsx";
import NewOrder from "./components/NewOrder.jsx";
import CustomerRegistration from "./components/CustomerRegistration.jsx";
import Customers from "./components/Customers.jsx";
import RiderView from "./components/RiderView.jsx";
import Payments from "./components/Payments.jsx";
import Complaints from "./components/Complaints.jsx";
import Outbox from "./components/Outbox.jsx";
import Toast from "./components/Toast.jsx";
import CustomerPortal from "./components/CustomerPortal.jsx";
import CustomerAccount from "./components/CustomerAccount.jsx";
import Attendant from "./components/Attendant.jsx";
import ModeBadge from "./components/ModeBadge.jsx";
import { SEED_CUSTOMERS, SEED_ORDERS, SEED_COMPLAINTS, ATTENDANT, RIDERS, DEFAULT_BRANCH } from "./data/seedData.js";
import { IS_API, api, applyOrderPatch } from "./api.js";
import { nextStatus, advanceBlockReason, nextOrderId } from "./utils/helpers.js";
import { buildPickupSummary, buildReceiptAlert } from "./utils/notify.js";
import { usePersistentState, clearPersistedState } from "./utils/usePersistentState.js";
import { NAV_ITEMS } from "./components/Nav.jsx";

// "v2" keys: the order/customer shape changed (structured addresses, multi-package orders, PINs).
const DATA_KEYS = ["tel.v2.customers", "tel.v2.orders", "tel.v2.complaints", "tel.v2.outbox"];
const DEFAULT_TAB = { owner: "dashboard", attendant: "attendant", rider: "rider" };
const ROLE_LABEL = { owner: "Owner", attendant: ATTENDANT.name, rider: "Rider" };
const PHOTO_TTL_MS = 30 * 24 * 3600 * 1000; // photos are deleted 30 days after payment is verified
const PHOTO_FIELDS = ["bagPhoto", "receiptUrl", "proofPhotoUrl", "refPhoto"];

// Staff entry is not linked from any customer page: open /#staff (or /#staff/payments/<orderId> from a group-chat alert).
function parseHash() {
  const h = typeof window !== "undefined" ? window.location.hash : "";
  if (!h.startsWith("#staff")) return { staff: false };
  const [, tab, id] = h.slice(1).split("/");
  return { staff: true, tab: tab || null, id: id ? decodeURIComponent(id) : null };
}

// prototype mode: seed data persisted in localStorage. api mode: empty until loaded from the server.
const useCollection = IS_API ? () => useState([]) : usePersistentState;
const POLL_MS = 15000; // api mode: pick up changes made on other devices

export default function App() {
  const initialHash = useRef(parseHash()).current;
  const [customers, setCustomers] = useCollection("tel.v2.customers", SEED_CUSTOMERS);
  const [orders, setOrders] = useCollection("tel.v2.orders", SEED_ORDERS);
  const [complaints, setComplaints] = useCollection("tel.v2.complaints", SEED_COMPLAINTS);
  const [apiState, setApiState] = useState(IS_API ? { ready: false, error: null } : { ready: true, error: null });
  const [outbox, setOutbox] = usePersistentState("tel.v2.outbox", []);
  const [role, setRole] = usePersistentState("tel.role", "owner");
  const [tab, setTab] = useState(initialHash.tab && NAV_ITEMS.some((n) => n.id === initialHash.tab) ? initialHash.tab : DEFAULT_TAB[role] || "dashboard");
  const [highlightId] = useState(initialHash.id);
  const [prefillCustomerId, setPrefillCustomerId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [portal, setPortal] = useState(initialHash.staff ? "admin" : "customer"); // customer | account | admin

  // Synchronous mirrors so two submits in the same tick can never be issued the same order ID.
  const ordersRef = useRef(orders);
  ordersRef.current = orders;
  const customersRef = useRef(customers);
  customersRef.current = customers;

  // ---- api mode: load from the server, then keep refreshing ------------------------------------
  async function loadFromServer() {
    try {
      const data = await api.loadAll();
      // Staff ids are database ids; the UI's rider/attendant lists are shared module-level arrays.
      RIDERS.splice(0, RIDERS.length, ...data.staff.filter((s) => s.role === "rider").map((s) => ({ id: s.id, name: s.name })));
      const att = data.staff.find((s) => s.role === "attendant");
      if (att) Object.assign(ATTENDANT, { id: att.id, name: att.name });
      customersRef.current = data.customers;
      ordersRef.current = data.orders;
      setCustomers(data.customers);
      setOrders(data.orders);
      setComplaints(data.complaints);
      setApiState({ ready: true, error: null });
    } catch (err) {
      setApiState((s) => (s.ready ? s : { ready: false, error: err.message }));
    }
  }

  useEffect(() => {
    if (!IS_API) return undefined;
    loadFromServer();
    const t = setInterval(loadFromServer, POLL_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const actor = () => ROLE_LABEL[role];

  // Runs an API call; on failure shows the server's message and re-syncs from the database.
  async function run(promise) {
    try {
      return await promise;
    } catch (err) {
      showToast(err.message);
      loadFromServer();
      return null;
    }
  }

  function putOrder(o) {
    if (!o) return;
    const next = ordersRef.current.some((x) => x.id === o.id)
      ? ordersRef.current.map((x) => (x.id === o.id ? o : x))
      : [o, ...ordersRef.current];
    ordersRef.current = next;
    setOrders(next);
  }

  function putCustomer(c) {
    const next = customersRef.current.some((x) => x.id === c.id)
      ? customersRef.current.map((x) => (x.id === c.id ? { ...x, ...c } : x))
      : [...customersRef.current, c];
    customersRef.current = next;
    setCustomers(next);
  }

  // Switching role (or landing on a tab the role can't see) falls back to that role's home tab.
  useEffect(() => {
    if (portal !== "admin") return;
    const allowed = NAV_ITEMS.some((n) => n.id === tab && n.roles.includes(role));
    if (!allowed) setTab(DEFAULT_TAB[role]);
  }, [role, tab, portal]);

  // Retention: strip every uploaded photo 30 days after the order's payment was verified.
  useEffect(() => {
    if (IS_API) return undefined;
    function purge() {
      const cutoff = Date.now() - PHOTO_TTL_MS;
      setOrders((prev) => {
        let changed = false;
        const next = prev.map((o) => {
          if (o.paymentStatus === "Verified" && o.verifiedTs && o.verifiedTs < cutoff && PHOTO_FIELDS.some((f) => o[f])) {
            changed = true;
            const cleared = Object.fromEntries(PHOTO_FIELDS.map((f) => [f, null]));
            return { ...o, ...cleared, photosPurged: true };
          }
          return o;
        });
        return changed ? next : prev;
      });
      setComplaints((prev) => {
        const stale = prev.some((t) => t.photos?.length && ordersRef.current.some((o) => o.id === t.orderId && o.paymentStatus === "Verified" && o.verifiedTs && o.verifiedTs < cutoff));
        if (!stale) return prev;
        return prev.map((t) =>
          t.photos?.length && ordersRef.current.some((o) => o.id === t.orderId && o.paymentStatus === "Verified" && o.verifiedTs && o.verifiedTs < cutoff)
            ? { ...t, photos: [] }
            : t
        );
      });
    }
    purge();
    const t = setInterval(purge, 3600 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function resetDemoData() {
    if (IS_API) return;
    if (!window.confirm("Reset all orders, customers and tickets back to the demo data?")) return;
    clearPersistedState(DATA_KEYS);
    setCustomers(SEED_CUSTOMERS);
    setOrders(SEED_ORDERS);
    setComplaints(SEED_COMPLAINTS);
    setOutbox([]);
  }

  function showToast(message) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function pushOutbox(entry) {
    setOutbox((prev) => [{ id: `m${Date.now()}${Math.random().toString(36).slice(2, 5)}`, ts: Date.now(), ...entry }, ...prev].slice(0, 50));
  }

  const commitOrders = (next) => { ordersRef.current = next; setOrders(next); };

  function advanceOrder(orderId, patch = {}) {
    const order = ordersRef.current.find((o) => o.id === orderId);
    if (!order) return;
    const blocked = advanceBlockReason({ ...order, ...patch });
    if (blocked) return showToast(blocked);
    if (IS_API) {
      const body = {
        ...(patch.weight ? { weightKg: patch.weight } : {}),
        ...(patch.price != null ? { price: patch.price } : {}),
      };
      return run(api.advance(orderId, body, actor()).then(putOrder));
    }
    commitOrders(
      ordersRef.current.map((o) => {
        if (o.id !== orderId) return o;
        const ns = nextStatus(o.status);
        return ns ? { ...o, ...patch, status: ns } : o;
      })
    );
  }

  function updateOrder(orderId, patch) {
    if (IS_API) {
      const order = ordersRef.current.find((o) => o.id === orderId);
      if (!order) return undefined;
      return run(applyOrderPatch(order, patch, actor()).then(putOrder));
    }
    commitOrders(ordersRef.current.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
  }

  function assignRider(orderId, riderId) {
    if (IS_API) return run(api.assign(orderId, riderId, actor()).then(putOrder));
    commitOrders(
      ordersRef.current.map((o) => (o.id === orderId ? { ...o, riderId, status: o.status === "New Request" ? "Assigned for Pickup" : o.status } : o))
    );
  }

  // Payment verification / rejection — the ledger, board and customer card all read the same order record.
  function verifyPayment(orderId) {
    if (IS_API) return run(api.verifyPayment(orderId, actor()).then(putOrder));
    updateOrder(orderId, {
      paymentStatus: "Verified", verifiedTs: Date.now(), verifiedBy: ROLE_LABEL[role], shortage: null, rejectReason: "",
      ...(ordersRef.current.find((o) => o.id === orderId)?.status === "Payment Verification" ? { status: "Completed" } : {}),
    });
  }

  function rejectCash(orderId, shortage) {
    if (IS_API) return run(api.rejectCash(orderId, shortage, actor()).then(putOrder));
    updateOrder(orderId, { paymentStatus: "Shortage Logged", shortage, verifiedTs: Date.now(), verifiedBy: ROLE_LABEL[role] });
  }

  function rejectReceipt(orderId, reason) {
    if (IS_API) return run(api.rejectReceipt(orderId, reason, actor()).then(putOrder));
    updateOrder(orderId, { paymentStatus: "Awaiting Re-upload", rejectReason: reason, verifiedTs: Date.now(), verifiedBy: ROLE_LABEL[role] });
  }

  // Customer uploads (or re-uploads) a GCash receipt for a Leave-at-Lobby order.
  function payOrder(orderId, receiptUrl) {
    const now = Date.now();
    if (IS_API) {
      run(api.logPayment(orderId, { method: "GCash", receiptUrl }, "Customer").then((o) => {
        if (!o) return;
        putOrder(o);
        const customer = customersRef.current.find((c) => c.id === o.customerId);
        const link = `${window.location.origin}${window.location.pathname}#staff/payments/${encodeURIComponent(orderId)}`;
        pushOutbox({
          channel: "TEL: Bayad Center (Messenger)",
          parts: [buildReceiptAlert(o, customer, now, link)],
          attachments: [{ caption: `Payment receipt — ${o.id}`, orderId: o.id, field: "receiptUrl" }],
        });
      }));
      return;
    }
    updateOrder(orderId, { receiptUrl, paymentStatus: "Pending Verification", paymentTs: now, rejectReason: "", verifiedTs: null, verifiedBy: null });
    const order = ordersRef.current.find((o) => o.id === orderId);
    const customer = customersRef.current.find((c) => c.id === order.customerId);
    const link = `${window.location.origin}${window.location.pathname}#staff/payments/${encodeURIComponent(orderId)}`;
    pushOutbox({
      channel: "TEL: Bayad Center (Messenger)",
      parts: [buildReceiptAlert(order, customer, now, link)],
      attachments: [{ caption: `Payment receipt — ${order.id}`, orderId: order.id, field: "receiptUrl" }],
    });
  }

  // On-the-spot outcomes entered by the rider/staff with a required reason.
  function setOrderOutcome(orderId, kind, reason) {
    if (IS_API) {
      return run((kind === "return" ? api.returnVisit(orderId, reason, actor()) : api.abort(orderId, reason, actor())).then(putOrder));
    }
    if (kind === "return") updateOrder(orderId, { status: "Rider Will Return", returnReason: reason });
    else updateOrder(orderId, { status: "Cancelled", cancelReason: reason, riderId: null });
  }

  function resumeOrder(orderId) {
    if (IS_API) return run(api.resume(orderId, actor()).then(putOrder));
    updateOrder(orderId, { status: "Assigned for Pickup", returnReason: "" });
  }

  function cancelOrder(orderId) {
    if (IS_API) return run(api.cancel(orderId, "Customer").then(putOrder));
    updateOrder(orderId, { status: "Cancelled", riderId: null, cancelReason: "Cancelled by customer" });
  }

  // Single entry point for every new pick-up request (customer app and staff New Order alike).
  function addOrder(order) {
    if (IS_API) {
      run(api.createOrder({
        customerId: order.customerId, packages: order.packages, handover: order.handover,
        channel: order.channel || "App", paymentMethod: order.paymentMethod, pickupDate: order.pickupDate,
        pickupSlot: order.pickupSlot, notes: order.notes, bagPhoto: order.bagPhoto || undefined,
      }, order.channel === "App" ? "Customer" : actor()).then((full) => {
        if (!full) return;
        putOrder(full);
        const customer = customersRef.current.find((c) => c.id === full.customerId);
        pushOutbox({
          channel: "Pick-up requests (Messenger)",
          parts: buildPickupSummary(ordersRef.current, customersRef.current, full.pickupDate),
          attachments: full.bagPhoto ? [{ caption: `Bag Photo for ${customer?.name ?? ""}`, orderId: full.id, field: "bagPhoto" }] : [],
        });
      }));
      return null;
    }
    const createdTs = Date.now();
    const full = { branchId: DEFAULT_BRANCH, ...order, createdTs, id: nextOrderId(ordersRef.current, createdTs) };
    commitOrders([full, ...ordersRef.current]);

    // Rider app gets the card via shared state; the group chat gets the compiled FIFO summary for that pickup date.
    const customer = customersRef.current.find((c) => c.id === full.customerId);
    const parts = buildPickupSummary(ordersRef.current, customersRef.current, full.pickupDate);
    pushOutbox({
      channel: "Pick-up requests (Messenger)",
      parts,
      attachments: full.bagPhoto ? [{ caption: `Bag Photo for ${customer?.name ?? ""}`, orderId: full.id, field: "bagPhoto" }] : [],
    });
    return full;
  }

  function registerCustomer(customer, opts) {
    if (IS_API) {
      putCustomer(customer); // optimistic: the registration screen shows it straight away
      run(api.createCustomer({
        id: customer.id, firstName: customer.firstName, lastName: customer.lastName, contact: customer.contact,
        pin: customer.pin, address: customer.address, deliveryAddress: customer.deliveryAddress, area: customer.area,
      })).then((saved) => {
        if (saved) putCustomer(saved);
      });
      if (!opts?.silent) showToast(`${customer.name} added to the customer directory`);
      return;
    }
    const next = [...customersRef.current, customer];
    customersRef.current = next;
    setCustomers(next);
    if (!opts?.silent) showToast(`${customer.name} added to the customer directory`);
  }

  function updateCustomer(id, patch) {
    if (IS_API) {
      putCustomer({ id, ...patch, pin: undefined });
      const { firstName, lastName, contact, address, deliveryAddress, area, pin } = patch;
      run(api.updateCustomer(id, { firstName, lastName, contact, address, deliveryAddress, area, ...(pin ? { pin } : {}) }))
        .then((saved) => saved && putCustomer(saved));
      return;
    }
    const next = customersRef.current.map((c) => (c.id === id ? { ...c, ...patch } : c));
    customersRef.current = next;
    setCustomers(next);
  }

  function goToNewOrderFor(customerId) {
    setPrefillCustomerId(customerId);
    setTab("newOrder");
  }

  function addComplaint(ticket) {
    if (IS_API) {
      run(api.createComplaint({
        orderId: ticket.orderId, kind: ticket.kind, channel: ticket.channel, message: ticket.message, photos: ticket.photos || [],
      })).then((t) => t && setComplaints((prev) => [t, ...prev]));
      return;
    }
    setComplaints((prev) => [{ createdTs: Date.now(), ...ticket }, ...prev]);
  }

  function updateComplaint(id, patch) {
    if (IS_API) {
      const { assignedTo, response, status } = patch;
      run(api.patchComplaint(id, { assignedTo, response, status })).then((t) => {
        if (t) setComplaints((prev) => prev.map((x) => (x.id === t.id ? t : x)));
      });
      return;
    }
    setComplaints((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  function leaveStaff() {
    if (typeof window !== "undefined" && window.location.hash) window.history.replaceState(null, "", window.location.pathname);
    setPortal("customer");
  }

  // api mode: PINs are never sent to the browser, so sign-in is checked by the server.
  async function signInViaApi(contact, pin) {
    try {
      const c = await api.login(contact.trim(), pin);
      putCustomer(c);
      return c;
    } catch {
      return null;
    }
  }

  if (IS_API && !apiState.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-center text-sm text-slate-600">
        <div>
          {apiState.error ? (
            <>
              <p className="font-medium text-rose-700">Cannot connect to the server</p>
              <p className="mt-1">{apiState.error}</p>
              <button onClick={loadFromServer} className="mt-3 rounded-md bg-teal-600 px-3 py-2 text-xs font-medium text-white">Try again</button>
            </>
          ) : (
            <p>Connecting to the server…</p>
          )}
        </div>
        <ModeBadge />
      </div>
    );
  }

  if (portal === "customer") {
    return (
      <>
        <CustomerPortal customers={customers} registerCustomer={registerCustomer} onGoToAccount={() => setPortal("account")} />
        <ModeBadge />
      </>
    );
  }

  if (portal === "account") {
    return (
      <>
      <CustomerAccount
        customers={customers}
        orders={orders}
        addOrder={addOrder}
        cancelOrder={cancelOrder}
        payOrder={payOrder}
        complaints={complaints}
        addComplaint={addComplaint}
        updateCustomer={updateCustomer}
        onGoToRegister={() => setPortal("customer")}
        onBack={() => setPortal("customer")}
        onSignIn={IS_API ? signInViaApi : undefined}
      />
      <ModeBadge />
      </>
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <Nav tab={tab} setTab={setTab} role={role} setRole={setRole} onResetData={resetDemoData} onExitToCustomerView={leaveStaff} />

      <div className="pt-14 md:pt-0 md:pl-60">
        <div className={tab === "board" ? "px-4 py-6" : "mx-auto max-w-6xl px-4 py-6"}>
          {tab === "dashboard" && <Dashboard orders={orders} complaints={complaints} customers={customers} setTab={setTab} />}
          {tab === "board" && (
            <DispatchBoard
              orders={orders} customers={customers} advanceOrder={advanceOrder} assignRider={assignRider}
              resumeOrder={resumeOrder} setOrderOutcome={setOrderOutcome}
            />
          )}
          {tab === "newOrder" && (
            <NewOrder
              customers={customers}
              addOrder={addOrder}
              prefillCustomerId={prefillCustomerId}
              clearPrefill={() => setPrefillCustomerId(null)}
              goToRegister={() => setTab("register")}
              goToBoard={() => setTab("board")}
            />
          )}
          {tab === "register" && (
            <CustomerRegistration customers={customers} registerCustomer={registerCustomer} goToNewOrderFor={goToNewOrderFor} />
          )}
          {tab === "customers" && <Customers customers={customers} orders={orders} role={role} goToRegister={() => setTab("register")} />}
          {tab === "attendant" && <Attendant orders={orders} customers={customers} advanceOrder={advanceOrder} updateOrder={updateOrder} />}
          {tab === "rider" && (
            <RiderView
              orders={orders} customers={customers} advanceOrder={advanceOrder} updateOrder={updateOrder}
              setOrderOutcome={setOrderOutcome} resumeOrder={resumeOrder}
            />
          )}
          {tab === "payments" && (
            <Payments
              orders={orders} customers={customers} verifyPayment={verifyPayment}
              rejectCash={rejectCash} rejectReceipt={rejectReceipt} highlightId={highlightId}
            />
          )}
          {tab === "outbox" && <Outbox outbox={outbox} orders={orders} customers={customers} />}
          {tab === "complaints" && (
            <Complaints complaints={complaints} orders={orders} customers={customers} addComplaint={addComplaint} updateComplaint={updateComplaint} />
          )}
        </div>
      </div>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      <ModeBadge />
    </div>
  );
}
