import React from "react";
import { Search, Bell, Calendar } from "lucide-react";

/* ============================================================
   TOPBAR — v0 edition
   ============================================================ */

export default function Topbar({ title, user }) {
  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="topbar-v0">
      <div className="topbar-left">
        <h1 className="topbar-title-v0">{title}</h1>
        <div className="topbar-period">
          <Calendar size={14} />
          <span>Últimos 30 dias</span>
        </div>
      </div>

      <div className="topbar-right">
        <div className="topbar-search">
          <Search size={14} />
          <input placeholder="Buscar..." />
        </div>

        <button className="topbar-icon-btn" title="Notificações">
          <Bell size={18} />
          <span className="topbar-badge" />
        </button>

        <button className="topbar-avatar" title={user?.name}>
          {initials}
        </button>
      </div>
    </header>
  );
}