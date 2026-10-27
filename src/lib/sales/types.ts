// Tipos e metadados do fluxo de Pedido (fase 1).
// Espelham supabase/migrations/20261021090100_sales_orders.sql. Enquanto o
// `supabase gen types` não roda, o acesso ao banco passa por @/lib/sales/api
// (cliente frouxo), mesmo padrão de creative-sync.ts.

export type SalesOrderStatus =
  | "rascunho"
  | "enviado"
  | "em_custo"
  | "custo_concluido"
  | "aprovado"
  | "liberado_pcp"
  | "cancelado";

export type SalesItemTechStatus = "aguardando_ficha" | "em_detalhamento" | "ficha_concluida";

export type SalesItemCostStatus =
  "aguardando_custo" | "em_custo" | "custo_concluido" | "aprovado" | "reprovado";

export type CostDriver = "peca" | "mil_pontos" | "m2" | "cor" | "minuto" | "lote";

export type CatalogStatus = "rascunho" | "validado" | "descontinuado";

export const ORDER_STATUS: Record<SalesOrderStatus, { label: string; cls: string; hint: string }> =
  {
    rascunho: {
      label: "Rascunho",
      cls: "badge-status-draft",
      hint: "em edição pelo vendedor",
    },
    enviado: {
      label: "Enviado",
      cls: "badge-status-review",
      hint: "aguardando a engenharia de custo",
    },
    em_custo: {
      label: "Em custo",
      cls: "badge-status-progress",
      hint: "custos em detalhamento",
    },
    custo_concluido: {
      label: "Custo concluído",
      cls: "badge-status-review",
      hint: "aguardando aprovação",
    },
    aprovado: {
      label: "Aprovado",
      cls: "badge-status-approved",
      hint: "liberado para o PCP",
    },
    liberado_pcp: {
      label: "No PCP",
      cls: "bg-primary/10 text-primary border-primary/30",
      hint: "OP gerada",
    },
    cancelado: {
      label: "Cancelado",
      cls: "badge-status-rejected",
      hint: "fora do fluxo",
    },
  };

export const ITEM_COST_STATUS: Record<SalesItemCostStatus, { label: string; cls: string }> = {
  aguardando_custo: {
    label: "Aguardando custo",
    cls: "badge-status-draft",
  },
  em_custo: { label: "Em custo", cls: "badge-status-progress" },
  custo_concluido: {
    label: "Custo concluído",
    cls: "badge-status-review",
  },
  aprovado: {
    label: "Custo aprovado",
    cls: "badge-status-approved",
  },
  reprovado: { label: "Custo reprovado", cls: "badge-status-rejected" },
};

export const CATALOG_STATUS: Record<CatalogStatus, { label: string; cls: string; hint: string }> = {
  rascunho: {
    label: "Rascunho",
    cls: "badge-status-draft",
    hint: "não pode ser vendido",
  },
  validado: {
    label: "Validado",
    cls: "badge-status-approved",
    hint: "disponível no pedido",
  },
  descontinuado: {
    label: "Descontinuado",
    cls: "badge-status-rejected",
    hint: "fora do catálogo",
  },
};

export const GRADE_PADRAO = ["P", "M", "G", "GG", "3G"];

export type Customer = {
  id: string;
  name: string;
  tradeName?: string;
  taxId?: string;
  city?: string;
  state?: string;
  segment?: string;
  active: boolean;
};

export type CatalogOption = {
  id: string;
  groupId: string;
  groupCode?: string;
  groupName?: string;
  code: string;
  name: string;
  sector?: string;
  operationName?: string;
  driver: CostDriver;
  unitCost: number;
  setupCost: number;
  minutes?: number;
  outsourced: boolean;
  priceDelta: number;
  requiresSpec: string[];
};

export type CatalogProduct = {
  id: string;
  code: string;
  name: string;
  family?: string;
  description?: string;
  referenceCode?: string;
  configurationId?: string;
  basePrice: number;
  minQty: number;
  grade: string[];
  status: CatalogStatus;
  active: boolean;
  options: CatalogOption[];
};

export type SalesOrder = {
  id: string;
  number: string;
  customerId: string;
  customerName?: string;
  sellerId?: string;
  status: SalesOrderStatus;
  isQuote: boolean;
  dueDate?: string;
  quoteValidUntil?: string;
  paymentTerms?: string;
  notes?: string;
  totalValue: number;
  submittedAt?: string;
  approvedAt?: string;
  releasedAt?: string;
  createdAt: string;
};

export type SalesOrderItem = {
  id: string;
  orderId: string;
  lineNo: number;
  catalogProductId: string;
  productName?: string;
  referenceCode?: string;
  description: string;
  color?: string;
  notes?: string;
  quantity: number;
  unitPrice: number;
  priceLocked: boolean;
  techStatus: SalesItemTechStatus;
  costStatus: SalesItemCostStatus;
  productionOrderItemId?: string;
  sizes: Array<{ size: string; quantity: number }>;
  options: Array<{ optionId: string; name: string; quantity: number; driverQty?: number }>;
};

export type MaterialLine = {
  id?: string;
  kind: string;
  material: string;
  unit: string;
  consumption: number;
  wastePct: number;
  unitCost: number;
  totalCost?: number;
  source?: "catalogo" | "custo";
  /** Item de estoque vinculado — reservado na liberação do pedido ao PCP. */
  stockItemId?: string | null;
  stockItemCode?: string | null;
};

export type OperationLine = {
  id?: string;
  seq: number;
  sector: string;
  operation: string;
  driver: CostDriver;
  driverQty: number;
  unitCost: number;
  setupCost: number;
  totalCost?: number;
  outsourced: boolean;
  source: "catalogo" | "custo";
};

export type ItemCost = {
  itemId: string;
  materialsTotal: number;
  operationsTotal: number;
  setupTotal: number;
  overheadPct: number;
  industrialCost: number;
  unitCost: number;
  marginPct: number | null;
  suggestedPrice: number;
  status: SalesItemCostStatus;
  detailedAt?: string;
  approvedAt?: string;
};

export type OrderEvent = {
  id: string;
  eventType: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  actorName?: string;
  createdAt: string;
};

export const sumSizes = (sizes: Array<{ quantity: number }>): number =>
  sizes.reduce((acc, s) => acc + (Number(s.quantity) || 0), 0);

export const brl = (n: number): string =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });

export const orderTotal = (items: Array<{ quantity: number; unitPrice: number }>): number =>
  items.reduce((acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);

/**
 * O fluxo operacional ponta-a-ponta (redesign 26/out; fonte das etapas:
 * docs/FLUXO-OPERACIONAL-PEDIDO.md, provado contra o ciclo real no banco).
 * Cada etapa declara QUEM age e O QUE a pessoa faz para o pedido avançar — o
 * stepper do pedido e a trilha do dashboard leem daqui, então "onde começa e
 * onde termina" deixa de ser conhecimento tribal. `cancelado` é saída lateral.
 */
export const ORDER_FLOW_STEPS: ReadonlyArray<{
  status: SalesOrderStatus;
  who: string;
  action: string;
}> = [
  { status: "rascunho", who: "Vendedor", action: "montar os itens e enviar para custo" },
  { status: "enviado", who: "Custos", action: "assumir o pedido na aba Custo" },
  { status: "em_custo", who: "Custos", action: "insumos + operações → recalcular → concluir" },
  { status: "custo_concluido", who: "Gestor", action: "revisar a margem e aprovar o custo" },
  { status: "aprovado", who: "PCP", action: "liberar para PCP — isto gera a OP" },
  { status: "liberado_pcp", who: "PCP", action: "OP na régua de produção" },
];

export const ORDER_FLOW_TERMINAL: SalesOrderStatus = "liberado_pcp";
