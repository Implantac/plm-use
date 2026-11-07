// Onda 42. `INITIAL_PARTNERS` passou a ser **vitrine** (`demo: true`): os 4
// fornecedores de fábrica têm CNPJ, certificação ABVTEX e scores AQL/OTIF
// inventados. Não geram ranking de homologação, OTIF médio nem documentos de
// remessa. Os testes antigos queriam medir uma operação real de terceirização
// — continuam válidos, mas precisam declarar que usam cadastro salvo pela
// empresa. Nenhuma asserção foi afrouxada: `overallScore >= 90`, `tier A+`,
// `176 peças`, CFOPs e o XML de remessa seguem exigidos.

import { INITIAL_PARTNERS, type IndustrialPartner } from "@/lib/techsheet/outsourcing-os";

/** Os 4 parceiros da vitrine, regravados como cadastro da empresa. */
export function parceirosSalvos(): IndustrialPartner[] {
  return INITIAL_PARTNERS.map((p) => ({ ...p, demo: false }));
}
