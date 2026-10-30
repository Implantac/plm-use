// Motor puro de Inspeção Amostral de Qualidade AQL (NBR 5426 / ISO 2859-1 — Nível Geral II)
// padrão da indústria de confecção brasileira para recebimento de lotes de facção:
//   - Defeitos Críticos (AQL 0): Ac = 0, Re = 1
//   - Defeitos Maiores  (AQL 2.5)
//   - Defeitos Menores  (AQL 4.0)

export interface AqlRow {
  codeLetter: string;
  minLot: number;
  maxLot: number;
  sampleSize: number;
  acMajor25: number;
  reMajor25: number;
  acMinor40: number;
  reMinor40: number;
}

export const ISO_2859_LEVEL_II_TABLE: AqlRow[] = [
  {
    codeLetter: "A",
    minLot: 2,
    maxLot: 8,
    sampleSize: 2,
    acMajor25: 0,
    reMajor25: 1,
    acMinor40: 0,
    reMinor40: 1,
  },
  {
    codeLetter: "B",
    minLot: 9,
    maxLot: 15,
    sampleSize: 3,
    acMajor25: 0,
    reMajor25: 1,
    acMinor40: 0,
    reMinor40: 1,
  },
  {
    codeLetter: "C",
    minLot: 16,
    maxLot: 25,
    sampleSize: 5,
    acMajor25: 0,
    reMajor25: 1,
    acMinor40: 0,
    reMinor40: 1,
  },
  {
    codeLetter: "D",
    minLot: 26,
    maxLot: 50,
    sampleSize: 8,
    acMajor25: 0,
    reMajor25: 1,
    acMinor40: 1,
    reMinor40: 2,
  },
  {
    codeLetter: "E",
    minLot: 51,
    maxLot: 90,
    sampleSize: 13,
    acMajor25: 1,
    reMajor25: 2,
    acMinor40: 1,
    reMinor40: 2,
  },
  {
    codeLetter: "F",
    minLot: 91,
    maxLot: 150,
    sampleSize: 20,
    acMajor25: 1,
    reMajor25: 2,
    acMinor40: 2,
    reMinor40: 3,
  },
  {
    codeLetter: "G",
    minLot: 151,
    maxLot: 280,
    sampleSize: 32,
    acMajor25: 2,
    reMajor25: 3,
    acMinor40: 3,
    reMinor40: 4,
  },
  {
    codeLetter: "H",
    minLot: 281,
    maxLot: 500,
    sampleSize: 50,
    acMajor25: 3,
    reMajor25: 4,
    acMinor40: 5,
    reMinor40: 6,
  },
  {
    codeLetter: "J",
    minLot: 501,
    maxLot: 1200,
    sampleSize: 80,
    acMajor25: 5,
    reMajor25: 6,
    acMinor40: 7,
    reMinor40: 8,
  },
  {
    codeLetter: "K",
    minLot: 1201,
    maxLot: 3200,
    sampleSize: 125,
    acMajor25: 7,
    reMajor25: 8,
    acMinor40: 10,
    reMinor40: 11,
  },
  {
    codeLetter: "L",
    minLot: 3201,
    maxLot: 10000,
    sampleSize: 200,
    acMajor25: 10,
    reMajor25: 11,
    acMinor40: 14,
    reMinor40: 15,
  },
  {
    codeLetter: "M",
    minLot: 10001,
    maxLot: 35000,
    sampleSize: 315,
    acMajor25: 14,
    reMajor25: 15,
    acMinor40: 21,
    reMinor40: 22,
  },
  {
    codeLetter: "N",
    minLot: 35001,
    maxLot: 9999999,
    sampleSize: 500,
    acMajor25: 21,
    reMajor25: 22,
    acMinor40: 21,
    reMinor40: 22,
  },
];

export interface AqlDefectCounts {
  criticos: number;
  maiores: number;
  menores: number;
}

export interface AqlInspectionResult {
  lotSize: number;
  codeLetter: string;
  sampleSize: number;
  limits: {
    critico: { ac: number; re: number };
    maior25: { ac: number; re: number };
    menor40: { ac: number; re: number };
  };
  found: AqlDefectCounts;
  aprovado: boolean;
  motivosReprovacao: string[];
  taxaDefeitoAmostraPct: number;
}

export function computeAqlInspectionPlan(
  rawLotSize: number,
  defects: Partial<AqlDefectCounts> = {},
): AqlInspectionResult {
  const lotSize = Math.max(2, Math.round(Number(rawLotSize) || 2));
  const row =
    ISO_2859_LEVEL_II_TABLE.find((r) => lotSize >= r.minLot && lotSize <= r.maxLot) ??
    ISO_2859_LEVEL_II_TABLE[ISO_2859_LEVEL_II_TABLE.length - 1];

  const sampleSize = Math.min(lotSize, row.sampleSize);
  const criticos = Math.max(0, Math.round(Number(defects.criticos) || 0));
  const maiores = Math.max(0, Math.round(Number(defects.maiores) || 0));
  const menores = Math.max(0, Math.round(Number(defects.menores) || 0));

  const motivosReprovacao: string[] = [];
  if (criticos >= 1) {
    motivosReprovacao.push(`Defeito crítico detectado (${criticos} ≥ Re 1)`);
  }
  if (maiores >= row.reMajor25) {
    motivosReprovacao.push(
      `Defeitos maiores AQL 2,5 estourados (${maiores} ≥ Re ${row.reMajor25})`,
    );
  }
  if (menores >= row.reMinor40) {
    motivosReprovacao.push(
      `Defeitos menores AQL 4,0 estourados (${menores} ≥ Re ${row.reMinor40})`,
    );
  }

  const totalDefeitos = criticos + maiores + menores;
  const taxaDefeitoAmostraPct =
    sampleSize > 0 ? Math.round((totalDefeitos / sampleSize) * 1000) / 10 : 0;

  return {
    lotSize,
    codeLetter: row.codeLetter,
    sampleSize,
    limits: {
      critico: { ac: 0, re: 1 },
      maior25: { ac: row.acMajor25, re: row.reMajor25 },
      menor40: { ac: row.acMinor40, re: row.reMinor40 },
    },
    found: { criticos, maiores, menores },
    aprovado: motivosReprovacao.length === 0,
    motivosReprovacao,
    taxaDefeitoAmostraPct,
  };
}
