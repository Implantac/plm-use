// Onda 39. `INITIAL_PRIVATE_LABEL_ORDERS` passou a ser **vitrine**
// (`demo: true`) e saiu de todos os números operacionais: carteira B2B,
// margem ponderada, volume, MRP, capacidade finita, S&OP A4 e copiloto.
// Os testes antigos continuam válidos — sempre quiseram medir uma carteira
// real — mas precisam declarar que usam pedidos salvos pela empresa, não os
// dois de fábrica (PD-2026-801/802, CNPJ 14.890.300/0001-22).
// Nenhuma asserção foi afrouxada: R$ 9.867,20, margem > 40%, 112 peças,
// "PD-2026-801", setup > 20 e marginHealthy === false seguem exigidos.

import {
  INITIAL_PRIVATE_LABEL_ORDERS,
  type PrivateLabelOrder,
} from "@/lib/sales/private-label-queue";

/** Os dois pedidos da vitrine, regravados como carteira da empresa. */
export function pedidosSalvos(): PrivateLabelOrder[] {
  return INITIAL_PRIVATE_LABEL_ORDERS.map((o) => ({ ...o, demo: false }));
}
