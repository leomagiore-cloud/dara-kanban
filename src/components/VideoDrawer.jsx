import React, { useState, useEffect } from "react";
import {
  CHECKLIST_DEFS,
  PRIORITIES,
  FORMATS,
  TYPES,
  deadlineInfo,
  fmtDateBR,
} from "../lib/utils";
import { loadSettings } from "../lib/settings";
import "./video-drawer.css";
import { Download, Pencil } from "lucide-react";

/* ============================================================
   VIDEO DRAWER — compartilhado entre Kanban e Fila
   ============================================================ */

export default function VideoDrawer({
  video,
  onClose,
  onStageChange,
  onToggleChecklist,
  onAddRevision,
  onUpdate,
  onDelete,
  onClaim,
  onRelease,
  currentUser,
  canEdit = true,
}) {
  const [revisionText, setRevisionText] = useState("");
  const [editing, setEditing] = useState(false);
  const [stages, setStages] = useState(() => loadSettings().stages);
  const info = deadlineInfo(video);

  // mantém as etapas em sincronia com as configurações
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === "dara-settings") {
        setStages(loadSettings().stages);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // fecha com ESC
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const checkedCount = Object.values(video.checklist || {}).filter(Boolean).length;
  const totalChecks = CHECKLIST_DEFS.length;

  const isMine = video.claimedBy === currentUser?.name;
  const isAdmin = currentUser?.role === "admin";
  const canRelease = isMine || isAdmin;
  const canClaim =
    onClaim &&
    !video.claimedBy &&
    (video.stage === "GRAVADO" || video.stage === "DECUPAGEM");

  return (
    <div className="vd-overlay" onClick={onClose}>
      <div className="vd" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="vd-head">
          <div className="vd-head-info">
            <span className="vd-client">{video.client}</span>
            <span className="vd-title">{video.title}</span>
          </div>
          <div className="vd-head-actions">
            {canEdit && !editing && (
              <button
                className="vd-head-btn"
                onClick={() => setEditing(true)}
                title="Editar vídeo"
              >
                <Pencil size={15} />
              </button>
            )}
            <button className="vd-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {/* Ações rápidas: pegar / liberar */}
        {(canClaim || (canRelease && onRelease)) && !editing && (
          <div className="vd-actions-bar">
            {canClaim && (
              <button
                className="btn btn-primary vd-action-btn"
                onClick={() => {
                  onClaim(video);
                  onClose();
                }}
              >
                🎬 Pegar este vídeo
              </button>
            )}
            {canRelease && onRelease && (
              <button
                className="btn btn-ghost vd-action-btn"
                onClick={() => {
                  if (
                    window.confirm(
                      `Liberar "${video.title}" de volta pra fila?`
                    )
                  ) {
                    onRelease(video);
                    onClose();
                  }
                }}
              >
                Liberar
              </button>
            )}
          </div>
        )}

        {/* Modo edição */}
        {editing && (
          <div className="vd-section">
            <VideoEditForm
              video={video}
              onSave={(draft) => {
                onUpdate(draft);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        )}

        {/* Modo visualização */}
        {!editing && (
          <>
            {/* Status */}
            <div className="vd-status">
              <span className={"vd-deadline tone-" + info.level}>
                {info.label}
              </span>
              <select
                className="vd-stage-select"
                value={video.stage}
                onChange={(e) => onStageChange(e.target.value)}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Grid de dados */}
            <div className="vd-grid">
              <Field label="Gravado" value={fmtDateBR(video.shootDate)} />
              <Field label="Entrega" value={fmtDateBR(video.dueDate)} />
              <Field label="Editor" value={video.editor || "—"} />
              <Field label="Prioridade" value={video.priority} />
              <Field label="Formato" value={video.format} />
              <Field label="Tipo" value={video.type} />
            </div>

            {/* Quem está editando */}
            {video.claimedBy && (
              <div className="vd-section">
                <div className="vd-section-title">
                  {isMine ? "Você está editando" : "Em edição por"}
                </div>
                <div className="vd-claimed">
                  <span className="vd-claimed-avatar">
                    {video.claimedBy.slice(0, 1)}
                  </span>
                  <span>{video.claimedBy}</span>
                  {video.claimedAt && (
                    <span className="vd-muted">· desde {video.claimedAt}</span>
                  )}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="vd-section">
              <div className="vd-section-title">Links e arquivos</div>
              <div className="vd-links">
                {video.filesLink ? (
                  <a
                    href={video.filesLink}
                    target="_blank"
                    rel="noreferrer"
                    className="vd-link primary"
                  >
                    <Download size={14} />
                    Abrir arquivos
                  </a>
                ) : (
                  <span className="vd-muted">
                    Nenhum link de arquivo cadastrado
                  </span>
                )}
                {video.scriptLink && (
                  <a
                    href={video.scriptLink}
                    target="_blank"
                    rel="noreferrer"
                    className="vd-link"
                  >
                    📝 Roteiro / referência
                  </a>
                )}
              </div>
            </div>

            {/* Observações */}
            {video.notes && (
              <div className="vd-section">
                <div className="vd-section-title">Observações</div>
                <div className="vd-notes">{video.notes}</div>
              </div>
            )}

            {/* Checklist */}
            <div className="vd-section">
              <div className="vd-section-title">
                Checklist de finalização
                <span className="vd-section-count">
                  {checkedCount}/{totalChecks}
                </span>
              </div>
              <div className="vd-checklist">
                {CHECKLIST_DEFS.map(([key, label]) => (
                  <label key={key} className="vd-check">
                    <input
                      type="checkbox"
                      checked={!!video.checklist?.[key]}
                      onChange={() => onToggleChecklist(key)}
                    />
                    <span className="vd-check-box" />
                    <span className="vd-check-label">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Registrar alteração */}
            {video.stage === "ALTERACAO" && (
              <div className="vd-section">
                <div className="vd-section-title">Registrar alteração</div>
                <textarea
                  className="vd-textarea"
                  rows="2"
                  placeholder="Ex: Trocar música e corrigir lettering aos 00:32."
                  value={revisionText}
                  onChange={(e) => setRevisionText(e.target.value)}
                />
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => {
                    if (revisionText.trim()) {
                      onAddRevision(revisionText.trim());
                      setRevisionText("");
                    }
                  }}
                >
                  Adicionar alteração
                </button>
              </div>
            )}

            {/* Alterações */}
            {video.revisions && video.revisions.length > 0 && (
              <div className="vd-section">
                <div className="vd-section-title">Alterações</div>
                {video.revisions.map((r) => (
                  <div key={r.number} className="vd-revision">
                    <div className="vd-revision-head">
                      <strong>#{r.number}</strong>
                      <span className="vd-muted">{r.requestedAt}</span>
                    </div>
                    <div className="vd-revision-body">{r.description}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Histórico */}
            <div className="vd-section">
              <div className="vd-section-title">Histórico</div>
              <div className="vd-history">
                {video.history.map((h, i) => (
                  <div key={i} className="vd-history-item">
                    <span className="vd-history-dot" />
                    <span className="vd-history-at">{h.at}</span>
                    <span className="vd-history-text">{h.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Delete */}
            {onDelete && (
              <div className="vd-section">
                <button
                  className="btn btn-danger"
                  onClick={() => {
                    if (
                      window.confirm(
                        "Excluir este vídeo? Essa ação não pode ser desfeita."
                      )
                    ) {
                      onDelete();
                    }
                  }}
                >
                  Excluir vídeo
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   FORM DE EDIÇÃO
   ============================================================ */
function VideoEditForm({ video, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    client: video.client,
    title: video.title,
    shootDate: video.shootDate,
    dueDate: video.dueDate,
    editor: video.editor || "",
    priority: video.priority,
    format: video.format,
    type: video.type,
    notes: video.notes || "",
    filesLink: video.filesLink || "",
    scriptLink: video.scriptLink || "",
  });

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <div className="vd-form">
      <div className="vd-form-row">
        <label className="field">
          <span>Cliente *</span>
          <input value={draft.client} onChange={set("client")} />
        </label>
        <label className="field">
          <span>Nome do vídeo *</span>
          <input value={draft.title} onChange={set("title")} />
        </label>
      </div>

      <div className="vd-form-row">
        <label className="field">
          <span>Data da gravação</span>
          <input
            type="date"
            value={draft.shootDate}
            onChange={set("shootDate")}
          />
        </label>
        <label className="field">
          <span>Entrega</span>
          <input type="date" value={draft.dueDate} onChange={set("dueDate")} />
        </label>
      </div>

      <div className="vd-form-row">
        <label className="field">
          <span>Editor responsável</span>
          <input value={draft.editor} onChange={set("editor")} />
        </label>
        <label className="field">
          <span>Prioridade</span>
          <select value={draft.priority} onChange={set("priority")}>
            {PRIORITIES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="vd-form-row">
        <label className="field">
          <span>Formato</span>
          <select value={draft.format} onChange={set("format")}>
            {FORMATS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tipo</span>
          <select value={draft.type} onChange={set("type")}>
            {TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Observações</span>
        <textarea rows="2" value={draft.notes} onChange={set("notes")} />
      </label>

      <div className="vd-form-row">
        <label className="field">
          <span>Link dos arquivos</span>
          <input value={draft.filesLink} onChange={set("filesLink")} />
        </label>
        <label className="field">
          <span>Link do roteiro</span>
          <input value={draft.scriptLink} onChange={set("scriptLink")} />
        </label>
      </div>

      <div className="vd-form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>
          Cancelar
        </button>
        <button
          className="btn btn-primary"
          onClick={() => {
            if (!draft.client.trim() || !draft.title.trim()) return;
            onSave(draft);
          }}
        >
          Salvar alterações
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="vd-field">
      <span className="vd-field-label">{label}</span>
      <span className="vd-field-value">{value}</span>
    </div>
  );
}