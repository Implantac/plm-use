// Onda 121 — autenticação da API pública v1 por chave (Authorization: Bearer plm_live_…).
// Guardamos só o SHA-256; a chave inteira aparece uma vez na criação.
import { createHash, randomBytes } from "node:crypto";

export const PREFIXO_CHAVE = "plm_live_";

export function gerarChave(): { chave: string; prefixo: string; hash: string } {
  const corpo = randomBytes(24).toString("base64url");
  const chave = `${PREFIXO_CHAVE}${corpo}`;
  return { chave, prefixo: chave.slice(0, PREFIXO_CHAVE.length + 6), hash: hashChave(chave) };
}

export function hashChave(chave: string) {
  return createHash("sha256").update(chave, "utf8").digest("hex");
}

export type ApiKeyAuth =
  | { ok: true; keyId: string; name: string; scopes: string[] }
  | { ok: false; status: 401 | 503; message: string };

export async function autenticarChave(request: Request): Promise<ApiKeyAuth> {
  const h = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(\S+)$/i.exec(h);
  if (!m) return { ok: false, status: 401, message: "Envie Authorization: Bearer <chave de API>." };
  const chave = m[1]!;
  if (!chave.startsWith(PREFIXO_CHAVE))
    return { ok: false, status: 401, message: "Chave inválida (formato esperado: plm_live_…)." };

  let supabaseAdmin;
  try {
    ({ supabaseAdmin } = await import("@/integrations/supabase/client.server"));
  } catch {
    return {
      ok: false,
      status: 503,
      message: "API indisponível: servidor sem credencial de banco.",
    };
  }
  let data: { id: string; name: string; scopes: string[]; revoked_at: string | null } | null = null;
  let error: { code?: string; message?: string } | null = null;
  try {
    ({ data, error } = await supabaseAdmin
      .from("api_keys")
      .select("id, name, scopes, revoked_at")
      .eq("key_hash", hashChave(chave))
      .maybeSingle());
  } catch {
    return {
      ok: false,
      status: 503,
      message: "API indisponível: servidor sem credencial de banco.",
    };
  }
  if (error) {
    const pendente = error.code === "42P01" || error.code === "PGRST205";
    return {
      ok: false,
      status: 503,
      message: pendente
        ? "API indisponível: tabela api_keys ainda não aplicada no banco (migration pendente)."
        : "API indisponível no momento.",
    };
  }
  if (!data) return { ok: false, status: 401, message: "Chave desconhecida." };
  if (data.revoked_at) return { ok: false, status: 401, message: "Chave revogada." };

  // último uso: best-effort, não bloqueia a resposta
  void supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", data.id)
    .then(() => undefined);

  return { ok: true, keyId: data.id, name: data.name, scopes: data.scopes ?? ["read"] };
}
