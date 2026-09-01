import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Send,
  Zap,
  Brain,
  History,
  Settings,
  Bot,
  Layers,
  FileText,
  TrendingUp,
  CheckCircle2,
  Wand2,
  LayoutGrid,
  Palette,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ModuleTabs } from "@/components/nav/ModuleTabs";

export const Route = createFileRoute("/_authenticated/ai-center")({
  component: AICenterPage,
});

function AICenterPage() {
  const [activeTab, setActiveTab] = useState("copilot");
  const [isGenerating, setIsDialogOpen] = useState(false);
  const [generationStep, setGenerationStep] = useState(0);

  const skills = [
    { id: "copilot", label: "Neural Copilot", icon: <Sparkles className="w-4 h-4" /> },
    { id: "collections", label: "Gerador de Coleções", icon: <Layers className="w-4 h-4" /> },
    { id: "tech-sheet", label: "IA de Ficha Técnica", icon: <FileText className="w-4 h-4" /> },
    { id: "sales", label: "Predict Sales AI", icon: <TrendingUp className="w-4 h-4" /> },
  ];

  const suggestedPrompts = [
    "Gerar mood board para Primavera/Verão Classe B Brasil",
    "Estimar consumo para 'Vestido Longo Floral'",
    "Qual o ROI projetado para a próxima coleção?",
    "Quais tecidos devemos comprar para o Verão 25?",
  ];

  const handleGenerateCollection = () => {
    setIsDialogOpen(true);
    setGenerationStep(1);

    // Simulating AI process steps
    setTimeout(() => setGenerationStep(2), 2000);
    setTimeout(() => setGenerationStep(3), 4500);
    setTimeout(() => {
      setGenerationStep(4);
      toast.success("Coleção e SKUs gerados com sucesso!");
    }, 7000);
  };

  return (
    <div className="flex flex-col gap-4">
      <ModuleTabs group="ai" />
      <div className="h-[calc(100vh-220px)] flex gap-8">
      <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/5 rounded-[3rem] overflow-hidden relative">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='0.5'/%3E%3C/svg%3E")` }}
        />

        <header className="p-8 border-b border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-[0_0_30px_rgba(var(--primary),0.3)]">
              <Sparkles className="w-6 h-6 text-white fill-current animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight uppercase italic">
                USE AI <span className="text-primary">Copilot</span>
              </h2>
              <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-emerald-400">
                Online • Neural Engine v5.0
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
              <History className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1 p-10">
          <div className="max-w-3xl mx-auto space-y-12">
            {activeTab === "copilot" && (
              <div className="space-y-12">
                <div className="flex items-start gap-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="space-y-4 p-8 rounded-[2rem] bg-white/5 border border-white/5">
                    <p className="text-sm font-light text-white leading-relaxed italic">
                      Olá! Sou sua inteligência aplicada. Analisei todos os dados de produção,
                      vendas e tendências da marca. Como posso otimizar seu dia hoje?
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-6 flex-row-reverse">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-white shrink-0">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div className="space-y-4 p-8 rounded-[2rem] bg-primary/10 border border-primary/20">
                    <p className="text-sm font-bold text-white leading-relaxed uppercase tracking-tighter italic">
                      Quais produtos da Coleção Amalfi devo repetir na próxima estação?
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-6">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div className="space-y-6 p-8 rounded-[2rem] bg-white/5 border border-white/5">
                    <p className="text-sm font-light text-white leading-relaxed">
                      Baseado no Giro de Estoque (92%) e ROI (4.8x), recomendo repetir:
                    </p>
                    <ul className="space-y-3">
                      {[
                        "Blusa Linho Amalfi (Off-White)",
                        "Calça Pantalona Chic",
                        "Vestido Longo Gala",
                      ].map((item, i) => (
                        <li
                          key={i}
                          className="flex items-center gap-3 text-xs font-bold text-primary italic uppercase tracking-widest"
                        >
                          <Zap className="w-3 h-3 fill-current" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {activeTab === "collections" && (
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <Wand2 className="w-5 h-5" />
                </div>
                <div className="space-y-6 p-8 rounded-[2rem] bg-primary/[0.03] border border-primary/20 w-full">
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white tracking-tight uppercase italic">
                      Gerador de Coleções <span className="text-primary">v2.0</span>
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed italic lowercase">
                      configure os parâmetros neurais para que eu possa orquestrar seu próximo mix
                      de sucesso.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4 p-5 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/30 transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Palette className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                          Estética
                        </span>
                      </div>
                      <p className="text-[9px] text-muted-foreground uppercase">
                        Primavera Verão • Tropical Chic
                      </p>
                    </div>
                    <div className="space-y-4 p-5 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/30 transition-all cursor-pointer">
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-primary" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white">
                          Público Alvo
                        </span>
                      </div>
                      <p className="text-[9px] text-muted-foreground uppercase">
                        Classe B • 25-45 Anos • Brasil
                      </p>
                    </div>
                  </div>

                  <Button
 onClick={handleGenerateCollection}
 className="w-full text-[10px] tracking-[0.3em] group gap-3 shadow-[0_0_30px_rgba(var(--primary),0.2)]"
 >
                    <Wand2 className="w-4 h-4 animate-sparkle" />
                    Gerar Coleção e SKUs
                  </Button>
                </div>
              </div>
            )}
            {activeTab === "tech-sheet" && (
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-6 p-8 rounded-[2rem] bg-white/5 border border-white/5 w-full">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight uppercase italic">
                      Gerador de Ficha Técnica
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      Crie ficha inicial com materiais, consumo, processos, custos, arquivos
                      técnicos e riscos de produção.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Produto", value: "Blusa Linho Amalfi" },
                      { label: "Categoria", value: "Feminino / Top" },
                      { label: "Tecido sugerido", value: "Linho Puro Off-White" },
                      { label: "Custo previsto", value: "R$ 84,20" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-md border border-white/10 bg-black/20 p-4"
                      >
                        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                          {item.label}
                        </p>
                        <p className="mt-2 text-sm font-bold text-white">{item.value}</p>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full text-[10px] tracking-[0.2em] gap-3">
                    <FileText className="w-4 h-4" />
                    Gerar ficha técnica v1
                  </Button>
                </div>
              </div>
            )}
            {activeTab === "sales" && (
              <div className="flex items-start gap-6">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="space-y-6 p-8 rounded-[2rem] bg-primary/[0.03] border border-primary/20 w-full">
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight uppercase italic">
                      Previsão de Vendas e Planejamento
                    </h3>
                    <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                      Calcule demanda, sazonalidade, compra ideal, produção ideal e rentabilidade
                      esperada.
                    </p>
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "Demanda prevista", value: "18.400 peças", width: "82%" },
                      { label: "Compra ideal", value: "2.800m de linho", width: "68%" },
                      {
                        label: "Produção ideal",
                        value: "12.600 peças no lote inicial",
                        width: "74%",
                      },
                      { label: "Rentabilidade esperada", value: "R$ 412k margem", width: "88%" },
                    ].map((row) => (
                      <div
                        key={row.label}
                        className="rounded-md border border-white/10 bg-black/20 p-4"
                      >
                        <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.14em]">
                          <span className="text-muted-foreground">{row.label}</span>
                          <span className="text-white">{row.value}</span>
                        </div>
                        <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: row.width }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button className="w-full text-[10px] tracking-[0.2em] gap-3">
                    <TrendingUp className="w-4 h-4" />
                    Recalcular demanda
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Generation Overlay/Modal */}
        <AnimatePresence>
          {isGenerating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-10"
            >
              <Card className="glass-card w-full max-w-lg border-primary/20 bg-black/40 rounded-[3rem] p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32" />

                <div className="relative space-y-8 text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-[2rem] border border-primary/20 flex items-center justify-center mx-auto mb-6">
                    <Sparkles className="w-10 h-10 text-primary animate-pulse" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-white tracking-tighter uppercase italic">
                      Neural Engine <span className="text-primary">Processing</span>
                    </h2>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-[0.4em]">
                      Gerando inteligência de produto...
                    </p>
                  </div>

                  <div className="space-y-4 pt-4">
                    {[
                      { step: 1, label: "Analisando Tendências WGSN/Pinterest", icon: Brain },
                      { step: 2, label: "Compondo Moodboard e Paleta Color", icon: Palette },
                      { step: 3, label: "Orquestrando Mix de Produtos e SKUs", icon: LayoutGrid },
                      {
                        step: 4,
                        label: "Finalizado: Coleção 'Verão 25' Ativa",
                        icon: CheckCircle2,
                      },
                    ].map((s) => (
                      <div
                        key={s.step}
                        className={`flex items-center gap-4 transition-all duration-700 ${generationStep >= s.step ? "opacity-100 translate-x-0" : "opacity-20 -translate-x-4"}`}
                      >
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center border ${generationStep >= s.step ? "border-primary text-primary bg-primary/10" : "border-white/10 text-white/20"}`}
                        >
                          {generationStep > s.step ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <s.icon className="w-4 h-4" />
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-widest ${generationStep >= s.step ? "text-white" : "text-white/20"}`}
                        >
                          {s.label}
                        </span>
                      </div>
                    ))}
                  </div>

                  {generationStep === 4 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="pt-8"
                    >
                      <Button
 onClick={() => setIsDialogOpen(false)}
                        className="w-full text-[10px] tracking-[0.3em]"
                      >
                        Explorar Coleção Gerada
                      </Button>
                    </motion.div>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="p-8 border-t border-white/5 shrink-0">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex flex-wrap gap-3">
              {suggestedPrompts.map((p, i) => (
                <Button
 key={i}
 variant="ghost"
 className="bg-white/5 border text-[9px] tracking-[0.2em] text-muted-foreground hover:text-white hover:border-primary/40"
 >
                  {p}
                </Button>
              ))}
            </div>
            <div className="relative group">
              <Input
                className="h-16 pl-8 pr-16 rounded-3xl bg-white/10 focus:border-primary/40 focus:ring-0 text-white/50"
                placeholder="Pergunte qualquer coisa sobre sua operação..."
              />
              <Button className="absolute right-3 top-1/2 -translate-y-1/2 w-10 bg-primary text-white p-0 hover:scale-105 active:scale-95">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="w-80 space-y-8 hidden xl:block">
        <Card className="glass-card rounded-[2.5rem] p-6 border-primary/20 bg-primary/[0.02]">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-6">
            Neural Skills
          </h3>
          <div className="space-y-2">
            {skills.map((skill) => (
              <button
                key={skill.id}
                onClick={() => setActiveTab(skill.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all ${activeTab === skill.id ? "bg-primary text-white shadow-[0_0_20px_rgba(var(--primary),0.3)]" : "text-muted-foreground hover:bg-white/5 hover:text-white"}`}
              >
                {skill.icon}
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {skill.label}
                </span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="glass-card rounded-[2.5rem] p-8 border-primary/20 bg-primary/[0.02]">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-6">
            Neural Status
          </h3>
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white">
                Integração ERP
              </p>
              <span className="text-[9px] text-emerald-400 font-bold uppercase">Sync OK</span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white">
                Análise Preditiva
              </p>
              <span className="text-[9px] text-emerald-400 font-bold uppercase">98% Acc</span>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[9px] font-bold uppercase tracking-widest text-white">
                Trend Library
              </p>
              <span className="text-[9px] text-emerald-400 font-bold uppercase">Updated</span>
            </div>
          </div>
        </Card>

        <Card className="glass-card rounded-[2.5rem] p-8 space-y-6">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white mb-6">
            Insights em Tempo Real
          </h3>
          {[
            "Alerta: Tecido Linho Amalfi em nível crítico.",
            "Insight: Nova tendência de 'Peach Fuzz' em alta.",
            "ROI: Campanha Boho superou meta em 15%.",
          ].map((insight, i) => (
            <div
              key={i}
              className="p-4 rounded-2xl bg-white/5 border border-white/5 text-[10px] font-light text-muted-foreground leading-relaxed italic"
            >
              {insight}
            </div>
          ))}
        </Card>
      </div>
      </div>
    </div>
  );
}
