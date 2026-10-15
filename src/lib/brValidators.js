/* ============================================================
   BR VALIDATORS — máscaras, validações e ViaCEP
   ============================================================ */

/* ---------- máscaras ---------- */

export function maskCPF(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function maskCNPJ(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function maskCEP(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 8);
  return d.replace(/(\d{5})(\d)/, "$1-$2");
}

export function maskPhone(v) {
  const d = String(v || "").replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) {
    // fixo: (11) 1234-5678
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  // celular: (11) 91234-5678
  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

/* ---------- validadores ---------- */

export function isValidCPF(v) {
  const c = String(v || "").replace(/\D/g, "");
  if (c.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(c)) return false; // todos iguais

  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(c[i]) * (10 - i);
  let d1 = (s * 10) % 11;
  if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(c[9])) return false;

  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(c[i]) * (11 - i);
  let d2 = (s * 10) % 11;
  if (d2 === 10) d2 = 0;
  return d2 === parseInt(c[10]);
}

export function isValidCNPJ(v) {
  const c = String(v || "").replace(/\D/g, "");
  if (c.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(c)) return false;

  const calc = (base) => {
    let pos = base.length - 7;
    let sum = 0;
    for (let i = base.length; i >= 1; i--) {
      sum += parseInt(base[base.length - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };

  const d1 = calc(c.slice(0, 12));
  const d2 = calc(c.slice(0, 12) + d1);
  return d1 === parseInt(c[12]) && d2 === parseInt(c[13]);
}

export function isValidDoc(v, type = "cpf") {
  if (!v) return true; // campo opcional
  return type === "cnpj" ? isValidCNPJ(v) : isValidCPF(v);
}

export function isValidCEP(v) {
  const c = String(v || "").replace(/\D/g, "");
  return c.length === 8;
}

export function isValidPhone(v) {
  const c = String(v || "").replace(/\D/g, "");
  return c.length === 10 || c.length === 11;
}

export function isValidUF(v) {
  return /^[A-Za-z]{2}$/.test(String(v || "").trim());
}

/* ---------- ViaCEP ---------- */

export async function lookupCEP(cep) {
  const c = String(cep || "").replace(/\D/g, "");
  if (c.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${c}/json/`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data.erro) return null;
    return {
      address: data.logradouro || "",
      neighborhood: data.bairro || "",
      city: data.localidade || "",
      state: data.uf || "",
      complement: data.complemento || "",
    };
  } catch {
    return null;
  }
}