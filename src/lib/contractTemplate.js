/* ============================================================
   TEMPLATE DE CONTRATO
   - DEFAULT_TEMPLATE: usado quando o usuário nunca editou
   - generateContractHTML(client, contract, settings): faz o merge
   ============================================================ */

export const PLACEHOLDERS = [
  // cliente
  { key: "cliente.nome", label: "Nome do cliente" },
  { key: "cliente.empresa", label: "Empresa do cliente" },
  { key: "cliente.documento", label: "CPF/CNPJ do cliente" },
  { key: "cliente.rgIe", label: "RG / Inscrição Estadual" },
  { key: "cliente.telefone", label: "Telefone do cliente" },
  { key: "cliente.email", label: "E-mail do cliente" },
  { key: "cliente.instagram", label: "Instagram do cliente" },

  // endereço do cliente
  { key: "cliente.enderecoCompleto", label: "Endereço completo (uma linha)" },
  { key: "cliente.cep", label: "CEP" },
  { key: "cliente.rua", label: "Rua" },
  { key: "cliente.numero", label: "Número" },
  { key: "cliente.complemento", label: "Complemento" },
  { key: "cliente.bairro", label: "Bairro" },
  { key: "cliente.cidade", label: "Cidade" },
  { key: "cliente.estado", label: "Estado" },

  // representante legal
  { key: "cliente.representante", label: "Representante legal" },
  { key: "cliente.representanteDoc", label: "CPF do representante" },

  // contrato
  { key: "contrato.numero", label: "Número do contrato" },
  { key: "contrato.plano", label: "Plano" },
  { key: "contrato.videosMes", label: "Vídeos por mês" },
  { key: "contrato.valorMensal", label: "Valor mensal (R$)" },
  { key: "contrato.duracao", label: "Duração (meses)" },
  { key: "contrato.inicio", label: "Início da vigência" },
  { key: "contrato.fim", label: "Término da vigência" },
  { key: "contrato.formaPagamento", label: "Forma de pagamento" },
  { key: "contrato.diaVencimento", label: "Dia de vencimento" },
  { key: "contrato.observacao", label: "Observação" },

  // workspace / branding
  { key: "workspace.marca", label: "Marca (DARA)" },
  { key: "workspace.marcaSub", label: "Subtítulo (AUDIOVISUAL)" },
  { key: "workspace.nome", label: "Nome do workspace" },
  { key: "workspace.cnpj", label: "CNPJ" },
  { key: "workspace.endereco", label: "Endereço" },
  { key: "workspace.email", label: "E-mail de contato" },
  { key: "workspace.telefone", label: "Telefone de contato" },
  { key: "workspace.instagram", label: "Instagram" },
  { key: "workspace.pix", label: "Chave PIX" },
  { key: "workspace.banco", label: "Banco / agência / conta" },

  // data
  { key: "hoje", label: "Data de hoje (extenso)" },
];

export const DEFAULT_TEMPLATE = `
<div class="header">
  <div class="brand">{{workspace.marca}}</div>
  <div class="brand-sub">{{workspace.marcaSub}}</div>
</div>

<h1>Contrato de Prestação de Serviços</h1>
<div class="contract-num">
  Contrato nº {{contrato.numero}} · Emitido em {{hoje}}
</div>

<h2>1. Partes</h2>
<div class="parties">
  <div class="party">
    <div class="party-label">Contratada</div>
    <strong>{{workspace.nome}}</strong>
    <span>CNPJ: {{workspace.cnpj}}</span>
    <span>{{workspace.endereco}}</span>
    <span>E-mail: {{workspace.email}}</span>
    <span>Telefone: {{workspace.telefone}}</span>
  </div>
  <div class="party">
    <div class="party-label">Contratante</div>
    <strong>{{cliente.nome}}</strong>
    <span>{{cliente.documento}}</span>
    <span>{{cliente.enderecoCompleto}}</span>
    <span>Telefone: {{cliente.telefone}}</span>
    <span>E-mail: {{cliente.email}}</span>
  </div>
</div>

<h2>2. Qualificação das partes</h2>
<table>
  <tbody>
    <tr>
      <td><strong>Contratada</strong></td>
      <td>{{workspace.nome}} — CNPJ {{workspace.cnpj}} — {{workspace.endereco}}</td>
    </tr>
    <tr>
      <td><strong>Contratante</strong></td>
      <td>
        {{cliente.nome}}
        {{cliente.empresa}}
        — {{cliente.documento}}
        {{cliente.rgIe}}
        — {{cliente.enderecoCompleto}}
      </td>
    </tr>
    <tr>
      <td><strong>Representante legal</strong></td>
      <td>{{cliente.representante}} — CPF {{cliente.representanteDoc}}</td>
    </tr>
  </tbody>
</table>

<h2>3. Objeto do contrato</h2>
<p>
  A CONTRATADA prestará serviços de produção audiovisual ao CONTRATANTE,
  conforme o plano <strong>{{contrato.plano}}</strong> descrito na cláusula 4.
</p>

<h2>4. Plano contratado</h2>
<table>
  <thead><tr><th>Descrição</th><th>Detalhes</th></tr></thead>
  <tbody>
    <tr><td>Plano</td><td class="destaque">{{contrato.plano}}</td></tr>
    <tr><td>Vídeos por mês</td><td class="destaque">{{contrato.videosMes}}</td></tr>
    <tr><td>Valor mensal</td><td class="valor destaque">{{contrato.valorMensal}}</td></tr>
    <tr><td>Duração</td><td>{{contrato.duracao}} meses</td></tr>
    <tr><td>Início</td><td>{{contrato.inicio}}</td></tr>
    <tr><td>Término</td><td>{{contrato.fim}}</td></tr>
    <tr><td>Forma de pagamento</td><td>{{contrato.formaPagamento}}</td></tr>
    <tr><td>Vencimento</td><td>Todo dia {{contrato.diaVencimento}}</td></tr>
    <tr><td>Chave PIX</td><td>{{workspace.pix}}</td></tr>
    <tr><td>Dados bancários</td><td>{{workspace.banco}}</td></tr>
    {{contrato.observacao}}
  </tbody>
</table>

<h2>5. Obrigações da contratada</h2>
<ol>
  <li>Realizar as gravações conforme cronograma acordado entre as partes.</li>
  <li>Executar a edição, finalização e entrega dos vídeos nos prazos estabelecidos.</li>
  <li>Manter sigilo sobre informações, imagens e materiais fornecidos pelo CONTRATANTE.</li>
  <li>Entregar os arquivos finais em formato e resolução adequados.</li>
  <li>Realizar até 2 (duas) rodadas de ajustes por vídeo, sem custo adicional.</li>
</ol>

<h2>6. Obrigações do contratante</h2>
<ol>
  <li>Fornecer todo o material, informações e acessos necessários à execução dos serviços.</li>
  <li>Efetuar o pagamento conforme a cláusula 4, sob pena de suspensão dos serviços.</li>
  <li>Manter comunicação clara sobre prazos, ajustes e aprovações.</li>
  <li>Responder pelas autorizações de uso de imagem, áudio e demais direitos envolvidos.</li>
</ol>

<h2>7. Prazos e entregas</h2>
<p>Os prazos de entrega serão definidos caso a caso, respeitando o fluxo interno
de produção da CONTRATADA. Atrasos do CONTRATANTE poderão impactar no cronograma.</p>

<h2>8. Rescisão</h2>
<p>Este contrato poderá ser rescindido por qualquer das partes mediante aviso
prévio de 30 (trinta) dias. Em caso de rescisão antecipada pelo CONTRATANTE,
os serviços já executados serão cobrados proporcionalmente.</p>

<h2>9. Disposições gerais</h2>
<p>Este contrato é regido pelas leis brasileiras. Eventuais controvérsias serão
resolvidas amigavelmente; não havendo acordo, fica eleito o foro da comarca
da CONTRATADA para dirimir quaisquer questões.</p>

<p>E por estarem de acordo, as partes assinam o presente instrumento em duas
vias de igual teor e forma.</p>

<div class="assinaturas">
  <div class="assinatura">
    <div class="assinatura-linha"></div>
    <strong>{{workspace.nome}}</strong><br />
    <span>CONTRATADA</span>
  </div>
  <div class="assinatura">
    <div class="assinatura-linha"></div>
    <strong>{{cliente.nome}}</strong><br />
    <span>CONTRATANTE</span>
  </div>
</div>

<div class="footer-note">
  Documento gerado eletronicamente · {{workspace.marca}} · {{hoje}}
</div>
`;

const fmtBRL = (v) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (iso) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("pt-BR");
};

const hoje = () =>
  new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

/** Substitui {{chave}} pelos valores. */
function applyPlaceholders(html, values) {
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = values[key];
    if (v === undefined || v === null || v === "") {
      if (key === "contrato.observacao") return "";
      return "—";
    }
    return v;
  });
}

/** Monta os valores que preenchem os placeholders. */
export function buildPlaceholderValues(client, contract, settings = {}) {
  const obs = contract.observation
    ? `<tr><td>Observações</td><td>${contract.observation}</td></tr>`
    : "";

  const endParts = [
    client.address &&
      `${client.address}, ${client.addressNumber || "s/n"}`,
    client.addressComplement,
    client.neighborhood,
    client.city && client.state
      ? `${client.city}/${client.state}`
      : client.city || client.state,
    client.zipCode && `CEP ${client.zipCode}`,
  ].filter(Boolean);
  const enderecoCompleto = endParts.join(" · ") || "—";

  return {
    "cliente.nome": client.name || "—",
    "cliente.empresa": client.company || "",
    "cliente.documento": client.docNumber || "—",
    "cliente.rgIe": client.rgIe || "",
    "cliente.telefone": client.phone || "",
    "cliente.email": client.email || "",
    "cliente.instagram": client.instagram || "",

    "cliente.enderecoCompleto": enderecoCompleto,
    "cliente.cep": client.zipCode || "—",
    "cliente.rua": client.address || "—",
    "cliente.numero": client.addressNumber || "—",
    "cliente.complemento": client.addressComplement || "",
    "cliente.bairro": client.neighborhood || "—",
    "cliente.cidade": client.city || "—",
    "cliente.estado": client.state || "—",

    "cliente.representante": client.repName || "",
    "cliente.representanteDoc": client.repDoc || "",

    "contrato.numero": contract.number || "—",
    "contrato.plano": contract.plan || "—",
    "contrato.videosMes": `${contract.videosPerMonth} vídeos`,
    "contrato.valorMensal": fmtBRL(contract.monthlyValue),
    "contrato.duracao": contract.duration || 12,
    "contrato.inicio": fmtDate(contract.startDate),
    "contrato.fim": fmtDate(contract.endDate),
    "contrato.formaPagamento": contract.paymentMethod || "PIX",
    "contrato.diaVencimento": contract.dueDay || 10,
    "contrato.observacao": obs,

    "workspace.marca": settings.brandName || "DARA",
    "workspace.marcaSub": settings.brandSub || "AUDIOVISUAL",
    "workspace.nome":
      settings.companyName || settings.workspaceName || "Dara Audiovisual",
    "workspace.cnpj": settings.cnpj || "",
    "workspace.endereco": settings.address || "",
    "workspace.email": settings.contactEmail || "",
    "workspace.telefone": settings.contactPhone || "",
    "workspace.instagram": settings.instagram || "",
    "workspace.pix": settings.pix || "",
    "workspace.banco": settings.bankInfo || "",

    hoje: hoje(),
  };
}

/** Gera o HTML completo do contrato. */
export function generateContractHTML(client, contract, settings = {}) {
  const values = buildPlaceholderValues(client, contract, settings);
  const template =
    (settings.contractTemplate || "").trim() || DEFAULT_TEMPLATE;
  const body = applyPlaceholders(template, values);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Contrato — ${client.name || ""}</title>
<style>
  @page { size: A4; margin: 24mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1a1a1a; line-height: 1.7; font-size: 11.5pt; }
  .header { text-align: center; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 2px solid #1a1a1a; }
  .brand { font-size: 22pt; letter-spacing: 8px; font-weight: 700; margin-bottom: 4px; }
  .brand-sub { font-size: 9pt; letter-spacing: 4px; color: #555; text-transform: uppercase; }
  h1 { text-align: center; font-size: 14pt; letter-spacing: 3px; margin: 30px 0 8px; text-transform: uppercase; font-weight: 700; }
  .contract-num { text-align: center; font-size: 10pt; color: #666; margin-bottom: 40px; }
  h2 { font-size: 11pt; letter-spacing: 1.5px; margin: 26px 0 10px; text-transform: uppercase; font-weight: 700; border-bottom: 1px solid #ccc; padding-bottom: 4px; }
  p { margin-bottom: 12px; text-align: justify; }
  .parties { display: flex; gap: 20px; margin: 20px 0 30px; }
  .party { flex: 1; background: #f7f7f5; padding: 16px 18px; border-left: 3px solid #1a1a1a; font-size: 10.5pt; line-height: 1.6; }
  .party-label { font-size: 8.5pt; letter-spacing: 2px; text-transform: uppercase; color: #666; margin-bottom: 6px; font-weight: 700; }
  .party strong { display: block; font-size: 11.5pt; margin-bottom: 4px; }
  .party span { display: block; color: #333; }
  table { width: 100%; border-collapse: collapse; margin: 16px 0 24px; font-size: 10.5pt; }
  th, td { border: 1px solid #d5d5d5; padding: 10px 12px; text-align: left; vertical-align: top; }
  th { background: #f0f0ee; font-weight: 700; font-size: 9.5pt; letter-spacing: 0.5px; text-transform: uppercase; }
  td.valor { text-align: right; font-weight: 600; }
  td.destaque { font-weight: 700; background: #fafaf8; }
  ol { margin: 12px 0 20px 24px; }
  ol li { margin-bottom: 10px; text-align: justify; }
  .assinaturas { display: flex; gap: 40px; margin-top: 60px; page-break-inside: avoid; }
  .assinatura { flex: 1; text-align: center; font-size: 10pt; }
  .assinatura-linha { border-top: 1px solid #1a1a1a; margin-bottom: 6px; padding-top: 40px; }
  .footer-note { margin-top: 50px; padding-top: 16px; border-top: 1px solid #ccc; font-size: 8.5pt; color: #888; text-align: center; }
  @media print { body { padding: 0; } .no-print { display: none; } }
</style>
</head>
<body>
${body}
</body>
</html>`;
}

export function generateContractNumber() {
  const now = new Date();
  const year = now.getFullYear();
  const seq = String(Math.floor(Math.random() * 900) + 100).padStart(3, "0");
  return `${year}-${seq}`;
}