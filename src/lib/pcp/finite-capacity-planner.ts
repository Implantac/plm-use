// Motor de Carga-Capacidade Finita por Setor (RCP / CRP Têxtil),
// Sequenciamento Heurístico EDD (Earliest Due Date + Criticidade)
// e Mapa Semanal de Programação Industrial A4.

export interface FactorySectorCapacity {
  sectorId: "corte" | "costura" | "personalizacao" | "acabamento";
  label: string;
  operators: number;
  shiftMinutesPerDay: number;
  workDaysPerWeek: number;
  efficiencyPct: number;
  samPerPieceMin: number;
}

export interface SchedulableOrderInput {
  id: string;
  orderNumber: string;
  refCode: string;
  productName: string;
  pieces: number;
  dueDate: string;
  priority: "baixa" | "media" | "alta";
  hasCustomApplication: boolean;
}

export interface SectorLoadEvaluation {
  sector: FactorySectorCapacity;
  availableMinutesWeek: number;
  requiredMinutesWeek: number;
  utilizationPct: number;
  overloaded: boolean;
  overloadMinutes: number;
  recommendation: string;
}

export interface SequencedOrderSlot {
  rank: number;
  order: SchedulableOrderInput;
  totalStandardMinutes: number;
  suggestedStartIso: string;
  suggestedEndIso: string;
  onTime: boolean;
}

export const DEFAULT_FACTORY_SECTORS: FactorySectorCapacity[] = [
  {
    sectorId: "corte",
    label: "Corte Automático & Enfesto",
    operators: 3,
    shiftMinutesPerDay: 480,
    workDaysPerWeek: 5,
    efficiencyPct: 88,
    samPerPieceMin: 1.4,
  },
  {
    sectorId: "costura",
    label: "Costura Interna (Overloque / Reta / Galoneira)",
    operators: 12,
    shiftMinutesPerDay: 480,
    workDaysPerWeek: 5,
    efficiencyPct: 82,
    samPerPieceMin: 11.5,
  },
  {
    sectorId: "personalizacao",
    label: "Estamparia, Sublimação & Bordado",
    operators: 4,
    shiftMinutesPerDay: 480,
    workDaysPerWeek: 5,
    efficiencyPct: 85,
    samPerPieceMin: 4.8,
  },
  {
    sectorId: "acabamento",
    label: "Revisão AQL, Passadoria & Embalagem",
    operators: 5,
    shiftMinutesPerDay: 480,
    workDaysPerWeek: 5,
    efficiencyPct: 90,
    samPerPieceMin: 2.6,
  },
];

function round1(v: number): number {
  return Math.round(v * 10) / 10;
}

export function evaluateFiniteSectorCapacity(
  orders: SchedulableOrderInput[],
  sectors: FactorySectorCapacity[] = DEFAULT_FACTORY_SECTORS,
): SectorLoadEvaluation[] {
  const totalPieces = orders.reduce((acc, o) => acc + Math.max(0, o.pieces), 0);
  const customPieces = orders
    .filter((o) => o.hasCustomApplication)
    .reduce((acc, o) => acc + Math.max(0, o.pieces), 0);

  return sectors.map((sector) => {
    const availableMinutesWeek = Math.round(
      sector.operators *
        sector.shiftMinutesPerDay *
        sector.workDaysPerWeek *
        (sector.efficiencyPct / 100),
    );
    const driverPieces = sector.sectorId === "personalizacao" ? customPieces : totalPieces;
    const requiredMinutesWeek = Math.round(driverPieces * sector.samPerPieceMin);
    const utilizationPct =
      availableMinutesWeek > 0 ? round1((requiredMinutesWeek / availableMinutesWeek) * 100) : 0;
    const overloaded = utilizationPct > 95;
    const overloadMinutes = Math.max(0, requiredMinutesWeek - availableMinutesWeek);

    const recommendation = overloaded
      ? `Sobrecarga (+${overloadMinutes} min): redirecionar excedente para Facção Homologada (CFOP 5901) ou ativar turno extra.`
      : utilizationPct >= 80
        ? "Ocupação saudável próxima ao teto operacional — monitorar setup."
        : "Folga operacional disponível para encaixe de lotes rápidos / reposição.";

    return {
      sector,
      availableMinutesWeek,
      requiredMinutesWeek,
      utilizationPct,
      overloaded,
      overloadMinutes,
      recommendation,
    };
  });
}

const PRIORITY_WEIGHT: Record<"alta" | "media" | "baixa", number> = {
  alta: 0,
  media: 1,
  baixa: 2,
};

/**
 * Sequencia ordens pela regra industrial EDD + Prioridade Crítica,
 * alocando datas de início/fim respeitando a capacidade diária da Costura.
 */
export function sequenceOrdersEdd(
  orders: SchedulableOrderInput[],
  anchorDateIso = "2026-11-04",
  sewingOperators = 12,
): SequencedOrderSlot[] {
  const sorted = [...orders].sort((a, b) => {
    const dueCmp = (a.dueDate || "9999-12-31").localeCompare(b.dueDate || "9999-12-31");
    if (dueCmp !== 0) return dueCmp;
    return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
  });

  const sewingDailyMin = Math.max(240, sewingOperators * 480 * 0.82);
  const baseMs = new Date(`${anchorDateIso}T08:00:00Z`).getTime();
  let cursorDays = 0;

  return sorted.map((order, idx) => {
    const samTotal = 1.4 + 11.5 + (order.hasCustomApplication ? 4.8 : 0) + 2.6;
    const totalStandardMinutes = Math.round(order.pieces * samTotal);
    const durationDays = Math.max(1, Math.ceil((order.pieces * 11.5) / sewingDailyMin));

    const startIso = new Date(baseMs + cursorDays * 86_400_000).toISOString().slice(0, 10);
    cursorDays += durationDays;
    const endIso = new Date(baseMs + Math.max(0, cursorDays - 1) * 86_400_000)
      .toISOString()
      .slice(0, 10);

    const onTime = !order.dueDate || endIso <= order.dueDate;

    return {
      rank: idx + 1,
      order,
      totalStandardMinutes,
      suggestedStartIso: startIso,
      suggestedEndIso: endIso,
      onTime,
    };
  });
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildFiniteCapacityScheduleHtml(
  loads: SectorLoadEvaluation[],
  slots: SequencedOrderSlot[],
): string {
  const sectorRows = loads
    .map(
      (l) => `<tr>
      <td><strong>${escapeHtml(l.sector.label)}</strong> (${l.sector.operators} op.)</td>
      <td style="text-align:right">${l.availableMinutesWeek} min</td>
      <td style="text-align:right">${l.requiredMinutesWeek} min</td>
      <td style="text-align:right"><strong>${l.utilizationPct}%</strong></td>
      <td>${escapeHtml(l.recommendation)}</td>
    </tr>`,
    )
    .join("");

  const slotRows = slots
    .map(
      (s) => `<tr>
      <td>${s.rank}º</td>
      <td><strong>${escapeHtml(s.order.orderNumber)}</strong> · ${escapeHtml(s.order.refCode)}</td>
      <td>${escapeHtml(s.order.productName)}</td>
      <td style="text-align:right">${s.order.pieces}</td>
      <td>${escapeHtml(s.suggestedStartIso)} → ${escapeHtml(s.suggestedEndIso)}</td>
      <td>${escapeHtml(s.order.dueDate)} (${s.onTime ? "NO PRAZO" : "RISCO ATRASO"})</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Mapa Semanal Carga-Capacidade & Sequenciamento PCP · USE MODA</title>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; font-size: 11px; margin: 0; }
  h1 { font-size: 15px; margin: 4px 0; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
</style>
</head>
<body>
  <div style="border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:10px">
    <div style="font-size:9px;font-weight:700">PCP INDUSTRIAL · PLANEJAMENTO FINITO DE CAPACIDADE (CRP)</div>
    <h1>Mapa de Carga Semanal por Setor & Sequenciamento EDD</h1>
  </div>
  <h2 style="font-size:11px;text-transform:uppercase">1. Balanço Carga × Capacidade Semanal</h2>
  <table>
    <thead><tr><th>Setor</th><th style="text-align:right">Cap. Útil</th><th style="text-align:right">Carga</th><th style="text-align:right">Ocupação</th><th>Diretriz Operacional</th></tr></thead>
    <tbody>${sectorRows}</tbody>
  </table>
  <h2 style="font-size:11px;text-transform:uppercase">2. Fila Sequenciada EDD (Earliest Due Date)</h2>
  <table>
    <thead><tr><th>Seq</th><th>OP / Pedido</th><th>Produto</th><th style="text-align:right">Peças</th><th>Janela Sugerida</th><th>Entrega Meta</th></tr></thead>
    <tbody>${slotRows}</tbody>
  </table>
</body>
</html>`;
}
