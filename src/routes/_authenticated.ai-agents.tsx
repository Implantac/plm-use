// Agentes IA — 3 perfis operacionais (Fashion, PCP, Marketing) usando Lovable AI.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Sparkles, Factory, Megaphone, Bot } from "lucide-react";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { askAgent } from "@/lib/ai/agents.functions";
import { usePCPStore } from "@/lib/pcp/store";
import { useInfluencersStore, resumoInfluencers } from "@/lib/influencers/store";
import {
  ocorrenciasAbertasLote,
  pendenteReferencia,
  percentualLote,
  diasParaPrazo,
} from "@/types/pcp";

export const Route = createFileRoute("/_authenticated/ai-agents")({
  component: AIAgentsPage,
});

type AgentId = "fashion" | "pcp" | "marketing";

const AGENTS: Record<
  AgentId,
  { label: string; icon: typeof Sparkles; color: string; sugestoes: string[] }
> = {
  fashion: {
    label: "Fashion AI",
    icon: Sparkles,
    color: "text-fuchsia-300",
    sugestoes: [
      "Sugira um mood board para Alto Verão 2027 voltado ao público classe B Sudeste.",
      "Quais 5 cores devem dominar minha próxima cartela?",
      "Como diferenciar minha coleção da concorrência regional?",
    ],
  },
  pcp: {
    label: "PCP AI",
    icon: Factory,
    color: "text-emerald-300",
    sugestoes: [
      "Quais lotes estão atrasados e por quê?",
      "Onde está meu maior gargalo agora?",
      "Que ações tomar para acelerar a Costura?",
    ],
  },
  marketing: {
    label: "Marketing AI",
    icon: Megaphone,
    color: "text-amber-300",
    sugestoes: [
      "Quais influencers tiveram melhor ROI no último ciclo?",
      "Em qual região investir mais a próxima campanha?",
      "Que peças têm maior potencial de viralizar?",
    ],
  },
};

function AIAgentsPage() {
  const [agent, setAgent] = useState<AgentId>("fashion");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const ask = useServerFn(askAgent);
  const lotes = usePCPStore((s) => s.lotes);
  const influencers = useInfluencersStore((s) => s.influencers);

  function buildContext(): string {
    if (agent === "pcp") {
      const resumo = lotes.map((l) => {
        const pend = l.referencias.reduce((a, r) => a + pendenteReferencia(r), 0);
        return `${l.numero} (${l.grupo}, ${l.prioridade}): ${percentualLote(l)}% pronto, ${pend} pç pendentes, ${ocorrenciasAbertasLote(l)} ocorrências, prazo ${diasParaPrazo(l)}d`;
      });
      return `Lotes atuais:\n${resumo.join("\n")}`;
    }
    if (agent === "marketing") {
      return resumoInfluencers(influencers);
    }
    return "";
  }

  async function enviar(text?: string) {
    const msg = (text ?? input).trim();
    if (!msg || loading) return;
    setChat((c) => [...c, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    try {
      const res = await ask({ data: { agent, message: msg, context: buildContext() } });
      if (res.ok) {
        setChat((c) => [...c, { role: "ai", text: res.reply }]);
      } else {
        toast.error(res.error);
        setChat((c) => [...c, { role: "ai", text: `⚠️ ${res.error}` }]);
      }
    } catch (e) {
      toast.error("Falha ao consultar o agente.");
    } finally {
      setLoading(false);
    }
  }

  const A = AGENTS[agent];
  const Icon = A.icon;

  return (
    <ModuleLayout
      title="USE AI Agents"
      subtitle="3 especialistas conectados à sua operação real — coleção, PCP e marketing."
      version="Agents v1.0"
      metrics={[
        { label: "Agente", value: A.label, detail: "ativo" },
        { label: "Mensagens", value: String(chat.length), detail: "na sessão" },
        { label: "Contexto", value: agent === "pcp" ? `${lotes.length} lotes` : "Coleção", detail: "injetado" },
        { label: "Modelo", value: "Gemini 3", detail: "Flash" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Sidebar de agentes */}
        <div className="space-y-2">
          {(Object.keys(AGENTS) as AgentId[]).map((id) => {
            const Ai = AGENTS[id].icon;
            const active = id === agent;
            return (
              <button
                key={id}
                onClick={() => {
                  setAgent(id);
                  setChat([]);
                }}
                className={`w-full text-left rounded-lg border p-3 transition ${
                  active
                    ? "border-primary/50 bg-primary/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Ai className={`h-4 w-4 ${AGENTS[id].color}`} />
                  <p className="text-sm font-bold text-white">{AGENTS[id].label}</p>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {id === "fashion"
                    ? "Coleção, tendência, mood."
                    : id === "pcp"
                      ? "Lotes, gargalo, prazo."
                      : "Influencers, ROI, região."}
                </p>
              </button>
            );
          })}

          <Card className="glass-card rounded-lg mt-4">
            <CardContent className="p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                Sugestões
              </p>
              <div className="space-y-1.5">
                {A.sugestoes.map((s) => (
                  <button
                    key={s}
                    onClick={() => enviar(s)}
                    disabled={loading}
                    className="w-full text-left text-[11px] text-white/80 hover:text-white rounded-md border border-white/5 bg-white/[0.02] hover:border-primary/30 p-2 transition disabled:opacity-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat */}
        <Card className="glass-card rounded-lg lg:col-span-3 flex flex-col min-h-[560px]">
          <CardContent className="p-4 flex flex-col flex-1">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <Icon className={`h-5 w-5 ${A.color}`} />
              <p className="text-sm font-bold text-white">{A.label}</p>
              <Badge variant="outline" className="text-[9px] border-white/15 ml-auto">
                google/gemini-3-flash-preview
              </Badge>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {chat.length === 0 && (
                <div className="text-center text-muted-foreground py-12">
                  <Bot className={`h-10 w-10 mx-auto mb-2 ${A.color}`} />
                  <p className="text-sm">Comece uma conversa com {A.label}.</p>
                  <p className="text-[11px] mt-1">
                    {agent === "pcp"
                      ? "Eu já tenho contexto dos seus lotes atuais."
                      : "Pergunte qualquer coisa sobre sua área."}
                  </p>
                </div>
              )}
              {chat.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-white/[0.05] border border-white/10 text-white"
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.05] border border-white/10 rounded-lg px-3 py-2 text-sm text-muted-foreground flex items-center gap-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    pensando...
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-3 border-t border-white/10">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    enviar();
                  }
                }}
                placeholder={`Pergunte para ${A.label}...`}
                rows={2}
                className="resize-none bg-white/[0.04] border-white/10 text-white"
                disabled={loading}
              />
              <Button
                onClick={() => enviar()}
                disabled={loading || !input.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90 self-end"
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
