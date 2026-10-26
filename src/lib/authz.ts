// Autorizacao central do PLM. O enum `app_role` nao tem tier acima de `admin`,
// entao "superadmin" = admin, e admin passa em QUALQUER checagem de papel —
// espelhando o RLS do banco, onde as politicas ja tratam has_role(uid,'admin')
// como bypass. Gates novos devem usar estes helpers em vez de listas soltas
// (foi assim que orders/catalog/PCP ficaram certos por construcao).
import type { Database } from "@/integrations/supabase/types";

export type AppRole = Database["public"]["Enums"]["app_role"];

export function hasAppRole(roles: readonly AppRole[], role: AppRole): boolean {
  return roles.includes("admin") || roles.includes(role);
}

export function canAnyRole(roles: readonly AppRole[], allowed: readonly AppRole[]): boolean {
  return roles.includes("admin") || allowed.some((r) => roles.includes(r));
}
