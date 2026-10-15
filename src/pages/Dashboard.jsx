import React, { useMemo, useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Target,
  Users,
  Trophy,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
} from "lucide-react";
import "./dashboard.css";
import { loadVideos, loadClients, subscribeVideos } from "../lib/db";
import { deadlineInfo, fmtBRL, STAGES } from "../lib/utils";

/* ============================================================
   DASHBOARD — dados reais do Supabase
   ============================================================ */

export default function Dashboard() {
  const [videos, setVideos] = useState([]);
  const [clients, setClients] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;

    const refreshVideos = () => loadVideos().then((v) => alive && v && setVideos(v));

    Promise.all([refreshVideos(), loadClients().then((c) => alive && setClients(c || []))])
      .finally(() => alive && setLoaded(true));

    let t;
    const unsub = subscribeVideos(() => {
      clearTimeout(t);
      t = setTimeout(refreshVideos, 400);
    });
    return () => {
      alive = false;
      clearTimeout(t);
      unsub();
    };
  }, []);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    const emProducao = videos.filter((v) => v.stage !== "CONCLUIDO");
    const atrasados = emProducao.filter((v) => deadlineInfo(v).level === "late");
    const semana = emProducao.filter((v) => {
      const d = deadlineInfo(v).remaining;
      return d !== null && d >= 0 && d <= 5;
    });

    const concluidos = videos.filter((v) => v.stage === "CONCLUIDO");
    const entreguesMes = concluidos.filter((v) => {
      const hist = v.history.find((h) => /Conclu[íi]do/i.test(h.text));
      if (!hist) return false;
      // "at" é uma string pt-BR curta; usamos createdAt como fallback
      return true; // simplificado: todos os concluídos contam
    });

    const mrr = clients.reduce((s, c) => s + (Number(c.monthlyValue) || 0), 0);

    return {
      emProducao: emProducao.length,
      atrasados: atrasados.length,
      semana: semana.length,
      entreguesMes: entreguesMes.length,
      concluidos: concluidos.length,
      mrr,
      clientes: clients.length,
    };
  }, [videos, clients]);

  // por etapa
  const porEtapa = useMemo(() => {
    const total = videos.length || 1;
    return STAGES.map((s) => {
      const count = videos.filter((v) => v.stage === s.id).length;
      return { ...s, count, percent: Math.round((count / total) * 100) };
    }).filter((s) => s.count > 0);
  }, [videos]);

  // top editores do mês
  const topEditores = useMemo(() => {
    const map = {};
    videos.forEach((v) => {
      const name = v.claimedBy || v.editor;
      if (!name) return;
      if (!map[name]) map[name] = { name, total: 0, concluidos: 0, ativos: 0 };
      map[name].total++;
      if (v.stage === "CONCLUIDO") map[name].concluidos++;
      else map[name].ativos++;
    });
    return Object.values(map)
      .sort((a, b) => b.concluidos - a.concluidos || b.total - a.total)
      .slice(0, 5);
  }, [videos]);

  // vídeos recentes (últimos 5 com maior createdAt)
  const recentes = useMemo(
    () =>
      [...videos]
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
        .slice(0, 5),
    [videos]
  );

  if (!loaded) return null;

  return (
    <div className="dash">
      {/* KPIs */}
      <div className="kpi-grid">
        <KpiCard
          label="Em produção"
          value={stats.emProducao}
          icon={Target}
          hint={`${stats.semana} entregam esta semana`}
        />
        <KpiCard
          label="Atrasados"
          value={stats.atrasados}
          icon={AlertTriangle}
          tone="danger"
          hint={stats.atrasados === 0 ? "Tudo em dia" : "Precisam de atenção"}
        />
        <KpiCard
          label="Concluídos (total)"
          value={stats.concluidos}
          icon={CheckCircle2}
          tone="success"
          hint="Histórico acumulado"
        />
        <KpiCard
          label="MRR"
          value={fmtBRL(stats.mrr)}
          icon={DollarSign}
          hint={`${stats.clientes} cliente(s) ativo(s)`}
        />
      </div>

      {/* Row: pipeline + top editores */}
      <div className="dash-row">
        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Pipeline por etapa</h3>
              <p className="card-subtitle">Onde os vídeos estão agora</p>
            </div>
          </div>
          {porEtapa.length === 0 ? (
            <div className="dash-empty">Nenhum vídeo no fluxo ainda.</div>
          ) : (
            <div className="pipeline">
              {porEtapa.map((p, i) => (
                <div key={p.id} className="pipeline-item">
                  <div className="pipeline-row">
                    <span className="pipeline-name">{p.label}</span>
                    <div className="pipeline-values">
                      <span className="pipeline-count">{p.count}</span>
                      <span className="pipeline-percent">{p.percent}%</span>
                    </div>
                  </div>
                  <div className="pipeline-track">
                    <div
                      className="pipeline-fill"
                      style={{
                        width: `${p.percent}%`,
                        background:
                          p.tone === "success"
                            ? "var(--success)"
                            : p.tone === "danger"
                            ? "var(--destructive)"
                            : p.tone === "gold"
                            ? "var(--accent)"
                            : p.tone === "info"
                            ? "var(--chart-1)"
                            : "var(--muted-foreground)",
                        transitionDelay: `${i * 100}ms`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h3 className="card-title">Top editores</h3>
              <p className="card-subtitle">Vídeos concluídos</p>
            </div>
            <Trophy size={20} className="trophy-icon" />
          </div>
          {topEditores.length === 0 ? (
            <div className="dash-empty">Nenhuma atividade ainda.</div>
          ) : (
            <div className="performers-list">
              {topEditores.map((e, i) => (
                <div
                  key={e.name}
                  className="performer-item"
                  style={{ animationDelay: `${i * 80}ms` }}
                >
                  <div className="performer-left">
                    <div className="performer-avatar-wrap">
                      <div className="performer-avatar">
                        {e.name.slice(0, 1).toUpperCase()}
                      </div>
                      {i === 0 && <div className="performer-rank">1</div>}
                    </div>
                    <div>
                      <p className="performer-name">{e.name}</p>
                      <p className="performer-meta">
                        {e.ativos} ativos · {e.concluidos} concluídos
                      </p>
                    </div>
                  </div>
                  <div className="performer-right">
                    <p className="performer-value">{e.total}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Vídeos recentes */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3 className="card-title">Vídeos recentes</h3>
            <p className="card-subtitle">Últimos cadastrados</p>
          </div>
        </div>
        {recentes.length === 0 ? (
          <div className="dash-empty">Nenhum vídeo cadastrado ainda.</div>
        ) : (
          <div className="recent-list">
            {recentes.map((v, i) => {
              const info = deadlineInfo(v);
              const stage = STAGES.find((s) => s.id === v.stage);
              return (
                <div
                  key={v.id}
                  className="recent-item"
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className="recent-left">
                    <div className="recent-avatar">
                      {(v.client || "?").slice(0, 1)}
                    </div>
                    <div>
                      <p className="recent-client">
                        {v.client} — {v.title}
                      </p>
                      <p className="recent-meta">
                        {stage?.label} · {v.editor || "sem editor"}
                      </p>
                    </div>
                  </div>
                  <div className="recent-right">
                    <span className={"dash-stage-tag tone-" + info.level}>
                      {info.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, hint, tone }) {
  return (
    <div className={"kpi-card" + (tone ? " kpi-tone-" + tone : "")}>
      <div className="kpi-head">
        <span className="kpi-label">{label}</span>
        <div className="kpi-icon-box">
          <Icon size={16} />
        </div>
      </div>
      <div className="kpi-body">
        <span className="kpi-value">{value}</span>
      </div>
      {hint && <div className="dash-kpi-hint">{hint}</div>}
    </div>
  );
}