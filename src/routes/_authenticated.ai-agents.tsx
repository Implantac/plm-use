// Agentes IA — 4 perfis operacionais (Fashion, Engenharia & Custos, PCP, Marketing)
// com Copiloto Determinístico Instantâneo + Cloud LLM Híbrido e Relatório Executivo A4.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  Bot,
  Calculator,
  Factory,
  FileText,
  Loader2,
  Megaphone,
  Send,
  Sparkles,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { ModuleTabs } from "@/components/nav/ModuleTabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { askAgent } from "@/lib/ai/agents.functions";
import {
  runDeterministicAgentAnalysis,
  type IndustrialAgentId,
} from "@/lib/ai/deterministic-copilot";
import { fetchLiveContext } from "@/lib/ai/live-context.functions";
import { resumoInfluencers, useInfluencersStore } from "@/lib/influencers/store";
import { usePCPStore } from "@/lib/pcp/store";
import { pedidosOperacionais, usePrivateLabelQueueStore } from "@/lib/sales/private-label-queue";
import { campanhasOperacionais, useResearchGtmStore } from "@/lib/techsheet/research-gtm";
import { operationalCodes } from "@/lib/techsheet/provenance";
import { useTechSheetStore } from "@/lib/techsheet/store";
import {
  diasParaPrazo,
  ocorrenciasAbertasLote,
  pendenteReferencia,
  percentualLote,
} from "@/types/pcp";

export const Route = createFileRoute("/_authenticated/ai-agents")({
  component: AIAgentsPage,
});

const AGENTS: Record<
  IndustrialAgentId,
  {
    label: string;
    desc: string;
    icon: typeof Sparkles;
    color: string;
    sugestoes: string[];
  }
> = {
  engenharia: {
    label: "Engenharia & Custos AI",
    desc: "Margem B2B, setup, SAM e BOM.",
    icon: Calculator,
    color: "text-primary",
    sugestoes: [
      "Quais pedidos da Fila Private Label estão com margem comprimida pelo setup?",
      "Qual o preço mínimo sugerido para atingir a meta de margem nos lotes pequenos?",
      "Como otimizar o SAM e o consumo de malha nas fichas técnicas ativas?",
    ],
  },
  pcp: {
    label: "PCP & Capacidade AI",
    desc: "Lotes, gargalo, prazo e facção.",
    icon: Factory,
    color: "text-emerald-500",
    sugestoes: [
      "Quais lotes estão atrasados e onde está o maior gargalo agora?",
      "Quando devo redirecionar costura para Facção Homologada (CFOP 5901)?",
      "Qual a sequência prioritária EDD para proteger os prazos da semana?",
    ],
  },
  fashion: {
    label: "Fashion & Mix AI",
    desc: "Coleção, tendência, bases e mood.",
    icon: Sparkles,
    color: "text-fuchsia-500",
    sugestoes: [
      "Sugira um mix comercial equilibrado para Alto Verão 2027.",
      "Quais bases têxteis priorizar nos briefings criativos?",
      "Como conectar pesquisa criativa à ficha técnica sem retrabalho?",
    ],
  },
  marketing: {
    label: "Marketing & Drops AI",
    desc: "ROAS, drops, influencers e GTIN.",
    icon: Megaphone,
    color: "text-amber-500",
    sugestoes: [
      "Qual drop ativo projeta maior ROAS e faturamento?",
      "Como distribuir orçamento de mídia entre os lançamentos?",
      "Quais SKUs estão prontos para exportação Omnichannel?",
    ],
  },
};

function AIAgentsPage() {
  const [agent, setAgent] = useState<IndustrialAgentId>("engenharia");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "ai"; text: string }[]>([]);

  const ask = useServerFn(askAgent);
  const fetchLive = useServerFn(fetchLiveContext);

  const lotes = usePCPStore((s) => s.lotes);
  const influencers = useInfluencersStore((s) => s.influencers);
  const rawSheets = useTechSheetStore((s) => s.data);
  const materializadas = useTechSheetStore((s) => s.materializadas);
  const plOrders = pedidosOperacionais(usePrivateLabelQueueStore((s) => s.orders));
  const campanhas = useResearchGtmStore((s) => s.campaigns);

  // Onda 38. A tela montava `{ V24-001: seedFor(...), DEV000006: seedFor(...) }`
  // quando o store estava vazio, e o copiloto respondia "2 fichas ativas ·
  // SAM médio 13.5 min/peça" com engenharia do modelo. Agora `sheets` é só o
  // que a empresa salvou; a ausência é declarada, nunca preenchida.
  const codigosSalvos = operationalCodes(rawSheets, [], materializadas);
  const sheets = Object.fromEntries(codigosSalvos.map((c) => [c, rawSheets[c]!]));
  const temFichaSalva = codigosSalvos.length > 0;
  // As 3 campanhas de fábrica têm R$ 218.400 de "vendas atribuídas" de papel.
  const drops = campanhasOperacionais(campanhas);
  const soVitrine = !temFichaSalva && drops.length === 0 && plOrders.length === 0;
  const origemAnalise = soVitrine ? ("referencia" as const) : ("salva" as const);

  function computeLocalDeterministic(question: string): string {
    return runDeterministicAgentAnalysis({
      agent,
      question,
      sheets,
      privateLabelOrders: plOrders,
      lotesSummary: lotes.map((l) => ({
        numero: l.numero,
        grupo: l.grupo,
        prontoPct: percentualLote(l),
        pendentePcs: l.referencias.reduce((a, r) => a + pendenteReferencia(r), 0),
      })),
      drops,
    });
  }

  function handleInstantDeterministic() {
    const q = input.trim() || AGENTS[agent].sugestoes[0]!;
    const reply = computeLocalDeterministic(q);
    setChat((c) => [...c, { role: "user", text: q }, { role: "ai", text: reply }]);
    setInput("");
    toast.success("Diagnóstico calculado diretamente sobre os stores industriais!");
  }

  async function enviar(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setChat((c) => [...c, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    try {
      // Para o especialista determinístico de Engenharia & Custos (ou fallback offline),
      // sintetizamos os números exatos dos stores e enriquecemos via LLM se disponível.
      if (agent === "engenharia") {
        const det = computeLocalDeterministic(msg);
        setChat((c) => [...c, { role: "ai", text: det }]);
        return;
      }

      const entityTypes =
        agent === "pcp"
          ? (["lote", "reference"] as const)
          : agent === "fashion"
            ? (["reference", "tech_sheet"] as const)
            : undefined;
      let liveText = "";
      try {
        const live = await fetchLive({
          data: {
            since_hours: 72,
            limit_events: 40,
            ...(entityTypes ? { entity_types: [...entityTypes] } : {}),
          },
        });
        liveText = live.as_prompt;
      } catch {
        // Sem sessão cloud ativa: seguimos com o contexto local auditável.
      }

      const localCtx =
        agent === "pcp"
          ? lotes
              .map(
                (l) =>
                  `${l.numero} (${l.grupo}): ${percentualLote(l)}% pronto, ${ocorrenciasAbertasLote(l)} ocorrências, prazo ${diasParaPrazo(l)}d`,
              )
              .join("\n")
          : agent === "marketing"
            ? resumoInfluencers(influencers)
            : "";

      const context = [liveText, localCtx].filter(Boolean).join("\n\n");
      const res = await ask({ data: { agent, message: msg, context } });
      if (res.ok) {
        setChat((c) => [...c, { role: "ai", text: res.reply }]);
      } else {
        // Fallback determinístico resiliente quando a chave cloud externa não estiver configurada
        const fallback = computeLocalDeterministic(msg);
        setChat((c) => [...c, { role: "ai", text: fallback }]);
      }
    } catch {
      const fallback = computeLocalDeterministic(msg);
      setChat((c) => [...c, { role: "ai", text: fallback }]);
    } finally {
      setLoading(false);
    }
  }

  function handlePrintReport() {
    const content =
      chat.length > 0
        ? chat
            .map(
              (m) =>
                `<div style="margin-bottom:10px;padding:8px;border:1px solid #cbd5e1;border-radius:6px"><strong>${m.role === "user" ? "PERGUNTA" : AGENTS[agent].label}:</strong><br/>${m.text.replace(/\n/g, "<br/>")}</div>`,
            )
            .join("")
        : `<p>${computeLocalDeterministic(AGENTS[agent].sugestoes[0]!).replace(/\n/g, "<br/>")}</p>`;

    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir o parecer executivo A4.");
      return;
    }
    w.document.open();
    w.document.write(
      `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"/><title>Parecer ${AGENTS[agent].label}</title><style>@page{size:A4 portrait;margin:12mm}body{font-family:Inter,sans-serif;font-size:11px;color:#0f172a}</style></head><body><h1 style="font-size:15px;border-bottom:2px solid #0f172a;padding-bottom:6px">PARECER TÉCNICO · ${AGENTS[agent].label.toUpperCase()}</h1>${content}</body></html>`,
    );
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  const A = AGENTS[agent];
  const Icon = A.icon;

  return (
    <ModuleLayout
      title="USE AI Agents & Copiloto Industrial"
      subtitle={
        soVitrine
          ? "4 especialistas em modo demonstração: sem ficha salva nem Drop da empresa, os números de engenharia e ROAS não são apurados (híbrido determinístico + LLM)."
          : "4 especialistas conectados aos dados reais de Engenharia de Custos, PCP, Criação e Drops GTM (híbrido determinístico + LLM)."
      }
      version="Agents v2.17"
      metrics={[
        { label: "Especialista", value: A.label, detail: "ativo" },
        {
          label: "Fichas Lidas",
          value: temFichaSalva ? String(Object.keys(sheets).length) : "—",
          detail: temFichaSalva ? "BOM + SAM" : "sem ficha salva",
        },
        {
          label: "Fila Custos",
          value: plOrders.length > 0 ? `${plOrders.length} pedidos` : "—",
          detail: plOrders.length > 0 ? "margem real" : "margem não apurável",
        },
        {
          label: "Drops GTM",
          value: drops.length > 0 ? `${drops.length} ativos` : "—",
          detail: drops.length > 0 ? "ROAS projetado" : "ROAS não apurável",
        },
      ]}
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ModuleTabs group="ai" />
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handlePrintReport}
            className="gap-1.5 text-xs"
          >
            <FileText className="h-3.5 w-3.5 text-emerald-500" /> Imprimir Parecer A4
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleInstantDeterministic}
            className="gap-1.5 text-xs"
          >
            <Zap className="h-3.5 w-3.5" /> Diagnóstico Instantâneo dos Dados
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar de agentes */}
        <div className="space-y-2">
          {(Object.keys(AGENTS) as IndustrialAgentId[]).map((id) => {
            const Ai = AGENTS[id].icon;
            const active = id === agent;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setAgent(id);
                  setChat([]);
                }}
                className={`w-full text-left rounded-xl border p-3 transition ${
                  active
                    ? "border-primary/50 bg-primary/10"
                    : "border-border bg-card hover:border-primary/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Ai className={`h-4 w-4 ${AGENTS[id].color}`} />
                  <p className="text-sm font-bold text-foreground">{AGENTS[id].label}</p>
                </div>
                <p className="text-2xs text-muted-foreground mt-1">{AGENTS[id].desc}</p>
              </button>
            );
          })}

          <Card className="border-border bg-card rounded-xl mt-4">
            <CardContent className="p-3">
              <p className="text-2xs uppercase tracking-wider text-muted-foreground mb-2">
                Perguntas Auditáveis
              </p>
              <div className="space-y-1.5">
                {A.sugestoes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => void enviar(s)}
                    disabled={loading}
                    className="w-full text-left text-xs text-foreground/90 hover:text-foreground rounded-md border border-border/70 bg-muted/35 hover:border-primary/40 p-2 transition disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat */}
        <Card className="border-border bg-card rounded-xl lg:col-span-3 flex flex-col min-h-[540px]">
          <CardContent className="p-4 flex flex-col flex-1">
            <div className="flex items-center gap-2 pb-3 border-b border-border">
              <Icon className={`h-5 w-5 ${A.color}`} />
              <p className="text-sm font-bold text-foreground">{A.label}</p>
              <Badge
                variant="outline"
                className={
                  origemAnalise === "referencia"
                    ? "text-2xs ml-auto font-mono border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                    : "text-2xs ml-auto font-mono"
                }
                title={
                  origemAnalise === "referencia"
                    ? "Sem ficha técnica salva nem Drop da empresa: nenhuma ficha de referência é usada e os números de engenharia/ROAS ficam declarados como ausentes."
                    : "A análise usa as fichas salvas no seu workspace."
                }
              >
                {origemAnalise === "referencia"
                  ? "Sem ficha salva · sem números de demonstração"
                  : "Copiloto Híbrido · Stores + Cloud"}
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {chat.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Bot className={`h-10 w-10 mx-auto mb-2 ${A.color}`} />
                  <p className="text-sm font-medium text-foreground">
                    {origemAnalise === "referencia"
                      ? `${A.label} pronto — mas ainda sem ficha salva para analisar.`
                      : `${A.label} conectado aos seus números reais.`}
                  </p>
                  <p className="text-xs mt-1">
                    Clique em uma pergunta ao lado ou em{" "}
                    <strong>Diagnóstico Instantâneo dos Dados</strong> para gerar o plano de ação.
                  </p>
                </div>
              )}
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 border border-border text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted/60 border border-border rounded-xl px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    calculando diagnóstico...
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-border">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void enviar();
                  }
                }}
                placeholder={`Pergunte para ${A.label}...`}
                rows={2}
                className="resize-none bg-muted/40 text-foreground"
                disabled={loading}
              />
              <Button
                type="button"
                onClick={() => void enviar()}
                disabled={loading || !input.trim()}
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </ModuleLayout>
  );
}
