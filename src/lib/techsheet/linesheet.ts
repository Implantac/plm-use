// Motor Comercial de Coordenados (Looks) & Line Sheet B2B Imprimível — PLM 2.0
// Conecta Fichas Técnicas (BOM, NCM, Composição ABNT, Precificação Divisor) aos módulos
// de Coordenados (/looks), Displayagem (/display) e Mapa de Coleção (/collection-map).

import type { MatrixRow } from "@/lib/collection-map/store";
import { SIZE_GRADES, cellTotal, rowTotal } from "@/lib/collection-map/store";
import type { Look, LookItem } from "@/lib/looks/store";
import { describeTextileMicroPhysics } from "@/lib/ai/photorealism";
import { computeFullTechSheetPricing } from "./pricing";
import { defaultColorwaysFor, defaultEtiquetagemFor, type TechSheetData } from "./store";
import { sheetProvenance, type SheetProvenance } from "./provenance";
import { round2 } from "./textile";

export interface LookItemFinancialRow {
  refCode: string;
  refName: string;
  role: LookItem["role"];
  colorHex: string;
  provenance: SheetProvenance;
  linkedToTechSheet: boolean;
  /** `null` = não há ficha salva; a peça não tem preço, e a tela diz isso. */
  unitIndustrialCost: number | null;
  unitSuggestedPrice: number | null;
}

export interface LookFinancialSummary {
  items: LookItemFinancialRow[];
  /** Peças com preço vindo de ficha salva. */
  comPreco: number;
  /** Peças sem ficha salva — não entram em nenhum total. */
  semPreco: number;
  codesSemFicha: string[];
  /** Só é `true` quando todas as peças têm preço. */
  completo: boolean;
  totalIndustrialCost: number | null;
  totalSuggestedPrice: number | null;
  comboKitB2bPrice: number | null;
  comboGrossMarginPct: number | null;
}

/**
 * Custeio de um look coordenado.
 *
 * Antes desta função existir do jeito que está, peça sem ficha recebia preço
 * **inventado** por papel (R$ 249,90 / 169,90 / 289,90 / 89,90) e custo de 36%
 * desse preço — e o look sheet B2B era impresso com esses números, com margem
 * de kit calculada em cima. Um comprador podia fechar pedido sobre eles.
 *
 * Agora peça sem ficha salva não tem preço (`null`), não entra nos totais, e o
 * kit só é precificado quando o look inteiro tem ficha (`completo`).
 */
export function computeLookFinancialSummary(
  lookItems: LookItem[],
  sheetsMap: Record<string, TechSheetData>,
): LookFinancialSummary {
  const rows: LookItemFinancialRow[] = lookItems.map((item) => {
    const code = item.refCode.trim();
    const provenance = sheetProvenance(sheetsMap, code);
    const sheet = sheetsMap[code];

    if (!sheet || provenance !== "salva") {
      return {
        refCode: item.refCode,
        refName: item.refName || sheet?.meta?.name || item.refCode,
        role: item.role,
        colorHex: item.colorHex || sheet?.colorways?.[0]?.hex || "#64748B",
        provenance,
        // A ficha existe no store (template) mas não é trabalho do usuário:
        // dá para abrir, não dá para precificar.
        linkedToTechSheet: Boolean(sheet),
        unitIndustrialCost: null,
        unitSuggestedPrice: null,
      };
    }

    const pricing = computeFullTechSheetPricing(sheet);
    const pv =
      pricing.precoReferenciaMargem > 0 ? pricing.precoReferenciaMargem : pricing.precoSugerido;
    return {
      refCode: item.refCode,
      refName: item.refName || sheet.meta?.name || item.refCode,
      role: item.role,
      colorHex: item.colorHex || sheet.colorways?.[0]?.hex || "#64748B",
      provenance,
      linkedToTechSheet: true,
      unitIndustrialCost: pricing.custoFinal,
      unitSuggestedPrice: pv,
    };
  });

  const precificadas = rows.filter(
    (r): r is LookItemFinancialRow & { unitIndustrialCost: number; unitSuggestedPrice: number } =>
      r.unitIndustrialCost !== null && r.unitSuggestedPrice !== null,
  );
  const codesSemFicha = rows.filter((r) => r.unitSuggestedPrice === null).map((r) => r.refCode);
  const completo = rows.length > 0 && codesSemFicha.length === 0;

  const totalIndustrialCost = completo
    ? round2(precificadas.reduce((s, r) => s + r.unitIndustrialCost, 0))
    : null;
  const totalSuggestedPrice = completo
    ? round2(precificadas.reduce((s, r) => s + r.unitSuggestedPrice, 0))
    : null;

  // Desconto comercial de 8% só faz sentido sobre o conjunto completo; com peça
  // sem preço, o kit não é cotável.
  const comboKitB2bPrice = totalSuggestedPrice === null ? null : round2(totalSuggestedPrice * 0.92);
  const comboGrossMarginPct =
    comboKitB2bPrice === null || totalIndustrialCost === null || comboKitB2bPrice <= 0
      ? null
      : round2(((comboKitB2bPrice - totalIndustrialCost) / comboKitB2bPrice) * 100);

  return {
    items: rows,
    comPreco: precificadas.length,
    semPreco: codesSemFicha.length,
    codesSemFicha,
    completo,
    totalIndustrialCost,
    totalSuggestedPrice,
    comboKitB2bPrice,
    comboGrossMarginPct,
  };
}

export function buildFullLookEditorialPrompt(
  look: Look,
  sheetsMap: Record<string, TechSheetData>,
): { prompt: string; size: "1024x1536"; background: "transparent" } {
  const pieceDescriptions = look.items.map((item) => {
    const doc = sheetsMap[item.refCode];
    if (doc) {
      const fabrics = doc.bom
        .filter((b) => b.tipo === "Tecido")
        .map((b) => b.material)
        .join(", ");
      const mainGram = doc.bom.find((b) => b.tipo === "Tecido")?.gramaturaGm2;
      const comp = doc.etiquetagem?.composicao?.map((f) => `${f.pct}% ${f.fibra}`).join(" / ");
      const physics = describeTextileMicroPhysics(fabrics || item.refName, mainGram, comp);
      return `${item.role}: "${item.refName}" (${item.refCode}) in color ${item.colorHex || "#EAE6DF"} — ${physics}`;
    }
    return `${item.role}: "${item.refName}" (${item.refCode}) in color ${item.colorHex || "#EAE6DF"}`;
  });

  const outfitClause =
    pieceDescriptions.length > 0
      ? pieceDescriptions.join("; ")
      : `Contemporary fashion look "${look.name}" (${look.season})`;

  const prompt = [
    `Ultra-realistic full-body commercial fashion lookbook studio photograph of a charismatic adult model wearing the complete coordinated outfit "${look.name}" (${look.season}).`,
    `Complete styled outfit pieces worn together harmoniously: ${outfitClause}.`,
    look.stylingNotes ? `Styling & silhouette direction: ${look.stylingNotes}.` : "",
    "Shot on Hasselblad X2D 100C medium-format camera, XCD 85mm f/2.8 portrait lens at f/5.6, full head-to-toe framing, calibrated 5500K D55 Profoto softbox lighting on the subject.",
    "Natural skin micro-texture, authentic fabric drape, visible yarn weave and crisp stitching across every garment.",
    "100% pure alpha-channel transparent PNG background: crisp hair, shoe and garment edge cutout, zero studio backdrop, zero floor, zero text or watermarks, NO CGI/plastic shine.",
  ]
    .filter(Boolean)
    .join(" ");

  return {
    prompt,
    size: "1024x1536",
    background: "transparent",
  };
}

function mapToMatrixCategory(cat?: string): MatrixRow["category"] {
  const s = (cat ?? "").toLowerCase();
  if (/vestido|macac[aã]o/.test(s)) return "Dress";
  if (/cal[cç]a|bermuda|short|saia|bottom/.test(s)) return "Bottom";
  if (/jaqueta|casaco|blazer|moletom/.test(s)) return "Outerwear";
  if (/cal[cç]ad|t[eê]nis|sapato|sand[aá]lia/.test(s)) return "Calçado";
  if (/acess[oó]r|bon[eé]|bolsa|cinto/.test(s)) return "Acessório";
  return "Top";
}

export function techSheetToMatrixRow(refCode: string, doc: TechSheetData): MatrixRow {
  const pricing = computeFullTechSheetPricing(doc);
  const cws = doc.colorways?.length ? doc.colorways : defaultColorwaysFor();
  const baseQty = Math.max(60, Math.round((doc.preCost.tiragemPlanejada || 240) / cws.length));
  const perSize = Math.max(5, Math.round(baseQty / 5));

  return {
    refCode,
    refName: doc.meta?.name || refCode,
    category: mapToMatrixCategory(doc.meta?.category),
    // Sem preço de referência, a linha não inventa um: fica 0 e o documento
    // marca "sem preço". Antes, `|| 149` colocava R$ 149,00 em toda peça cujo
    // cálculo não retornava referência.
    price: Math.round(pricing.precoReferenciaMargem || pricing.precoSugerido || 0),
    cost: round2(pricing.custoFinal),
    image:
      doc.image ||
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=400",
    cells: cws.map((cw) => ({
      colorName: cw.name,
      colorHex: cw.hex,
      status: (doc.meta?.stage ?? 3) >= 6 ? "em_producao" : "planejado",
      grade: {
        PP: perSize,
        P: perSize * 2,
        M: perSize * 3,
        G: perSize * 2,
        GG: perSize,
      },
    })),
  };
}

function escHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildLineSheetCsvPtBr(
  rows: MatrixRow[],
  sheetsMap: Record<string, TechSheetData>,
): string {
  const headers = [
    "Referencia",
    "Modelo",
    "Categoria",
    "NCM",
    "Composicao_ABNT",
    "Cor",
    "Hex",
    ...SIZE_GRADES,
    "Total_Pecas",
    "PV_Unitario_BRL",
    "Receita_Alvo_BRL",
    "Status",
  ];

  const lines = [headers.join(";")];
  for (const row of rows) {
    const doc = sheetsMap[row.refCode];
    const etiq = doc?.etiquetagem ?? defaultEtiquetagemFor();
    const comp = etiq.composicao.length
      ? etiq.composicao.map((f) => `${f.pct}% ${f.fibra}`).join(" / ")
      : doc
        ? "Composição não informada"
        : "Sem ficha técnica";
    const ncm = etiq.ncm || (doc ? "sem NCM" : "sem ficha");

    for (const cell of row.cells) {
      const total = cellTotal(cell);
      const rev = total * row.price;
      const cols = [
        row.refCode,
        `"${row.refName.replace(/"/g, '""')}"`,
        `"${row.category}"`,
        ncm,
        `"${comp}"`,
        `"${cell.colorName}"`,
        cell.colorHex,
        ...SIZE_GRADES.map((s) => String(cell.grade[s] ?? 0)),
        String(total),
        row.price.toFixed(2).replace(".", ","),
        rev.toFixed(2).replace(".", ","),
        cell.status,
      ];
      lines.push(cols.join(";"));
    }
  }
  return "\uFEFF" + lines.join("\r\n");
}

export function buildLineSheetPrintableHtml(
  collectionName: string,
  season: string,
  rows: MatrixRow[],
  sheetsMap: Record<string, TechSheetData>,
): string {
  const totalUnits = rows.reduce((s, r) => s + rowTotal(r), 0);
  // Receita projetada soma só linhas com preço; linha sem preço não "custa zero".
  const rowsComPreco = rows.filter((r) => r.price > 0);
  const rowsSemPreco = rows.filter((r) => r.price <= 0);
  const totalRevenue = rowsComPreco.reduce((s, r) => s + rowTotal(r) * r.price, 0);

  const bodyRows = rows
    .map((row) => {
      const doc = sheetsMap[row.refCode];
      const comp = doc?.etiquetagem?.composicao?.length
        ? doc.etiquetagem.composicao.map((f) => `${f.pct}% ${f.fibra}`).join(" / ")
        : "Composição não informada";
      const ncm = doc?.etiquetagem?.ncm || "sem NCM";

      return row.cells
        .map((cell, idx) => {
          const tot = cellTotal(cell);
          return `<tr>
            ${
              idx === 0
                ? `<td rowspan="${row.cells.length}" class="ref-cell">
                    <strong>${escHtml(row.refCode)}</strong><br/>
                    <span>${escHtml(row.refName)}</span><br/>
                    <small>${escHtml(row.category)} · NCM ${escHtml(ncm)}<br/>${escHtml(comp)}</small>
                  </td>`
                : ""
            }
            <td><span class="swatch" style="background:${escHtml(cell.colorHex)}"></span>${escHtml(cell.colorName)}</td>
            ${SIZE_GRADES.map((s) => `<td class="num">${cell.grade[s] ?? "—"}</td>`).join("")}
            <td class="num"><strong>${tot}</strong></td>
            <td class="num">${row.price > 0 ? `R$ ${row.price.toFixed(2)}` : "—"}</td>
            <td class="num"><strong>${row.price > 0 ? `R$ ${(tot * row.price).toLocaleString("pt-BR")}` : "—"}</strong></td>
          </tr>`;
        })
        .join("");
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>Line Sheet B2B · ${escHtml(collectionName)}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Inter, system-ui, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
    header { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #0f172a; padding-bottom: 8px; margin-bottom: 12px; }
    h1 { font-size: 18px; margin: 0; }
    .kpis { display: flex; gap: 18px; font-size: 11px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { border: 1px solid #cbd5e1; padding: 5px 6px; vertical-align: top; }
    th { background: #f1f5f9; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.04em; text-align: left; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .ref-cell small { color: #475569; font-size: 9.5px; }
    .swatch { display: inline-block; width: 10px; height: 10px; border-radius: 999px; border: 1px solid #334155; margin-right: 5px; vertical-align: middle; }
  </style>
</head>
<body>
  <header>
    <div>
      <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#0f766e;font-weight:700;">USE MODA PLM · LINE SHEET COMERCIAL B2B</div>
      <h1>${escHtml(collectionName)} — ${escHtml(season)}</h1>
    </div>
    <div class="kpis">
      <div><strong>Modelos:</strong> ${rows.length}</div>
      <div><strong>Peças Planejadas:</strong> ${totalUnits.toLocaleString("pt-BR")}</div>
      <div><strong>Receita Alvo PVP:</strong> R$ ${totalRevenue.toLocaleString("pt-BR")}${
        rowsSemPreco.length > 0
          ? ` <span style="color:#b45309">(exclui ${rowsSemPreco.length} referência(s) sem preço: ${rowsSemPreco.map((r) => r.refCode).join(", ")})</span>`
          : ""
      }</div>
    </div>
  </header>
  <table>
    <thead>
      <tr>
        <th>Referência & Engenharia</th>
        <th>Variante de Cor</th>
        ${SIZE_GRADES.map((s) => `<th class="num">${s}</th>`).join("")}
        <th class="num">Total</th>
        <th class="num">PVP Unit.</th>
        <th class="num">Receita</th>
      </tr>
    </thead>
    <tbody>${bodyRows}</tbody>
  </table>
</body>
</html>`;
}
