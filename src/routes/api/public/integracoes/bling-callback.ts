// Onda 125 — retorno do OAuth do Bling: confere o state, troca o código por tokens e volta para Segurança.
// Registre no app do Bling a URL de redirecionamento: https://<seu-dominio>/api/public/integracoes/bling-callback
import { createFileRoute } from "@tanstack/react-router";

const voltar = (origem: string, q: Record<string, string>) =>
  new Response(null, {
    status: 302,
    headers: { Location: `${origem}/security?${new URLSearchParams(q).toString()}` },
  });

export const Route = createFileRoute("/api/public/integracoes/bling-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const origem = url.origin;
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const erroBling = url.searchParams.get("error");
        if (erroBling)
          return voltar(origem, { bling: "erro", motivo: `Bling recusou: ${erroBling}` });
        if (!code || !state)
          return voltar(origem, { bling: "erro", motivo: "Retorno sem code/state." });
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { credenciaisBling, trocarCodigoPorToken, expiraEm } =
            await import("@/lib/integracoes/bling.server");
          const cred = credenciaisBling();
          if (!cred)
            return voltar(origem, { bling: "erro", motivo: "BLING_CLIENT_ID/SECRET ausentes." });
          const { data: con } = await supabaseAdmin
            .from("integration_connections")
            .select("oauth_state, oauth_state_expires_at")
            .eq("provider", "bling")
            .maybeSingle();
          const valido =
            con?.oauth_state === state &&
            !!con.oauth_state_expires_at &&
            new Date(con.oauth_state_expires_at).getTime() > Date.now();
          if (!valido)
            return voltar(origem, {
              bling: "erro",
              motivo: "State inválido ou expirado (10 min). Clique em Conectar de novo.",
            });
          const t = await trocarCodigoPorToken(code, cred);
          // Nome da empresa (opcional; não bloqueia a conexão)
          let label: string | null = null;
          try {
            const r = await fetch("https://api.bling.com.br/Api/v3/empresas/me/dados-basicos", {
              headers: { Authorization: `Bearer ${t.access_token}`, Accept: "application/json" },
            });
            const j = (await r.json()) as { data?: { nome?: string; fantasia?: string } };
            label = j.data?.fantasia || j.data?.nome || null;
          } catch {
            label = null;
          }
          const { error } = await supabaseAdmin
            .from("integration_connections")
            .update({
              access_token: t.access_token,
              refresh_token: t.refresh_token,
              expires_at: expiraEm(t.expires_in),
              account_label: label,
              connected_at: new Date().toISOString(),
              oauth_state: null,
              oauth_state_expires_at: null,
              updated_at: new Date().toISOString(),
            })
            .eq("provider", "bling");
          if (error) return voltar(origem, { bling: "erro", motivo: "Falha ao gravar a conexão." });
          return voltar(origem, { bling: "ok" });
        } catch (e) {
          return voltar(origem, {
            bling: "erro",
            motivo: e instanceof Error ? e.message : String(e),
          });
        }
      },
    },
  },
});
