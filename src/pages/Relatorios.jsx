import React, { useMemo, useEffect, useState } from "react";
import "./relatorios.css";
import {
  STAGES,
  deadlineInfo,
} from "../lib/utils";
import { loadVideos } from "../lib/db";

export default function Relatorios() {
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    let alive = true;
    loadVideos().then((stored) => alive && setVideos(stored || []));
    return () => {
      alive = false;
    };
  }, []);

  const stats = useMemo(() => {
    const total = videos.length;
    const concluidos = videos.filter((v) => v.stage === "CONCLUIDO").length;
    const emProducao = videos.filter((v) => v.stage !== "CONCLUIDO").length;
    const atrasados = videos.filter(
      (v) => v.stage !== "CONCLUIDO" && deadlineInfo(v).level === "late"
    ).length;
    const taxaEntrega = total ? Math.round((concluidos / total) * 100) : 0;

    // Por etapa
    const porEtapa = STAGES.map((s) => ({
      ...s,
      count: videos.filter((v) => v.stage === s.id).length,
    }));

    // Por editor
    const editoresMap = {};
    videos.forEach((v) => {
      const ed = v.claimedBy || v.editor || "Sem editor";
      if (!editoresMap[ed]) editoresMap[ed] = { total: 0, concluidos: 0, ativos: 0 };
      editoresMap[ed].total++;
      if (v.stage === "CONCLUIDO") editoresMap[ed].concluidos++;
      else editoresMap[ed].ativos++;
    });
    const porEditor = Object.entries(editoresMap)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total);

    // Por tipo
    const tiposMap = {};
    videos.forEach((v) => {
      tiposMap[v.type] = (tiposMap[v.type] || 0) + 1;
    });
    const porTipo = Object.entries(tiposMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return { total, concluidos, emProducao, atrasados, taxaEntrega, porEtapa, porEditor, porTipo };
  }, [videos]);

  const maxEtapa = Math.max(...stats.porEtapa.map((e) => e.count), 1);
  const maxEditor = Math.max(...stats.porEditor.map((e) => e.total), 1);
  const maxTipo = Math.max(...stats.porTipo.map((t) => t.count), 1);

  return (
    <div className="rel">
      <div className="kpi-grid">
        <Kpi label="Total de vídeos" value={stats.total} hint="cadastrados na plataforma" />
        <Kpi label="Concluídos" value={stats.concluidos} hint="entregues e aprovados" />
        <Kpi label="Em produção" value={stats.emProducao} hint="ativos no fluxo" />
        <Kpi label="Atrasados" value={stats.atrasados} hint="precisam de atenção" critical />
      </div>

      <div className="rel-grid">
        {/* Progresso geral */}
        <section className="rel-card span-2">
          <div className="rel-card-head">
            <div>
              <h3 className="rel-card-title">Taxa de conclusão</h3>
              <p className="rel-card-sub">
                {stats.concluidos} de {stats.total} vídeos entregues
              </p>
            </div>
            <div className="rel-big-num">{stats.taxaEntrega}%</div>
          </div>
          <div className="rel-progress">
            <div
              className="rel-progress-fill"
              style={{ width: stats.taxaEntrega + "%" }}
            />
          </div>
        </section>

        {/* Distribuição por etapa */}
        <section className="rel-card span-2">
          <div className="rel-card-head">
            <div>
              <h3 className="rel-card-title">Distribuição por etapa</h3>
              <p className="rel-card-sub">Onde os vídeos estão agora</p>
            </div>
          </div>
          <ul className="rel-bar-list">
            {stats.porEtapa.map((e) => (
              <li key={e.id} className="rel-bar-item">
                <span className="rel-bar-label">{e.label}</span>
                <div className="rel-bar-track">
                  <div
                    className="rel-bar-fill"
                    style={{ width: (e.count / maxEtapa) * 100 + "%" }}
                  />
                </div>
                <span className="rel-bar-value">{e.count}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Produtividade por editor */}
        <section className="rel-card span-2">
          <div className="rel-card-head">
            <div>
              <h3 className="rel-card-title">Produtividade por editor</h3>
              <p className="rel-card-sub">Carga atual e concluídos</p>
            </div>
          </div>
          {stats.porEditor.length === 0 ? (
            <div className="rel-empty">Nenhum dado ainda.</div>
          ) : (
            <ul className="rel-editor-list">
              {stats.porEditor.map((e) => (
                <li key={e.name} className="rel-editor-item">
                  <div className="rel-editor-avatar">{e.name.slice(0, 1)}</div>
                  <div className="rel-editor-info">
                    <div className="rel-editor-name">{e.name}</div>
                    <div className="rel-editor-stats">
                      {e.ativos} ativos · {e.concluidos} concluídos
                    </div>
                    <div className="rel-bar-track small">
                      <div
                        className="rel-bar-fill gold"
                        style={{ width: (e.total / maxEditor) * 100 + "%" }}
                      />
                    </div>
                  </div>
                  <div className="rel-editor-total">{e.total}</div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Distribuição por tipo */}
        <section className="rel-card">
          <div className="rel-card-head">
            <div>
              <h3 className="rel-card-title">Por tipo de conteúdo</h3>
            </div>
          </div>
          {stats.porTipo.length === 0 ? (
            <div className="rel-empty">Nenhum dado ainda.</div>
          ) : (
            <ul className="rel-bar-list">
              {stats.porTipo.map((t) => (
                <li key={t.name} className="rel-bar-item compact">
                  <span className="rel-bar-label">{t.name}</span>
                  <div className="rel-bar-track">
                    <div
                      className="rel-bar-fill"
                      style={{ width: (t.count / maxTipo) * 100 + "%" }}
                    />
                  </div>
                  <span className="rel-bar-value">{t.count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, critical }) {
  return (
    <div className={"kpi" + (critical ? " kpi-critical" : "")}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {hint && <div className="kpi-trend">{hint}</div>}
    </div>
  );
}