// H9-10 · Lançamento — server functions.
// Todas escrevem sob RLS via requireSupabaseAuth (RLS aplica como o usuário).
// Handoff ao ERP é idempotente: chave determinística wave:{id}:destino:{d}:v1.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---------- createLaunchWave ------------------------------------------------
const CreateWaveInput = z.object({
  codigo: z.string().min(2).max(60),
  colecao: z.string().min(1).max(120),
  janela_inicio: z.string(), // ISO date
  janela_fim: z.string(),
  responsavel_id: z.string().uuid().optional(),
  notas: z.string().max(2000).optional(),
});

export const createLaunchWave = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => CreateWaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("launch_wave")
      .insert({
        codigo: data.codigo,
        colecao: data.colecao,
        janela_inicio: data.janela_inicio,
        janela_fim: data.janela_fim,
        responsavel_id: data.responsavel_id ?? userId,
        notas: data.notas ?? null,
        created_by: userId,
        updated_by: userId,
      })
      .select("*")
      .single();
    if (error) return { ok: false as const, reason: error.message };
    return { ok: true as const, wave: row };
  });

// ---------- promoteShowroomDecisions ---------------------------------------
// Copia decisões aprovadas do mostruário para uma wave (bulk).
const PromoteInput = z.object({
  wave_id: z.string().uuid(),
  decision_ids: z.array(z.string().uuid()).min(1).max(200),
});

export const promoteShowroomDecisions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PromoteInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: decs, error: dErr } = await supabase
      .from("showroom_decision")
      .select("id, reference_id, decision")
      .in("id", data.decision_ids);
    if (dErr) return { ok: false as const, reason: dErr.message, created: 0 };

    const approved = (decs ?? []).filter((d) => d.decision === "aprovada");
    if (approved.length === 0) {
      return {
        ok: false as const,
        reason: "Nenhuma decisão aprovada nas selecionadas",
        created: 0,
      };
    }

    const rows = approved.map((d) => ({
      wave_id: data.wave_id,
      reference_id: d.reference_id,
      showroom_decision_id: d.id,
      created_by: userId,
      updated_by: userId,
    }));

    const { data: inserted, error: iErr } = await supabase
      .from("launch_item")
      .upsert(rows, { onConflict: "wave_id,reference_id", ignoreDuplicates: true })
      .select("id");
    if (iErr) return { ok: false as const, reason: iErr.message, created: 0 };

    return { ok: true as const, created: inserted?.length ?? 0 };
  });

// ---------- transitionLaunchWave / transitionLaunchItem --------------------
const TransitionInput = z.object({
  entity_type: z.enum(["launch_wave", "launch_item"]),
  entity_id: z.string().uuid(),
  from_status: z.string().min(1),
  to_status: z.string().min(1),
});

export const transitionLaunch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TransitionInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const table = data.entity_type; // both tables share their name with entity_type

    const { data: allowed, error: rpcErr } = await supabase.rpc(
      "can_transition" as never,
      {
        _entity_type: data.entity_type,
        _from: data.from_status,
        _to: data.to_status,
      } as never,
    );
    if (rpcErr) return { ok: false as const, reason: rpcErr.message };
    if (!allowed) {
      return {
        ok: false as const,
        reason: `Transição não permitida: ${data.from_status} → ${data.to_status}`,
      };
    }

    const { error: upErr } = await supabase
      .from(table as never)
      .update({ status: data.to_status, updated_by: userId } as never)
      .eq("id", data.entity_id)
      .eq("status", data.from_status);
    if (upErr) return { ok: false as const, reason: upErr.message };

    return { ok: true as const };
  });

// ---------- sendLaunchHandoff ----------------------------------------------
// Idempotente: mesma wave+destino nunca duplica. Simula o writeErp() marcando
// synced_at logo após a inserção — no futuro, o httpErpAdapter fará o POST real.
const HandoffInput = z.object({
  wave_id: z.string().uuid(),
  destino: z.enum(["pcp", "comercial"]),
});

export const sendLaunchHandoff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => HandoffInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // 1) Wave precisa estar 'aprovada' ou adiante.
    const { data: wave, error: wErr } = await supabase
      .from("launch_wave")
      .select("id, status, codigo, colecao")
      .eq("id", data.wave_id)
      .single();
    if (wErr || !wave) return { ok: false as const, reason: "Wave não encontrada" };
    if (!["aprovada", "publicada", "em_producao"].includes(wave.status)) {
      return { ok: false as const, reason: `Wave em status '${wave.status}' não permite handoff` };
    }

    // 2) Snapshot de itens para hash de payload.
    const { data: items } = await supabase
      .from("launch_item")
      .select("id, reference_id, prioridade, meta_unidades")
      .eq("wave_id", data.wave_id);

    const payload = { wave: wave.codigo, colecao: wave.colecao, itens: items ?? [] };
    const payload_hash = await sha256(JSON.stringify(payload));
    const idempotency_key = `wave:${data.wave_id}:destino:${data.destino}:v1`;

    // 3) Upsert por idempotency_key.
    const { data: existing } = await supabase
      .from("launch_handoff")
      .select("id, synced_at")
      .eq("idempotency_key", idempotency_key)
      .maybeSingle();
    if (existing) {
      return { ok: true as const, handoff_id: existing.id, deduped: true };
    }

    const { data: inserted, error: iErr } = await supabase
      .from("launch_handoff")
      .insert({
        wave_id: data.wave_id,
        destino: data.destino,
        idempotency_key,
        payload_hash,
        created_by: userId,
        updated_by: userId,
      })
      .select("id")
      .single();
    if (iErr || !inserted) return { ok: false as const, reason: iErr?.message ?? "insert falhou" };

    // 4) Simular confirmação do ERP (mock). Substituir por chamada real do ErpAdapter.
    const erp_source = "mock-erp";
    const erp_id = `MOCK-${data.destino.toUpperCase()}-${inserted.id.slice(0, 8)}`;
    const { error: cErr } = await supabase
      .from("launch_handoff")
      .update({
        erp_source,
        erp_id,
        synced_at: new Date().toISOString(),
        updated_by: userId,
      })
      .eq("id", inserted.id);
    if (cErr) {
      return { ok: true as const, handoff_id: inserted.id, confirmed: false, reason: cErr.message };
    }

    return { ok: true as const, handoff_id: inserted.id, confirmed: true, erp_id };
  });

async function sha256(input: string): Promise<string> {
  const buf = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
