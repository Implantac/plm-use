// Onda 121 — gestão de chaves da API pública (só admin/manager; RLS reforça).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { descreverErroSupabase } from "@/lib/supabase/erro-humano";
import { gerarChave } from "./api-key-auth.server";

export const listarChavesApi = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("api_keys")
      .select("id, name, key_prefix, scopes, last_used_at, revoked_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(descreverErroSupabase(error, "listar as chaves de API"));
    return data ?? [];
  });

export const criarChaveApi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) =>
    z
      .object({ name: z.string().trim().min(2, "Dê um nome à chave (ex.: ERP TOTVS).").max(80) })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { chave, prefixo, hash } = gerarChave();
    const { error } = await context.supabase.from("api_keys").insert({
      name: data.name,
      key_prefix: prefixo,
      key_hash: hash,
      created_by: context.userId,
    });
    if (error) throw new Error(descreverErroSupabase(error, "criar a chave de API"));
    // A chave completa só existe nesta resposta.
    return { chave, prefixo };
  });

export const revogarChaveApi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("api_keys")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(descreverErroSupabase(error, "revogar a chave de API"));
    return { ok: true as const };
  });
