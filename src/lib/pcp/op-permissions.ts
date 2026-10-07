// Permissões do PCP por OP (espelham can_plan_pcp / can_write_pcp no banco).
// PCP/gestor(líder)/admin planejam; operador só registra passagens; visualizador só lê.
import type { AppRole } from "@/hooks/use-auth";

const PLAN: AppRole[] = ["admin", "manager", "pcp"];
const MOVE: AppRole[] = [...PLAN, "operator"];

export function opPermissions(roles: AppRole[]) {
  return {
    canPlan: roles.some((r) => PLAN.includes(r)),
    canMove: roles.some((r) => MOVE.includes(r)),
  };
}
