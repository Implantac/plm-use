// Onda 40. As 3 OS de facção e os 4 lotes PCP de fábrica passaram a ser
// **vitrine** (`demo: true`) e saíram dos números: 656 peças "em voo" no
// Book Executivo S&OP A4 e "4 lotes monitorados" no copiloto PCP.
// Os testes que medem uma operação real precisam declarar que usam dados
// salvos pela empresa. Nenhuma asserção antiga foi afrouxada.

import { usePCPStore } from "@/lib/pcp/store";
import { INITIAL_SERVICE_ORDERS, type ExternalServiceOrder } from "@/lib/techsheet/outsourcing-os";
import type { Lote as LoteTipo } from "@/types/pcp";

export function servicosSalvos(): ExternalServiceOrder[] {
  return INITIAL_SERVICE_ORDERS.map((o) => ({ ...o, demo: false }));
}

/** Os lotes de fábrica, regravados como produção da empresa. */
export function lotesSalvos(): LoteTipo[] {
  return usePCPStore.getState().lotes.map((l) => ({ ...l, demo: false }));
}
