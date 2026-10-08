// Mock adapter — devolve dados plausíveis com latência simulada.
// Substituível por um HTTP adapter real sem tocar nenhum consumidor.
import type {
  ErpAdapter,
  ErpListFilter,
  ErpProduct,
  ErpProductionOrder,
  ErpPurchaseOrder,
  ErpStockLevel,
  ErpSupplier,
} from "./contract";

const PRODUCTS: ErpProduct[] = [
  {
    id: "ERP-P-0001",
    sku: "MAL-VIS-BR-001",
    name: "Malha viscose branca 30/1",
    category: "Malha",
    unit: "kg",
    cost: 42.5,
    price: 0,
    active: true,
  },
  {
    id: "ERP-P-0002",
    sku: "MAL-ALG-PT-002",
    name: "Malha algodão preto 24/1",
    category: "Malha",
    unit: "kg",
    cost: 38.9,
    price: 0,
    active: true,
  },
  {
    id: "ERP-P-0003",
    sku: "AVI-ZP-METAL-15",
    name: "Zíper metal 15cm",
    category: "Aviamentos",
    unit: "un",
    cost: 2.4,
    price: 0,
    active: true,
  },
  {
    id: "ERP-P-0004",
    sku: "AVI-BT-4F-11",
    name: "Botão 4 furos 11mm",
    category: "Aviamentos",
    unit: "un",
    cost: 0.28,
    price: 0,
    active: true,
  },
  {
    id: "ERP-P-0005",
    sku: "TEC-JEANS-14OZ",
    name: "Tecido jeans 14oz azul índigo",
    category: "Tecido",
    unit: "m",
    cost: 28.7,
    price: 0,
    active: true,
  },
];

const SUPPLIERS: ErpSupplier[] = [
  {
    id: "ERP-S-1001",
    code: "F-001",
    name: "Têxtil Camargo",
    category: "Malha",
    tax_id: "12.345.678/0001-01",
    rating: 4.6,
    lead_time_days: 12,
    active: true,
  },
  {
    id: "ERP-S-1002",
    code: "F-002",
    name: "Aviamentos São Paulo",
    category: "Aviamentos",
    tax_id: "23.456.789/0001-02",
    rating: 4.2,
    lead_time_days: 5,
    active: true,
  },
  {
    id: "ERP-S-1003",
    code: "F-003",
    name: "Facção Nova Era",
    category: "Facção",
    tax_id: "34.567.890/0001-03",
    rating: 4.4,
    lead_time_days: 21,
    active: true,
  },
  {
    id: "ERP-S-1004",
    code: "F-004",
    name: "Jeans do Brás",
    category: "Tecido",
    tax_id: "45.678.901/0001-04",
    rating: 3.9,
    lead_time_days: 8,
    active: true,
  },
];

const STOCK: Record<string, ErpStockLevel> = Object.fromEntries(
  PRODUCTS.map((p) => {
    const on = Math.round(Math.random() * 500);
    const rsv = Math.round(Math.random() * 80);
    return [
      p.sku,
      {
        sku: p.sku,
        on_hand: on,
        reserved: rsv,
        available: Math.max(0, on - rsv),
        unit: p.unit ?? "un",
        updated_at: new Date().toISOString(),
      },
    ];
  }),
);

const PO: ErpPurchaseOrder[] = [
  {
    id: "ERP-PO-9001",
    number: "PC-2026-091",
    supplier_id: "ERP-S-1001",
    status: "aprovada",
    issued_at: "2026-06-20",
    expected_at: "2026-07-08",
    total: 12480,
  },
  {
    id: "ERP-PO-9002",
    number: "PC-2026-092",
    supplier_id: "ERP-S-1002",
    status: "recebida_parcial",
    issued_at: "2026-06-15",
    expected_at: "2026-06-27",
    total: 3420,
  },
];

const OP: ErpProductionOrder[] = [
  {
    id: "ERP-OP-5501",
    number: "OP-2026-118",
    product_id: "ERP-P-0001",
    qty: 450,
    status: "em_producao",
    scheduled_start: "2026-06-28",
    scheduled_end: "2026-07-10",
  },
];

function latency<T>(v: T, min = 60, max = 220): Promise<T> {
  const ms = min + Math.random() * (max - min);
  return new Promise((r) => setTimeout(() => r(v), ms));
}

function match(text: string, q?: string) {
  if (!q) return true;
  return text.toLowerCase().includes(q.toLowerCase());
}

export const mockErpAdapter: ErpAdapter = {
  name: "Mock ERP",
  mode: "mock",
  async getProduct(id) {
    return latency(PRODUCTS.find((p) => p.id === id || p.sku === id) ?? null);
  },
  async searchProducts({ q, limit = 20 }: ErpListFilter) {
    const res = PRODUCTS.filter((p) => match(`${p.sku} ${p.name} ${p.category ?? ""}`, q)).slice(
      0,
      limit,
    );
    return latency(res);
  },
  async getSupplier(id) {
    return latency(SUPPLIERS.find((s) => s.id === id || s.code === id) ?? null);
  },
  async searchSuppliers({ q, limit = 20 }: ErpListFilter) {
    const res = SUPPLIERS.filter((s) => match(`${s.code} ${s.name} ${s.category ?? ""}`, q)).slice(
      0,
      limit,
    );
    return latency(res);
  },
  async getStock(sku) {
    return latency(STOCK[sku] ?? null);
  },
  async listPurchaseOrders({ q, limit = 50 }: ErpListFilter) {
    return latency(
      PO.filter((p) => match(`${p.number} ${p.supplier_id} ${p.status}`, q)).slice(0, limit),
    );
  },
  async listProductionOrders({ q, limit = 50 }: ErpListFilter) {
    return latency(
      OP.filter((p) => match(`${p.number} ${p.product_id} ${p.status}`, q)).slice(0, limit),
    );
  },
};
