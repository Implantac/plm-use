// Motor Fase 2–4 do Fluxo de Pedidos Personalizados / Private Label / Uniformes:
// Fila de Engenharia de Custos, Clonagem de Pedido (Recompra B2B),
// Lista Nominal por Peça (Nome / Número / Tamanho) e Ficha Industrial Cega de Custo A4.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { buildQrMatrixSvg } from "@/lib/techsheet/dpp-expedition";
import {
  belowMinMargin,
  computeItemCost,
  marginPct,
  priceForMargin,
  round2,
  type ItemCostTotals,
} from "./cost";
import type { CostDriver } from "./types";

export const NOMINAL_SIZES = ["PP", "P", "M", "G", "GG", "3G"] as const;
export type NominalSize = (typeof NOMINAL_SIZES)[number];

export interface NominalPersonEntry {
  id: string;
  recipientName: string;
  badgeOrNumber: string;
  size: NominalSize;
}

export interface CustomOrderMaterial {
  id: string;
  material: string;
  unit: string;
  consumption: number;
  wastePct: number;
  unitCost: number;
}

export interface CustomOrderOperation {
  id: string;
  sector: string;
  operation: string;
  driver: CostDriver;
  driverQty: number;
  unitCost: number;
  setupCost: number;
  outsourced: boolean;
}

export type QueueOrderStatus =
  "Aguardando Custo" | "Em Detalhamento" | "Custo Aprovado" | "Liberado PCP";

export interface PrivateLabelOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  customerCnpj: string;
  refCode: string;
  productName: string;
  colorName: string;
  dueDate: string;
  status: QueueOrderStatus;
  unitSellingPriceBrl: number;
  minMarginPct: number;
  overheadPct: number;
  grade: Record<NominalSize, number>;
  nominalRoster: NominalPersonEntry[];
  materials: CustomOrderMaterial[];
  operations: CustomOrderOperation[];
  /**
   * Onda 39. `true` só nos pedidos que o app traz de fábrica para mostrar o
   * formato da Fila de Custos. Têm CNPJ, preço, materiais e nomes de papel:
   * **não entram em faturamento, margem, MRP, capacidade, S&OP nem copiloto**.
   */
  demo?: boolean;
}

export interface EvaluatedOrderCosting {
  totals: ItemCostTotals;
  totalPieces: number;
  setupPerPieceBrl: number;
  grossRevenueBrl: number;
  realMarginPct: number | null;
  suggestedMinPriceBrl: number;
  marginHealthy: boolean;
  rosterMatchesGrade: boolean;
  qrSvgDataUrl: string;
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeNominalSize(raw: string): NominalSize {
  const s = raw.trim().toUpperCase();
  if ((NOMINAL_SIZES as readonly string[]).includes(s)) return s as NominalSize;
  if (s === "XG" || s === "EXG" || s === "G1") return "3G";
  return "M";
}

/**
 * Converte colagem de Excel/TSV/CSV ("Nome \t Número/Cargo \t Tamanho")
 * em entradas estruturadas da Lista Nominal por Peça.
 */
export function parseNominalRosterPaste(rawText: string): NominalPersonEntry[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const out: NominalPersonEntry[] = [];

  lines.forEach((line, idx) => {
    const parts = line.includes("\t")
      ? line.split("\t")
      : line.includes(";")
        ? line.split(";")
        : line.split(",");
    const name = (parts[0] ?? "").trim();
    if (!name || /^nome$/i.test(name)) return;
    const badge = parts.length >= 3 ? (parts[1] ?? "").trim() : "—";
    const rawSize = parts.length >= 3 ? (parts[2] ?? "M") : (parts[1] ?? "M");
    out.push({
      id: `nom-${Date.now()}-${idx}`,
      recipientName: name,
      badgeOrNumber: badge || "—",
      size: normalizeNominalSize(rawSize),
    });
  });

  return out;
}

export function consolidateNominalRosterToGrade(roster: NominalPersonEntry[]): {
  grade: Record<NominalSize, number>;
  totalPieces: number;
} {
  const grade: Record<NominalSize, number> = { PP: 0, P: 0, M: 0, G: 0, GG: 0, "3G": 0 };
  for (const row of roster) {
    grade[row.size] = (grade[row.size] ?? 0) + 1;
  }
  const totalPieces = Object.values(grade).reduce((a, b) => a + b, 0);
  return { grade, totalPieces };
}

export function sumNominalGrade(grade: Record<NominalSize, number>): number {
  return NOMINAL_SIZES.reduce((acc, k) => acc + Math.max(0, Math.round(grade[k] || 0)), 0);
}

export function evaluateOrderCosting(order: PrivateLabelOrder): EvaluatedOrderCosting {
  const totalPieces = Math.max(1, sumNominalGrade(order.grade));
  const totals = computeItemCost({
    quantity: totalPieces,
    overheadPct: order.overheadPct,
    materials: order.materials,
    operations: order.operations,
  });

  const setupPerPieceBrl = round2(totals.setupTotal / totalPieces);
  const grossRevenueBrl = round2(totalPieces * order.unitSellingPriceBrl);
  const realMarginPct = marginPct(order.unitSellingPriceBrl, totals.unitCost);
  const suggestedMinPriceBrl = priceForMargin(totals.unitCost, order.minMarginPct);
  const marginHealthy = !belowMinMargin(realMarginPct, order.minMarginPct);
  const rosterMatchesGrade =
    order.nominalRoster.length === 0 || order.nominalRoster.length === totalPieces;

  const traceUri = `https://op-pedido.usemoda.ind.br/${encodeURIComponent(order.orderNumber)}/${encodeURIComponent(order.refCode)}?qtd=${totalPieces}`;
  const qrSvgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(buildQrMatrixSvg(traceUri))}`;

  return {
    totals,
    totalPieces,
    setupPerPieceBrl,
    grossRevenueBrl,
    realMarginPct,
    suggestedMinPriceBrl,
    marginHealthy,
    rosterMatchesGrade,
    qrSvgDataUrl,
  };
}

export function clonePrivateLabelOrder(
  source: PrivateLabelOrder,
  nextSeq: number,
): PrivateLabelOrder {
  const num = `PD-2026-${800 + Math.max(1, nextSeq)}`;
  return {
    ...source,
    id: `pl-${Date.now()}-${nextSeq}`,
    orderNumber: num,
    status: "Aguardando Custo",
    dueDate: "2026-11-28",
    grade: { ...source.grade },
    nominalRoster: source.nominalRoster.map((r, i) => ({ ...r, id: `clone-nom-${i}` })),
    materials: source.materials.map((m, i) => ({ ...m, id: `clone-mat-${i}` })),
    operations: source.operations.map((o, i) => ({ ...o, id: `clone-op-${i}` })),
  };
}

/**
 * Gera a Ficha Técnica Industrial do Pedido CEGA DE CUSTO E PREÇO COMERCIAL (A4).
 * Contém grade, materiais (consumo físico), operações técnicas e Lista Nominal por peça,
 * sem expor nenhum valor monetário (R$, custo unitário, setup ou margem).
 */
export function buildBlindOrderProductionSheetHtml(order: PrivateLabelOrder): string {
  const evalRes = evaluateOrderCosting(order);
  const gradeCells = NOMINAL_SIZES.map(
    (sz) => `<td style="text-align:center"><strong>${sz}</strong><br/>${order.grade[sz] || 0}</td>`,
  ).join("");

  const matRows = order.materials
    .map(
      (m) => `<tr>
      <td><strong>${escapeHtml(m.material)}</strong></td>
      <td>${escapeHtml(m.unit)}</td>
      <td style="text-align:right">${m.consumption} (+${m.wastePct}% quebra)</td>
      <td style="text-align:right">${round2(m.consumption * (1 + m.wastePct / 100) * evalRes.totalPieces)} ${escapeHtml(m.unit)}</td>
    </tr>`,
    )
    .join("");

  const opRows = order.operations
    .map(
      (o, idx) => `<tr>
      <td>${idx + 1}</td>
      <td>${escapeHtml(o.sector)}</td>
      <td><strong>${escapeHtml(o.operation)}</strong>${o.outsourced ? " (Terceirizado)" : ""}</td>
      <td style="text-align:right">${o.driverQty} (${escapeHtml(o.driver)})</td>
    </tr>`,
    )
    .join("");

  const rosterRows = order.nominalRoster
    .map(
      (r, idx) => `<tr>
      <td>${idx + 1}</td>
      <td><strong>${escapeHtml(r.recipientName)}</strong></td>
      <td>${escapeHtml(r.badgeOrNumber)}</td>
      <td style="text-align:center"><strong>${r.size}</strong></td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Ficha de Produção Cega · ${escapeXmlSafe(order.orderNumber)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
  .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
  .pill { display: inline-block; padding: 2px 6px; border: 1px solid #0f172a; border-radius: 4px; font-size: 9px; font-weight: 700; }
  h1 { font-size: 15px; margin: 5px 0 2px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="hdr">
    <div>
      <span class="pill">FICHA DE PRODUÇÃO DO PEDIDO · CEGA DE CUSTO E PREÇO</span>
      <h1>Pedido ${escapeHtml(order.orderNumber)} · ${escapeHtml(order.refCode)} — ${escapeHtml(order.productName)}</h1>
      <div>Cliente: <strong>${escapeHtml(order.customerName)}</strong> · Cor: <strong>${escapeHtml(order.colorName)}</strong> · Entrega: <strong>${escapeHtml(order.dueDate)}</strong></div>
      <div>Quantidade Total: <strong>${evalRes.totalPieces} peças</strong></div>
    </div>
    <img src="${evalRes.qrSvgDataUrl}" alt="QR Pedido" style="width:80px;height:80px;border:1px solid #cbd5e1;padding:3px;border-radius:4px" />
  </div>

  <h2 style="font-size:11px;text-transform:uppercase;margin:6px 0 3px">Grade Consolidada de Corte & Expedição</h2>
  <table><tr>${gradeCells}<td style="text-align:center;background:#f1f5f9"><strong>TOTAL</strong><br/>${evalRes.totalPieces}</td></tr></table>

  <h2 style="font-size:11px;text-transform:uppercase;margin:6px 0 3px">Explosão Física de Insumos (Sem Custos)</h2>
  <table>
    <thead><tr><th>Insumo</th><th>Unid.</th><th style="text-align:right">Consumo/Pç</th><th style="text-align:right">Total Pedido</th></tr></thead>
    <tbody>${matRows}</tbody>
  </table>

  <h2 style="font-size:11px;text-transform:uppercase;margin:6px 0 3px">Roteiro Técnico de Personalização & Costura</h2>
  <table>
    <thead><tr><th>#</th><th>Setor</th><th>Operação</th><th style="text-align:right">Volume Técnico</th></tr></thead>
    <tbody>${opRows}</tbody>
  </table>

  ${
    rosterRows
      ? `<h2 style="font-size:11px;text-transform:uppercase;margin:6px 0 3px">Lista Nominal Individual por Peça (Bordado / Sublimação / Embalagem)</h2>
  <table>
    <thead><tr><th>#</th><th>Nome Personalizado</th><th>Número / Cargo / Setor</th><th style="text-align:center">Tamanho</th></tr></thead>
    <tbody>${rosterRows}</tbody>
  </table>`
      : ""
  }
</body>
</html>`;
}

function escapeXmlSafe(s: string): string {
  return escapeHtml(s);
}

export const INITIAL_PRIVATE_LABEL_ORDERS: PrivateLabelOrder[] = [
  {
    demo: true,
    id: "pl-1",
    orderNumber: "PD-2026-801",
    customerName: "Arena Esportes & Running Club",
    customerCnpj: "14.890.300/0001-22",
    refCode: "DEV000006",
    productName: "Camiseta Dry Pro Sublimada + Nome/Número",
    colorName: "Verde Bandeira / Ouro",
    dueDate: "2026-11-16",
    status: "Aguardando Custo",
    unitSellingPriceBrl: 69.9,
    minMarginPct: 32,
    overheadPct: 12,
    grade: { PP: 0, P: 2, M: 3, G: 2, GG: 1, "3G": 0 },
    nominalRoster: [
      { id: "n1", recipientName: "LUCAS FERREIRA", badgeOrNumber: "10 · CAPITÃO", size: "M" },
      { id: "n2", recipientName: "RAFAEL COSTA", badgeOrNumber: "07 · ATACANTE", size: "G" },
      { id: "n3", recipientName: "BRUNO ALMEIDA", badgeOrNumber: "04 · ZAGUEIRO", size: "GG" },
      { id: "n4", recipientName: "TIAGO ROCHA", badgeOrNumber: "01 · GOLEIRO", size: "G" },
      { id: "n5", recipientName: "MATHEUS SILVA", badgeOrNumber: "08 · MEIA", size: "M" },
      { id: "n6", recipientName: "PEDRO SANTOS", badgeOrNumber: "11 · PONTA", size: "P" },
      { id: "n7", recipientName: "GABRIEL LIMA", badgeOrNumber: "05 · VOLANTE", size: "M" },
      { id: "n8", recipientName: "CAIO MENDES", badgeOrNumber: "02 · LATERAL", size: "P" },
    ],
    materials: [
      {
        id: "m1",
        material: "Malha Dry Fit UV50+ Microperfurada",
        unit: "kg",
        consumption: 0.25,
        wastePct: 7,
        unitCost: 39.8,
      },
      {
        id: "m2",
        material: "Papel Sublimático + Tinta Disperse",
        unit: "m",
        consumption: 0.9,
        wastePct: 5,
        unitCost: 4.2,
      },
    ],
    operations: [
      {
        id: "o1",
        sector: "Estampa",
        operation: "Sublimação Localizada Nome + Número Nominal",
        driver: "m2",
        driverQty: 8,
        unitCost: 6.5,
        setupCost: 95,
        outsourced: false,
      },
      {
        id: "o2",
        sector: "Bordado",
        operation: "Escudo Peito 5.500 Pontos",
        driver: "mil_pontos",
        driverQty: 44,
        unitCost: 0.95,
        setupCost: 80,
        outsourced: true,
      },
      {
        id: "o3",
        sector: "Costura",
        operation: "Fechamento Completo Overloque + Galoneira",
        driver: "peca",
        driverQty: 8,
        unitCost: 6.8,
        setupCost: 0,
        outsourced: false,
      },
    ],
  },
  {
    demo: true,
    id: "pl-2",
    orderNumber: "PD-2026-802",
    customerName: "AgroSul Cooperativa Corporativo",
    customerCnpj: "07.412.990/0001-60",
    refCode: "V24-001",
    productName: "Polo Piquet Pima Uniforme Diretoria (Private Label)",
    colorName: "Marinho Institucional",
    dueDate: "2026-11-22",
    status: "Custo Aprovado",
    unitSellingPriceBrl: 89.5,
    minMarginPct: 35,
    overheadPct: 12,
    grade: { PP: 6, P: 18, M: 36, G: 28, GG: 12, "3G": 4 },
    nominalRoster: [],
    materials: [
      {
        id: "m3",
        material: "Malha Piquet Pima 210 g/m²",
        unit: "kg",
        consumption: 0.28,
        wastePct: 6,
        unitCost: 54.0,
      },
      {
        id: "m4",
        material: "Gola Retilínea + Punho + Botões Madrepérola",
        unit: "kit",
        consumption: 1,
        wastePct: 2,
        unitCost: 5.9,
      },
    ],
    operations: [
      {
        id: "o4",
        sector: "Bordado",
        operation: "Logo Institucional Peito + Manga (7k pts)",
        driver: "mil_pontos",
        driverQty: 728,
        unitCost: 0.85,
        setupCost: 110,
        outsourced: true,
      },
      {
        id: "o5",
        sector: "Costura",
        operation: "Costura Polo Peitilho Duplo + Caseado",
        driver: "peca",
        driverQty: 104,
        unitCost: 8.4,
        setupCost: 0,
        outsourced: true,
      },
    ],
  },
];

interface PrivateLabelQueueState {
  orders: PrivateLabelOrder[];
  cloneOrder: (id: string) => PrivateLabelOrder | null;
  updateOrderPricing: (id: string, unitSellingPriceBrl: number) => void;
  updateOperationFields: (
    orderId: string,
    opId: string,
    patch: Partial<Pick<CustomOrderOperation, "driverQty" | "unitCost" | "setupCost">>,
  ) => void;
  setNominalRosterAndSyncGrade: (orderId: string, roster: NominalPersonEntry[]) => void;
  setOrderStatus: (orderId: string, status: QueueOrderStatus) => void;
}

export const PEDIDO_DEMO_LABEL = "Pedido de demonstração — não entra em número operacional";

/** Só pedidos criados/editados pela empresa. A vitrine fica de fora. */
export function pedidosOperacionais(orders: PrivateLabelOrder[]): PrivateLabelOrder[] {
  return orders.filter((o) => o.demo !== true);
}

/** Qualquer edição humana promove o pedido da vitrine a portfólio real. */
function promover(o: PrivateLabelOrder): PrivateLabelOrder {
  return { ...o, demo: false };
}

export const usePrivateLabelQueueStore = create<PrivateLabelQueueState>()(
  persist(
    (set, get) => ({
      orders: INITIAL_PRIVATE_LABEL_ORDERS,
      cloneOrder: (id) => {
        const src = get().orders.find((o) => o.id === id);
        if (!src) return null;
        const cloned = promover(clonePrivateLabelOrder(src, get().orders.length + 1));
        set((s) => ({ orders: [cloned, ...s.orders] }));
        return cloned;
      },
      updateOrderPricing: (id, unitSellingPriceBrl) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...promover(o), unitSellingPriceBrl } : o)),
        })),
      updateOperationFields: (orderId, opId, patch) =>
        set((s) => ({
          orders: s.orders.map((o) =>
            o.id === orderId
              ? {
                  ...promover(o),
                  status: o.status === "Custo Aprovado" ? "Em Detalhamento" : o.status,
                  operations: o.operations.map((op) => (op.id === opId ? { ...op, ...patch } : op)),
                }
              : o,
          ),
        })),
      setNominalRosterAndSyncGrade: (orderId, roster) =>
        set((s) => ({
          orders: s.orders.map((o) => {
            if (o.id !== orderId) return o;
            const { grade } = consolidateNominalRosterToGrade(roster);
            return { ...promover(o), nominalRoster: roster, grade };
          }),
        })),
      setOrderStatus: (orderId, status) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === orderId ? { ...promover(o), status } : o)),
        })),
    }),
    { name: "use-moda:private-label-orders-v1" },
  ),
);
