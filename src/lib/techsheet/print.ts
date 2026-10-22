// Impressão da ficha técnica → "PDF factory-ready" sem dependências: monta um
// documento A4 autocontido (HTML string) e o navegador cuida de "Imprimir →
// Salvar como PDF". O builder é puro por um motivo: é o artefato que a fábrica
// recebe — escapamento de HTML e números formatados são testáveis aqui, não só
// "olha, apareceu".
import type { BomItem, BopStep, PreCost, TechSheetData } from "./store";
import { custoTotalBOM, custoTotalBOP, tempoTotalBOP } from "./store";
import type { Aplicacao } from "./aplicacoes";
import { custoAplicacoesPecasTotal, setupTotal } from "./aplicacoes";

export interface PrintIdentity {
  ref: string;
  name: string;
  category: string;
  season: string;
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

function bomTable(bom: BomItem[]): string {
  const rows = bom
    .map(
      (b) => `<tr><td>${esc(b.tipo)}</td><td>${esc(b.material)}</td><td>${esc(b.fornecedor)}</td>
      <td class="num">${esc(b.consumo)} ${esc(b.unidade)}</td><td class="num">${brl(b.custo)}</td></tr>`,
    )
    .join("");
  return `<h2>BOM — Materiais</h2>
  <table><thead><tr><th>Tipo</th><th>Material</th><th>Fornecedor</th><th>Consumo</th><th>Custo</th></tr></thead>
  <tbody>${rows || '<tr><td colspan="5" class="muted">sem itens</td></tr>'}</tbody>
  <tfoot><tr><th colspan="4">Custo materiais</th><th class="num">${brl(custoTotalBOM(bom))}</th></tr></tfoot></table>`;
}

function aplicacoesTable(apps: Aplicacao[]): string {
  if (!apps.length) return "";
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

function bopTable(bop: BopStep[]): string {
  // cópia antes do sort: o builder é chamado com o array vivo do store —
  // ordenar in-place reescreveria a ordem das etapas na UI (e no persist).
  const rows = [...bop]
    .sort((a, b) => a.seq - b.seq)
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

function preCostBlock(preCost: PreCost, industrial: number): string {
  const overhead = industrial * (preCost.overheadPct / 100);
  const custoFinal = industrial + overhead;
  const sugerido = custoFinal * (1 + preCost.markupPct / 100);
  const alvo =
    preCost.targetPreco != null
      ? `<p>Preço-alvo de venda: <strong>${brl(preCost.targetPreco)}</strong>${
          sugerido > preCost.targetPreco
            ? " <em>(sugerido acima do alvo — revisar markup/custo)</em>"
            : ""
        }</p>`
      : "";
  return `<h2>Pré-custo</h2>
  <p>Meta de custo industrial: <strong>${brl(preCost.targetCusto)}</strong> · Real: <strong>${brl(industrial)}</strong>
  · Rateio ${esc(preCost.overheadPct)}% = ${brl(overhead)} · Custo final: <strong>${brl(custoFinal)}</strong></p>
  <p>Markup ${esc(preCost.markupPct)}% → preço sugerido: <strong>${brl(sugerido)}</strong></p>${alvo}`;
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
): string {
  const industrial =
    custoTotalBOM(data.bom) +
    custoTotalBOP(data.bop) +
    custoAplicacoesPecasTotal(data.aplicacoes ?? []);
  const versaoAtual = data.versoes[0]?.versao ?? "—";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"/>
<title>Ficha técnica ${esc(id.ref)} ${esc(id.name)}</title>
<style>
  @page { size: A4; margin: 14mm; }
  body { font: 11px/1.45 "Helvetica Neue", Arial, sans-serif; color: #111; margin: 0; }
  header { display:flex; justify-content:space-between; border-bottom:2px solid #111; padding-bottom:8px; margin-bottom:14px; }
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
  footer { margin-top:18px; border-top:1px solid #bbb; padding-top:6px; font-size:9px; color:#666; display:flex; justify-content:space-between; }
</style></head><body>
<header>
  <h1>Ficha técnica · ${esc(id.name)}<small>${esc(id.category)}${id.season ? " · " + esc(id.season) : ""}</small></h1>
  <div class="ident"><b>${esc(id.ref)}</b>versão ${esc(versaoAtual)}</div>
</header>
${bomTable(data.bom)}
${aplicacoesTable(data.aplicacoes ?? [])}
${bopTable(data.bop)}
${preCostBlock(data.preCost, industrial)}
${versionsTable(data)}
<footer><span>USE MODA PLM AI — gerada em ${esc(now.toLocaleString("pt-BR"))}</span><span>${esc(id.ref)} · ${esc(versaoAtual)}</span></footer>
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
