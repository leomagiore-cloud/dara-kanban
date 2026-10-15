import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Search,
  Trash2,
  RefreshCw,
  XCircle,
  Eye,
} from "lucide-react";
import "./contratos.css";
import {
  fmtBRL,
  contractStatus,
  contractStatusLabel,
  contractDaysRemaining,
  toISODate,
} from "../lib/utils";
import { loadSettings } from "../lib/settings";
import { loadClients, saveClients } from "../lib/db";
import {
  generateContractHTML,
  generateContractNumber,
} from "../lib/contractTemplate";

/* ============================================================
   CONTRATOS — visão geral de todos os contratos
   ============================================================ */

export default function Contratos({ setView, setDetailClientId }) {
  const [clients, setClients] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let alive = true;
    loadClients().then((stored) => {
      if (!alive) return;
      setClients(stored || []);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // persiste alterações
  useEffect(() => {
    if (!loaded) return;
    saveClients(clients);
  }, [clients, loaded]);

  // agrega todos os contratos com referência ao cliente
  const allContracts = useMemo(() => {
    const out = [];
    clients.forEach((c) => {
      (c.contracts || []).forEach((ct) => {
        out.push({
          ...ct,
          clientId: c.id,
          clientName: c.name,
          clientCompany: c.company,
          clientPhone: c.phone,
          clientEmail: c.email,
          clientInstagram: c.instagram,
        });
      });
    });
    return out.sort(
      (a, b) => new Date(b.generatedAt) - new Date(a.generatedAt)
    );
  }, [clients]);

  const filtered = useMemo(() => {
    return allContracts.filter((ct) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !ct.number.toLowerCase().includes(q) &&
          !ct.clientName.toLowerCase().includes(q) &&
          !(ct.clientCompany || "").toLowerCase().includes(q)
        )
          return false;
      }
      if (clientFilter && ct.clientId !== clientFilter) return false;
      if (statusFilter && contractStatus(ct) !== statusFilter) return false;
      return true;
    });
  }, [allContracts, search, clientFilter, statusFilter]);

  // KPIs
  const stats = useMemo(() => {
    let ativos = 0,
      aVencer = 0,
      vencidos = 0,
      cancelados = 0,
      mrr = 0;
    allContracts.forEach((ct) => {
      const st = contractStatus(ct);
      if (st === "ativo") {
        ativos++;
        mrr += Number(ct.monthlyValue) || 0;
      } else if (st === "a_vencer") {
        aVencer++;
        mrr += Number(ct.monthlyValue) || 0;
      } else if (st === "vencido") vencidos++;
      else if (st === "cancelado") cancelados++;
    });
    return {
      ativos,
      aVencer,
      vencidos,
      cancelados,
      mrr,
      total: allContracts.length,
    };
  }, [allContracts]);

  // ações
  function handleCancel(ct) {
    if (
      !window.confirm(
        `Cancelar o contrato #${ct.number} de ${ct.clientName}?`
      )
    )
      return;
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== ct.clientId) return c;
        return {
          ...c,
          contracts: (c.contracts || []).map((x) =>
            x.number === ct.number
              ? {
                  ...x,
                  status: "cancelado",
                  cancelledAt: toISODate(new Date()),
                }
              : x
          ),
        };
      })
    );
  }

  function handleDelete(ct) {
    if (
      !window.confirm(
        `Excluir permanentemente o contrato #${ct.number}?`
      )
    )
      return;
    setClients((prev) =>
      prev.map((c) => {
        if (c.id !== ct.clientId) return c;
        return {
          ...c,
          contracts: (c.contracts || []).filter(
            (x) => x.number !== ct.number
          ),
        };
      })
    );
  }

  function handleRenew(ct) {
    if (
      !window.confirm(
        `Renovar o contrato #${ct.number} de ${ct.clientName}?`
      )
    )
      return;

    const start = new Date();
    const end = new Date();
    end.setFullYear(end.getFullYear() + (Number(ct.duration) || 12));

    const newContract = {
      ...ct,
      number: generateContractNumber(),
      startDate: toISODate(start),
      endDate: toISODate(end),
      status: "ativo",
      cancelledAt: null,
      generatedAt: new Date().toISOString(),
    };
    delete newContract.clientId;
    delete newContract.clientName;
    delete newContract.clientCompany;
    delete newContract.clientPhone;
    delete newContract.clientEmail;
    delete newContract.clientInstagram;

    const updatedClients = clients.map((c) => {
      if (c.id !== ct.clientId) return c;
      return {
        ...c,
        contracts: [
          ...(c.contracts || []).map((x) =>
            x.number === ct.number ? { ...x, status: "vencido" } : x
          ),
          newContract,
        ],
      };
    });
    setClients(updatedClients);
    setPreview({
      client: updatedClients.find((c) => c.id === ct.clientId),
      contract: newContract,
    });
  }

  if (!loaded) return null;

  return (
    <div className="cont">
      {/* KPIs */}
      <div className="cont-kpi-grid">
        <div className="cont-kpi">
          <span className="cont-kpi-label">Contratos ativos</span>
          <span className="cont-kpi-value">{stats.ativos}</span>
        </div>
        <div className="cont-kpi">
          <span className="cont-kpi-label">A vencer (30 dias)</span>
          <span
            className="cont-kpi-value"
            style={{ color: "var(--warning)" }}
          >
            {stats.aVencer}
          </span>
        </div>
        <div className="cont-kpi">
          <span className="cont-kpi-label">Vencidos</span>
          <span
            className="cont-kpi-value"
            style={{ color: "var(--destructive)" }}
          >
            {stats.vencidos}
          </span>
        </div>
        <div className="cont-kpi">
          <span className="cont-kpi-label">MRR (mensalidade)</span>
          <span
            className="cont-kpi-value"
            style={{ color: "var(--accent)" }}
          >
            {fmtBRL(stats.mrr)}
          </span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="cont-toolbar">
        <div className="cont-search">
          <Search size={16} />
          <input
            placeholder="Buscar por número ou cliente…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
        >
          <option value="">Todos os clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Todos os status</option>
          <option value="ativo">Ativos</option>
          <option value="a_vencer">A vencer</option>
          <option value="vencido">Vencidos</option>
          <option value="cancelado">Cancelados</option>
        </select>
      </div>

      {/* Lista */}
      <div className="cont-list">
        {filtered.map((ct) => {
          const st = contractStatus(ct);
          const days = contractDaysRemaining(ct.endDate);
          return (
            <div key={ct.number} className={"cont-card st-" + st}>
              <div className="cont-card-left">
                <div className="cont-card-icon">
                  <FileText size={20} />
                </div>
                <div className="cont-card-info">
                  <div className="cont-card-head">
                    <span className="cont-card-num">#{ct.number}</span>
                    <span className={"cont-badge badge-" + st}>
                      {contractStatusLabel(st)}
                    </span>
                  </div>
                  <div className="cont-card-client">{ct.clientName}</div>
                  <div className="cont-card-meta">
                    <span>{ct.plan}</span>
                    <span>·</span>
                    <span>{fmtBRL(ct.monthlyValue)}/mês</span>
                    <span>·</span>
                    <span>{ct.videosPerMonth} vídeos/mês</span>
                    {ct.dueDay && (
                      <>
                        <span>·</span>
                        <span>vence dia {ct.dueDay}</span>
                      </>
                    )}
                  </div>
                  <div className="cont-card-dates">
                    {ct.startDate || "—"} → {ct.endDate || "—"}
                    {st === "a_vencer" && days !== null && (
                      <span className="cont-days">
                        · vence em {days} dias
                      </span>
                    )}
                    {st === "vencido" && days !== null && (
                      <span className="cont-days danger">
                        · vencido há {Math.abs(days)} dias
                      </span>
                    )}
                    {st === "cancelado" && ct.cancelledAt && (
                      <span className="cont-days muted">
                        · cancelado em {ct.cancelledAt}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="cont-card-actions">
                <button
                  className="cont-btn"
                  title="Ver cliente"
                  onClick={() => {
                    if (setDetailClientId) setDetailClientId(ct.clientId);
                    if (setView) setView("clientes");
                  }}
                >
                  <Eye size={14} />
                </button>
                <button
                  className="cont-btn"
                  title="Abrir / imprimir"
                  onClick={() =>
                    setPreview({ client: ct, contract: ct })
                  }
                >
                  <FileText size={14} />
                </button>
                <button
                  className="cont-btn"
                  title="Renovar"
                  onClick={() => handleRenew(ct)}
                >
                  <RefreshCw size={14} />
                </button>
                {st !== "cancelado" && (
                  <button
                    className="cont-btn warning"
                    title="Cancelar"
                    onClick={() => handleCancel(ct)}
                  >
                    <XCircle size={14} />
                  </button>
                )}
                <button
                  className="cont-btn danger"
                  title="Excluir"
                  onClick={() => handleDelete(ct)}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="cont-empty">
            <FileText size={32} />
            <div className="cont-empty-title">
              Nenhum contrato encontrado
            </div>
            <div className="cont-empty-desc">
              Vá em Clientes e crie um novo cliente marcando "Gerar
              contrato".
            </div>
          </div>
        )}
      </div>

      {/* Preview */}
      {preview && (
        <ContractPreview
          client={preview.client}
          contract={preview.contract}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
   MODAL DE PREVIEW (reaproveitado)
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
    a.download = `contrato-${
      client.name || client.clientName
    }-${contract.number}.html`;
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
          <span>Contrato #{contract.number}</span>
          <button className="kb-close" onClick={onClose}>
            ✕
          </button>
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