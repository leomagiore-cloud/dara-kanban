import React, { useEffect, useState, useCallback } from "react";
import { Check, X, ShieldCheck, Mail, UserPlus, Pencil, Trash2 } from "lucide-react";
import "./equipe.css";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

/* ============================================================
   EQUIPE — admin convida / edita / exclui membros
   ============================================================ */
export default function Equipe() {
  const { profile: me, inviteMember } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);

  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [sending, setSending] = useState(false);

  // edição inline
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ name: "", email: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, role, is_active, created_at")
      .order("created_at", { ascending: true });
    if (error) setMsg({ type: "error", text: error.message });
    setRows(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(row, changes) {
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update(changes)
      .eq("id", row.id);
    if (error) return setMsg({ type: "error", text: error.message });

    if (changes.is_active === true && !row.is_active) {
      supabase.functions
        .invoke("send-email", {
          body: { type: "access_approved", user_id: row.id },
        })
        .then(
          ({ error: fnErr }) =>
            fnErr && console.warn("send-email:", fnErr.message)
        );
    }
    load();
  }

  async function handleInvite() {
    setMsg(null);
    const name = inviteName.trim();
    const email = inviteEmail.trim().toLowerCase();

    if (!name) return setMsg({ type: "error", text: "Informe o nome do membro." });
    if (!email || !email.includes("@"))
      return setMsg({ type: "error", text: "Informe um e-mail válido." });

    setSending(true);
    const res = await inviteMember(email, inviteRole, name);
    setSending(false);

    if (!res.ok) return setMsg({ type: "error", text: res.error });

    setInviteName("");
    setInviteEmail("");
    setInviteRole("editor");
    setMsg({
      type: "success",
      text: `Convite enviado para ${name} (${email}).`,
    });
    load();
  }

  function startEdit(r) {
    setEditingId(r.id);
    setDraft({ name: r.name || "", email: r.email || "" });
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft({ name: "", email: "" });
  }

  async function saveEdit(row) {
    setMsg(null);
    const name = draft.name.trim();
    const email = draft.email.trim().toLowerCase();
    if (!name) return setMsg({ type: "error", text: "Nome não pode ficar vazio." });

    setSavingEdit(true);

    // atualiza profile
    const { error } = await supabase
      .from("profiles")
      .update({ name, email })
      .eq("id", row.id);
    if (error) {
      setSavingEdit(false);
      return setMsg({ type: "error", text: error.message });
    }

    // se o e-mail mudou, atualiza no Auth (via Edge Function admin)
    if (email && email !== row.email) {
      const { error: fnErr } = await supabase.functions.invoke("update-member", {
        body: { user_id: row.id, email },
      });
      if (fnErr) {
        setSavingEdit(false);
        return setMsg({
          type: "error",
          text: `Nome atualizado, mas o e-mail falhou: ${fnErr.message}`,
        });
      }
    }

    setSavingEdit(false);
    setEditingId(null);
    setMsg({ type: "success", text: "Membro atualizado." });
    load();
  }

  async function handleDelete(row) {
    if (row.id === me?.id) {
      return setMsg({ type: "error", text: "Você não pode excluir a si mesmo." });
    }
    if (
      !window.confirm(
        `Excluir ${row.name || row.email}? O acesso será revogado e o perfil removido. Esta ação não pode ser desfeita.`
      )
    )
      return;

    setMsg(null);
    const { error: fnErr } = await supabase.functions.invoke("delete-member", {
      body: { user_id: row.id },
    });
    if (fnErr) return setMsg({ type: "error", text: fnErr.message });
    setMsg({ type: "success", text: "Membro excluído." });
    load();
  }

  const pendentes = rows.filter((r) => !r.is_active);
  const ativos = rows.filter((r) => r.is_active);

  return (
    <div className="eq-wrap">
      {msg && (
        <div className={"eq-msg " + (msg.type === "success" ? "ok" : "")}>
          {msg.text}
        </div>
      )}
      {loading && <p className="eq-muted">Carregando…</p>}

      {/* ---------- Convidar ---------- */}
      <section className="eq-section">
        <h2>
          <UserPlus size={16} /> Convidar membro
        </h2>
        <p className="eq-hint">
          O convidado recebe um e-mail com um link para criar a senha e entra
          direto com o papel escolhido. O nome aparece no kanban e no "pegou em"
          dos vídeos.
        </p>
        <div className="eq-invite">
          <input
            type="text"
            placeholder="Nome do membro"
            value={inviteName}
            onChange={(e) => setInviteName(e.target.value)}
          />
          <input
            type="email"
            placeholder="email@dominio.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value)}
          >
            <option value="editor">Editor</option>
            <option value="admin">Admin</option>
          </select>
          <button
            className="btn btn-primary"
            onClick={handleInvite}
            disabled={sending}
          >
            <Mail size={14} /> {sending ? "Enviando…" : "Enviar convite"}
          </button>
        </div>
      </section>

      {/* ---------- Pendentes ---------- */}
      <section className="eq-section">
        <h2>
          Aguardando aprovação{" "}
          <span className="eq-count">{pendentes.length}</span>
        </h2>
        {pendentes.length === 0 && (
          <p className="eq-muted">Nenhum cadastro pendente.</p>
        )}
        {pendentes.map((r) => (
          <div className="eq-row" key={r.id}>
            <div className="eq-info">
              <strong>{r.name || "—"}</strong>
              <span>{r.email}</span>
            </div>
            <div className="eq-actions">
              <button
                className="btn btn-primary"
                onClick={() => patch(r, { is_active: true })}
              >
                <Check size={14} /> Aprovar
              </button>
              <button
                className="btn btn-ghost eq-icon"
                title="Excluir"
                onClick={() => handleDelete(r)}
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* ---------- Ativos ---------- */}
      <section className="eq-section">
        <h2>
          Equipe ativa <span className="eq-count">{ativos.length}</span>
        </h2>
        {ativos.map((r) =>
          editingId === r.id ? (
            <div className="eq-row edit" key={r.id}>
              <div className="eq-edit-fields">
                <input
                  value={draft.name}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, name: e.target.value }))
                  }
                  placeholder="Nome"
                />
                <input
                  value={draft.email}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, email: e.target.value }))
                  }
                  placeholder="E-mail"
                  type="email"
                />
              </div>
              <div className="eq-actions">
                <button
                  className="btn btn-primary"
                  onClick={() => saveEdit(r)}
                  disabled={savingEdit}
                >
                  <Check size={14} /> {savingEdit ? "Salvando…" : "Salvar"}
                </button>
                <button className="btn btn-ghost" onClick={cancelEdit}>
                  <X size={14} /> Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="eq-row" key={r.id}>
              <div className="eq-info">
                <strong>
                  {r.name || "—"}{" "}
                  {r.role === "admin" && (
                    <ShieldCheck size={14} className="eq-shield" />
                  )}
                </strong>
                <span>{r.email}</span>
              </div>
              <div className="eq-actions">
                <select
                  value={r.role}
                  disabled={r.id === me?.id}
                  onChange={(e) => patch(r, { role: e.target.value })}
                >
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
                <button
                  className="btn btn-ghost eq-icon"
                  title="Editar nome e e-mail"
                  onClick={() => startEdit(r)}
                >
                  <Pencil size={14} />
                </button>
                <button
                  className="btn btn-ghost eq-icon danger"
                  title="Excluir membro"
                  disabled={r.id === me?.id}
                  onClick={() => handleDelete(r)}
                >
                  <Trash2 size={14} />
                </button>
                <button
                  className="btn btn-ghost eq-icon"
                  title={
                    r.id === me?.id
                      ? "Você não pode desativar a si mesmo"
                      : "Revogar acesso"
                  }
                  disabled={r.id === me?.id}
                  onClick={() =>
                    window.confirm(`Revogar o acesso de ${r.name}?`) &&
                    patch(r, { is_active: false })
                  }
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          )
        )}
      </section>
    </div>
  );
}