/* ============================================================
   DB — camada de dados Supabase
   ============================================================ */
import { supabase } from "./supabase";

const emptyToNull = (v) => (v === "" || v === undefined ? null : v);

/* ---------- vídeos ---------- */
const videoFromRow = (r) => ({
  id: r.id,
  client: r.client,
  title: r.title,
  shootDate: r.shoot_date || "",
  dueDate: r.due_date || "",
  editor: r.editor,
  priority: r.priority,
  format: r.format,
  type: r.type,
  notes: r.notes,
  filesLink: r.files_link,
  scriptLink: r.script_link,
  stage: r.stage,
  order: r.sort_order,
  checklist: r.checklist || {},
  revisions: r.revisions || [],
  history: r.history || [],
  claimedBy: r.claimed_by,
  claimedByEmail: r.claimed_by_email,
  claimedAt: r.claimed_at,
  version: r.version,
  createdAt: new Date(r.created_at).getTime(),
});

const videoToRow = (v) => ({
  id: v.id,
  client: v.client || "",
  title: v.title,
  shoot_date: emptyToNull(v.shootDate),
  due_date: emptyToNull(v.dueDate),
  editor: v.editor || "",
  priority: v.priority || "Normal",
  format: v.format || "",
  type: v.type || "",
  notes: v.notes || "",
  files_link: v.filesLink || "",
  script_link: v.scriptLink || "",
  stage: v.stage,
  sort_order: v.order ?? 0,
  checklist: v.checklist || {},
  revisions: v.revisions || [],
  history: v.history || [],
  claimed_by: v.claimedBy ?? null,
  claimed_by_email: v.claimedByEmail ?? null,
  claimed_at: v.claimedAt ?? null,
  version: v.version ?? 1,
});

/* ---------- contratos ---------- */
const contractFromRow = (r) => ({
  number: r.number,
  plan: r.plan,
  videosPerMonth: r.videos_per_month,
  monthlyValue: Number(r.monthly_value),
  duration: r.duration,
  paymentMethod: r.payment_method,
  dueDay: r.due_day,
  observation: r.observation,
  startDate: r.start_date || "",
  endDate: r.end_date || "",
  status: r.status,
  cancelledAt: r.cancelled_at,
  generatedAt: r.generated_at,
});

const contractToRow = (ct, clientId) => ({
  client_id: clientId,
  number: ct.number,
  plan: ct.plan || "Essencial",
  videos_per_month: Number(ct.videosPerMonth) || 0,
  monthly_value: Number(ct.monthlyValue) || 0,
  duration: Number(ct.duration) || 12,
  payment_method: ct.paymentMethod || "",
  due_day: Number(ct.dueDay) || 10,
  observation: ct.observation || "",
  start_date: emptyToNull(ct.startDate),
  end_date: emptyToNull(ct.endDate),
  status: ["ativo", "a_vencer", "vencido", "cancelado"].includes(ct.status)
    ? ct.status
    : "ativo",
  cancelled_at: emptyToNull(ct.cancelledAt),
  generated_at: ct.generatedAt || new Date().toISOString(),
});

/* ---------- clientes ---------- */
const clientFromRow = (r, contracts) => ({
  id: r.id,
  name: r.name,
  company: r.company,
  phone: r.phone,
  email: r.email,
  instagram: r.instagram,
  plan: r.plan,
  monthlyValue: Number(r.monthly_value),
  contractedVideos: r.contracted_videos,
  dueDay: r.due_day ?? 10,
  paymentMethod: r.payment_method ?? "",
  startDate: r.start_date || "",
  docType: r.doc_type || "cpf",
  docNumber: r.doc_number || "",
  rgIe: r.rg_ie || "",
  zipCode: r.zip_code || "",
  address: r.address || "",
  addressNumber: r.address_number || "",
  addressComplement: r.address_complement || "",
  neighborhood: r.neighborhood || "",
  city: r.city || "",
  state: r.state || "",
  repName: r.rep_name || "",
  repDoc: r.rep_doc || "",
  notes: r.notes,
  createdAt: new Date(r.created_at).getTime(),
  contracts: contracts.map(contractFromRow),
});

const clientToRow = (c) => ({
  id: c.id,
  name: c.name,
  company: c.company || "",
  phone: c.phone || "",
  email: c.email || "",
  instagram: c.instagram || "",
  plan: c.plan || "Essencial",
  monthly_value: Number(c.monthlyValue) || 0,
  contracted_videos: Number(c.contractedVideos) || 0,
  due_day: Number(c.dueDay) || 10,
  payment_method: c.paymentMethod || "",
  start_date: emptyToNull(c.startDate),
  doc_type: c.docType || "cpf",
  doc_number: c.docNumber || "",
  rg_ie: c.rgIe || "",
  zip_code: c.zipCode || "",
  address: c.address || "",
  address_number: c.addressNumber || "",
  address_complement: c.addressComplement || "",
  neighborhood: c.neighborhood || "",
  city: c.city || "",
  state: c.state || "",
  rep_name: c.repName || "",
  rep_doc: c.repDoc || "",
  notes: c.notes || "",
});

/* ---------- despesas ---------- */
const expenseFromRow = (r) => ({
  id: r.id,
  desc: r.description,
  value: Number(r.value),
  category: r.category,
  date: r.date,
});

const expenseToRow = (e) => ({
  id: e.id,
  description: e.desc,
  value: Number(e.value) || 0,
  category: e.category || "Outros",
  date: e.date,
});

/* ---------- diff ---------- */
const snapshots = {
  videos: new Map(),
  clients: new Map(),
  contracts: new Map(),
  expenses: new Map(),
};

function diff(snapKey, rows) {
  const prev = snapshots[snapKey];
  const next = new Map(rows.map((r) => [r.id ?? r.number, JSON.stringify(r)]));
  const upserts = rows.filter(
    (r) => prev.get(r.id ?? r.number) !== next.get(r.id ?? r.number)
  );
  const removed = [...prev.keys()].filter((k) => !next.has(k));
  return { upserts, removed, next };
}

function logErr(where, error) {
  if (error) console.error(`[db:${where}]`, error.message);
  return !error;
}

/* ============================================================
   VÍDEOS
   ============================================================ */
export async function loadVideos() {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: true });
  if (!logErr("loadVideos", error)) return null;
  const rows = data.map(videoFromRow);
  snapshots.videos = new Map(
    data.map((r) => [r.id, JSON.stringify(videoToRow(videoFromRow(r)))])
  );
  return rows;
}

export async function saveVideos(videos) {
  const rows = videos.map(videoToRow);
  const { upserts, removed, next } = diff("videos", rows);
  if (!upserts.length && !removed.length) return true;

  if (upserts.length) {
    const { error } = await supabase.from("videos").upsert(upserts);
    if (!logErr("saveVideos.upsert", error)) return false;
  }
  if (removed.length) {
    const { error } = await supabase.from("videos").delete().in("id", removed);
    if (!logErr("saveVideos.delete", error)) return false;
  }
  snapshots.videos = next;
  return true;
}

export async function claimVideoRemote(id) {
  const { data, error } = await supabase.rpc("claim_video", { p_id: id });
  if (error) {
    const reason = error.message.includes("already_claimed")
      ? "already_claimed"
      : error.message.includes("not_found")
      ? "not_found"
      : "error";
    return { ok: false, reason };
  }
  return { ok: true, video: videoFromRow(data) };
}

export async function releaseVideoRemote(id) {
  const { data, error } = await supabase.rpc("release_video", { p_id: id });
  if (error) return { ok: false };
  return { ok: true, video: videoFromRow(data) };
}

export function subscribeVideos(onChange) {
  const channel = supabase
    .channel("videos-live")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "videos" },
      onChange    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/* ============================================================
   CLIENTES + CONTRATOS
   ============================================================ */
export async function loadClients() {
  const [cl, ct] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: true }),
    supabase
      .from("contracts")
      .select("*")
      .order("generated_at", { ascending: true }),
  ]);
  if (!logErr("loadClients", cl.error) || !logErr("loadContracts", ct.error))
    return null;

  const clients = cl.data.map((r) =>
    clientFromRow(r, ct.data.filter((x) => x.client_id === r.id))
  );
  snapshots.clients = new Map(
    cl.data.map((r) => [
      r.id,
      JSON.stringify(clientToRow(clientFromRow(r, []))),
    ])
  );
  snapshots.contracts = new Map(
    ct.data.map((r) => [
      r.number,
      JSON.stringify(contractToRow(contractFromRow(r), r.client_id)),
    ])
  );
  return clients;
}

export async function saveClients(clients) {
  const cRows = clients.map(clientToRow);
  const cd = diff("clients", cRows);

  const ctRows = clients.flatMap((c) =>
    (c.contracts || []).map((ct) => contractToRow(ct, c.id))
  );
  const td = diff(
    "contracts",
    ctRows.map((r) => ({ ...r, id: undefined }))
  );

  if (cd.upserts.length) {
    const { error } = await supabase.from("clients").upsert(cd.upserts);
    if (!logErr("saveClients.upsert", error)) return false;
  }

  if (td.upserts.length) {
    const { error } = await supabase
      .from("contracts")
      .upsert(td.upserts, { onConflict: "number" });
    if (!logErr("saveClients.contracts.upsert", error)) return false;
  }

  if (td.removed.length) {
    const { error } = await supabase
      .from("contracts")
      .delete()
      .in("number", td.removed);
    if (!logErr("saveClients.contracts.delete", error)) return false;
  }

  if (cd.removed.length) {
    const { error } = await supabase
      .from("clients")
      .delete()
      .in("id", cd.removed);
    if (!logErr("saveClients.delete", error)) return false;
  }

  snapshots.clients = cd.next;
  snapshots.contracts = td.next;
  return true;
}

/* ============================================================
   DESPESAS
   ============================================================ */
export async function loadExpenses() {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false });
  if (!logErr("loadExpenses", error)) return null;
  snapshots.expenses = new Map(
    data.map((r) => [r.id, JSON.stringify(expenseToRow(expenseFromRow(r)))])
  );
  return data.map(expenseFromRow);
}

export async function saveExpenses(expenses) {
  const rows = expenses.map(expenseToRow);
  const { upserts, removed, next } = diff("expenses", rows);
  if (upserts.length) {
    const { error } = await supabase.from("expenses").upsert(upserts);
    if (!logErr("saveExpenses.upsert", error)) return false;
  }
  if (removed.length) {
    const { error } = await supabase.from("expenses").delete().in("id", removed);
    if (!logErr("saveExpenses.delete", error)) return false;
  }
  snapshots.expenses = next;
  return true;
}