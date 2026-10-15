import React, { useState, useEffect, useMemo } from "react";
import "./fila.css";
import VideoDrawer from "../components/VideoDrawer";
import {
  deadlineInfo,
  sortScore,
  fmtDateBR,
  nowStamp,
  isAvailable,
  isInProduction,
  CHECKLIST_DEFS,
} from "../lib/utils";
import { loadSettings } from "../lib/settings";
import {
  loadVideos,
  saveVideos,
  claimVideoRemote,
  releaseVideoRemote,
  subscribeVideos,
} from "../lib/db";
import { Video, FolderOpen, CheckCircle2 } from "lucide-react";

/* ============================================================
   FILA DE EDIÇÃO — pegar, concluir e liberar vídeos
   ============================================================ */

const CONCLUIDO_STAGE = "CONCLUIDO";

export default function Fila({ user }) {
  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());
  const [tab, setTab] = useState("fila");
  const [feedback, setFeedback] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const stages = settings.stages;

  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === "dara-settings") {
        setSettings(loadSettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    let alive = true;
    const refresh = () =>
      loadVideos().then((stored) => {
        if (alive && stored) setVideos(stored);
      });
    refresh().finally(() => alive && setLoaded(true));

    let t;
    const unsub = subscribeVideos(() => {
      clearTimeout(t);
      t = setTimeout(refresh, 400);
    });
    return () => {
      alive = false;
      clearTimeout(t);
      unsub();
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveVideos(videos);
  }, [videos, loaded]);

  useEffect(() => {
    if (!feedback) return;
    const t = setTimeout(() => setFeedback(null), 3200);
    return () => clearTimeout(t);
  }, [feedback]);

  const disponiveis = useMemo(
    () => videos.filter(isAvailable).sort((a, b) => sortScore(a) - sortScore(b)),
    [videos]
  );

  const meus = useMemo(
    () =>
      videos
        .filter(
          (v) =>
            v.claimedBy === user.name && v.stage !== CONCLUIDO_STAGE
        )
        .sort((a, b) => sortScore(a) - sortScore(b)),
    [videos, user.name]
  );

  const emProducao = useMemo(
    () => videos.filter(isInProduction).sort((a, b) => sortScore(a) - sortScore(b)),
    [videos]
  );

  // ---------- ações ----------
  async function handleClaim(video) {
    const res = await claimVideoRemote(video.id);

    if (!res.ok) {
      if (res.reason === "already_claimed") {
        setFeedback({
          type: "error",
          msg: `"${video.title}" já foi pego por ${res.claimedBy}.`,
        });
      } else {
        setFeedback({ type: "error", msg: "Não foi possível pegar este vídeo." });
      }
      return;
    }

    setVideos((prev) => prev.map((v) => (v.id === res.video.id ? res.video : v)));
    setFeedback({
      type: "success",
      msg: `Você pegou "${video.title}". Bom trabalho!`,
    });
    setTab("meus");
  }

  async function handleRelease(video) {
    if (!window.confirm(`Liberar "${video.title}" de volta pra fila?`)) return;
    const res = await releaseVideoRemote(video.id);
    if (!res.ok) {
      setFeedback({ type: "error", msg: "Não foi possível liberar este vídeo." });
      return;
    }
    setVideos((prev) => prev.map((v) => (v.id === res.video.id ? res.video : v)));
    setFeedback({ type: "info", msg: `"${video.title}" foi liberado.` });
  }

  function handleConclude(video) {
    if (
      !window.confirm(
        `Concluir "${video.title}"? O vídeo vai pra etapa "Concluído" e some da sua fila.`
      )
    )
      return;

    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== video.id) return v;
        const oldLabel =
          stages.find((s) => s.id === v.stage)?.label ?? v.stage;
        return {
          ...v,
          stage: CONCLUIDO_STAGE,
          history: [
            ...v.history,
            {
              at: nowStamp(),
              text: `Concluído por ${user.name} (estava em ${oldLabel})`,
            },
          ],
        };
      })
    );
    setFeedback({
      type: "success",
      msg: `"${video.title}" concluído. Bom trabalho!`,
    });
  }

  function moveVideo(id, newStage) {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== id || v.stage === newStage) return v;
        const oldLabel = stages.find((s) => s.id === v.stage)?.label ?? v.stage;
        const newLabel = stages.find((s) => s.id === newStage)?.label ?? newStage;
        return {
          ...v,
          stage: newStage,
          history: [
            ...v.history,
            { at: nowStamp(), text: `Movido de ${oldLabel} para ${newLabel}` },
          ],
        };
      })
    );
  }

  function updateVideo(id, patch) {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === id
          ? {
              ...v,
              ...patch,
              history: [
                ...v.history,
                { at: nowStamp(), text: "Dados do vídeo editados" },
              ],
            }
          : v
      )
    );
  }

  function toggleChecklist(id, key) {
    setVideos((prev) =>
      prev.map((v) =>
        v.id === id
          ? { ...v, checklist: { ...v.checklist, [key]: !v.checklist[key] } }
          : v
      )
    );
  }

  function addRevision(id, description) {
    setVideos((prev) =>
      prev.map((v) => {
        if (v.id !== id) return v;
        const num = v.revisions.length + 1;
        return {
          ...v,
          revisions: [
            ...v.revisions,
            { number: num, requestedAt: nowStamp(), description, notes: "" },
          ],
          history: [
            ...v.history,
            { at: nowStamp(), text: `Alteração #${num} registrada` },
          ],
        };
      })
    );
  }

  if (!loaded) return null;

  const isAdmin = user.role === "admin";
  const detailVideo = videos.find((v) => v.id === detailId) || null;

  return (
    <div className="fila">
      {feedback && (
        <div className={"fila-feedback tone-" + feedback.type}>
          <span className="fila-feedback-icon">
            {feedback.type === "success" && "✓"}
            {feedback.type === "error" && "!"}
            {feedback.type === "info" && "i"}
          </span>
          <span>{feedback.msg}</span>
        </div>
      )}

      <div className="fila-tabs">
        <TabBtn
          active={tab === "fila"}
          onClick={() => setTab("fila")}
          label="Fila disponível"
          count={disponiveis.length}
        />
        <TabBtn
          active={tab === "meus"}
          onClick={() => setTab("meus")}
          label="Meus vídeos"
          count={meus.length}
          accent
        />
        <TabBtn
          active={tab === "todos"}
          onClick={() => setTab("todos")}
          label={isAdmin ? "Em produção (todos)" : "Em produção"}
          count={emProducao.length}
        />
      </div>

      {tab === "fila" && (
        <DisponiveisList
          videos={disponiveis}
          stages={stages}
          onClaim={handleClaim}
          onOpen={setDetailId}
        />
      )}
      {tab === "meus" && (
        <MeusVideosList
          videos={meus}
          stages={stages}
          onRelease={handleRelease}
          onConclude={handleConclude}
          onOpen={setDetailId}
        />
      )}
      {tab === "todos" && (
        <ProducaoList
          videos={emProducao}
          stages={stages}
          currentUser={user}
          isAdmin={isAdmin}
          onRelease={handleRelease}
          onOpen={setDetailId}
        />
      )}

      {detailVideo && (
        <VideoDrawer
          video={detailVideo}
          onClose={() => setDetailId(null)}
          onStageChange={(s) => moveVideo(detailVideo.id, s)}
          onToggleChecklist={(k) => toggleChecklist(detailVideo.id, k)}
          onAddRevision={(text) => addRevision(detailVideo.id, text)}
          onUpdate={(patch) => updateVideo(detailVideo.id, patch)}
          onClaim={handleClaim}
          onRelease={handleRelease}
          onConclude={handleConclude}
          currentUser={user}
          canEdit={true}
        />
      )}
    </div>
  );
}

function TabBtn({ active, onClick, label, count, accent }) {
  return (
    <button
      className={"fila-tab" + (active ? " active" : "") + (accent ? " accent" : "")}
      onClick={onClick}
    >
      <span>{label}</span>
      <span className="fila-tab-count">{count}</span>
    </button>
  );
}

/* ============================================================
   LISTA — VÍDEOS DISPONÍVEIS
   ============================================================ */
function DisponiveisList({ videos, stages, onClaim, onOpen }) {
  if (videos.length === 0) {
    return (
      <EmptyState
        title="Fila vazia"
        desc="Nenhum vídeo disponível no momento. Assim que novos vídeos entrarem no fluxo, eles aparecem aqui."
      />
    );
  }

  return (
    <div className="fila-grid">
      {videos.map((v) => {
        const info = deadlineInfo(v);
        const stage = stages.find((s) => s.id === v.stage);
        return (
          <div key={v.id} className={"fila-card tone-" + info.level}>
            <div
              className="fila-card-clickable"
              onClick={() => onOpen(v.id)}
              title="Ver detalhes do vídeo"
            >
              <div className="fila-card-top">
                <div className="fila-card-client">{v.client}</div>
                <span className={"fila-card-prio prio-" + v.priority}>
                  {v.priority}
                </span>
              </div>

              <div className="fila-card-title">{v.title}</div>

              <div className="fila-card-meta">
                <div className="fila-meta-item">
                  <span className="fila-meta-label">Etapa</span>
                  <span className="fila-meta-value">{stage?.label}</span>
                </div>
                <div className="fila-meta-item">
                  <span className="fila-meta-label">Formato</span>
                  <span className="fila-meta-value">{v.format}</span>
                </div>
                <div className="fila-meta-item">
                  <span className="fila-meta-label">Tipo</span>
                  <span className="fila-meta-value">{v.type}</span>
                </div>
              </div>

              {(v.filesLink || v.notes) && (
                <div className="fila-card-hint">
                  {v.filesLink && (
                    <span className="fila-hint-chip">📁 Arquivos</span>
                  )}
                  {v.notes && <span className="fila-hint-chip">📝 Obs.</span>}
                </div>
              )}
            </div>

            <div className="fila-card-foot">
              <div className="fila-card-dates">
                <span className="fila-date-chip">
                  <span className="fila-date-label">Entrega</span>
                  <span className="fila-date-value">
                    {fmtDateBR(v.dueDate)}
                  </span>
                </span>
                <span className={"fila-deadline tone-" + info.level}>
                  {info.label}
                </span>
              </div>

              <div className="fila-card-actions">
                {v.filesLink && (
                  <a
                    className="btn btn-ghost fila-details-btn"
                    href={v.filesLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Abrir arquivos"
                  >
                    <FolderOpen size={14} />
                  </a>
                )}
                <button
                  className="btn btn-ghost fila-details-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(v.id);
                  }}
                >
                  Ver detalhes
                </button>
                <button
                  className="btn btn-primary fila-claim-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onClaim(v);
                  }}
                >
                  Pegar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   LISTA — MEUS VÍDEOS
   ============================================================ */
function MeusVideosList({ videos, stages, onRelease, onConclude, onOpen }) {
  if (videos.length === 0) {
    return (
      <EmptyState
        title="Você não tem vídeos em andamento"
        desc="Vá até a aba 'Fila disponível' e pegue um vídeo pra começar."
      />
    );
  }

  return (
    <div className="fila-grid">
      {videos.map((v) => {
        const info = deadlineInfo(v);
        const stage = stages.find((s) => s.id === v.stage);
        const checked = Object.values(v.checklist || {}).filter(Boolean).length;
        return (
          <div key={v.id} className={"fila-card mine tone-" + info.level}>
            <div
              className="fila-card-clickable"
              onClick={() => onOpen(v.id)}
              title="Ver detalhes do vídeo"
            >
              <div className="fila-card-top">
                <div className="fila-card-client">{v.client}</div>
                <span className="fila-card-tag mine-tag">Meu</span>
              </div>

              <div className="fila-card-title">{v.title}</div>

              <div className="fila-card-meta">
                <div className="fila-meta-item">
                  <span className="fila-meta-label">Etapa</span>
                  <span className="fila-meta-value">{stage?.label}</span>
                </div>
                <div className="fila-meta-item">
                  <span className="fila-meta-label">Checklist</span>
                  <span className="fila-meta-value">
                    {checked}/{CHECKLIST_DEFS.length}
                  </span>
                </div>
              </div>

              {(v.filesLink || v.notes) && (
                <div className="fila-card-hint">
                  {v.filesLink && (
                    <span className="fila-hint-chip">📁 Arquivos</span>
                  )}
                  {v.notes && <span className="fila-hint-chip">📝 Obs.</span>}
                </div>
              )}
            </div>

            <div className="fila-card-foot">
              <div className="fila-card-dates">
                <span className={"fila-deadline tone-" + info.level}>
                  {info.label}
                </span>
              </div>
              <div className="fila-card-actions">
                {v.filesLink && (
                  <a
                    className="btn btn-ghost fila-details-btn"
                    href={v.filesLink}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    title="Abrir arquivos"
                  >
                    <FolderOpen size={14} />
                  </a>
                )}
                <button
                  className="btn btn-ghost fila-details-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpen(v.id);
                  }}
                >
                  Abrir
                </button>
                <button
                  className="btn btn-ghost fila-claim-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRelease(v);
                  }}
                >
                  Liberar
                </button>
                <button
                  className="btn btn-primary fila-claim-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    onConclude(v);
                  }}
                  title="Marcar como concluído"
                >
                  <CheckCircle2 size={14} /> Concluir
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   LISTA — EM PRODUÇÃO (TODOS)
   ============================================================ */
function ProducaoList({ videos, stages, currentUser, isAdmin, onRelease, onOpen }) {
  if (videos.length === 0) {
    return (
      <EmptyState
        title="Ninguém editando agora"
        desc="Nenhum vídeo em produção no momento."
      />
    );
  }

  return (
    <div className="fila-table">
      <div className="fila-table-head">
        <span>Cliente / Vídeo</span>
        <span>Editor</span>
        <span>Etapa</span>
        <span>Pegou em</span>
        <span>Prazo</span>
        <span></span>
      </div>

      {videos.map((v) => {
        const info = deadlineInfo(v);
        const stage = stages.find((s) => s.id === v.stage);
        const isMine = v.claimedBy === currentUser.name;
        const canRelease = isMine || isAdmin;

        return (
          <div
            key={v.id}
            className="fila-table-row clickable"
            onClick={() => onOpen(v.id)}
          >
            <div className="fila-table-cell">
              <div className="fila-table-client">{v.client}</div>
              <div className="fila-table-title">{v.title}</div>
            </div>
            <div className="fila-table-cell">
              <span className="fila-owner-pill">
                <span className="fila-owner-avatar">
                  {v.claimedBy?.slice(0, 1)}
                </span>
                {v.claimedBy}
              </span>
            </div>
            <div className="fila-table-cell">
              <span className="fila-stage-pill">{stage?.label}</span>
            </div>
            <div className="fila-table-cell fila-cell-muted">
              {v.claimedAt || "—"}
            </div>
            <div className="fila-table-cell">
              <span className={"fila-deadline tone-" + info.level}>
                {info.label}
              </span>
            </div>
            <div className="fila-table-cell fila-cell-actions">
              {canRelease && (
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRelease(v);
                  }}
                >
                  Liberar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   EMPTY STATE
   ============================================================ */
function EmptyState({ title, desc }) {
  return (
    <div className="fila-empty">
      <div className="fila-empty-icon">
        <Video size={28} />
      </div>
      <div className="fila-empty-title">{title}</div>
      <div className="fila-empty-desc">{desc}</div>
    </div>
  );
}