import React, { useState, useEffect, useMemo, useCallback } from "react";
import { FileText, Search, Loader2 } from "lucide-react";
import "./clientes.css";
import {
  uid,
  fmtBRL,
  STAGES,
  fmtDateBR,
  toISODate,
} from "../lib/utils";
import { loadSettings } from "../lib/settings";
import { loadClients, saveClients, loadVideos } from "../lib/db";
import {
  generateContractHTML,
  generateContractNumber,
} from "../lib/contractTemplate";
import {
  maskCPF,
  maskCNPJ,
  maskCEP,
  maskPhone,
  isValidDoc,
  isValidCEP,
  isValidPhone,
  isValidUF,
  lookupCEP,
} from "../lib/brValidators";

/* ============================================================
   CLIENTES — CRM + geração de contratos
   ============================================================ */

export default function Clientes() {
  const [clients, setClients] = useState([]);
  const [videos, setVideos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [detailId, setDetailId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [newOpen, setNewOpen] = useState(false);
  const [contractModal, setContractModal] = useState(null);

  useEffect(() => {
    let alive = true;
    Promise.all([loadClients(), loadVideos()]).then(([sc, sv]) => {
      if (!alive) return;
      setClients(sc || []);
      setVideos(sv || []);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveClients(clients);
  }, [clients, loaded]);

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        (c.company || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
      );
    });
  }, [clients, search]);

  function videosDoCliente(name) {
    return videos.filter((v) => v.client === name);
  }

  function saveClient(draft) {
    let savedClient;

    if (editingId) {
      savedClient = { ...clients.find((c) => c.id === editingId), ...draft };
      setClients((prev) =>
        prev.map((c) => (c.id === editingId ? savedClient : c))
      );
    } else {
      savedClient = {
        id: uid(),
        createdAt: Date.now(),
        contracts: [],
        ...draft,
      };
      setClients((prev) => [...prev, savedClient]);
    }

    if (draft.__generateContract) {
      const start = draft.startDate
        ? new Date(draft.startDate + "T00:00:00")
        : new Date();
      const end = new Date(start);
      end.setFullYear(end.getFullYear() + 12);

      const contract = {
        number: generateContractNumber(),
        plan: draft.plan || "Essencial",
        videosPerMonth: Number(draft.contractedVideos) || 4,
        monthlyValue: Number(draft.monthlyValue) || 0,
        duration: 12,
        paymentMethod: draft.paymentMethod || "PIX",
        dueDay: Number(draft.dueDay) || 10,
        observation: draft.notes || "",
        startDate: toISODate(start),
        endDate: toISODate(end),
        status: "ativo",
        cancelledAt: null,
        generatedAt: new Date().toISOString(),
      };

      setClients((prev) =>
        prev.map((c) =>
          c.id === savedClient.id
            ? { ...c, contracts: [...(c.contracts || []), contract] }
            : c
        )
      );

      setContractModal({ client: savedClient, contract });
    }

    setEditingId(null);
    setNewOpen(false);
  }

  function removeClient(id) {
    if (
      !window.confirm("Excluir este cliente? Os vídeos continuam no kanban.")
    )
      return;
    setClients((prev) => prev.filter((c) => c.id !== id));
    setDetailId(null);
  }

  if (!loaded) return null;

  const detail = clients.find((c) => c.id === detailId);
  const editing = clients.find((c) => c.id === editingId);

  return (
    <div className="cli">
      {/* Toolbar */}
      <div className="cli-toolbar">
        <div className="cli-search">
          <Search size={16} />
          <input
            placeholder="Buscar cliente, empresa ou e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
          + Novo cliente
        </button>
      </div>

      {/* Grid */}
      <div className="cli-grid">
        {filtered.map((c) => {
          const vids = videosDoCliente(c.name);
          const concluidos = vids.filter(
            (v) => v.stage === "CONCLUIDO"
          ).length;
          return (
            <div
              key={c.id}
              className="cli-card"
              onClick={() => setDetailId(c.id)}
            >
              <div className="cli-card-head">
                <div className="cli-avatar">
                  {(c.name || "?").slice(0, 1)}
                </div>
                <div className="cli-card-info">
                  <div className="cli-card-name">{c.name}</div>
                  <div className="cli-card-company">{c.company || "—"}</div>
                </div>
                <div className="cli-plan-badge">{c.plan || "—"}</div>
              </div>

              <div className="cli-card-meta">
                <div className="cli-meta-item">
                  <span className="cli-meta-label">Telefone</span>
                  <span className="cli-meta-value">{c.phone || "—"}</span>
                </div>
                <div className="cli-meta-item">
                  <span className="cli-meta-label">Vencimento</span>
                  <span className="cli-meta-value">
                    {c.dueDay ? `Dia ${c.dueDay}` : "—"}
                  </span>
                </div>
              </div>

              <div className="cli-card-foot">
                <div className="cli-stat">
                  <span className="cli-stat-num">{vids.length}</span>
                  <span className="cli-stat-label">vídeos</span>
                </div>
                <div className="cli-stat">
                  <span className="cli-stat-num">{concluidos}</span>
                  <span className="cli-stat-label">concluídos</span>
                </div>
                <div className="cli-stat value">
                  <span className="cli-stat-num">
                    {fmtBRL(c.monthlyValue)}
                  </span>
                  <span className="cli-stat-label">/mês</span>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="cli-empty">Nenhum cliente encontrado.</div>
        )}
      </div>

      {/* Modal novo/editar */}
      {(newOpen || editingId) && (
        <ClientModal
          client={editing}
          onClose={() => {
            setNewOpen(false);
            setEditingId(null);
          }}
          onSave={saveClient}
        />
      )}

      {/* Drawer detalhe */}
      {detail && !editingId && (
        <div className="cli-drawer-overlay" onClick={() => setDetailId(null)}>
          <div
            className="cli-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="cli-drawer-head">
              <div className="cli-drawer-head-info">
                <div className="cli-avatar big">
                  {(detail.name || "?").slice(0, 1)}
                </div>
                <div>
                  <div className="cli-drawer-name">{detail.name}</div>
                  <div className="cli-drawer-company">
                    {detail.company || "—"}
                  </div>
                </div>
              </div>
              <button className="kb-close" onClick={() => setDetailId(null)}>
                ✕
              </button>
            </div>

            <div className="cli-drawer-section">
              <div className="cli-section-title">Identificação</div>
              <div className="cli-drawer-grid">
                <Field
                  label={detail.docType === "cnpj" ? "CNPJ" : "CPF"}
                  value={detail.docNumber || "—"}
                />
                <Field
                  label={
                    detail.docType === "cnpj"
                      ? "Inscrição Estadual"
                      : "RG"
                  }
                  value={detail.rgIe || "—"}
                />
              </div>
            </div>

            <div className="cli-drawer-section">
              <div className="cli-section-title">Contato</div>
              <div className="cli-drawer-grid">
                <Field label="Telefone" value={detail.phone || "—"} />
                <Field label="E-mail" value={detail.email || "—"} />
                <Field label="Instagram" value={detail.instagram || "—"} />
              </div>
            </div>

            {(detail.address ||
              detail.city ||
              detail.zipCode) && (
              <div className="cli-drawer-section">
                <div className="cli-section-title">Endereço</div>
                <div className="cli-drawer-grid">
                  <Field label="CEP" value={detail.zipCode || "—"} />
                  <Field label="Rua" value={detail.address || "—"} />
                  <Field
                    label="Número"
                    value={detail.addressNumber || "—"}
                  />
                  <Field
                    label="Complemento"
                    value={detail.addressComplement || "—"}
                  />
                  <Field
                    label="Bairro"
                    value={detail.neighborhood || "—"}
                  />
                  <Field
                    label="Cidade"
                    value={
                      detail.city
                        ? `${detail.city}${
                            detail.state ? "/" + detail.state : ""
                          }`
                        : "—"
                    }
                  />
                </div>
              </div>
            )}

            {(detail.repName || detail.repDoc) && (
              <div className="cli-drawer-section">
                <div className="cli-section-title">
                  Representante legal
                </div>
                <div className="cli-drawer-grid">
                  <Field
                    label="Nome"
                    value={detail.repName || "—"}
                  />
                  <Field label="CPF" value={detail.repDoc || "—"} />
                </div>
              </div>
            )}

            <div className="cli-drawer-section">
              <div className="cli-section-title">Contrato</div>
              <div className="cli-drawer-grid">
                <Field label="Plano" value={detail.plan || "—"} />
                <Field
                  label="Valor mensal"
                  value={fmtBRL(detail.monthlyValue)}
                />
                <Field
                  label="Vídeos contratados"
                  value={detail.contractedVideos || 0}
                />
                <Field
                  label="Vencimento"
                  value={detail.dueDay ? `Dia ${detail.dueDay}` : "—"}
                />
                <Field
                  label="Forma de pagamento"
                  value={detail.paymentMethod || "—"}
                />
                <Field
                  label="Início"
                  value={
                    detail.startDate ? fmtDateBR(detail.startDate) : "—"
                  }
                />
              </div>
            </div>

            {detail.notes && (
              <div className="cli-drawer-section">
                <div className="cli-section-title">Observações</div>
                <div className="cli-notes">{detail.notes}</div>
              </div>
            )}

            {(detail.contracts || []).length > 0 && (
              <div className="cli-drawer-section">
                <div className="cli-section-title">
                  Contratos
                  <span className="cli-section-count">
                    {detail.contracts.length}
                  </span>
                </div>
                <ul className="cli-contract-list">
                  {detail.contracts.map((ct) => (
                    <li key={ct.number} className="cli-contract-item">
                      <div className="cli-contract-info">
                        <div className="cli-contract-num">
                          Contrato #{ct.number}
                        </div>
                        <div className="cli-contract-date">
                          {new Date(ct.generatedAt).toLocaleDateString(
                            "pt-BR"
                          )}{" "}
                          · {ct.plan}
                        </div>
                      </div>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                          setContractModal({
                            client: detail,
                            contract: ct,
                          })
                        }
                      >
                        <FileText size={14} />
                        Abrir
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="cli-drawer-section">
              <div className="cli-section-title">
                Vídeos deste cliente
                <span className="cli-section-count">
                  {videosDoCliente(detail.name).length}
                </span>
              </div>
              {videosDoCliente(detail.name).length === 0 ? (
                <div className="cli-empty small">
                  Nenhum vídeo cadastrado ainda.
                </div>
              ) : (
                <ul className="cli-video-list">
                  {videosDoCliente(detail.name).map((v) => {
                    const stage = STAGES.find((s) => s.id === v.stage);
                    return (
                      <li key={v.id} className="cli-video-item">
                        <div className="cli-video-info">
                          <div className="cli-video-title">{v.title}</div>
                          <div className="cli-video-meta">
                            Entrega: {fmtDateBR(v.dueDate)}
                          </div>
                        </div>
                        <span className="cli-video-stage">
                          {stage?.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="cli-drawer-actions">
              <button
                className="btn btn-ghost"
                onClick={() => setEditingId(detail.id)}
              >
                Editar cliente
              </button>
              <button
                className="btn btn-danger"
                onClick={() => removeClient(detail.id)}
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview contrato */}
      {contractModal && (
        <ContractPreview
          client={contractModal.client}
          contract={contractModal.contract}
          onClose={() => setContractModal(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
   MODAL NOVO/EDITAR CLIENTE — com máscaras + ViaCEP + validação
   ============================================================ */
function ClientModal({ client, onClose, onSave }) {
  const [draft, setDraft] = useState({
    name: client?.name || "",
    company: client?.company || "",
    phone: client?.phone || "",
    email: client?.email || "",
    instagram: client?.instagram || "",
    plan: client?.plan || "Essencial",
    monthlyValue: client?.monthlyValue || 0,
    contractedVideos: client?.contractedVideos || 0,
    dueDay: client?.dueDay ?? 10,
    paymentMethod: client?.paymentMethod || "PIX",
    startDate: client?.startDate || toISODate(new Date()),
    notes: client?.notes || "",
    generateContract: false,

    docType: client?.docType || "cpf",
    docNumber: client?.docNumber || "",
    rgIe: client?.rgIe || "",
    zipCode: client?.zipCode || "",
    address: client?.address || "",
    addressNumber: client?.addressNumber || "",
    addressComplement: client?.addressComplement || "",
    neighborhood: client?.neighborhood || "",
    city: client?.city || "",
    state: client?.state || "",
    repName: client?.repName || "",
    repDoc: client?.repDoc || "",
  });

  const [errors, setErrors] = useState({});
  const [cepLoading, setCepLoading] = useState(false);

  const set = (k) => (e) => {
    const value =
      typeof e === "string" ? e : e?.target?.value ?? "";
    setDraft((d) => ({ ...d, [k]: value }));
    if (errors[k]) setErrors((err) => ({ ...err, [k]: null }));
  };

  // campos com máscara
  const setMasked = (k, maskFn) => (e) => {
    const raw = e.target.value;
    const masked = maskFn(raw);
    setDraft((d) => ({ ...d, [k]: masked }));
    if (errors[k]) setErrors((err) => ({ ...err, [k]: null }));
  };

  async function handleCEPLookup() {
    const cep = draft.zipCode;
    if (!isValidCEP(cep)) return;
    setCepLoading(true);
    const data = await lookupCEP(cep);
    setCepLoading(false);
    if (!data) return;
    setDraft((d) => ({
      ...d,
      address: data.address || d.address,
      neighborhood: data.neighborhood || d.neighborhood,
      city: data.city || d.city,
      state: data.state || d.state,
      addressComplement: d.addressComplement || data.complement || "",
    }));
  }

  function validate() {
    const e = {};
    if (!draft.name.trim()) e.name = "Nome é obrigatório.";
    if (draft.docNumber && !isValidDoc(draft.docNumber, draft.docType))
      e.docNumber =
        draft.docType === "cnpj"
          ? "CNPJ inválido."
          : "CPF inválido.";
    if (draft.repDoc && !isValidDoc(draft.repDoc, "cpf"))
      e.repDoc = "CPF do representante inválido.";
    if (draft.phone && !isValidPhone(draft.phone))
      e.phone = "Telefone incompleto.";
    if (draft.zipCode && !isValidCEP(draft.zipCode))
      e.zipCode = "CEP inválido.";
    if (draft.state && !isValidUF(draft.state)) e.state = "UF inválida.";
    if (draft.email && !/^\S+@\S+\.\S+$/.test(draft.email))
      e.email = "E-mail inválido.";
    return e;
  }

  function submit() {
    const e = validate();
    if (Object.keys(e).length) {
      setErrors(e);
      return;
    }
    onSave({
      ...draft,
      __generateContract: draft.generateContract,
      monthlyValue: Number(draft.monthlyValue) || 0,
      contractedVideos: Number(draft.contractedVideos) || 0,
      dueDay: Number(draft.dueDay) || 10,
      state: draft.state ? draft.state.toUpperCase() : "",
    });
  }

  return (
    <div className="kb-overlay" onClick={onClose}>
      <div className="kb-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kb-modal-head">
          <span>{client ? "Editar cliente" : "Novo cliente"}</span>
          <button className="kb-close" onClick={onClose}>✕</button>
        </div>
        <div className="kb-modal-body">
          <div className="kb-form">
            {/* ---------- Identificação ---------- */}
            <div className="kb-form-section">Identificação</div>

            <div className="kb-form-row">
              <label className="field">
                <span>Nome *</span>
                <input
                  value={draft.name}
                  onChange={set("name")}
                  className={errors.name ? "has-error" : ""}
                />
                {errors.name && (
                  <span className="field-error">{errors.name}</span>
                )}
              </label>
              <label className="field">
                <span>Empresa</span>
                <input value={draft.company} onChange={set("company")} />
              </label>
            </div>

            <div className="kb-form-row">
              <label className="field" style={{ maxWidth: 160 }}>
                <span>Tipo</span>
                <select
                  value={draft.docType}
                  onChange={(e) => {
                    set("docType")(e);
                    setDraft((d) => ({ ...d, docNumber: "" }));
                  }}
                >
                  <option value="cpf">CPF (Pessoa física)</option>
                  <option value="cnpj">CNPJ (Pessoa jurídica)</option>
                </select>
              </label>
              <label className="field">
                <span>{draft.docType === "cnpj" ? "CNPJ" : "CPF"}</span>
                <input
                  value={draft.docNumber}
                  onChange={setMasked(
                    "docNumber",
                    draft.docType === "cnpj" ? maskCNPJ : maskCPF
                  )}
                  placeholder={
                    draft.docType === "cnpj"
                      ? "00.000.000/0000-00"
                      : "000.000.000-00"
                  }
                  className={errors.docNumber ? "has-error" : ""}
                  inputMode="numeric"
                />
                {errors.docNumber && (
                  <span className="field-error">{errors.docNumber}</span>
                )}
              </label>
              <label className="field">
                <span>
                  {draft.docType === "cnpj" ? "Inscrição Estadual" : "RG"}
                </span>
                <input value={draft.rgIe} onChange={set("rgIe")} />
              </label>
            </div>

            {/* ---------- Contato ---------- */}
            <div className="kb-form-section">Contato</div>

            <div className="kb-form-row">
              <label className="field">
                <span>Telefone</span>
                <input
                  value={draft.phone}
                  onChange={setMasked("phone", maskPhone)}
                  placeholder="(11) 91234-5678"
                  className={errors.phone ? "has-error" : ""}
                  inputMode="tel"
                />
                {errors.phone && (
                  <span className="field-error">{errors.phone}</span>
                )}
              </label>
              <label className="field">
                <span>E-mail</span>
                <input
                  type="email"
                  value={draft.email}
                  onChange={set("email")}
                  className={errors.email ? "has-error" : ""}
                />
                {errors.email && (
                  <span className="field-error">{errors.email}</span>
                )}
              </label>
              <label className="field">
                <span>Instagram</span>
                <input
                  value={draft.instagram}
                  onChange={set("instagram")}
                  placeholder="@cliente"
                />
              </label>
            </div>

            {/* ---------- Endereço ---------- */}
            <div className="kb-form-section">Endereço</div>

            <div className="kb-form-row">
              <label className="field" style={{ maxWidth: 170 }}>
                <span>CEP</span>
                <div className="field-with-action">
                  <input
                    value={draft.zipCode}
                    onChange={setMasked("zipCode", maskCEP)}
                    onBlur={handleCEPLookup}
                    placeholder="00000-000"
                    className={errors.zipCode ? "has-error" : ""}
                    inputMode="numeric"
                  />
                  {cepLoading && (
                    <span className="field-action">
                      <Loader2 size={14} className="spin" />
                    </span>
                  )}
                </div>
                {errors.zipCode && (
                  <span className="field-error">{errors.zipCode}</span>
                )}
              </label>
              <label className="field">
                <span>Rua / Logradouro</span>
                <input value={draft.address} onChange={set("address")} />
              </label>
            </div>

            <div className="kb-form-row">
              <label className="field" style={{ maxWidth: 140 }}>
                <span>Número</span>
                <input
                  value={draft.addressNumber}
                  onChange={set("addressNumber")}
                />
              </label>
              <label className="field">
                <span>Complemento</span>
                <input
                  value={draft.addressComplement}
                  onChange={set("addressComplement")}
                />
              </label>
              <label className="field">
                <span>Bairro</span>
                <input
                  value={draft.neighborhood}
                  onChange={set("neighborhood")}
                />
              </label>
            </div>

            <div className="kb-form-row">
              <label className="field">
                <span>Cidade</span>
                <input value={draft.city} onChange={set("city")} />
              </label>
              <label className="field" style={{ maxWidth: 120 }}>
                <span>UF</span>
                <input
                  maxLength={2}
                  value={draft.state}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      state: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="SP"
                  className={errors.state ? "has-error" : ""}
                />
                {errors.state && (
                  <span className="field-error">{errors.state}</span>
                )}
              </label>
            </div>

            {/* ---------- Representante legal ---------- */}
            <div className="kb-form-section">
              Representante legal{" "}
              <span className="kb-form-hint">
                (opcional — útil para PJ)
              </span>
            </div>

            <div className="kb-form-row">
              <label className="field">
                <span>Nome do representante</span>
                <input value={draft.repName} onChange={set("repName")} />
              </label>
              <label className="field">
                <span>CPF do representante</span>
                <input
                  value={draft.repDoc}
                  onChange={setMasked("repDoc", maskCPF)}
                  placeholder="000.000.000-00"
                  className={errors.repDoc ? "has-error" : ""}
                  inputMode="numeric"
                />
                {errors.repDoc && (
                  <span className="field-error">{errors.repDoc}</span>
                )}
              </label>
            </div>

            {/* ---------- Comercial ---------- */}
            <div className="kb-form-section">Contrato e pagamento</div>

            <div className="kb-form-row">
              <label className="field">
                <span>Plano</span>
                <select value={draft.plan} onChange={set("plan")}>
                  <option>Essencial</option>
                  <option>Profissional</option>
                  <option>Premium</option>
                  <option>Avulso</option>
                </select>
              </label>
              <label className="field">
                <span>Valor mensal (R$)</span>
                <input
                  type="number"
                  value={draft.monthlyValue}
                  onChange={set("monthlyValue")}
                />
              </label>
              <label className="field">
                <span>Vídeos contratados/mês</span>
                <input
                  type="number"
                  value={draft.contractedVideos}
                  onChange={set("contractedVideos")}
                />
              </label>
            </div>

            <div className="kb-form-row">
              <label className="field">
                <span>Dia de vencimento</span>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={draft.dueDay}
                  onChange={set("dueDay")}
                  placeholder="10"
                />
              </label>
              <label className="field">
                <span>Forma de pagamento</span>
                <select
                  value={draft.paymentMethod}
                  onChange={set("paymentMethod")}
                >
                  <option value="">—</option>
                  <option>PIX</option>
                  <option>Boleto</option>
                  <option>Transferência</option>
                  <option>Cartão</option>
                  <option>Dinheiro</option>
                </select>
              </label>
              <label className="field">
                <span>Início do contrato</span>
                <input
                  type="date"
                  value={draft.startDate}
                  onChange={set("startDate")}
                />
              </label>
            </div>

            <label className="field">
              <span>Observações</span>
              <textarea
                rows="2"
                value={draft.notes}
                onChange={set("notes")}
              />
            </label>

            <label className="cli-contract-check">
              <input
                type="checkbox"
                checked={draft.generateContract || false}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    generateContract: e.target.checked,
                  }))
                }
              />
              <span className="cli-contract-check-box" />
              <span className="cli-contract-check-label">
                <FileText size={14} />
                Gerar contrato ao salvar
              </span>
            </label>

            <div className="kb-form-actions">
              <button className="btn btn-ghost" onClick={onClose}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={submit}>
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MODAL DE PRÉ-VISUALIZAÇÃO DO CONTRATO
   ============================================================ */
function ContractPreview({ client, contract, onClose }) {
  const settings = loadSettings();
  const html = generateContractHTML(client, contract, settings);

  function handlePrint() {
    const win = window.open("", "_blank", "width=900,height=800");
    win.document.write(html);
    win.document.close();
  }

  function handleDownload() {
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contrato-${client.name}-${contract.number}.html`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="kb-overlay" onClick={onClose}>
      <div
        className="cli-contract-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="kb-modal-head">
          <span>Pré-visualização do contrato</span>
          <button className="kb-close" onClick={onClose}>✕</button>
        </div>

        <div className="cli-contract-actions">
          <button className="btn btn-ghost" onClick={handleDownload}>
            Baixar HTML
          </button>
          <button className="btn btn-primary" onClick={handlePrint}>
            🖨️ Imprimir / Salvar PDF
          </button>
        </div>

        <div className="cli-contract-preview">
          <iframe
            title="Contrato"
            srcDoc={html}
            className="cli-contract-iframe"
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   FIELD
   ============================================================ */
function Field({ label, value }) {
  return (
    <div className="cli-field">
      <span className="cli-field-label">{label}</span>
      <span className="cli-field-value">{value}</span>
    </div>
  );
}