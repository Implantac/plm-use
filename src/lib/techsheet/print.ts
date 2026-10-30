// Impressão da ficha técnica → "PDF factory-ready" sem dependências: monta um
// documento A4 autocontido (HTML string) e o navegador cuida de "Imprimir →
// Salvar como PDF". Suporta dois modos:
//   - Engenharia Completa (padrão): custos, Mark-up Divisor, margens e fornecedores;
//   - Facção / Oficina Cega (`omitCosts: true`): zero valores em R$, focado em
//     consumo, variantes de cor, aplicações, medidas graduadas, roteiro e ABNT.
import type { BomItem, BopStep, TechSheetData } from "./store";
import { custoTotalBOM, custoTotalBOP, tempoTotalBOP } from "./store";
import type { Aplicacao } from "./aplicacoes";
import { custoAplicacoesPecasTotal, setupTotal } from "./aplicacoes";
import {
  CARE_SYMBOL_LABELS,
  bomItemCustoEfetivo,
  computeGradedMatrix,
  validateComposicaoAbnt,
} from "./textile";
import { computeFullTechSheetPricing } from "./pricing";

export interface PrintIdentity {
  ref: string;
  name: string;
  category: string;
  season: string;
  /** https apenas — foto entra no documento que a fábrica recebe; URL de
   *  outro esquema (javascript:, data:) é ignorado de propósito. */
  foto?: string;
}

export interface PrintOptions {
  /** Quando true, omite 100% dos custos, preços, margens e fornecedores comerciais. */
  omitCosts?: boolean;
}

const esc = (v: unknown): string =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

function colorwaysBlock(data: TechSheetData): string {
  if (!data.colorways?.length) return "";
  const pills = data.colorways
    .map(
      (c) =>
        `<span class="cw"><span class="sw" style="background:${esc(c.hex)}"></span><b>${esc(c.code)}</b> ${esc(c.name)} (${esc(c.status)})</span>`,
    )
    .join(" ");
  return `<h2>Cartela de Variantes (Colorways)</h2><div class="cw-wrap">${pills}</div>`;
}

function bomTable(bom: BomItem[], omitCosts: boolean): string {
  if (omitCosts) {
    const rows = bom
      .map(
        (b) => `<tr><td>${esc(b.tipo)}</td><td>${esc(b.material)}</td>
        <td class="num">${esc(b.consumo)} ${esc(b.unidade)}</td>
        <td class="num">${b.perdaPct != null ? esc(b.perdaPct) + "%" : "—"}</td>
        <td>${b.lote ? esc(b.lote) : "—"}</td></tr>`,
      )
      .join("");
    return `<h2>BOM — Estrutura de Materiais (Facção)</h2>
    <table><thead><tr><th>Tipo</th><th>Material</th><th>Consumo/peça</th><th>Quebra</th><th>Lote/Obs</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="muted">sem itens</td></tr>'}</tbody></table>`;
  }

  const rows = bom
    .map(
      (b) => `<tr><td>${esc(b.tipo)}</td><td>${esc(b.material)}</td><td>${esc(b.fornecedor)}</td>
      <td class="num">${esc(b.consumo)} ${esc(b.unidade)}${b.perdaPct ? ` (+${esc(b.perdaPct)}%)` : ""}</td>
      <td class="num">${brl(bomItemCustoEfetivo(b))}</td></tr>`,
    )
    .join("");
  return `<h2>BOM — Materiais</h2>
  <table><thead><tr><th>Tipo</th><th>Material</th><th>Fornecedor</th><th>Consumo</th><th>Custo</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" class="muted">sem itens</td></tr>'}</tbody>
  <tfoot><tr><th colspan="4">Custo materiais</th><th class="num">${brl(custoTotalBOM(bom))}</th></tr></tfoot></table>`;
}

function aplicacoesTable(apps: Aplicacao[], omitCosts: boolean): string {
  if (!apps.length) return "";
  if (omitCosts) {
    const rows = apps
      .map(
        (
          a,
        ) => `<tr><td>${esc(a.tipo)}</td><td>${esc(a.posicao)}</td><td>${a.arte ? esc(a.arte) : "—"}</td>
        <td class="num">${esc(a.larguraCm)}×${esc(a.alturaCm)}</td>
        <td class="num">${a.tipo === "Bordado" && a.pontos ? esc(a.pontos) + "k pts" : esc(a.cores) + " cor(es)"}</td>
        <td class="num">${esc(a.qtdPorPeca)}</td>
        <td>${a.obs ? esc(a.obs) : "—"}</td></tr>`,
      )
      .join("");
    return `<h2>Aplicações &amp; Posicionamento</h2>
    <table><thead><tr><th>Técnica</th><th>Posição</th><th>Arte</th><th>L×A (cm)</th><th>Cores/Pontos</th><th>×/peça</th><th>Instrução</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
  }

  const rows = apps
    .map(
      (
        a,
      ) => `<tr><td>${esc(a.tipo)}</td><td>${esc(a.posicao)}</td><td>${a.arte ? esc(a.arte) : "—"}</td>
      <td class="num">${esc(a.larguraCm)}×${esc(a.alturaCm)}</td>
      <td class="num">${a.tipo === "Bordado" && a.pontos ? esc(a.pontos) + "k pts" : esc(a.cores) + " cor(es)"}</td>
      <td class="num">${esc(a.qtdPorPeca)}</td><td class="num">${brl(a.custoUnitario)}</td>
      <td class="num">${brl(a.custoUnitario * a.qtdPorPeca)}</td></tr>`,
    )
    .join("");
  const setup = setupTotal(apps);
  return `<h2>Aplicações</h2>
  <table><thead><tr><th>Técnica</th><th>Posição</th><th>Arte</th><th>L×A (cm)</th><th>Cores/Pontos</th>
  <th>×/peça</th><th>Unit.</th><th>Custo/peça</th></tr></thead>
  <tbody>${rows}</tbody>
  <tfoot><tr><th colspan="7">Custo de aplicações por peça</th><th class="num">${brl(custoAplicacoesPecasTotal(apps))}</th></tr>
  ${setup > 0 ? `<tr><th colspan="7">Setup único (telas/chapas) — NÃO amortizado acima</th><th class="num">${brl(setup)}</th></tr>` : ""}</tfoot></table>`;
}

function bopTable(bop: BopStep[], omitCosts: boolean): string {
  const sorted = [...bop].sort((a, b) => a.seq - b.seq);
  if (omitCosts) {
    const rows = sorted
      .map(
        (
          p,
        ) => `<tr><td class="num">${esc(p.seq)}</td><td>${esc(p.etapa)}</td><td>${esc(p.setor)}</td>
        <td>${esc(p.maquina ?? "Padrão")}</td>
        <td class="num">${esc(p.tempoMin)} min</td></tr>`,
      )
      .join("");
    return `<h2>BOP — Roteiro Operacional de Costura</h2>
    <table><thead><tr><th>Seq</th><th>Etapa</th><th>Setor</th><th>Máquina</th><th>Tempo Padrão</th></tr></thead>
    <tbody>${rows || '<tr><td colspan="5" class="muted">sem etapas</td></tr>'}</tbody>
    <tfoot><tr><th colspan="4">Tempo operacional total</th><th class="num">${tempoTotalBOP(bop)} min</th></tr></tfoot></table>`;
  }

  const rows = sorted
    .map(
      (p) => `<tr><td class="num">${esc(p.seq)}</td><td>${esc(p.etapa)}</td><td>${esc(p.setor)}</td>
      <td class="num">${esc(p.tempoMin)} min</td><td class="num">${brl(p.custo)}</td></tr>`,
    )
    .join("");
  return `<h2>BOP — Operação</h2>
  <table><thead><tr><th>Seq</th><th>Etapa</th><th>Setor</th><th>Tempo</th><th>Custo</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" class="muted">sem etapas</td></tr>'}</tbody>
  <tfoot><tr><th colspan="3">Totais</th><th class="num">${tempoTotalBOP(bop)} min</th><th class="num">${brl(custoTotalBOP(bop))}</th></tr></tfoot></table>`;
}

function medidasTable(data: TechSheetData): string {
  if (!data.medidas || !data.medidas.pontos.length) return "";
  const spec = data.medidas;
  const matrix = computeGradedMatrix(spec);
  const sizeHeaders = spec.tamanhos
    .map((t) => `<th class="num">${esc(t)}${t === spec.tamanhoBase ? " ★" : ""}</th>`)
    .join("");
  const rows = matrix
    .map(({ row, values }) => {
      const cells = spec.tamanhos
        .map((t) => `<td class="num">${esc(values[t] ?? "—")}</td>`)
        .join("");
      return `<tr><td><b>${esc(row.codigo)}</b> · ${esc(row.nome)}</td>${cells}<td class="num">±${esc(row.toleranciaCm)} ${esc(spec.unidade)}</td></tr>`;
    })
    .join("");
  return `<h2>Tabela de Medidas Graduada (Base: ${esc(spec.tamanhoBase)} · ${esc(spec.unidade)})</h2>
  <table><thead><tr><th>POM · Ponto de Medida</th>${sizeHeaders}<th>Tolerância</th></tr></thead>
  <tbody>${rows}</tbody></table>`;
}

function etiquetagemCadBlock(data: TechSheetData): string {
  const parts: string[] = [];
  if (data.etiquetagem) {
    const et = data.etiquetagem;
    const comp = validateComposicaoAbnt(et.composicao);
    const c = et.cuidados;
    const care = [
      CARE_SYMBOL_LABELS.lavagem[c.lavagem]?.desc,
      CARE_SYMBOL_LABELS.alvejamento[c.alvejamento]?.desc,
      CARE_SYMBOL_LABELS.secagem[c.secagem]?.desc,
      CARE_SYMBOL_LABELS.passadoria[c.passadoria]?.desc,
      CARE_SYMBOL_LABELS.limpezaProfissional[c.limpezaProfissional]?.desc,
    ]
      .filter(Boolean)
      .join(" · ");
    parts.push(
      `<h2>Etiquetagem Técnica ABNT / INMETRO</h2>
      <p><strong>Composição:</strong> ${esc(comp.resumo)} · <strong>NCM:</strong> ${esc(et.ncm)} · <strong>Origem:</strong> ${esc(et.paisOrigem)}</p>
      <p><strong>Conservação ISO 3758:</strong> ${esc(care)}${et.instrucoesExtras ? ` — <em>${esc(et.instrucoesExtras)}</em>` : ""}</p>`,
    );
  }
  if (data.encaixeCad) {
    const cad = data.encaixeCad;
    parts.push(
      `<p><strong>Encaixe CAD (${esc(cad.sistemaCad ?? "CAD")}):</strong> Aproveitamento <strong>${esc(cad.eficienciaPct)}%</strong> · Largura útil ${esc(cad.larguraEnfestoM)} m${cad.arquivoMolde ? ` · Molde: <code>${esc(cad.arquivoMolde)}</code>` : ""}</p>`,
    );
  }
  return parts.join("\n");
}

function preCostBlock(data: TechSheetData): string {
  const p = computeFullTechSheetPricing(data);
  const preCost = data.preCost;
  const alvo =
    preCost.targetPreco != null
      ? `<p>Preço-alvo de venda: <strong>${brl(preCost.targetPreco)}</strong>${
          p.precoAcimaAlvo ? " <em>(sugerido acima do alvo — revisar markup/custo)</em>" : ""
        }</p>`
      : "";
  const modeDetail =
    p.pricingMode === "divisor"
      ? `<p>Mark-up Divisor <strong>${esc(p.markupDivisor)}</strong> (Deduções ${esc(p.deducoesSemLucroPct)}% + Margem Alvo ${esc(p.margemLiquidaAlvoPct)}%) → preço sugerido: <strong>${brl(p.precoSugerido)}</strong> · Margem líquida real: <strong>${esc(p.margemLiquidaRealPct)}%</strong></p>`
      : `<p>Markup ${esc(preCost.markupPct)}% → preço sugerido: <strong>${brl(p.precoSugerido)}</strong></p>`;

  return `<h2>Pré-custo</h2>
  <p>Meta de custo industrial: <strong>${brl(preCost.targetCusto)}</strong> · Real: <strong>${brl(p.industrial)}</strong>
  · Rateio ${esc(preCost.overheadPct)}% = ${brl(p.overhead)} · Custo final: <strong>${brl(p.custoFinal)}</strong></p>
  ${modeDetail}${alvo}`;
}

function versionsTable(data: TechSheetData): string {
  const rows = data.versoes
    .map(
      (
        v,
      ) => `<tr><td>${esc(v.versao)}</td><td>${esc(v.data)}</td><td>${esc(v.autor)}</td><td>${esc(v.status)}</td>
      <td>${esc(v.resumo)}${v.alteracoes.length ? `<ul>${v.alteracoes.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}</td></tr>`,
    )
    .join("");
  return `<h2>Versões</h2>
  <table><thead><tr><th>Versão</th><th>Data</th><th>Autor</th><th>Status</th><th>Alterações</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" class="muted">sem histórico</td></tr>'}</tbody></table>`;
}

export function buildTechSheetPrintHtml(
  id: PrintIdentity,
  data: TechSheetData,
  now: Date = new Date(),
  opts?: PrintOptions,
): string {
  const omitCosts = opts?.omitCosts === true;
  const versaoAtual = data.versoes[0]?.versao ?? "—";
  const docBadge = omitCosts ? " · VIA FACÇÃO / OFICINA (SEM CUSTO)" : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Ficha técnica ${esc(id.ref)} ${esc(id.name)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font: 11px/1.45 "Helvetica Neue", Arial, sans-serif; color: #111; margin: 0; }
  header { display:flex; justify-content:space-between; gap:12px; border-bottom:2px solid #111; padding-bottom:8px; margin-bottom:14px; }
  .headmain { flex:1; display:flex; justify-content:space-between; }
  .foto { width:34mm; height:44mm; object-fit:cover; border:1px solid #ccc; border-radius:4px; }
  h1 { font-size:16px; margin:0; text-transform:uppercase; letter-spacing:.5px; }
  h1 small { display:block; font-size:10px; font-weight:400; color:#555; margin-top:2px; }
  .ident { text-align:right; font-size:10px; color:#333; }
  .ident b { font-size:13px; display:block; }
  h2 { font-size:11px; text-transform:uppercase; letter-spacing:1px; border-bottom:1px solid #bbb; padding-bottom:3px; margin:16px 0 6px; }
  table { width:100%; border-collapse:collapse; margin:4px 0 8px; }
  th,td { border:1px solid #ccc; padding:4px 6px; text-align:left; vertical-align:top; }
  thead th { background:#f2f2f2; font-size:9px; text-transform:uppercase; letter-spacing:.5px; }
  td.num, th.num { text-align:right; white-space:nowrap; }
  ul { margin:2px 0 0 14px; padding:0; }
  .muted { color:#777; font-style:italic; }
  .cw-wrap { display:flex; flex-wrap:wrap; gap:8px; margin:6px 0; }
  .cw { display:inline-flex; align-items:center; gap:5px; border:1px solid #ccc; border-radius:12px; padding:2px 8px; font-size:10px; }
  .sw { width:10px; height:10px; border-radius:50%; border:1px solid #555; display:inline-block; }
  footer { margin-top:18px; border-top:1px solid #bbb; padding-top:6px; font-size:9px; color:#666; display:flex; justify-content:space-between; }
</style></head><body>
<header>
  ${/^https:\/\//.test(id.foto ?? "") ? `<img class="foto" src="${esc(id.foto)}" alt="${esc(id.name)}"/>` : ""}
  <div class="headmain">
    <h1>Ficha técnica · ${esc(id.name)}${docBadge}<small>${esc(id.category)}${id.season ? " · " + esc(id.season) : ""}</small></h1>
    <div class="ident"><b>${esc(id.ref)}</b>versão ${esc(versaoAtual)}</div>
  </div>
</header>
${colorwaysBlock(data)}
${bomTable(data.bom, omitCosts)}
${aplicacoesTable(data.aplicacoes ?? [], omitCosts)}
${bopTable(data.bop, omitCosts)}
${medidasTable(data)}
${etiquetagemCadBlock(data)}
${omitCosts ? "" : preCostBlock(data)}
${versionsTable(data)}
<footer><span>USE MODA PLM AI — gerada em ${esc(now.toLocaleString("pt-BR"))}${omitCosts ? " · Via Cega p/ Facção" : ""}</span><span>${esc(id.ref)} · ${esc(versaoAtual)}</span></footer>
</body></html>`;
}

/** Abre a impressão no popup; retorna false se o navegador bloqueou (a rota trata). */
export function openPrintWindow(html: string): boolean {
  const w = window.open("", "_blank", "width=880,height=1080");
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
  return true;
}
