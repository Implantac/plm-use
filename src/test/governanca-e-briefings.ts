// Onda 41. `INITIAL_GOVERNANCE_EVENTS` e `INITIAL_BRIEFINGS` passaram a ser
// **vitrine** (`demo: true`) e saíram da trilha de auditoria LGPD, do
// Relatório de Governança A4 e do "score de aderência comercial".
// Os testes antigos continuam válidos — sempre quiseram medir dados reais —
// mas precisam declarar que usam registros salvos pela empresa, não os de
// fábrica. Nenhuma asserção foi afrouxada: "engenharia_custo" e
// "Lista Nominal por Peça" seguem exigidos no CSV.

import {
  INITIAL_GOVERNANCE_EVENTS,
  type GovernanceAuditEntry,
} from "@/lib/security/rbac-governance";
import { INITIAL_BRIEFINGS, type BriefingInsight } from "@/lib/techsheet/research-gtm";

/** Os 4 eventos da vitrine, regravados como trilha real. */
export function eventosSalvos(): GovernanceAuditEntry[] {
  return INITIAL_GOVERNANCE_EVENTS.map((e) => ({ ...e, demo: false }));
}

/** Os 4 briefings da vitrine, regravados como pesquisa da empresa. */
export function briefingsSalvos(): BriefingInsight[] {
  return INITIAL_BRIEFINGS.map((b) => ({ ...b, demo: false }));
}
