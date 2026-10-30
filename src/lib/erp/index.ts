// Factory do adapter ERP. Ativa UseCloud HTTP via VITE_ERP_MODE="http" +
// VITE_USECLOUD_API_URL sem quebrar nenhum consumidor quando em modo mock.
import type { ErpAdapter } from "./contract";
import { mockErpAdapter } from "./mock-adapter";
import { createUseCloudHttpAdapter } from "./usecloud-adapter";

let cached: ErpAdapter | null = null;

export function getErpAdapter(): ErpAdapter {
  if (cached) return cached;
  const mode = import.meta.env.VITE_ERP_MODE;
  const baseUrl = import.meta.env.VITE_USECLOUD_API_URL as string | undefined;
  if (mode === "http" && baseUrl && baseUrl.trim().length > 0) {
    cached = createUseCloudHttpAdapter(baseUrl);
    return cached;
  }
  cached = mockErpAdapter;
  return cached;
}

export type { ErpAdapter } from "./contract";
export * from "./contract";
export * from "./usecloud-adapter";
