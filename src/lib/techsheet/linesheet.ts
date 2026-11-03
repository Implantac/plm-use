// Motor Comercial de Coordenados (Looks) & Line Sheet B2B Imprimível — PLM 2.0
// Conecta Fichas Técnicas (BOM, NCM, Composição ABNT, Precificação Divisor) aos módulos
// de Coordenados (/looks), Displayagem (/display) e Mapa de Coleção (/collection-map).

import type { MatrixRow } from "@/lib/collection-map/store";
import { SIZE_GRADES, cellTotal, rowTotal } from "@/lib/collection-map/store";
import type { Look, LookItem } from "@/lib/looks/store";
import { describeTextileMicroPhysics } from "@/lib/ai/photorealism";
import { computeFullTechSheetPricing } from "./pricing";
import { defaultColorwaysFor, defaultEtiquetagemFor, seedFor, type TechSheetData } from "./store";
import { round2 } from "./textile";

export interface LookItemFinancialRow {
  refCode: string;
  refName: string;
  role: LookItem["role"];
  colorHex: string;
  linkedToTechSheet: boolean;
  unitIndustrialCost: number;
  unitSuggestedPrice: number;
}

export interface LookFinancialSummary {
  items: LookItemFinancialRow[];
  totalIndustrialCost: number;
  totalSuggestedPrice: number;
  comboKitB2bPrice: number;
  comboGrossMarginPct: number;
}

export function computeLookFinancialSummary(
  lookItems: LookItem[],
  sheetsMap: Record<string, TechSheetData>,
): LookFinancialSummary {
  const rows: LookItemFinancialRow[] = lookItems.map((item) => {
    const code = item.refCode.trim();
    const sheet = sheetsMap[code] ?? (/^(DEV|V24|U25|I25)/i.test(code) ? seedFor(code) : undefined);

    if (sheet) {
      const pricing = computeFullTechSheetPricing(sheet);
      const pv =
        pricing.precoReferenciaMargem > 0 ? pricing.precoReferenciaMargem : pricing.precoSugerido;
      return {
        refCode: item.refCode,
        refName: item.refName || sheet.meta?.name || item.refCode,
        role: item.role,
        colorHex: item.colorHex || sheet.colorways?.[0]?.hex || "#64748B",
        linkedToTechSheet: true,
        unitIndustrialCost: pricing.custoFinal,
        unitSuggestedPrice: pv,
      };
    }

    // Estimativa comercial padrão quando a referência ainda não tem Ficha Técnica aberta
    const fallbackPv =
      item.role === "peça-chave"
        ? 249.9
        : item.role === "complemento"
          ? 169.9
          : item.role === "calçado"
            ? 289.9
            : 89.9;
    return {
      refCode: item.refCode,
      refName: item.refName,
      role: item.role,
      colorHex: item.colorHex || "#64748B",
      linkedToTechSheet: false,
      unitIndustrialCost: round2(fallbackPv * 0.36),
      unitSuggestedPrice: fallbackPv,
    };
  });

  const totalIndustrialCost = round2(rows.reduce((s, r) => s + r.unitIndustrialCost, 0));
  const totalSuggestedPrice = round2(rows.reduce((s, r) => s + r.unitSuggestedPrice, 0));
  // Desconto comercial padrão de 8% na compra do Look Coordenado completo no showroom B2B
  const comboKitB2bPrice = round2(totalSuggestedPrice * 0.92);
  const comboGrossMarginPct =
    comboKitB2bPrice > 0
      ? round2(((comboKitB2bPrice - totalIndustrialCost) / comboKitB2bPrice) * 100)
      : 0;

  return {
    items: rows,
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
    price: Math.round(pricing.precoReferenciaMargem || pricing.precoSugerido || 149),
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
    const comp = doc
      ? etiq.composicao.map((f) => `${f.pct}% ${f.fibra}`).join(" / ")
      : "Conforme etiqueta";
    const ncm = doc ? etiq.ncm : "6109.90.00";

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
  const totalRevenue = rows.reduce((s, r) => s + rowTotal(r) * r.price, 0);

  const bodyRows = rows
    .map((row) => {
      const doc = sheetsMap[row.refCode];
      const comp = doc?.etiquetagem?.composicao
        ? doc.etiquetagem.composicao.map((f) => `${f.pct}% ${f.fibra}`).join(" / ")
        : "Composição padrão comercial";
      const ncm = doc?.etiquetagem?.ncm ?? "6109.90.00";

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
            <td class="num">R$ ${row.price.toFixed(2)}</td>
            <td class="num"><strong>R$ ${(tot * row.price).toLocaleString("pt-BR")}</strong></td>
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
      <div><strong>Receita Alvo PVP:</strong> R$ ${totalRevenue.toLocaleString("pt-BR")}</div>
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
