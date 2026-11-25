// Onda 125 — Conector Bling v3: OAuth (troca/renovação de token) e sincronização de pedidos.
// Só roda no servidor (service role). `http`/`sleep` são injetáveis para teste.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { criarPedidoExterno } from "@/lib/api/pedidos-v1.server";
import {
  BLING_API_URL,
  BLING_TOKEN_URL,
  dataInicialSync,
  mapearPedidoBling,
  resumoVazio,
  type BlingPedidoDetalhe,
  type BlingPedidoResumo,
  type ResumoSyncBling,
} from "./bling";

type Admin = SupabaseClient<Database>;
export type Http = (url: string, init?: RequestInit) => Promise<Response>;

export type ConexaoBling = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at: string | null;
  account_label: string | null;
  last_sync_at: string | null;
};

export function credenciaisBling(env: NodeJS.ProcessEnv = process.env) {
  const id = env.BLING_CLIENT_ID?.trim();
  const secret = env.BLING_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  return { id, secret };
}

type TokenResp = { access_token: string; refresh_token: string; expires_in: number };

async function pedirToken(
  body: Record<string, string>,
  cred: { id: string; secret: string },
  http: Http,
): Promise<TokenResp> {
  const r = await http(BLING_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${cred.id}:${cred.secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "1.0",
    },
    body: new URLSearchParams(body).toString(),
  });
  const j = (await r.json().catch(() => ({}))) as Partial<TokenResp> & {
    error?: { type?: string; message?: string; description?: string };
  };
  if (!r.ok || !j.access_token || !j.refresh_token)
    throw new Error(
      `Bling recusou o token (${r.status}): ${j.error?.description ?? j.error?.message ?? j.error?.type ?? "sem detalhe"}.`,
    );
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token,
    expires_in: j.expires_in ?? 21_600,
  };
}

export const trocarCodigoPorToken = (
  code: string,
  cred: { id: string; secret: string },
  http: Http = fetch,
) => pedirToken({ grant_type: "authorization_code", code }, cred, http);

export const renovarToken = (
  refresh: string,
  cred: { id: string; secret: string },
  http: Http = fetch,
) => pedirToken({ grant_type: "refresh_token", refresh_token: refresh }, cred, http);

export const expiraEm = (expires_in: number, agora = Date.now()) =>
  new Date(agora + Math.max(60, expires_in - 120) * 1000).toISOString();

/** Devolve um access_token válido, renovando (e persistindo) se faltar < 2 min. */
export async function obterTokenValido(
  admin: Admin,
  cred: { id: string; secret: string },
  http: Http = fetch,
): Promise<string> {
  const { data, error } = await admin
    .from("integration_connections")
    .select("access_token, refresh_token, expires_at")
    .eq("provider", "bling")
    .maybeSingle();
  if (error) {
    if (error.code === "42P01")
      throw new Error("Migration pendente: tabela integration_connections (20261125120000).");
    throw new Error("Falha ao ler a conexão com o Bling.");
  }
  if (!data?.refresh_token) throw new Error("Bling não conectado. Clique em “Conectar ao Bling”.");
  if (data.access_token && data.expires_at && new Date(data.expires_at).getTime() > Date.now())
    return data.access_token;
  const t = await renovarToken(data.refresh_token, cred, http);
  await admin
    .from("integration_connections")
    .update({
      access_token: t.access_token,
      refresh_token: t.refresh_token,
      expires_at: expiraEm(t.expires_in),
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "bling");
  return t.access_token;
}

async function blingGet<T>(path: string, token: string, http: Http): Promise<T> {
  const r = await http(`${BLING_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (r.status === 429)
    throw new Error("Bling: limite de requisições (3/s) — tente de novo em instantes.");
  if (r.status === 401) throw new Error("Bling: token recusado (401). Reconecte a conta.");
  if (!r.ok) throw new Error(`Bling respondeu ${r.status} em ${path}.`);
  return (await r.json()) as T;
}

export async function listarPedidosBling(
  token: string,
  desde: string,
  http: Http = fetch,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
  maxPaginas = 20,
): Promise<BlingPedidoResumo[]> {
  const todos: BlingPedidoResumo[] = [];
  for (let pagina = 1; pagina <= maxPaginas; pagina++) {
    const j = await blingGet<{ data?: BlingPedidoResumo[] }>(
      `/pedidos/vendas?pagina=${pagina}&limite=100&dataInicial=${desde}`,
      token,
      http,
    );
    const lote = j.data ?? [];
    todos.push(...lote);
    if (lote.length < 100) break;
    await sleep(350);
  }
  return todos;
}

export async function detalharPedidoBling(id: number, token: string, http: Http = fetch) {
  const j = await blingGet<{ data?: BlingPedidoDetalhe }>(`/pedidos/vendas/${id}`, token, http);
  if (!j.data) throw new Error(`Bling não devolveu o pedido ${id}.`);
  return j.data;
}

/** Sincroniza pedidos do Bling → PLM (idempotente: source 'bling' + nº do pedido). */
export async function sincronizarPedidosBling(
  admin: Admin,
  cred: { id: string; secret: string },
  opts: {
    dias?: number;
    http?: Http;
    sleep?: (ms: number) => Promise<void>;
    maxPedidos?: number;
  } = {},
): Promise<ResumoSyncBling> {
  const http = opts.http ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const con = await admin
    .from("integration_connections")
    .select("last_sync_at")
    .eq("provider", "bling")
    .maybeSingle();
  const desde = dataInicialSync(opts.dias ? null : con.data?.last_sync_at, opts.dias ?? 30);
  const resumo = resumoVazio(desde);
  try {
    const token = await obterTokenValido(admin, cred, http);
    const lista = (await listarPedidosBling(token, desde, http, sleep)).slice(
      0,
      opts.maxPedidos ?? 200,
    );
    resumo.lidos = lista.length;
    for (const r of lista) {
      await sleep(350);
      let det: BlingPedidoDetalhe;
      try {
        det = await detalharPedidoBling(r.id, token, http);
      } catch (e) {
        resumo.rejeitados.push({
          numero: String(r.numero),
          motivo: e instanceof Error ? e.message : String(e),
        });
        continue;
      }
      const m = mapearPedidoBling(det);
      if (!m.ok) {
        if (m.ignorar) resumo.ignorados++;
        else resumo.rejeitados.push({ numero: String(r.numero), motivo: m.motivo });
        continue;
      }
      const res = await criarPedidoExterno(admin, m.pedido, "Conector Bling");
      if (res.status === 201) resumo.criados++;
      else if (res.status === 200) resumo.existentes++;
      else if ("erro" in res)
        resumo.rejeitados.push({
          numero: String(r.numero),
          motivo:
            res.status === 422 && res.detalhes
              ? `${res.erro} ${JSON.stringify(res.detalhes)}`
              : res.erro,
        });
    }
  } catch (e) {
    resumo.erro = e instanceof Error ? e.message : String(e);
  }
  resumo.fim = new Date().toISOString();
  await admin
    .from("integration_connections")
    .update({
      ...(resumo.erro ? {} : { last_sync_at: resumo.inicio }),
      last_sync_summary:
        resumo as unknown as Database["public"]["Tables"]["integration_connections"]["Row"]["last_sync_summary"],
      updated_at: new Date().toISOString(),
    })
    .eq("provider", "bling");
  return resumo;
}
