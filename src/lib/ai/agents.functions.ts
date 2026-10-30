// Agentes IA do PLM — fala direto com Lovable AI Gateway via createServerFn.
// PLM-only: 3 perfis (Fashion, PCP, Marketing) com prompts especializados.
// AUTENTICADO: exige sessão + membro (is_member) para evitar burn de créditos.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AgentInput = z.object({
  agent: z.enum(["fashion", "pcp", "marketing"]),
  message: z.string().trim().min(1).max(8000),
  context: z.string().trim().max(8000).optional(),
});

const SYSTEM_PROMPTS: Record<string, string> = {
  fashion:
    "Você é o Diretor de Produto, Modelagem Industrial e Fotografia Têxtil (Fashion AI) do USE MODA PLM. Ao criar propostas ou especificações de peças, descreva com precisão industrial brasileira: ligamento e física do tecido (ex.: meia-malha 30.1 penteada 165 g/m², linho cambraia com flamê natural, sarja peletizada 240 g/m², dry fit microperfurado), construção real de costuras (galoneira 2 agulhas, overloque ponto cadeia, pesponto 2 mm, entretela termocolante, ribana 1x1/2x1), caimento físico e direção fotográfica realista de estúdio médio-formato. Responda em português (ou estritamente em JSON quando solicitado), sem inventar dados financeiros/ERP.",
  pcp: "Você é o PCP AI do USE MODA PLM — especialista em planejamento e controle de produção têxtil: lotes, passagens, ocorrências, lead time, gargalos, terceirizados. Responda em português, prático, com números quando possível. Não invente dados; se faltar contexto, peça.",
  marketing:
    "Você é o Marketing AI do USE MODA PLM — especialista em performance de coleção, calendário editorial, envio de peças para influencers, ROI por região e segmentação. Responda em português, com sugestões acionáveis. Não trate de financeiro/fiscal.",
};

export const askAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AgentInput.parse(input))
  .handler(async ({ data, context }) => {
    // Só membros da confecção (algum papel em user_roles) podem gastar créditos.
    const { supabase, userId } = context;
    const { data: memberFlag, error: memberErr } = await supabase.rpc("is_member", {
      _uid: userId,
    } as never);
    if (memberErr) {
      return { ok: false as const, error: "Falha ao validar acesso." };
    }
    if (!memberFlag) {
      return { ok: false as const, error: "Sem permissão para consultar o agente." };
    }
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "AI Gateway não configurado." };
    }

    const system = SYSTEM_PROMPTS[data.agent];
    const userContent = data.context
      ? `Contexto da operação:\n${data.context}\n\nPergunta: ${data.message}`
      : data.message;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": apiKey,
          "X-Lovable-AIG-SDK": "raw",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: system },
            { role: "user", content: userContent },
          ],
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        if (res.status === 429)
          return {
            ok: false as const,
            error: "Limite temporário. Tente novamente em alguns segundos.",
          };
        if (res.status === 402) return { ok: false as const, error: "Créditos de IA esgotados." };
        return { ok: false as const, error: `Falha (${res.status}): ${text.slice(0, 200)}` };
      }

      const json = await res.json();
      const reply = json?.choices?.[0]?.message?.content ?? "(sem resposta)";
      return { ok: true as const, reply };
    } catch (e) {
      return {
        ok: false as const,
        error: e instanceof Error ? e.message : "Erro desconhecido",
      };
    }
  });
