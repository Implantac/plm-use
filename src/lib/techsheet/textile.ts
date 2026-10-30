// Engenharia têxtil pura: rendimento de malha (kg ↔ m), custo efetivo de linha
// do BOM com quebra/encaixe, colagem de planilha (Excel/TSV), graduação
// automática por regra de modelagem e validação de etiquetagem ABNT/Conmetro.

export const round2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;
export const round3 = (n: number): number => Math.round((Number(n) || 0) * 1000) / 1000;
export const round4 = (n: number): number => Math.round((Number(n) || 0) * 10000) / 10000;

/** Aceita "1,25", "1.25", " 0,260 m " ou number puro; devolve 0 se inválido. */
export function parseDecimalPtBr(raw: string | number | undefined | null): number {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  if (raw == null) return 0;
  const cleaned = String(raw)
    .trim()
    .replace(/\s+/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Rendimento linear de malha/tecido em metros por quilo (m/kg):
 *   Rendimento (m/kg) = 1000 / (Largura útil em metros × Gramatura em g/m²)
 * Ex.: largura 1,80 m e gramatura 135 g/m² → 4,1152 m/kg.
 */
export function calcRendimentoMporKg(larguraM?: number, gramaturaGm2?: number): number {
  const l = Number(larguraM) || 0;
  const g = Number(gramaturaGm2) || 0;
  if (l <= 0 || g <= 0) return 0;
  return round4(1000 / (l * g));
}

/** Converte consumo linear (m/peça) para peso (kg/peça) usando o rendimento. */
export function converterMetroParaKg(
  consumoMetros: number,
  larguraM?: number,
  gramaturaGm2?: number,
): number {
  const rend = calcRendimentoMporKg(larguraM, gramaturaGm2);
  if (rend <= 0 || consumoMetros <= 0) return 0;
  return round4(consumoMetros / rend);
}

/** Converte consumo em peso (kg/peça) para linear (m/peça) usando o rendimento. */
export function converterKgParaMetro(
  consumoKg: number,
  larguraM?: number,
  gramaturaGm2?: number,
): number {
  const rend = calcRendimentoMporKg(larguraM, gramaturaGm2);
  if (rend <= 0 || consumoKg <= 0) return 0;
  return round4(consumoKg * rend);
}

export type BomCalculable = {
  consumo: string;
  custo: number;
  perdaPct?: number;
  custoUnitario?: number;
};

/**
 * Custo efetivo da linha de BOM:
 * - Quando `custoUnitario` está preenchido (ficha fluida v3), calcula
 *   `consumo × (1 + perdaPct/100) × custoUnitario`.
 * - Em fichas legadas (v1/v2) onde só existe `custo` fechado da linha, preserva
 *   exatamente `item.custo` para não alterar históricos já aprovados.
 */
export function bomItemCustoEfetivo(item: BomCalculable): number {
  if (
    item.custoUnitario != null &&
    Number.isFinite(item.custoUnitario) &&
    item.custoUnitario >= 0
  ) {
    const qtd = Math.max(0, parseDecimalPtBr(item.consumo));
    const perda = Math.max(0, Number(item.perdaPct) || 0);
    return round2(qtd * (1 + perda / 100) * item.custoUnitario);
  }
  return round2(Math.max(0, Number(item.custo) || 0));
}

// ---------------------------------------------------------------------------
// Matriz de Variantes de Cor (Colorways)
// ---------------------------------------------------------------------------
export type TechSheetColorway = {
  id: string;
  code: string; // "CW-01"
  name: string; // "Verde Brasil / Ouro"
  hex: string; // "#1D6B47"
  secondaryHex?: string; // "#EAB308"
  status: "Ativa" | "Amostra" | "Cancelada";
  mixPct?: number; // % planejado na coleção
};

// ---------------------------------------------------------------------------
// Tabela de Medidas com Graduação Automática (POM)
// ---------------------------------------------------------------------------
export type MeasurementPomRow = {
  id: string;
  codigo: string; // "A", "B", "C"
  nome: string; // "Tórax / Busto"
  comoMedir?: string; // "2 cm abaixo da cava"
  valorBase: number; // valor no tamanhoBase (ex.: 54 cm no M)
  regraGraduacaoCm: number; // salto por tamanho (ex.: +2.0 cm)
  toleranciaCm: number; // tolerância +/- (ex.: 1.0 cm)
  /** Ajustes manuais pontuais (ex.: GG pula +3 em vez de +2). */
  overrides?: Record<string, number>;
};

export type TechSheetMeasurementSpec = {
  tamanhoBase: string; // "M"
  tamanhos: string[]; // ["PP", "P", "M", "G", "GG"]
  unidade: "cm" | "mm";
  pontos: MeasurementPomRow[];
  observacoesModelagem?: string;
};

/**
 * Calcula a matriz graduada completa a partir do tamanho-base e do salto
 * (`regraGraduacaoCm`), respeitando overrides manuais por célula.
 */
export function computeGradedRow(
  row: MeasurementPomRow,
  tamanhos: string[],
  tamanhoBase: string,
): Record<string, number> {
  const baseIdx = Math.max(
    0,
    tamanhos.findIndex((t) => t.toUpperCase() === tamanhoBase.toUpperCase()),
  );
  const out: Record<string, number> = {};
  tamanhos.forEach((tam, idx) => {
    const manual = row.overrides?.[tam];
    if (manual != null && Number.isFinite(manual)) {
      out[tam] = round2(manual);
      return;
    }
    const deltaSteps = idx - baseIdx;
    out[tam] = round2(Math.max(0, row.valorBase + deltaSteps * row.regraGraduacaoCm));
  });
  return out;
}

export function computeGradedMatrix(
  spec: TechSheetMeasurementSpec,
): Array<{ row: MeasurementPomRow; values: Record<string, number> }> {
  return spec.pontos.map((row) => ({
    row,
    values: computeGradedRow(row, spec.tamanhos, spec.tamanhoBase),
  }));
}

// ---------------------------------------------------------------------------
// Etiquetagem Técnica ABNT NBR NM ISO 3758 / Regulamento Conmetro
// ---------------------------------------------------------------------------
export type FiberCompositionItem = {
  fibra: string; // "Poliéster", "Algodão", "Elastano", "Viscose", "Linho"
  pct: number; // 0..100
};

export type CareSymbolChoice = {
  lavagem: "30C_NORMAL" | "30C_SUAVE" | "40C_NORMAL" | "MAO" | "NAO_LAVAR";
  alvejamento: "NAO_ALVEJAR" | "SEM_CLORO" | "PERMITIDO";
  secagem: "VARAL_SOMBRA" | "TAMBOR_BAIXA" | "HORIZONTAL" | "NAO_SECAR_TAMBOR";
  passadoria: "NAO_PASSAR" | "BAIXA_110" | "MEDIA_150" | "ALTA_200";
  limpezaProfissional: "NAO_LIMPAR_SECO" | "PERCLOROETILENO" | "UMIDO_PROFISSIONAL";
};

export type CareLabelSpec = {
  composicao: FiberCompositionItem[];
  ncm: string; // ex.: "6109.90.00" (Camisetas de malha)
  paisOrigem: string; // "Feito no Brasil"
  cnpjFabricante?: string;
  cuidados: CareSymbolChoice;
  instrucoesExtras?: string;
};

export const CARE_SYMBOL_LABELS: {
  [K in keyof CareSymbolChoice]: Record<CareSymbolChoice[K], { short: string; desc: string }>;
} = {
  lavagem: {
    "30C_NORMAL": { short: "30°", desc: "Lavagem suave até 30°C" },
    "30C_SUAVE": { short: "30°=", desc: "Ciclo delicado até 30°C" },
    "40C_NORMAL": { short: "40°", desc: "Lavagem normal até 40°C" },
    MAO: { short: "Mão", desc: "Somente lavagem à mão" },
    NAO_LAVAR: { short: "✕Lav", desc: "Não lavar em água" },
  },
  alvejamento: {
    NAO_ALVEJAR: { short: "▲✕", desc: "Não alvejar" },
    SEM_CLORO: { short: "▲//", desc: "Alvejante sem cloro" },
    PERMITIDO: { short: "▲", desc: "Alvejamento permitido" },
  },
  secagem: {
    VARAL_SOMBRA: { short: "▢|", desc: "Secar à sombra no varal" },
    TAMBOR_BAIXA: { short: "⊡•", desc: "Secadora temperatura baixa" },
    HORIZONTAL: { short: "▢—", desc: "Secagem na horizontal" },
    NAO_SECAR_TAMBOR: { short: "⊡✕", desc: "Não secar em tambor" },
  },
  passadoria: {
    NAO_PASSAR: { short: "熨✕", desc: "Não passar" },
    BAIXA_110: { short: "•110°", desc: "Ferro máx. 110°C (sem vapor)" },
    MEDIA_150: { short: "••150°", desc: "Ferro máx. 150°C" },
    ALTA_200: { short: "•••200°", desc: "Ferro máx. 200°C" },
  },
  limpezaProfissional: {
    NAO_LIMPAR_SECO: { short: "◯✕", desc: "Não limpar a seco" },
    PERCLOROETILENO: { short: "Ⓟ", desc: "Limpeza a seco profissional (P)" },
    UMIDO_PROFISSIONAL: { short: "Ⓦ", desc: "Limpeza a úmido profissional (W)" },
  },
};

export function validateComposicaoAbnt(items: FiberCompositionItem[]): {
  somaPct: number;
  valida: boolean;
  resumo: string;
} {
  const validItems = items.filter((i) => i.fibra.trim().length > 0 && Number(i.pct) > 0);
  const somaPct = round2(validItems.reduce((acc, i) => acc + Number(i.pct), 0));
  const valida = Math.abs(somaPct - 100) <= 0.05;
  const resumo = validItems.map((i) => `${i.pct}% ${i.fibra.trim()}`).join(" · ");
  return { somaPct, valida, resumo: resumo || "Composição pendente" };
}

// ---------------------------------------------------------------------------
// Encaixe CAD / Risco / Encolhimento de Malharia & Jeans
// ---------------------------------------------------------------------------
export type CadMarkerSpec = {
  eficienciaPct: number; // ex.: 88.3%
  larguraEnfestoM: number; // ex.: 1.80 m
  comprimentoRiscoM?: number; // ex.: 4.65 m
  encolhimentoUrdumePct?: number; // longitudinal %
  encolhimentoTramaPct?: number; // transversal %
  arquivoMolde?: string; // ex.: "DEV000006_DRY_PRO_v3.ADS"
  sistemaCad?: "Audaces" | "Lectra" | "Gerber" | "Optitex" | "CLO3D" | "Outro";
};

// ---------------------------------------------------------------------------
// Importação rápida por Colar do Excel / Planilha (TSV / CSV ponto-e-vírgula)
// ---------------------------------------------------------------------------
export type ParsedExcelBomRow = {
  tipo: "Tecido" | "Aviamento" | "Linha" | "Embalagem" | "Bordado" | "Silk";
  material: string;
  fornecedor: string;
  consumo: string;
  unidade: string;
  perdaPct: number;
  custoUnitario: number;
  custo: number;
};

const VALID_TIPOS = new Set(["Tecido", "Aviamento", "Linha", "Embalagem", "Bordado", "Silk"]);

function normalizeBomTipo(raw: string): ParsedExcelBomRow["tipo"] {
  const clean = raw.trim().toLowerCase();
  if (clean.startsWith("tec") || clean.startsWith("malh")) return "Tecido";
  if (clean.startsWith("lin") || clean.startsWith("fio")) return "Linha";
  if (clean.startsWith("emb") || clean.startsWith("tag")) return "Embalagem";
  if (clean.startsWith("bor")) return "Bordado";
  if (clean.startsWith("sil") || clean.startsWith("est") || clean.startsWith("sub")) return "Silk";
  for (const t of VALID_TIPOS) {
    if (t.toLowerCase() === clean) return t as ParsedExcelBomRow["tipo"];
  }
  return "Aviamento";
}

/**
 * Lê linhas coladas do Excel/Sheets:
 * Formato aceito (TSV ou `;`):
 *   Tipo | Material | Fornecedor | Consumo | Unidade | Perda% | CustoUnitario
 * Cabeçalho opcional é ignorado automaticamente.
 */
export function parseExcelBomPaste(rawText: string): ParsedExcelBomRow[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const out: ParsedExcelBomRow[] = [];

  for (const line of lines) {
    const cols = line.includes("\t") ? line.split("\t") : line.split(";");
    if (cols.length < 2) continue;
    const first = cols[0].trim().toLowerCase();
    const second = (cols[1] ?? "").trim().toLowerCase();
    if (
      (first === "tipo" || first === "categoria") &&
      (second.includes("material") || second.includes("insumo") || second.includes("descri"))
    ) {
      continue; // pula linha de cabeçalho
    }

    const tipo = normalizeBomTipo(cols[0] ?? "Aviamento");
    const material = (cols[1] ?? "").trim();
    if (!material) continue;
    const fornecedor = (cols[2] ?? "").trim() || "A definir";
    const consumoNum = Math.max(0, parseDecimalPtBr(cols[3] ?? "1")) || 1;
    const unidade = (cols[4] ?? "").trim() || "un";
    const perdaPct = cols.length >= 7 ? Math.max(0, parseDecimalPtBr(cols[5])) : 0;
    const custoUnitario = Math.max(
      0,
      parseDecimalPtBr(cols.length >= 7 ? cols[6] : (cols[5] ?? "0")),
    );
    const custo = round2(consumoNum * (1 + perdaPct / 100) * custoUnitario);

    out.push({
      tipo,
      material,
      fornecedor,
      consumo: String(consumoNum),
      unidade,
      perdaPct,
      custoUnitario,
      custo,
    });
  }
  return out;
}
