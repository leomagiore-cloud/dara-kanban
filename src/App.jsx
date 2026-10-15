import React, { useState } from "react";
import "./styles/theme.css";
import "./styles/app.css";

import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";
import Kanban from "./pages/Kanban";
import Fila from "./pages/Fila";
import Relatorios from "./pages/Relatorios";
import Clientes from "./pages/Clientes";
import Financeiro from "./pages/Financeiro";
import Contratos from "./pages/Contratos";
import Equipe from "./pages/Equipe";
import Configuracoes from "./pages/Configuracoes";
import { useAuth } from "./lib/auth";

const PAGE_META = {
  dashboard:  { title: "Visão geral" },
  kanban:     { title: "Kanban" },
  fila:       { title: "Fila de edição" },
  relatorios: { title: "Relatórios" },
  clientes:   { title: "Clientes" },
  contratos:  { title: "Contratos" },
  financeiro: { title: "Financeiro" },
  equipe:     { title: "Equipe" },
  config:     { title: "Configurações" },
};

export default function App() {
  const { session, profile, loading, recovery, signOut } = useAuth();
  const [view, setView] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);

  if (loading) return <div className="app-loading">Carregando…</div>;
  if (recovery) return <Login forceMode="reset" />;
  if (!session) return <Login />;
  if (!profile || !profile.is_active) return <Login forceMode="pending" />;

  const user = { email: profile.email, name: profile.name, role: profile.role };

  function handleLogout() {
    signOut();
    setView("dashboard");
  }

  const meta = PAGE_META[view] || PAGE_META.dashboard;

  return (
    <div className="app-shell">
      <Sidebar
        view={view}
        setView={setView}
        collapsed={collapsed}
        role={user.role}
        onLogout={handleLogout}
        onToggleSidebar={() => setCollapsed((c) => !c)}
      />

      <div className={"main" + (collapsed ? " collapsed" : "")}>
        <Topbar title={meta.title} user={user} />
        <main className="content">
          <PageRouter view={view} user={user} setView={setView} />
        </main>
      </div>
    </div>
  );
}

function PageRouter({ view, user, setView }) {
  switch (view) {
    case "dashboard":  return <Dashboard />;
    case "kanban":     return <Kanban />;
    case "fila":       return <Fila user={user} />;
    case "relatorios": return user.role === "admin" ? <Relatorios /> : <Dashboard />;
    case "clientes":   return user.role === "admin" ? <Clientes /> : <Dashboard />;
    case "contratos":  return user.role === "admin" ? <Contratos setView={setView} /> : <Dashboard />;
    case "financeiro": return user.role === "admin" ? <Financeiro /> : <Dashboard />;
    case "equipe":     return user.role === "admin" ? <Equipe /> : <Dashboard />;
    case "config":     return <Configuracoes />;
    default:           return <Dashboard />;
  }
}