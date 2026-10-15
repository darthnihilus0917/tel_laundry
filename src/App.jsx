import { useState } from "react";
import Nav from "./components/Nav.jsx";
import Dashboard from "./components/Dashboard.jsx";
import DispatchBoard from "./components/DispatchBoard.jsx";
import NewOrder from "./components/NewOrder.jsx";
import CustomerRegistration from "./components/CustomerRegistration.jsx";
import Customers from "./components/Customers.jsx";
import RiderView from "./components/RiderView.jsx";
import Payments from "./components/Payments.jsx";
import Complaints from "./components/Complaints.jsx";
import Toast from "./components/Toast.jsx";
import CustomerPortal from "./components/CustomerPortal.jsx";
import CustomerAccount from "./components/CustomerAccount.jsx";
import { SEED_CUSTOMERS, SEED_ORDERS, SEED_COMPLAINTS } from "./data/seedData.js";
import Attendant from "./components/Attendant.jsx";
import { nextStatus, advanceBlockReason } from "./utils/helpers.js";

export default function App() {
  const [customers, setCustomers] = useState(SEED_CUSTOMERS);
  const [orders, setOrders] = useState(SEED_ORDERS);
  const [complaints, setComplaints] = useState(SEED_COMPLAINTS);
  const [tab, setTab] = useState("dashboard");
  const [prefillCustomerId, setPrefillCustomerId] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);
  const [portal, setPortal] = useState("customer"); // "customer" = public self-service page, "admin" = staff portal

  function showToast(message) {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }

  function advanceOrder(orderId, patch = {}) {
    const order = orders.find((o) => o.id === orderId);
    if (!order) return;
    const blocked = advanceBlockReason({ ...order, ...patch });
    if (blocked) return showToast(blocked);
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const ns = nextStatus(o.status);
        return ns ? { ...o, ...patch, status: ns } : o;
      })
    );
  }

  function updateOrder(orderId, patch) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, ...patch } : o)));
  }

  function assignRider(orderId, riderId) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, riderId, status: o.status === "New Request" ? "Assigned for Pickup" : o.status } : o))
    );
  }

  function markVerified(orderId) {
    setOrders((prev) =>
      prev.map((o) =>
        o.id === orderId
          ? { ...o, paymentStatus: "Verified", status: o.status === "Payment Verification" ? "Completed" : o.status }
          : o
      )
    );
  }

  function cancelOrder(orderId) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "Cancelled", riderId: null } : o)));
  }

  function addOrder(order, newCustomer) {
    if (newCustomer) setCustomers((prev) => [...prev, newCustomer]);
    setOrders((prev) => [{ createdTs: Date.now(), ...order }, ...prev]);
  }

  function registerCustomer(customer, opts) {
    setCustomers((prev) => [...prev, customer]);
    if (!opts?.silent) showToast(`${customer.name} added to the customer directory`);
  }

  function goToNewOrderFor(customerId) {
    setPrefillCustomerId(customerId);
    setTab("newOrder");
  }

  function addComplaint(ticket) {
    setComplaints((prev) => [{ createdTs: Date.now(), ...ticket }, ...prev]);
  }

  function updateComplaint(id, patch) {
    setComplaints((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }

  if (portal === "customer") {
    return (
      <CustomerPortal
        customers={customers}
        registerCustomer={registerCustomer}
        onStaffLogin={() => setPortal("admin")}
        onGoToAccount={() => setPortal("account")}
      />
    );
  }

  if (portal === "account") {
    return (
      <CustomerAccount
        customers={customers}
        orders={orders}
        addOrder={addOrder}
        cancelOrder={cancelOrder}
        complaints={complaints}
        addComplaint={addComplaint}
        onStaffLogin={() => setPortal("admin")}
        onGoToRegister={() => setPortal("customer")}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <Nav tab={tab} setTab={setTab} onExitToCustomerView={() => setPortal("customer")} />

      <div className="pt-14 md:pt-0 md:pl-60">
        <div className={tab === "board" ? "px-4 py-6" : "mx-auto max-w-6xl px-4 py-6"}>
          {tab === "dashboard" && <Dashboard orders={orders} complaints={complaints} customers={customers} setTab={setTab} />}
          {tab === "board" && (
            <DispatchBoard orders={orders} customers={customers} advanceOrder={advanceOrder} assignRider={assignRider} />
          )}
          {tab === "newOrder" && (
            <NewOrder
              customers={customers}
              addOrder={addOrder}
              prefillCustomerId={prefillCustomerId}
              clearPrefill={() => setPrefillCustomerId(null)}
              goToRegister={() => setTab("register")}
            />
          )}
          {tab === "register" && (
            <CustomerRegistration customers={customers} registerCustomer={registerCustomer} goToNewOrderFor={goToNewOrderFor} />
          )}
          {tab === "customers" && <Customers customers={customers} orders={orders} goToRegister={() => setTab("register")} />}
          {tab === "attendant" && <Attendant orders={orders} customers={customers} advanceOrder={advanceOrder} updateOrder={updateOrder} />}
          {tab === "rider" && <RiderView orders={orders} customers={customers} advanceOrder={advanceOrder} updateOrder={updateOrder} />}
          {tab === "payments" && <Payments orders={orders} customers={customers} markVerified={markVerified} />}
          {tab === "complaints" && (
            <Complaints complaints={complaints} orders={orders} customers={customers} addComplaint={addComplaint} updateComplaint={updateComplaint} />
          )}
        </div>
      </div>

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
