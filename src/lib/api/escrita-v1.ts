// Onda 122 — validação (pura) das escritas aceitas pela API v1.
export const STATUS_OP = ["planejada", "em_producao", "pausada", "concluida", "cancelada"] as const;

export interface PatchOp {
  status?: (typeof STATUS_OP)[number];
  erp_op_id?: string | null;
  planned_start?: string | null;
  planned_end?: string | null;
  notes?: string | null;
}

const dataISO = /^\d{4}-\d{2}-\d{2}$/;

export function validarPatchOp(
  corpo: unknown,
): { ok: true; patch: PatchOp } | { ok: false; erro: string } {
  if (!corpo || typeof corpo !== "object" || Array.isArray(corpo))
    return { ok: false, erro: "Corpo deve ser um objeto JSON." };
  const c = corpo as Record<string, unknown>;
  const patch: PatchOp = {};
  const permitidos = ["status", "erp_op_id", "planned_start", "planned_end", "notes"];
  for (const k of Object.keys(c)) {
    if (!permitidos.includes(k))
      return { ok: false, erro: `Campo não permitido: ${k}. Aceitos: ${permitidos.join(", ")}` };
  }
  if (c.status !== undefined) {
    if (typeof c.status !== "string" || !(STATUS_OP as readonly string[]).includes(c.status))
      return { ok: false, erro: `status deve ser um de: ${STATUS_OP.join(", ")}` };
    patch.status = c.status as PatchOp["status"];
  }
  if (c.erp_op_id !== undefined) {
    if (c.erp_op_id !== null && (typeof c.erp_op_id !== "string" || c.erp_op_id.length > 60))
      return { ok: false, erro: "erp_op_id deve ser texto (≤ 60) ou null" };
    patch.erp_op_id = c.erp_op_id as string | null;
  }
  for (const k of ["planned_start", "planned_end"] as const) {
    if (c[k] !== undefined) {
      if (c[k] !== null && (typeof c[k] !== "string" || !dataISO.test(c[k] as string)))
        return { ok: false, erro: `${k} deve ser data AAAA-MM-DD ou null` };
      patch[k] = c[k] as string | null;
    }
  }
  if (c.notes !== undefined) {
    if (c.notes !== null && (typeof c.notes !== "string" || c.notes.length > 2000))
      return { ok: false, erro: "notes deve ser texto (≤ 2000) ou null" };
    patch.notes = c.notes as string | null;
  }
  if (Object.keys(patch).length === 0) return { ok: false, erro: "Nada para atualizar." };
  return { ok: true, patch };
}
