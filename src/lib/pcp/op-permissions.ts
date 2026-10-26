// Permissões do PCP por OP (espelham can_plan_pcp / can_write_pcp no banco).
// PCP/gestor(líder)/admin planejam; operador só registra passagens; visualizador só lê.
import type { AppRole } from "@/hooks/use-auth";
import { canAnyRole } from "@/lib/authz";

const PLAN: AppRole[] = ["admin", "manager", "pcp"];
const MOVE: AppRole[] = [...PLAN, "operator"];

export function opPermissions(roles: AppRole[]) {
  // canAnyRole trata admin como wildcard; as listas ficam como documentacao.
  return {
    canPlan: canAnyRole(roles, PLAN),
    canMove: canAnyRole(roles, MOVE),
  };
}
