// Onda 38. `INITIAL_GTM_CAMPAIGNS` passou a ser **vitrine** (`demo: true`) e
// saiu de todos os números operacionais. Os testes antigos de ROAS, S&OP e
// copiloto continuam válidos — eles sempre quiseram medir um portfólio real —
// mas precisam declarar que estão usando campanhas salvas pela empresa, não as
// três de fábrica. Nenhuma asserção foi afrouxada: os valores esperados
// (3 campanhas, ROAS > 4, "Drop 02", 5.62x) continuam os mesmos.

import { INITIAL_GTM_CAMPAIGNS, type GtmDropCampaign } from "@/lib/techsheet/research-gtm";

/** As três campanhas da vitrine, regravadas como portfólio da empresa. */
export function campanhasSalvas(): GtmDropCampaign[] {
  return INITIAL_GTM_CAMPAIGNS.map((c) => ({ ...c, demo: false }));
}
