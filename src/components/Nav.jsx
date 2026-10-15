import { useState } from "react";
import {
  LayoutDashboard, PackagePlus, Truck, Users, Wallet, MessageSquareWarning,
  Bike, Package, Scale, Menu, X, UserPlus, Globe,
} from "lucide-react";

export const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "board", label: "Dispatch board", icon: Truck },
  { id: "newOrder", label: "New order", icon: PackagePlus },
  { id: "register", label: "Register customer", icon: UserPlus },
  { id: "customers", label: "Customers", icon: Users },
  { id: "attendant", label: "Attendant", icon: Scale },
  { id: "rider", label: "Rider view", icon: Bike },
  { id: "payments", label: "Payments", icon: Wallet },
  { id: "complaints", label: "Complaints", icon: MessageSquareWarning },
];

function Brand() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
        <Package size={18} />
      </div>
      <div>
        <div className="text-sm font-medium leading-tight">TEL Laundry — Ops</div>
        <div className="text-xs text-slate-500 leading-tight">Pickup · delivery · complaint prototype</div>
      </div>
    </div>
  );
}

export default function Nav({ tab, setTab, onExitToCustomerView }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const activeItem = NAV_ITEMS.find((n) => n.id === tab);

  function go(id) {
    setTab(id);
    setDrawerOpen(false);
  }

  return (
    <>
      {/* Mobile top bar — fixed, not sticky, so it never scrolls out of view */}
      <div className="fixed inset-x-0 top-0 z-40 h-14 border-b border-slate-200 bg-white/95 backdrop-blur md:hidden">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-white">
              <Package size={16} />
            </div>
            <span className="truncate text-sm font-medium">{activeItem?.label ?? "TEL Laundry"}</span>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <Brand />
              <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {NAV_ITEMS.map((n) => {
                const Icon = n.icon;
                const active = tab === n.id;
                return (
                  <button
                    key={n.id}
                    onClick={() => go(n.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-sm ${
                      active ? "bg-teal-50 font-medium text-teal-700" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={18} />
                    {n.label}
                  </button>
                );
              })}
            </nav>
            <div className="border-t border-slate-100 p-3">
              <button
                onClick={() => { onExitToCustomerView?.(); setDrawerOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm text-slate-500 hover:bg-slate-50"
              >
                <Globe size={16} /> View customer page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="border-b border-slate-100 p-4">
          <Brand />
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((n) => {
            const Icon = n.icon;
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                  active ? "bg-teal-50 font-medium text-teal-700" : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon size={16} />
                {n.label}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-slate-100 p-3">
          <button
            onClick={onExitToCustomerView}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-50"
          >
            <Globe size={16} /> View customer page
          </button>
        </div>
      </div>
    </>
  );
}
