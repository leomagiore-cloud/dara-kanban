import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Search, Calendar, Pencil } from "lucide-react";
import "./kanban.css";
import {
  CHECKLIST_DEFS,
  deadlineInfo,
  sortScore,
  toISODate,
  addBusinessDays,
  parseISODate,
  fmtDateBR,
  nowStamp,
  uid,
} from "../lib/utils";
import { loadSettings } from "../lib/settings";
import {
  loadVideos,
  saveVideos,
  subscribeVideos,
  loadClients, /* NOVO */
} from "../lib/db";

/* ============================================================
   KANBAN — fluxo de produção audiovisual
   ============================================================ */

const EMPTY_FORM = {
  client: "",
  title: "",
  shootDate: toISODate(new Date()),
  dueDate: "",
  dueDateEdited: false,
  editor: "",
  priority: "",
  format: "",
  type: "",
  notes: "",
  filesLink: "",
  scriptLink: "",
};

export default function Kanban() {
  const [videos, setVideos] = useState([]);
  const [clients, setClients] = useState([]); /* NOVO */
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState(() => loadSettings());
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [editorFilter, setEditorFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [manualSort, setManualSort] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [detailId, setDetailId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const stages = settings.stages;

  // ---------- settings sync ----------
  useEffect(() => {
    const onStorage = (e) => {
      if (!e.key || e.key === "dara-settings") {
        setSettings(loadSettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // ---------- carregar ----------
  useEffect(() => {
    let alive = true;
    const refresh = () =>
      loadVideos().then((stored) => {
        if (alive && stored) setVideos(stored);
      });
    refresh().finally(() => alive && setLoaded(true));

    /* NOVO — carrega clientes cadastrados */
    loadClients().then((list) => {
      if (alive && list) setClients(list);
    });

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

  // ---------- salvar ----------
  useEffect(() => {
    if (!loaded) return;
    saveVideos(videos);
  }, [videos, loaded]);

  // ---------- derivados ----------
  const clientsFromVideos = useMemo(
    () => Array.from(new Set(videos.map((v) => v.client))).sort(),
    [videos]
  );

  /* NOVO — mescla clientes do cadastro com os que apareceram só em vídeos */
  const allClientNames = useMemo(() => {
    const set = new Set([
      ...clients.map((c) => c.name).filter(Boolean),
      ...clientsFromVideos,
    ]);
    return Array.from(set).sort();
  }, [clients, clientsFromVideos]);

  const editors = useMemo(
    () => Array.from(new Set(videos.map((v) => v.editor).filter(Boolean))).sort(),
    [videos]
  );

  const filtered = useMemo(() => {
    return videos.filter((v) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !v.client.toLowerCase().includes(q) &&
          !v.title.toLowerCase().includes(q)
        )
          return false;
      }
      if (clientFilter && v.client !== clientFilter) return false;
      if (editorFilter && v.editor !== editorFilter) return false;
      if (priorityFilter && v.priority !== priorityFilter) return false;
      return true;
    });
  }, [videos, search, clientFilter, editorFilter, priorityFilter]);

  function stageVideos(stageId) {
    const list = filtered.filter((v) => v.stage === stageId);
    if (manualSort) {
      return list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    return list.sort((a, b) => sortScore(a) - sortScore(b));
  }

  // ---------- ações ----------
  function addHistory(video, text) {
    return { ...video, history: [...video.history, { at: nowStamp(), text }] };
  }

  const moveVideo = useCallback(
    (id, newStage) => {
      setVideos((prev) =>
        prev.map((v) => {
          if (v.id !== id || v.stage === newStage) return v;
          const oldLabel = stages.find((s) => s.id === v.stage)?.label ?? v.stage;
          const newLabel = stages.find((s) => s.id === newStage)?.label ?? newStage;
          let nv = { ...v, stage: newStage };
          nv = addHistory(nv, `Movido de ${oldLabel} para ${newLabel}`);
          if (newStage === "ENVIADO") nv = addHistory(nv, "Enviado ao cliente");
          if (newStage === "CONCLUIDO") nv = addHistory(nv, "Concluído");
          return nv;
        })
      );
    },
    [stages]
  );

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
        let nv = {
          ...v,
          revisions: [
            ...v.revisions,
            { number: num, requestedAt: nowStamp(), description, notes: "" },
          ],
        };
        nv = addHistory(nv, `Alteração #${num} registrada`);
        return nv;
      })
    );
  }

  function deleteVideo(id) {
    setVideos((prev) => prev.filter((v) => v.id !== id));
    setDetailId(null);
  }

  function openNewModal(prefill) {
    if (prefill) {
      setForm({ ...EMPTY_FORM, ...prefill });
    } else {
      setForm({
        ...EMPTY_FORM,
        priority: settings.priorities?.[0] || "Normal",
        format: settings.formats?.[0] || "Vertical 9:16",
        type: settings.types?.[0] || "Vídeo imobiliário",
      });
    }
    setModalOpen(true);
  }

  function submitForm(addAnother) {
    if (!form.client.trim() || !form.title.trim() || !form.shootDate) return;
    const shoot = parseISODate(form.shootDate);
    const due = form.dueDate || toISODate(addBusinessDays(shoot, 3));
    const firstStage = stages[0]?.id || "GRAVADO";
    const newVideo = {
      id: uid(),
      client: form.client.trim(),
      title: form.title.trim(),
      shootDate: form.shootDate,
      dueDate: due,
      editor: form.editor.trim(),
      priority: form.priority || "Normal",
      format: form.format || "",
      type: form.type || "",
      notes: form.notes,
      filesLink: form.filesLink,
      scriptLink: form.scriptLink,
      stage: firstStage,
      order: 0,
      checklist: Object.fromEntries(CHECKLIST_DEFS.map(([k]) => [k, false])),
      revisions: [],
      history: [{ at: nowStamp(), text: "Vídeo cadastrado" }],
      createdAt: Date.now(),
    };
    setVideos((prev) => [...prev, newVideo]);
    if (addAnother) {
      setForm({
        ...EMPTY_FORM,
        client: newVideo.client,
        shootDate: newVideo.shootDate,
        editor: newVideo.editor,
        filesLink: newVideo.filesLink,
        scriptLink: newVideo.scriptLink,
        priority: settings.priorities?.[0] || "Normal",
        format: settings.formats?.[0] || "Vertical 9:16",
        type: settings.types?.[0] || "Vídeo imobiliário",
      });
    } else {
      setModalOpen(false);
    }
  }

  // auto-calc dueDate
  useEffect(() => {
    if (!modalOpen) return;
    if (form.dueDateEdited) return;
    if (!form.shootDate) return;
    const due = toISODate(addBusinessDays(parseISODate(form.shootDate), 3));
    setForm((f) => (f.dueDateEdited ? f : { ...f, dueDate: due }));
  }, [form.shootDate, modalOpen, form.dueDateEdited]);

  const detailVideo = videos.find((v) => v.id === detailId) || null;

  if (!loaded) return null;

  return (
    <div className="kb">
      {/* ---------- Filtros ---------- */}
      <div className="kb-toolbar">
        <div className="kb-search-wrap">
          <Search size={16} />
          <input
            placeholder="Buscar cliente ou vídeo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select value={clientFilter} onChange={(e) => setClientFilter(e.target.value)}>
          <option value="">Todos os clientes</option>
          {allClientNames.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={editorFilter} onChange={(e) => setEditorFilter(e.target.value)}>
          <option value="">Todos os editores</option>
          {editors.map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>

        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">Todas as prioridades</option>
          {(settings.priorities || []).map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>

        <button
          className={"kb-chip" + (manualSort ? " active" : "")}
          onClick={() => setManualSort((s) => !s)}
          title="Alternar tipo de ordenação"
        >
          {manualSort ? "Ordem manual" : "Ordem inteligente"}
        </button>

        <button className="btn btn-primary kb-new-btn" onClick={() => openNewModal(null)}>
          + Novo vídeo
        </button>
      </div>

      {/* ---------- Board ---------- */}
      <div className="kb-board">
        {stages.map((stage) => {
          const list = stageVideos(stage.id);
          const isOver = dragOverStage === stage.id;

          return (
            <div
              key={stage.id}
              className={"kb-column tone-" + (stage.tone || "neutral") + (isOver ? " drag-over" : "")}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverStage !== stage.id) setDragOverStage(stage.id);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget)) {
                  setDragOverStage(null);
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (dragId) moveVideo(dragId, stage.id);
                setDragId(null);
                setDragOverStage(null);
              }}
            >
              <div className="kb-col-head">
                <div className="kb-col-title-wrap">
                  <span className="kb-col-dot" />
                  <span className="kb-col-title">{stage.label}</span>
                  <span className="kb-col-count">{list.length}</span>
                </div>
              </div>
              <div className="kb-col-hint">{stage.hint}</div>

              <div className="kb-col-body">
                {list.map((v) => (
                  <VideoCard
                    key={v.id}
                    video={v}
                    stages={stages}
                    onDragStart={() => setDragId(v.id)}
                    onDragEnd={() => {
                      setDragId(null);
                      setDragOverStage(null);
                    }}
                    onOpen={() => setDetailId(v.id)}
                    onStageChange={(s) => moveVideo(v.id, s)}
                  />
                ))}

                {list.length === 0 && (
                  <div className="kb-empty">
                    {isOver ? "Solte aqui" : "Nada por aqui"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---------- Modal novo ---------- */}
      {modalOpen && (
        <Modal onClose={() => setModalOpen(false)} title="Novo vídeo">
          <VideoForm
            form={form}
            setForm={setForm}
            settings={settings}
            clientSuggestions={allClientNames}
            onCancel={() => setModalOpen(false)}
            onSubmit={() => submitForm(false)}
            onSubmitAndAnother={() => submitForm(true)}
          />
        </Modal>
      )}

      {/* ---------- Drawer detalhes ---------- */}
      {detailVideo && (
        <DetailDrawer
          video={detailVideo}
          stages={stages}
          settings={settings}
          onClose={() => setDetailId(null)}
          onStageChange={(s) => moveVideo(detailVideo.id, s)}
          onToggleChecklist={(k) => toggleChecklist(detailVideo.id, k)}
          onAddRevision={(text) => addRevision(detailVideo.id, text)}
          onUpdate={(patch) => updateVideo(detailVideo.id, patch)}
          onDelete={() => deleteVideo(detailVideo.id)}
        />
      )}
    </div>
  );
}

/* ============================================================
   VIDEO CARD
   ============================================================ */
function VideoCard({ video, stages, onDragStart, onDragEnd, onOpen, onStageChange }) {
  const info = deadlineInfo(video);
  return (
    <div
      className={"kb-card tone-" + info.level}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onOpen}
    >
      <div className="kb-card-head">
        <span className="kb-card-client">{video.client}</span>
        {video.priority && video.priority !== "Normal" && (
          <span className={"kb-prio prio-" + video.priority}>
            {video.priority}
          </span>
        )}
      </div>

      <div className="kb-card-title">{video.title}</div>

      {video.claimedBy && (
        <div className="kb-card-owner">
          <span className="kb-card-owner-avatar">
            {video.claimedBy.slice(0, 1)}
          </span>
          <span className="kb-card-owner-name">{video.claimedBy}</span>
        </div>
      )}

      <div className="kb-card-meta">
        <span className="kb-card-meta-item">
          <Calendar size={12} />
          {fmtDateBR(video.dueDate)}
        </span>
        {video.editor && (
          <span className="kb-card-meta-item editor">
            {video.editor.slice(0, 1)}
          </span>
        )}
      </div>

      <div className="kb-card-foot">
        <span className={"kb-deadline tone-" + info.level}>{info.label}</span>
      </div>

      <select
        className="kb-stage-select"
        value={video.stage}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => onStageChange(e.target.value)}
        title="Mover para outra etapa"
      >
        {stages.map((s) => (
          <option key={s.id} value={s.id}>{s.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ============================================================
   MODAL
   ============================================================ */
function Modal({ children, onClose, title }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="kb-overlay" onClick={onClose}>
      <div className="kb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kb-modal-head">
          <span>{title}</span>
          <button className="kb-close" onClick={onClose}>✕</button>
        </div>
        <div className="kb-modal-body">{children}</div>
      </div>
    </div>
  );
}

/* ============================================================
   FORM NOVO VÍDEO — cliente com sugestões + selects dinâmicos
   ============================================================ */
function VideoForm({
  form,
  setForm,
  settings,
  clientSuggestions,
  onCancel,
  onSubmit,
  onSubmitAndAnother,
}) {
  const set = (k) => (e) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.value,
      ...(k === "dueDate" ? { dueDateEdited: true } : {}),
    }));

  const priorities = settings.priorities || [];
  const formats = settings.formats || [];
  const types = settings.types || [];

  return (
    <div className="kb-form">
      <div className="kb-form-row">
        <label className="field">
          <span>Cliente *</span>
          <input
            list="kb-client-suggestions"
            value={form.client}
            onChange={set("client")}
            placeholder="Digite ou escolha um cliente cadastrado"
          />
          <datalist id="kb-client-suggestions">
            {clientSuggestions.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </label>
        <label className="field">
          <span>Nome do vídeo *</span>
          <input
            value={form.title}
            onChange={set("title")}
            placeholder="Ex: Pré-lançamento"
          />
        </label>
      </div>

      <div className="kb-form-row">
        <label className="field">
          <span>Data da gravação *</span>
          <input
            type="date"
            value={form.shootDate}
            onChange={set("shootDate")}
          />
        </label>
        <label className="field">
          <span>Entrega (auto: +3 dias úteis)</span>
          <input type="date" value={form.dueDate} onChange={set("dueDate")} />
        </label>
      </div>

      <div className="kb-form-row">
        <label className="field">
          <span>Editor responsável</span>
          <input
            value={form.editor}
            onChange={set("editor")}
            placeholder="Editor"
          />
        </label>
        <label className="field">
          <span>Prioridade</span>
          <select value={form.priority} onChange={set("priority")}>
            <option value="">— Selecione —</option>
            {priorities.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="kb-form-row">
        <label className="field">
          <span>Formato</span>
          <select value={form.format} onChange={set("format")}>
            <option value="">— Selecione —</option>
            {formats.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Tipo</span>
          <select value={form.type} onChange={set("type")}>
            <option value="">— Selecione —</option>
            {types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Observações</span>
        <textarea rows="2" value={form.notes} onChange={set("notes")} />
      </label>

      <div className="kb-form-row">
        <label className="field">
          <span>Link dos arquivos</span>
          <input
            value={form.filesLink}
            onChange={set("filesLink")}
            placeholder="Drive, WeTransfer…"
          />
        </label>
        <label className="field">
          <span>Link do roteiro/referência</span>
          <input value={form.scriptLink} onChange={set("scriptLink")} />
        </label>
      </div>

      <div className="kb-form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn btn-ghost" onClick={onSubmitAndAnother}>
          Salvar + criar outro
        </button>
        <button className="btn btn-primary" onClick={onSubmit}>Salvar vídeo</button>
      </div>
    </div>
  );
}

/* ============================================================
   FORM DE EDIÇÃO
   ============================================================ */
function VideoEditForm({ video, settings, onSave, onCancel }) {
  const priorities = settings.priorities || [];
  const formats = settings.formats || [];
  const types = settings.types || [];

  const [draft, setDraft] = useState({
    client: video.client,
    title: video.title,
    shootDate: video.shootDate,
    dueDate: video.dueDate,
    editor: video.editor || "",
    priority: video.priority || "",
    format: video.format || "",
    type: video.type || "",
    notes: video.notes || "",
    filesLink: video.filesLink || "",
    scriptLink: video.scriptLink || "",
  });

  const set = (k) => (e) => setDraft((d) => ({ ...d, [k]: e.target.value }));

  return (
    <div className="kb-form">
      <div className="kb-form-row">
        <label className="field">
          <span>Cliente *</span>
          <input value={draft.client} onChange={set("client")} />
        </label>
        <label className="field">
          <span>Nome do vídeo *</span>
          <input value={draft.title} onChange={set("title")} />
        </label>
      </div>

      <div className="kb-form-row">
        <label className="field">
          <span>Data da gravação</span>
          <input type="date" value={draft.shootDate} onChange={set("shootDate")} />
        </label>
        <label className="field">
          <span>Entrega</span>
          <input type="date" value={draft.dueDate} onChange={set("dueDate")} />
        </label>
      </div>

      <div className="kb-form-row">
        <label className="field">
          <span>Editor responsável</span>
          <input value={draft.editor} onChange={set("editor")} />
        </label>
        <label className="field">
          <span>Prioridade</span>
          <select value={draft.priority} onChange={set("priority")}>
            <option value="">—</option>
            {priorities.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
      </div>

      <div className="kb-form-row">
        <label className="field">
          <span>Formato</span>
          <select value={draft.format} onChange={set("format")}>
            <option value="">—</option>
            {formats.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Tipo</span>
          <select value={draft.type} onChange={set("type")}>
            <option value="">—</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
      </div>

      <label className="field">
        <span>Observações</span>
        <textarea rows="2" value={draft.notes} onChange={set("notes")} />
      </label>

      <div className="kb-form-row">
        <label className="field">
          <span>Link dos arquivos</span>
          <input value={draft.filesLink} onChange={set("filesLink")} />
        </label>
        <label className="field">
          <span>Link do roteiro</span>
          <input value={draft.scriptLink} onChange={set("scriptLink")} />
        </label>
      </div>

      <div className="kb-form-actions">
        <button className="btn btn-ghost" onClick={onCancel}>Cancelar</button>
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

/* ============================================================
   DRAWER DE DETALHES
   ============================================================ */
function DetailDrawer({
  video,
  stages,
  settings,
  onClose,
  onStageChange,
  onToggleChecklist,
  onAddRevision,
  onUpdate,
  onDelete,
}) {
  const [revisionText, setRevisionText] = useState("");
  const [editing, setEditing] = useState(false);
  const info = deadlineInfo(video);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const checkedCount = Object.values(video.checklist).filter(Boolean).length;
  const totalChecks = CHECKLIST_DEFS.length;

  return (
    <div className="kb-drawer-overlay" onClick={onClose}>
      <div className="kb-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="kb-drawer-head">
          <div className="kb-drawer-head-info">
            <span className="kb-card-client big">{video.client}</span>
            <span className="kb-drawer-title">{video.title}</span>
          </div>
          <div className="kb-drawer-head-actions">
            {!editing && (
              <button
                className="kb-head-btn"
                onClick={() => setEditing(true)}
                title="Editar vídeo"
              >
                <Pencil size={15} />
              </button>
            )}
            <button className="kb-close" onClick={onClose}>✕</button>
          </div>
        </div>

        {editing && (
          <div className="kb-drawer-section">
            <VideoEditForm
              video={video}
              settings={settings}
              onSave={(draft) => {
                onUpdate(draft);
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        )}

        {!editing && (
          <>
            <div className="kb-drawer-status">
              <span className={"kb-deadline tone-" + info.level}>{info.label}</span>
              <select
                className="kb-drawer-stage"
                value={video.stage}
                onChange={(e) => onStageChange(e.target.value)}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </div>

            <div className="kb-drawer-grid">
              <Field label="Gravado" value={fmtDateBR(video.shootDate)} />
              <Field label="Entrega" value={fmtDateBR(video.dueDate)} />
              <Field label="Editor" value={video.editor || "—"} />
              <Field label="Prioridade" value={video.priority || "—"} />
              <Field label="Formato" value={video.format || "—"} />
              <Field label="Tipo" value={video.type || "—"} />
            </div>

            {video.claimedBy && (
              <div className="kb-drawer-section">
                <div className="kb-section-title">Em edição por</div>
                <div className="kb-claimed">
                  <span className="kb-claimed-avatar">
                    {video.claimedBy.slice(0, 1)}
                  </span>
                  <span>{video.claimedBy}</span>
                  <span className="kb-muted">· desde {video.claimedAt}</span>
                </div>
              </div>
            )}

            {video.notes && (
              <div className="kb-drawer-section">
                <div className="kb-section-title">Observações</div>
                <div className="kb-notes">{video.notes}</div>
              </div>
            )}

            <div className="kb-drawer-section">
              <div className="kb-section-title">Links</div>
              <div className="kb-links">
                {video.filesLink && (
                  <a href={video.filesLink} target="_blank" rel="noreferrer" className="kb-link">
                    📁 Arquivos
                  </a>
                )}
                {video.scriptLink && (
                  <a href={video.scriptLink} target="_blank" rel="noreferrer" className="kb-link">
                    📝 Roteiro
                  </a>
                )}
                {!video.filesLink && !video.scriptLink && (
                  <span className="kb-muted">Nenhum link cadastrado</span>
                )}
              </div>
            </div>

            <div className="kb-drawer-section">
              <div className="kb-section-title">
                Checklist
                <span className="kb-section-count">{checkedCount}/{totalChecks}</span>
              </div>
              <div className="kb-checklist">
                {CHECKLIST_DEFS.map(([key, label]) => (
                  <label key={key} className="kb-check">
                    <input
                      type="checkbox"
                      checked={!!video.checklist[key]}
                      onChange={() => onToggleChecklist(key)}
                    />
                    <span className="kb-check-box" />
                    <span className="kb-check-label">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {video.stage === "ALTERACAO" && (
              <div className="kb-drawer-section">
                <div className="kb-section-title">Registrar alteração</div>
                <textarea
                  className="kb-textarea"
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
                  Adicionar
                </button>
              </div>
            )}

            {video.revisions.length > 0 && (
              <div className="kb-drawer-section">
                <div className="kb-section-title">Alterações</div>
                {video.revisions.map((r) => (
                  <div key={r.number} className="kb-revision">
                    <div className="kb-revision-head">
                      <strong>#{r.number}</strong>
                      <span className="kb-muted">{r.requestedAt}</span>
                    </div>
                    <div className="kb-revision-body">{r.description}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="kb-drawer-section">
              <div className="kb-section-title">Histórico</div>
              <div className="kb-history">
                {video.history.map((h, i) => (
                  <div key={i} className="kb-history-item">
                    <span className="kb-history-dot" />
                    <span className="kb-history-at">{h.at}</span>
                    <span className="kb-history-text">{h.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="kb-drawer-section">
              <button
                className="btn btn-danger"
                onClick={() => {
                  if (window.confirm("Excluir este vídeo? Essa ação não pode ser desfeita.")) {
                    onDelete();
                  }
                }}
              >
                Excluir vídeo
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div className="kb-field">
      <span className="kb-field-label">{label}</span>
      <span className="kb-field-value">{value}</span>
    </div>
  );
}