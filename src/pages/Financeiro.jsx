import React, { useState, useEffect, useMemo } from "react";
import "./financeiro.css";
import { uid, fmtBRL, toISODate, parseISODate } from "../lib/utils";
import { loadClients, loadExpenses, saveExpenses } from "../lib/db";

/* Retorna quantos dias faltam até o próximo vencimento (dia X do mês). */
function daysUntilDue(dueDay) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let next = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (next < today) {
    next = new Date(today.getFullYear(), today.getMonth() + 1, dueDay);
  }
  return Math.round((next - today) / (1000 * 60 * 60 * 24));
}

export default function Financeiro() {
  const [clients, setClients] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [form, setForm] = useState({ desc: "", value: "", category: "Software" });

  useEffect(() => {
    let alive = true;
    Promise.all([loadClients(), loadExpenses()]).then(([sc, se]) => {
      if (!alive) return;
      setClients(sc || []);
      setExpenses(se || []);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    saveExpenses(expenses);
  }, [expenses, loaded]);

  const receita = useMemo(
    () => clients.reduce((s, c) => s + (Number(c.monthlyValue) || 0), 0),
    [clients]
  );
  const despesas = useMemo(
    () => expenses.reduce((s, e) => s + (Number(e.value) || 0), 0),
    [expenses]
  );
  const resultado = receita - despesas;
  const margem = receita > 0 ? Math.round((resultado / receita) * 100) : 0;

  /* vencimentos ordenados por proximidade */
  const vencimentos = useMemo(() => {
    return clients
      .filter((c) => Number(c.monthlyValue) > 0)
      .map((c) => {
        const dueDay = Number(c.dueDay) || 10;
        const days = daysUntilDue(dueDay);
        return { ...c, dueDay, days };
      })
      .sort((a, b) => a.days - b.days);
  }, [clients]);

  function addExpense() {
    if (!form.desc.trim() || !form.value) return;
    setExpenses((prev) => [
      ...prev,
      {
        id: uid(),
        desc: form.desc.trim(),
        value: Number(form.value) || 0,
        category: form.category,
        date: toISODate(new Date()),
      },
    ]);
    setForm({ desc: "", value: "", category: "Software" });
  }

  function removeExpense(id) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  if (!loaded) return null;

  return (
    <div className="fin">
      <div className="kpi-grid">
        <Kpi label="Receita mensal (MRR)" value={fmtBRL(receita)} hint="soma dos planos ativos" />
        <Kpi label="Despesas do mês" value={fmtBRL(despesas)} hint="custos operacionais" critical />
        <Kpi
          label="Resultado"
          value={fmtBRL(resultado)}
          hint={`margem de ${margem}%`}
          highlight={resultado >= 0 ? "up" : "down"}
        />
        <Kpi label="Clientes ativos" value={clients.length} hint="com plano em vigor" />
      </div>

      <div className="fin-grid">
        {/* Vencimentos — destaque no topo */}
        <section className="fin-card span-2">
          <div className="fin-card-head">
            <div>
              <h3 className="fin-card-title">Próximos vencimentos</h3>
              <p className="fin-card-sub">Cobranças dos clientes ativos</p>
            </div>
          </div>
          {vencimentos.length === 0 ? (
            <div className="fin-empty">Nenhum cliente com mensalidade cadastrada.</div>
          ) : (
            <ul className="fin-dues">
              {vencimentos.map((c) => {
                const tone =
                  c.days === 0
                    ? "today"
                    : c.days <= 3
                    ? "soon"
                    : c.days <= 7
                    ? "week"
                    : "ok";
                return (
                  <li key={c.id} className={"fin-due tone-" + tone}>
                    <div className="fin-due-info">
                      <div className="fin-due-name">{c.name}</div>
                      <div className="fin-due-meta">
                        Dia {c.dueDay} · {c.paymentMethod || "—"}
                      </div>
                    </div>
                    <div className="fin-due-value">{fmtBRL(c.monthlyValue)}</div>
                    <div className={"fin-due-days tone-" + tone}>
                      {c.days === 0
                        ? "Hoje"
                        : c.days === 1
                        ? "Amanhã"
                        : `Em ${c.days} dias`}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Tabela de clientes */}
        <section className="fin-card span-2">
          <div className="fin-card-head">
            <div>
              <h3 className="fin-card-title">Clientes e planos</h3>
              <p className="fin-card-sub">Receita recorrente por cliente</p>
            </div>
          </div>
          <div className="fin-table">
            <div className="fin-table-head">
              <span>Cliente</span>
              <span>Plano</span>
              <span>Vencimento</span>
              <span>Valor mensal</span>
            </div>
            {clients.map((c) => (
              <div key={c.id} className="fin-table-row">
                <span className="fin-client">{c.name}</span>
                <span className="fin-plan">{c.plan || "—"}</span>
                <span className="fin-videos">Dia {Number(c.dueDay) || 10}</span>
                <span className="fin-value">{fmtBRL(c.monthlyValue)}</span>
              </div>
            ))}
            {clients.length === 0 && (
              <div className="fin-empty">Nenhum cliente cadastrado.</div>
            )}
          </div>
        </section>

        {/* Nova despesa */}
        <section className="fin-card">
          <div className="fin-card-head">
            <div>
              <h3 className="fin-card-title">Nova despesa</h3>
              <p className="fin-card-sub">Adicione um custo operacional</p>
            </div>
          </div>
          <div className="fin-form">
            <label className="field">
              <span>Descrição</span>
              <input
                value={form.desc}
                onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
                placeholder="Ex: Adobe CC"
              />
            </label>
            <label className="field">
              <span>Valor (R$)</span>
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                placeholder="0"
              />
            </label>
            <label className="field">
              <span>Categoria</span>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                <option>Software</option>
                <option>Infra</option>
                <option>Marketing</option>
                <option>Equipe</option>
                <option>Outros</option>
              </select>
            </label>
            <button className="btn btn-primary" onClick={addExpense}>
              Adicionar despesa
            </button>
          </div>
        </section>

        <section className="fin-card span-2">
          <div className="fin-card-head">
            <div>
              <h3 className="fin-card-title">Despesas do mês</h3>
              <p className="fin-card-sub">{expenses.length} lançamentos</p>
            </div>
          </div>
          {expenses.length === 0 ? (
            <div className="fin-empty">Nenhuma despesa lançada.</div>
          ) : (
            <ul className="fin-expenses">
              {expenses.map((e) => (
                <li key={e.id} className="fin-expense">
                  <div className="fin-expense-info">
                    <div className="fin-expense-desc">{e.desc}</div>
                    <div className="fin-expense-cat">{e.category}</div>
                  </div>
                  <span className="fin-expense-value">{fmtBRL(e.value)}</span>
                  <button
                    className="kb-close"
                    onClick={() => removeExpense(e.id)}
                    title="Remover"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Kpi({ label, value, hint, critical, highlight }) {
  return (
    <div className={"kpi" + (critical ? " kpi-critical" : "")}>
      <div className="kpi-label">{label}</div>
      <div
        className="kpi-value"
        style={{
          color:
            highlight === "up"
              ? "var(--dara-success)"
              : highlight === "down"
              ? "var(--dara-danger)"
              : undefined,
        }}
      >
        {value}
      </div>
      {hint && <div className="kpi-trend">{hint}</div>}
    </div>
  );
}