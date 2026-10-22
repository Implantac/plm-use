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
      cls: "bg-zinc-400/10 text-zinc-300 border-zinc-400/30",
      hint: "em edição pelo vendedor",
    },
    enviado: {
      label: "Enviado",
      cls: "bg-sky-400/10 text-sky-300 border-sky-400/30",
      hint: "aguardando a engenharia de custo",
    },
    em_custo: {
      label: "Em custo",
      cls: "bg-amber-400/10 text-amber-300 border-amber-400/30",
      hint: "custos em detalhamento",
    },
    custo_concluido: {
      label: "Custo concluído",
      cls: "bg-violet-400/10 text-violet-300 border-violet-400/30",
      hint: "aguardando aprovação",
    },
    aprovado: {
      label: "Aprovado",
      cls: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
      hint: "liberado para o PCP",
    },
    liberado_pcp: {
      label: "No PCP",
      cls: "bg-primary/10 text-primary border-primary/30",
      hint: "OP gerada",
    },
    cancelado: {
      label: "Cancelado",
      cls: "bg-red-400/10 text-red-300 border-red-400/30",
      hint: "fora do fluxo",
    },
  };

export const ITEM_COST_STATUS: Record<SalesItemCostStatus, { label: string; cls: string }> = {
  aguardando_custo: {
    label: "Aguardando custo",
    cls: "bg-zinc-400/10 text-zinc-300 border-zinc-400/30",
  },
  em_custo: { label: "Em custo", cls: "bg-amber-400/10 text-amber-300 border-amber-400/30" },
  custo_concluido: {
    label: "Custo concluído",
    cls: "bg-violet-400/10 text-violet-300 border-violet-400/30",
  },
  aprovado: {
    label: "Custo aprovado",
    cls: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
  },
  reprovado: { label: "Custo reprovado", cls: "bg-red-400/10 text-red-300 border-red-400/30" },
};

export const CATALOG_STATUS: Record<CatalogStatus, { label: string; cls: string; hint: string }> = {
  rascunho: {
    label: "Rascunho",
    cls: "bg-zinc-400/10 text-zinc-300 border-zinc-400/30",
    hint: "não pode ser vendido",
  },
  validado: {
    label: "Validado",
    cls: "bg-emerald-400/10 text-emerald-300 border-emerald-400/30",
    hint: "disponível no pedido",
  },
  descontinuado: {
    label: "Descontinuado",
    cls: "bg-red-400/10 text-red-300 border-red-400/30",
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
