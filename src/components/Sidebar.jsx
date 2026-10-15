import React from "react";
import {
  LayoutDashboard,
  Kanban,
  ListChecks,
  BarChart3,
  Users,
  DollarSign,
  FileSignature,
  LogOut,
  ChevronLeft,
  UserCog,
  Settings,
} from "lucide-react";

const NAV_MAIN = [
  { id: "dashboard", label: "Dashboard",      icon: LayoutDashboard },
  { id: "kanban",    label: "Kanban",         icon: Kanban },
  { id: "fila",      label: "Fila de edição", icon: ListChecks },
];

const NAV_ADMIN = [
  { id: "relatorios", label: "Relatórios", icon: BarChart3 },
  { id: "clientes",   label: "Clientes",   icon: Users },
  { id: "contratos",  label: "Contratos",  icon: FileSignature },
  { id: "financeiro", label: "Financeiro", icon: DollarSign },
  { id: "equipe",     label: "Equipe",     icon: UserCog },
];

const NAV_BOTTOM = [
  { id: "config", label: "Configurações", icon: Settings },
];

export default function Sidebar({ view, setView, collapsed, role, onLogout, onToggleSidebar }) {
  const isAdmin = role === "admin";

  return (
    <aside className={"sb" + (collapsed ? " collapsed" : "")}>
      <div className="sb-head">
        <div className="sb-brand">
          <span className="sb-brand-title">DARA</span>
          <span className="sb-brand-sub">AUDIOVISUAL</span>
        </div>
      </div>

      <nav className="sb-nav">
        <div className="sb-section-label">Produção</div>
        {NAV_MAIN.map((it) => (
          <NavItem
            key={it.id}
            item={it}
            active={view === it.id}
            onClick={() => setView(it.id)}
          />
        ))}

        {isAdmin && (
          <>
            <div className="sb-section-label">Gestão</div>
            {NAV_ADMIN.map((it) => (
              <NavItem
                key={it.id}
                item={it}
                active={view === it.id}
                onClick={() => setView(it.id)}
              />
            ))}
          </>
        )}

        <div className="sb-section-label">Conta</div>
        {NAV_BOTTOM.map((it) => (
          <NavItem
            key={it.id}
            item={it}
            active={view === it.id}
            onClick={() => setView(it.id)}
          />
        ))}

        <div style={{ flex: 1 }} />

        <button className="sb-item" onClick={onLogout}>
          <span className="sb-item-icon"><LogOut size={20} /></span>
          <span className="sb-item-label">Sair</span>
        </button>
      </nav>

      <div className="sb-footer">
        <button
          className="sb-collapse-btn"
          onClick={onToggleSidebar}
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          <ChevronLeft
            size={18}
            style={{
              transform: collapsed ? "rotate(180deg)" : "none",
              transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
          <span className="sb-collapse-label">Collapse</span>
        </button>

        <div className="sb-signature">
          Desenvolvido por{" "}
          <a href="https://instagram.com/magiore.br" target="_blank" rel="noreferrer">
            @magiore.br
          </a>
        </div>
      </div>
    </aside>
  );
}

function NavItem({ item, active, onClick }) {
  const Icon = item.icon;
  return (
    <button className={"sb-item" + (active ? " active" : "")} onClick={onClick}>
      <span className="sb-item-icon"><Icon size={20} /></span>
      <span className="sb-item-label">{item.label}</span>
      {item.badge && <span className="sb-badge">{item.badge}</span>}
    </button>
  );
}