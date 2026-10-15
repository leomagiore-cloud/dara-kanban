/* ============================================================
   UTILS — datas úteis, IDs, helpers
   ============================================================ */

export function uid() {
  return crypto.randomUUID();
}

export function toISODate(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
}

export function parseISODate(s) {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addBusinessDays(date, days) {
  const d = new Date(date);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) added++;
  }
  return d;
}

export function businessDaysDiff(from, to) {
  const sign = to >= from ? 1 : -1;
  const start = sign === 1 ? from : to;
  const end = sign === 1 ? to : from;
  let count = 0;
  const cur = new Date(start);
  cur.setHours(0, 0, 0, 0);
  const endD = new Date(end);
  endD.setHours(0, 0, 0, 0);
  while (cur.getTime() < endD.getTime()) {
    cur.setDate(cur.getDate() + 1);
    const day = cur.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return sign * count;
}

export function fmtDateBR(iso) {
  if (!iso) return "—";
  const d = parseISODate(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export function nowStamp() {
  return new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ============================================================
   ETAPAS DO FLUXO — padrão (podem ser sobrescritas pelas
   configurações em /settings)
   ============================================================ */
export const DEFAULT_STAGES = [
  { id: "GRAVADO",     label: "Gravado",     hint: "Recém-gravados",     tone: "neutral" },
  { id: "DECUPAGEM",   label: "Decupagem",   hint: "Seleção de takes",   tone: "neutral" },
  { id: "EDICAO",      label: "Edição",      hint: "Em edição",          tone: "gold" },
  { id: "FINALIZACAO", label: "Finalização", hint: "Processos técnicos", tone: "gold" },
  { id: "REVISAO",     label: "Revisão",     hint: "Revisão interna",    tone: "gold" },
  { id: "ENVIADO",     label: "Enviado",     hint: "Aguardando cliente", tone: "info" },
  { id: "ALTERACAO",   label: "Alteração",   hint: "Cliente pediu ajuste", tone: "danger" },
  { id: "CONCLUIDO",   label: "Concluído",   hint: "Entregue e aprovado", tone: "success" },
];

// mantém o nome antigo funcionando em imports legados
export const STAGES = DEFAULT_STAGES;

export const CHECKLIST_DEFS = [
  ["colorGrading", "Color Grading"],
  ["audio", "Tratamento de áudio"],
  ["lettering", "Lettering / Motion"],
  ["legendas", "Legendas"],
  ["ortografia", "Revisão ortográfica"],
  ["exportacao", "Exportação"],
];

export const PRIORITIES = ["Normal", "Alta", "Urgente"];
export const FORMATS = ["Vertical 9:16", "Horizontal 16:9", "Quadrado 1:1", "Outro"];
export const TYPES = [
  "Vídeo imobiliário",
  "Reels",
  "Institucional",
  "Depoimento",
  "Anúncio",
  "IA",
  "Outro",
];

/* ============================================================
   DEADLINE — calcula o estado do prazo
   ============================================================ */
export function deadlineInfo(video) {
  if (video.stage === "CONCLUIDO") {
    return { level: "done", label: "Entregue", remaining: null };
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseISODate(video.dueDate);
  const remaining = businessDaysDiff(today, due);

  if (remaining < 0)
    return { level: "late", label: `${Math.abs(remaining)}d atrasado`, remaining };
  if (remaining === 0) return { level: "today", label: "Hoje", remaining };
  if (remaining === 1) return { level: "tomorrow", label: "Amanhã", remaining };
  if (remaining <= 3) return { level: "soon", label: `Em ${remaining} dias`, remaining };
  return { level: "ok", label: `Em ${remaining} dias`, remaining };
}

export function sortScore(video) {
  const info = deadlineInfo(video);
  if (video.stage === "CONCLUIDO") return 999;
  const prio = video.priority === "Urgente" ? 0 : video.priority === "Alta" ? 1 : 2;
  let bucket;
  if (info.level === "late") bucket = 0;
  else if (info.level === "today") bucket = 1;
  else if (info.level === "tomorrow") bucket = 2;
  else bucket = 3 + prio;
  return bucket * 10000 + (info.remaining ?? 0) * 10 + prio;
}

/* ============================================================
   LOCK OTIMISTA
   ============================================================ */
export function tryClaimVideo(videos, videoId, editor) {
  const target = videos.find((v) => v.id === videoId);
  if (!target) return { ok: false, reason: "not_found" };
  if (target.claimedBy && target.claimedBy !== editor.name) {
    return { ok: false, reason: "already_claimed", claimedBy: target.claimedBy };
  }
  const updated = videos.map((v) => {
    if (v.id !== videoId) return v;
    return {
      ...v,
      claimedBy: editor.name,
      claimedByEmail: editor.email,
      claimedAt: nowStamp(),
      version: (v.version ?? 1) + 1,
      history: [...v.history, { at: nowStamp(), text: `Pego por ${editor.name}` }],
    };
  });
  return { ok: true, videos: updated };
}

export function releaseVideo(videos, videoId, byUser) {
  return videos.map((v) => {
    if (v.id !== videoId) return v;
    return {
      ...v,
      claimedBy: null,
      claimedByEmail: null,
      claimedAt: null,
      version: (v.version ?? 1) + 1,
      history: [...v.history, { at: nowStamp(), text: `Liberado por ${byUser.name}` }],
    };
  });
}

export function isAvailable(video) {
  if (video.stage === "CONCLUIDO") return false;
  if (video.claimedBy) return false;
  return video.stage === "GRAVADO" || video.stage === "DECUPAGEM";
}

export function isInProduction(video) {
  if (video.stage === "CONCLUIDO") return false;
  return !!video.claimedBy;
}

/* ============================================================
   FORMATAÇÃO BRL
   ============================================================ */
export function fmtBRL(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/* ============================================================
   CONTRATOS — helpers
   ============================================================ */
export function contractStatus(contract) {
  if (contract.status === "cancelado") return "cancelado";
  if (!contract.endDate) return "ativo";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseISODate(contract.endDate);
  const diffDays = Math.round((end - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "vencido";
  if (diffDays <= 30) return "a_vencer";
  return "ativo";
}

export function contractStatusLabel(status) {
  const map = {
    ativo: "Ativo",
    a_vencer: "A vencer",
    vencido: "Vencido",
    cancelado: "Cancelado",
  };
  return map[status] || status;
}

export function contractDaysRemaining(endDate) {
  if (!endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = parseISODate(endDate);
  return Math.round((end - today) / (1000 * 60 * 60 * 24));
}