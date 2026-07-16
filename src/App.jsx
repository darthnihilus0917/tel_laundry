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
import { SEED_CUSTOMERS, SEED_ORDERS, SEED_COMPLAINTS } from "./data/seedData.js";
import { nextStatus } from "./utils/helpers.js";

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

  function advanceOrder(orderId) {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        const ns = nextStatus(o.status);
        if (!ns) return o;
        const patch = { status: ns };
        if (ns === "Payment Verification") patch.paymentStatus = "Pending Verification";
        if (ns === "Completed") patch.paymentStatus = "Verified";
        return { ...o, ...patch };
      })
    );
  }

  function assignRider(orderId, riderId) {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, riderId, status: o.status === "New Request" ? "Assigned for Pickup" : o.status } : o))
    );
  }

  function markVerified(orderId) {
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, paymentStatus: "Verified" } : o)));
  }

  function addOrder(order, newCustomer) {
    if (newCustomer) setCustomers((prev) => [...prev, newCustomer]);
    setOrders((prev) => [order, ...prev]);
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
    setComplaints((prev) => [ticket, ...prev]);
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
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900">
      <Nav tab={tab} setTab={setTab} onExitToCustomerView={() => setPortal("customer")} />

      <div className="pb-20 pt-0 md:pb-0 md:pl-60">
        <div className="mx-auto max-w-6xl px-4 py-6">
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
          {tab === "rider" && <RiderView orders={orders} customers={customers} advanceOrder={advanceOrder} setOrders={setOrders} />}
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
