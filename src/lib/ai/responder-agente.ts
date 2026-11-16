// Onda 90 — lógica do agente de IA fora do createServerFn para ser testável
// (o plugin do Start substitui o handler por um stub RPC em bundles de cliente/teste).
export type AgenteId = "fashion" | "pcp" | "marketing";
export type EntradaAgente = { agent: AgenteId; message: string; context?: string };
// Só o que o agente usa do cliente Supabase: a RPC `is_member` (thenable).
export type ClienteMembro = {
  rpc: (fn: "is_member", args: never) => PromiseLike<{ data: unknown; error: unknown }>;
};
export type RespostaAgente =
  { ok: true; reply: string } | { ok: false; reason: string; error: string };

const SYSTEM_PROMPTS: Record<string, string> = {
  fashion:
    "Você é o Diretor de Produto, Modelagem Industrial e Fotografia Têxtil (Fashion AI) do USE MODA PLM. Ao criar propostas ou especificações de peças, descreva com precisão industrial brasileira: ligamento e física do tecido (ex.: meia-malha 30.1 penteada 165 g/m², linho cambraia com flamê natural, sarja peletizada 240 g/m², dry fit microperfurado), construção real de costuras (galoneira 2 agulhas, overloque ponto cadeia, pesponto 2 mm, entretela termocolante, ribana 1x1/2x1), caimento físico e direção fotográfica realista de estúdio médio-formato. Responda em português (ou estritamente em JSON quando solicitado), sem inventar dados financeiros/ERP.",
  pcp: "Você é o PCP AI do USE MODA PLM — especialista em planejamento e controle de produção têxtil: lotes, passagens, ocorrências, lead time, gargalos, terceirizados. Responda em português, prático, com números quando possível. Não invente dados; se faltar contexto, peça.",
  marketing:
    "Você é o Marketing AI do USE MODA PLM — especialista em performance de coleção, calendário editorial, envio de peças para influencers, ROI por região e segmentação. Responda em português, com sugestões acionáveis. Não trate de financeiro/fiscal.",
};

/**
 * Onda 90 — toda recusa sai com `reason` em linguagem do usuário; o texto cru
 * do gateway/rede fica em `detalhe` só para log do servidor, nunca no toast.
 */
function falha(reason: string, detalhe?: string) {
  if (detalhe) console.warn("[askAgent]", reason, "—", detalhe);
  return { ok: false as const, reason, error: reason };
}

export async function responderAgente(
  data: EntradaAgente,
  context: { supabase: ClienteMembro; userId: string },
  deps: { apiKey?: string; fetch?: typeof fetch } = {},
): Promise<RespostaAgente> {
  const fetchImpl = deps.fetch ?? fetch;
  // Só membros da confecção (algum papel em user_roles) podem gastar créditos.
  const { supabase, userId } = context;
  const { data: memberFlag, error: memberErr } = await supabase.rpc("is_member", {
    _uid: userId,
  } as never);
  if (memberErr) {
    return falha("Não foi possível validar seu acesso ao agente. Tente novamente em instantes.");
  }
  if (!memberFlag) {
    return falha(
      "Sem permissão para consultar o agente: seu usuário ainda não tem papel nesta confecção.",
    );
  }
  const apiKey = deps.apiKey ?? process.env.LOVABLE_API_KEY;
  if (!apiKey) {
    return falha(
      "O serviço de IA não está configurado neste ambiente. Peça ao administrador para definir a chave do AI Gateway.",
    );
  }

  const system = SYSTEM_PROMPTS[data.agent];
  const userContent = data.context
    ? `Contexto da operação:\n${data.context}\n\nPergunta: ${data.message}`
    : data.message;

  try {
    const res = await fetchImpl("https://ai.gateway.lovable.dev/v1/chat/completions", {
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
        return falha(
          "O serviço de IA está no limite temporário de uso. Tente novamente em alguns segundos.",
        );
      if (res.status === 402)
        return falha(
          "Os créditos de IA desta conta esgotaram. Peça ao administrador para recarregar.",
        );
      return falha(
        `O serviço de IA respondeu com erro (HTTP ${res.status}). Tente novamente em instantes.`,
        text.slice(0, 200),
      );
    }

    const json = await res.json();
    const reply = json?.choices?.[0]?.message?.content ?? "(sem resposta)";
    return { ok: true as const, reply };
  } catch (e) {
    return falha(
      "Não foi possível falar com o serviço de IA (falha de rede no servidor). Tente novamente em instantes.",
      e instanceof Error ? e.message : String(e),
    );
  }
}
