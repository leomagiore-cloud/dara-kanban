import React, { useState } from "react";
import "./configuracoes.css";
import { supabase } from "../lib/supabase";
import { useAuth, traduzErro } from "../lib/auth";
import {
  loadSettings,
  saveSettings,
  resetSettings,
  stageIdFromLabel,
  OPTION_LISTS,
  addOption,
  renameOption,
  removeOption,
  moveOption,
} from "../lib/settings";
import {
  PLACEHOLDERS,
  DEFAULT_TEMPLATE,
} from "../lib/contractTemplate";
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  RotateCcw,
  GripVertical,
} from "lucide-react";

/* ============================================================
   CONFIGURAÇÕES — conta, workspace, kanban, opções e contrato
   ============================================================ */
export default function Configuracoes() {
  const { profile, refreshProfile } = useAuth();
  const [tab, setTab] = useState("conta");

  return (
    <div className="cfg">
      <div className="cfg-tabs">
        <button
          className={"cfg-tab" + (tab === "conta" ? " active" : "")}
          onClick={() => setTab("conta")}
        >
          Conta
        </button>
        <button
          className={"cfg-tab" + (tab === "workspace" ? " active" : "")}
          onClick={() => setTab("workspace")}
        >
          Workspace
        </button>
        <button
          className={"cfg-tab" + (tab === "etapas" ? " active" : "")}
          onClick={() => setTab("etapas")}
        >
          Etapas do Kanban
        </button>
        <button
          className={"cfg-tab" + (tab === "opcoes" ? " active" : "")}
          onClick={() => setTab("opcoes")}
        >
          Opções dos campos
        </button>
        <button
          className={"cfg-tab" + (tab === "contrato" ? " active" : "")}
          onClick={() => setTab("contrato")}
        >
          Contrato
        </button>
      </div>

      {tab === "conta" && (
        <ContaTab profile={profile} refreshProfile={refreshProfile} />
      )}
      {tab === "workspace" && <WorkspaceTab />}
      {tab === "etapas" && <EtapasTab />}
      {tab === "opcoes" && <OpcoesTab />}
      {tab === "contrato" && <ContratoTab />}
    </div>
  );
}

/* ------------------------------------------------------------
   CONTA
   ------------------------------------------------------------ */
function ContaTab({ profile, refreshProfile }) {
  const [name, setName] = useState(profile?.name || "");
  const [email, setEmail] = useState(profile?.email || "");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(false);

  async function saveName() {
    setMsg(null);
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({ name: name.trim() })
      .eq("id", profile.id);
    setLoading(false);
    if (error) return setMsg({ type: "error", text: error.message });
    await refreshProfile();
    setMsg({ type: "success", text: "Nome atualizado." });
  }

  async function saveEmail() {
    setMsg(null);
    if (!email.trim() || email === profile.email) return;
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    setLoading(false);
    if (error) return setMsg({ type: "error", text: traduzErro(error) });
    setMsg({
      type: "success",
      text: "Enviamos um link de confirmação para o novo e-mail.",
    });
  }

  async function savePassword() {
    setMsg(null);
    if (pass.length < 8)
      return setMsg({
        type: "error",
        text: "A senha precisa ter pelo menos 8 caracteres.",
      });
    if (pass !== pass2)
      return setMsg({ type: "error", text: "As senhas não conferem." });
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (error) return setMsg({ type: "error", text: traduzErro(error) });
    setPass("");
    setPass2("");
    setMsg({ type: "success", text: "Senha atualizada." });
  }

  return (
    <div className="cfg-panel">
      {msg && <div className={"cfg-msg " + msg.type}>{msg.text}</div>}

      <section className="cfg-section">
        <h3>Nome de exibição</h3>
        <div className="cfg-row">
          <input value={name} onChange={(e) => setName(e.target.value)} />
          <button
            className="btn btn-primary"
            onClick={saveName}
            disabled={loading}
          >
            Salvar
          </button>
        </div>
      </section>

      <section className="cfg-section">
        <h3>E-mail</h3>
        <p className="cfg-hint">
          Trocar o e-mail exige confirmação no novo endereço.
        </p>
        <div className="cfg-row">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={saveEmail}
            disabled={loading || email === profile.email}
          >
            Atualizar
          </button>
        </div>
      </section>

      <section className="cfg-section">
        <h3>Senha</h3>
        <div className="cfg-row">
          <input
            type="password"
            placeholder="Nova senha"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirmar"
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
          />
          <button
            className="btn btn-primary"
            onClick={savePassword}
            disabled={loading}
          >
            Trocar
          </button>
        </div>
      </section>

      <section className="cfg-section">
        <h3>Função</h3>
        <p className="cfg-hint">
          Sua função atual:{" "}
          <strong>
            {profile?.role === "admin" ? "Administrador" : "Editor"}
          </strong>
        </p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------
   WORKSPACE
   ------------------------------------------------------------ */
function WorkspaceTab() {
  const [s, setS] = useState(loadSettings());
  const [msg, setMsg] = useState(null);

  function save() {
    saveSettings(s);
    setMsg({ type: "success", text: "Workspace atualizado." });
  }

  return (
    <div className="cfg-panel">
      {msg && <div className={"cfg-msg " + msg.type}>{msg.text}</div>}

      <section className="cfg-section">
        <h3>Branding</h3>
        <div className="cfg-grid-2">
          <label className="field">
            <span>Marca (texto)</span>
            <input
              value={s.brandName}
              onChange={(e) => setS({ ...s, brandName: e.target.value })}
            />
          </label>
          <label className="field">
            <span>Subtítulo</span>
            <input
              value={s.brandSub}
              onChange={(e) => setS({ ...s, brandSub: e.target.value })}
            />
          </label>
        </div>
        <label className="field">
          <span>Nome do workspace</span>
          <input
            value={s.workspaceName}
            onChange={(e) => setS({ ...s, workspaceName: e.target.value })}
          />
        </label>
        <div className="cfg-actions">
          <button className="btn btn-primary" onClick={save}>
            Salvar
          </button>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------
   ETAPAS
   ------------------------------------------------------------ */
function EtapasTab() {
  const [s, setS] = useState(loadSettings());
  const [msg, setMsg] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ label: "", hint: "", tone: "neutral" });
  const [adding, setAdding] = useState(false);
  const [newStage, setNewStage] = useState({
    label: "",
    hint: "",
    tone: "neutral",
  });

  function persist(next) {
    setS(next);
    saveSettings(next);
  }

  function startEdit(stage) {
    setEditingId(stage.id);
    setDraft({
      label: stage.label,
      hint: stage.hint || "",
      tone: stage.tone || "neutral",
    });
  }

  function saveEdit() {
    if (!draft.label.trim()) return;
    const next = {
      ...s,
      stages: s.stages.map((st) =>
        st.id === editingId
          ? {
              ...st,
              label: draft.label.trim(),
              hint: draft.hint.trim(),
              tone: draft.tone,
            }
          : st
      ),
    };
    persist(next);
    setEditingId(null);
  }

  function removeStage(id) {
    if (
      !window.confirm(
        "Remover esta etapa? Vídeos nela NÃO serão apagados, mas ficarão órfãos até serem movidos."
      )
    )
      return;
    persist({ ...s, stages: s.stages.filter((st) => st.id !== id) });
  }

  function addStage() {
    if (!newStage.label.trim()) return;
    const id = stageIdFromLabel(
      newStage.label,
      s.stages.map((st) => st.id)
    );
    const next = {
      ...s,
      stages: [
        ...s.stages,
        {
          id,
          label: newStage.label.trim(),
          hint: newStage.hint.trim(),
          tone: newStage.tone,
        },
      ],
    };
    persist(next);
    setNewStage({ label: "", hint: "", tone: "neutral" });
    setAdding(false);
    setMsg({ type: "success", text: `Etapa "${newStage.label}" criada.` });
  }

  function move(idx, dir) {
    const arr = [...s.stages];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    persist({ ...s, stages: arr });
  }

  function resetStages() {
    if (!window.confirm("Restaurar as etapas padrão do sistema?")) return;
    const fresh = resetSettings();
    persist(fresh);
    setMsg({ type: "success", text: "Etapas restauradas para o padrão." });
  }

  const TONES = [
    { id: "neutral", label: "Neutro" },
    { id: "gold", label: "Destaque (verde)" },
    { id: "info", label: "Informativo (azul)" },
    { id: "danger", label: "Atenção (vermelho)" },
    { id: "success", label: "Sucesso (verde)" },
  ];

  return (
    <div className="cfg-panel">
      {msg && <div className={"cfg-msg " + msg.type}>{msg.text}</div>}

      <section className="cfg-section">
        <div className="cfg-section-head">
          <h3>Etapas do Kanban</h3>
          <div className="cfg-head-actions">
            <button
              className="btn btn-ghost btn-sm"
              onClick={resetStages}
              title="Restaurar padrão"
            >
              <RotateCcw size={14} /> Restaurar padrão
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setAdding(true)}
            >
              <Plus size={14} /> Nova etapa
            </button>
          </div>
        </div>
        <p className="cfg-hint">
          Estas etapas definem as colunas do Kanban em todo o sistema.
        </p>

        <ul className="cfg-stages">
          {s.stages.map((st, idx) => (
            <li key={st.id} className="cfg-stage">
              {editingId === st.id ? (
                <>
                  <input
                    className="cfg-stage-input"
                    value={draft.label}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, label: e.target.value }))
                    }
                    autoFocus
                  />
                  <input
                    className="cfg-stage-input"
                    placeholder="Dica (opcional)"
                    value={draft.hint}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, hint: e.target.value }))
                    }
                  />
                  <select
                    value={draft.tone}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, tone: e.target.value }))
                    }
                  >
                    {TONES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    className="cfg-icon-btn ok"
                    onClick={saveEdit}
                    title="Salvar"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    className="cfg-icon-btn"
                    onClick={() => setEditingId(null)}
                    title="Cancelar"
                  >
                    <X size={14} />
                  </button>
                </>
              ) : (
                <>
                  <span className="cfg-grip">
                    <GripVertical size={14} />
                  </span>
                  <span className="cfg-stage-label">{st.label}</span>
                  <span className="cfg-stage-hint">{st.hint}</span>
                  <span
                    className={
                      "cfg-stage-tone tone-" + (st.tone || "neutral")
                    }
                  >
                    {st.tone || "neutral"}
                  </span>
                  <button
                    className="cfg-icon-btn"
                    onClick={() => move(idx, -1)}
                    title="Subir"
                  >
                    ↑
                  </button>
                  <button
                    className="cfg-icon-btn"
                    onClick={() => move(idx, +1)}
                    title="Descer"
                  >
                    ↓
                  </button>
                  <button
                    className="cfg-icon-btn"
                    onClick={() => startEdit(st)}
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="cfg-icon-btn danger"
                    onClick={() => removeStage(st.id)}
                    title="Excluir"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>

        {adding && (
          <div className="cfg-stage cfg-stage-new">
            <input
              className="cfg-stage-input"
              placeholder="Nome da etapa"
              value={newStage.label}
              onChange={(e) =>
                setNewStage((s) => ({ ...s, label: e.target.value }))
              }
              autoFocus
            />
            <input
              className="cfg-stage-input"
              placeholder="Dica (opcional)"
              value={newStage.hint}
              onChange={(e) =>
                setNewStage((s) => ({ ...s, hint: e.target.value }))
              }
            />
            <select
              value={newStage.tone}
              onChange={(e) =>
                setNewStage((s) => ({ ...s, tone: e.target.value }))
              }
            >
              {TONES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
            <button
              className="cfg-icon-btn ok"
              onClick={addStage}
              title="Adicionar"
            >
              <Check size={14} />
            </button>
            <button
              className="cfg-icon-btn"
              onClick={() => setAdding(false)}
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------
   OPÇÕES — prioridades, formatos, tipos
   ------------------------------------------------------------ */
function OpcoesTab() {
  const [s, setS] = useState(loadSettings());
  const [msg, setMsg] = useState(null);
  const [newValues, setNewValues] = useState({});
  const [editing, setEditing] = useState({});

  function persist(next, feedback) {
    setS(next);
    saveSettings(next);
    if (feedback) setMsg({ type: "success", text: feedback });
  }

  function handleAdd(listKey) {
    const value = (newValues[listKey] || "").trim();
    if (!value) return;
    const next = addOption(s, listKey, value);
    const label = OPTION_LISTS.find((o) => o.key === listKey)?.label;
    persist(next, `"${value}" adicionado em ${label}.`);
    setNewValues((v) => ({ ...v, [listKey]: "" }));
  }

  function handleRename(listKey, oldValue) {
    const key = `${listKey}|${oldValue}`;
    const newValue = (editing[key] || "").trim();
    if (!newValue || newValue === oldValue) {
      setEditing((e) => {
        const copy = { ...e };
        delete copy[key];
        return copy;
      });
      return;
    }
    persist(renameOption(s, listKey, oldValue, newValue), "Opção renomeada.");
    setEditing((e) => {
      const copy = { ...e };
      delete copy[key];
      return copy;
    });
  }

  function handleRemove(listKey, value) {
    if (!window.confirm(`Excluir "${value}"?`)) return;
    persist(removeOption(s, listKey, value), "Opção excluída.");
  }

  function handleReset(listKey) {
    if (!window.confirm("Restaurar padrão desta lista?")) return;
    const fresh = resetSettings();
    const onlyKey = { ...s, [listKey]: fresh[listKey] };
    persist(onlyKey, "Lista restaurada ao padrão.");
  }

  return (
    <div className="cfg-panel">
      {msg && <div className={"cfg-msg " + msg.type}>{msg.text}</div>}

      <p className="cfg-hint">
        Estas opções aparecem nos selects do cadastro de vídeo (Prioridade,
        Formato, Tipo). Você pode adicionar, renomear, reordenar e excluir
        livremente.
      </p>

      {OPTION_LISTS.map(({ key, label }) => {
        const list = s[key] || [];
        return (
          <section className="cfg-section" key={key}>
            <div className="cfg-section-head">
              <h3>
                {label} <span className="cfg-count">{list.length}</span>
              </h3>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleReset(key)}
                title="Restaurar padrão desta lista"
              >
                <RotateCcw size={14} /> Restaurar
              </button>
            </div>

            <ul className="cfg-stages">
              {list.map((value, idx) => {
                const editKey = `${key}|${value}`;
                const isEditing = editing[editKey] !== undefined;
                return (
                  <li key={value} className="cfg-stage">
                    <span className="cfg-grip">
                      <GripVertical size={14} />
                    </span>
                    {isEditing ? (
                      <input
                        className="cfg-stage-input"
                        autoFocus
                        value={editing[editKey]}
                        onChange={(e) =>
                          setEditing((ed) => ({
                            ...ed,
                            [editKey]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleRename(key, value);
                          if (e.key === "Escape")
                            setEditing((ed) => {
                              const copy = { ...ed };
                              delete copy[editKey];
                              return copy;
                            });
                        }}
                      />
                    ) : (
                      <span className="cfg-stage-label">{value}</span>
                    )}
                    <span style={{ flex: 1 }} />
                    {isEditing ? (
                      <>
                        <button
                          className="cfg-icon-btn ok"
                          onClick={() => handleRename(key, value)}
                          title="Salvar"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="cfg-icon-btn"
                          onClick={() =>
                            setEditing((ed) => {
                              const copy = { ...ed };
                              delete copy[editKey];
                              return copy;
                            })
                          }
                          title="Cancelar"
                        >
                          <X size={14} />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="cfg-icon-btn"
                          onClick={() =>
                            persist(moveOption(s, key, value, -1))
                          }
                          title="Subir"
                        >
                          ↑
                        </button>
                        <button
                          className="cfg-icon-btn"
                          onClick={() =>
                            persist(moveOption(s, key, value, +1))
                          }
                          title="Descer"
                        >
                          ↓
                        </button>
                        <button
                          className="cfg-icon-btn"
                          onClick={() =>
                            setEditing((ed) => ({
                              ...ed,
                              [editKey]: value,
                            }))
                          }
                          title="Renomear"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="cfg-icon-btn danger"
                          onClick={() => handleRemove(key, value)}
                          title="Excluir"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </li>
                );
              })}
              {list.length === 0 && (
                <li className="cfg-stage" style={{ opacity: 0.6 }}>
                  <span className="cfg-stage-hint">
                    Nenhuma opção. Adicione abaixo.
                  </span>
                </li>
              )}
            </ul>

            <div className="cfg-add-option">
              <input
                placeholder={`Nova opção em "${label}"`}
                value={newValues[key] || ""}
                onChange={(e) =>
                  setNewValues((v) => ({ ...v, [key]: e.target.value }))
                }
                onKeyDown={(e) => e.key === "Enter" && handleAdd(key)}
              />
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAdd(key)}
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------
   CONTRATO — dados da empresa + template editável
   ------------------------------------------------------------ */
function ContratoTab() {
  const [s, setS] = useState(loadSettings());
  const [msg, setMsg] = useState(null);

  function setField(k, v) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  function save() {
    saveSettings(s);
    setMsg({ type: "success", text: "Configurações de contrato salvas." });
  }

  function insertPlaceholder(ph) {
    const textarea = document.getElementById("cfg-contract-template");
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const token = `{{${ph}}}`;
    const current = s.contractTemplate || DEFAULT_TEMPLATE;
    const value = current.slice(0, start) + token + current.slice(end);
    setField("contractTemplate", value);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + token.length;
    });
  }

  function resetTemplate() {
    if (
      !window.confirm(
        "Restaurar o template padrão? Suas edições serão perdidas."
      )
    )
      return;
    setField("contractTemplate", "");
  }

  const currentTemplate = s.contractTemplate || DEFAULT_TEMPLATE;

  return (
    <div className="cfg-panel">
      {msg && <div className={"cfg-msg " + msg.type}>{msg.text}</div>}

      <section className="cfg-section">
        <h3>Dados da empresa (aparecem no contrato)</h3>
        <div className="cfg-grid-2">
          <label className="field">
            <span>Razão social</span>
            <input
              value={s.companyName || ""}
              onChange={(e) => setField("companyName", e.target.value)}
            />
          </label>
          <label className="field">
            <span>CNPJ</span>
            <input
              value={s.cnpj || ""}
              onChange={(e) => setField("cnpj", e.target.value)}
            />
          </label>
          <label className="field">
            <span>E-mail de contato</span>
            <input
              value={s.contactEmail || ""}
              onChange={(e) => setField("contactEmail", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Telefone</span>
            <input
              value={s.contactPhone || ""}
              onChange={(e) => setField("contactPhone", e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>Endereço</span>
          <input
            value={s.address || ""}
            onChange={(e) => setField("address", e.target.value)}
          />
        </label>
        <div className="cfg-grid-2">
          <label className="field">
            <span>Chave PIX</span>
            <input
              value={s.pix || ""}
              onChange={(e) => setField("pix", e.target.value)}
            />
          </label>
          <label className="field">
            <span>Banco / agência / conta</span>
            <input
              value={s.bankInfo || ""}
              onChange={(e) => setField("bankInfo", e.target.value)}
            />
          </label>
        </div>
        <label className="field">
          <span>Instagram</span>
          <input
            value={s.instagram || ""}
            onChange={(e) => setField("instagram", e.target.value)}
          />
        </label>
      </section>

      <section className="cfg-section">
        <div className="cfg-section-head">
          <h3>Template do contrato</h3>
          <button
            className="btn btn-ghost btn-sm"
            onClick={resetTemplate}
            title="Restaurar template padrão"
          >
            <RotateCcw size={14} /> Restaurar padrão
          </button>
        </div>
        <p className="cfg-hint">
          Edite o HTML/template livremente. Use placeholders como{" "}
          <code>{"{{cliente.nome}}"}</code> — eles são substituídos na hora de
          gerar o contrato. Clique em um placeholder abaixo para inseri-lo na
          posição do cursor.
        </p>

        <div className="cfg-placeholders">
          {PLACEHOLDERS.map((p) => (
            <button
              key={p.key}
              type="button"
              className="cfg-ph-chip"
              onClick={() => insertPlaceholder(p.key)}
              title={`Inserir {{${p.key}}}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        <textarea
          id="cfg-contract-template"
          className="cfg-template-editor"
          value={currentTemplate}
          onChange={(e) => setField("contractTemplate", e.target.value)}
          spellCheck={false}
        />
      </section>

      <div className="cfg-actions">
        <button className="btn btn-primary" onClick={save}>
          Salvar
        </button>
      </div>
    </div>
  );
}