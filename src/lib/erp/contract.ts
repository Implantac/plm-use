// Contrato de consumo do ERP — PLM só LÊ. Nunca duplicamos essas entidades.
// O ERP é a fonte da verdade para produto, estoque, fornecedor, pedidos, OP.

export type ErpProduct = {
  id: string; // ID opaco do ERP
  sku: string;
  name: string;
  category?: string;
  unit?: string; // un, m, kg
  cost?: number;
  price?: number;
  active: boolean;
};

export type ErpSupplier = {
  id: string;
  code: string;
  name: string;
  tax_id?: string;
  category?: string; // "Malha", "Aviamentos", "Facção"...
  rating?: number; // 0-5
  lead_time_days?: number;
  active: boolean;
};

export type ErpStockLevel = {
  sku: string;
  on_hand: number;
  reserved: number;
  available: number;
  unit: string;
  updated_at: string;
};

export type ErpPurchaseOrder = {
  id: string;
  number: string;
  supplier_id: string;
  status: "aberta" | "aprovada" | "recebida_parcial" | "recebida" | "cancelada";
  issued_at: string;
  expected_at?: string;
  total?: number;
  items?: Array<{ sku: string; qty: number; unit_cost: number }>;
};

export type ErpProductionOrder = {
  id: string;
  number: string;
  product_id: string;
  qty: number;
  status: "planejada" | "liberada" | "em_producao" | "concluida" | "cancelada";
  scheduled_start?: string;
  scheduled_end?: string;
};

export type ErpListFilter = {
  q?: string;
  limit?: number;
  since?: string;
};

// Adapter read-only. Não há create/update/delete deliberadamente.
export interface ErpAdapter {
  readonly name: string;
  readonly mode: "mock" | "http";
  getProduct(id: string): Promise<ErpProduct | null>;
  searchProducts(filter: ErpListFilter): Promise<ErpProduct[]>;
  getSupplier(id: string): Promise<ErpSupplier | null>;
  searchSuppliers(filter: ErpListFilter): Promise<ErpSupplier[]>;
  getStock(sku: string): Promise<ErpStockLevel | null>;
  listPurchaseOrders(filter: ErpListFilter): Promise<ErpPurchaseOrder[]>;
  listProductionOrders(filter: ErpListFilter): Promise<ErpProductionOrder[]>;
}
