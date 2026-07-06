// Factory do adapter ERP. Troca por HTTP real via env sem tocar consumidores.
import type { ErpAdapter } from "./contract";
import { mockErpAdapter } from "./mock-adapter";

let cached: ErpAdapter | null = null;

export function getErpAdapter(): ErpAdapter {
  if (cached) return cached;
  // No futuro: if (import.meta.env.VITE_ERP_MODE === "http") return httpErpAdapter;
  cached = mockErpAdapter;
  return cached;
}

export type { ErpAdapter } from "./contract";
export * from "./contract";
