/* ============================================================
   SETTINGS — configurações do workspace
   - stages: etapas do kanban
   - priorities / formats / types / editors: opções dos selects
   - checklist: itens do checklist
   - branding
   ============================================================ */
import { DEFAULT_STAGES, CHECKLIST_DEFS } from "./utils";

const KEY = "dara-settings";

export const DEFAULT_PRIORITIES = ["Normal", "Alta", "Urgente"];
export const DEFAULT_FORMATS = [
  "Vertical 9:16",
  "Horizontal 16:9",
  "Quadrado 1:1",
  "Outro",
];
export const DEFAULT_TYPES = [
  "Vídeo imobiliário",
  "Reels",
  "Institucional",
  "Depoimento",
  "Anúncio",
  "IA",
  "Outro",
];

const DEFAULTS = {
  stages: DEFAULT_STAGES,
  checklist: CHECKLIST_DEFS,
  priorities: DEFAULT_PRIORITIES,
  formats: DEFAULT_FORMATS,
  types: DEFAULT_TYPES,
  editors: [], // lista fixa de editores (opcional) — a fila real vem do profiles
  brandName: "DARA",
  brandSub: "AUDIOVISUAL",
  workspaceName: "Dara Audiovisual",
  companyName: "",
  cnpj: "",
  address: "",
  contactEmail: "",
  contactPhone: "",
  instagram: "",
  pix: "",
  bankInfo: "",
  // template
  contractTemplate: "", // vazio = usa DEFAULT_TEMPLATE
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(s) {
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function resetSettings() {
  localStorage.removeItem(KEY);
  return { ...DEFAULTS };
}

/** Gera um id em MAIÚSCULAS a partir de um label. */
export function stageIdFromLabel(label, existing = []) {
  const base =
    label
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 20) || "ETAPA";
  let id = base;
  let i = 2;
  while (existing.includes(id)) {
    id = `${base}_${i++}`;
  }
  return id;
}

/* ============================================================
   OPÇÕES SIMPLES (prioridades, formatos, tipos, editores)
   ============================================================ */
export const OPTION_LISTS = [
  { key: "priorities", label: "Prioridades", icon: "flag" },
  { key: "formats", label: "Formatos", icon: "aspect" },
  { key: "types", label: "Tipos de conteúdo", icon: "tag" },
];

export function addOption(settings, key, value) {
  const v = String(value || "").trim();
  if (!v) return settings;
  const list = settings[key] || [];
  if (list.includes(v)) return settings;
  return { ...settings, [key]: [...list, v] };
}

export function renameOption(settings, key, oldValue, newValue) {
  const v = String(newValue || "").trim();
  if (!v) return settings;
  const list = (settings[key] || []).map((x) => (x === oldValue ? v : x));
  return { ...settings, [key]: list };
}

export function removeOption(settings, key, value) {
  const list = (settings[key] || []).filter((x) => x !== value);
  return { ...settings, [key]: list };
}

export function moveOption(settings, key, value, dir) {
  const list = [...(settings[key] || [])];
  const i = list.indexOf(value);
  if (i === -1) return settings;
  const j = i + dir;
  if (j < 0 || j >= list.length) return settings;
  [list[i], list[j]] = [list[j], list[i]];
  return { ...settings, [key]: list };
}