import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  Globe,
  Download,
  CircleDollarSign,
  PieChart,
  Workflow,
} from "lucide-react";
import { ModuleLayout, ModuleActionMenu } from "@/components/modules/ModuleLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type MarketingMetric = {
  collection: string;
  product: string;
  color: string;
  category: string;
  channel: "Meta Ads" | "Instagram" | "Google Ads" | "TikTok Ads";
  spendPlanned: number;
  spendReal: number;
  revenueGenerated: number;
  roi: number;
};

interface KPIItem {
  id: number;
  label: string;
  value: string;
  sub: string;
  progress?: number;
  icon: ReactNode;
  tone: string;
}

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const [kpis, setKpis] = useState<KPIItem[]>([
    {
      id: 1,
      label: "Meta de Coleção",
      value: "2.4M",
      sub: "4M",
      progress: 60,
      icon: <Target className="w-6 h-6" />,
      tone: "primary",
    },
    {
      id: 2,
      label: "Crescimento YoY",
      value: "+24.8%",
      sub: "vs mercado: +12%",
      icon: <TrendingUp className="w-6 h-6" />,
      tone: "emerald",
    },
    {
      id: 3,
      label: "Eficiência PCP",
      value: "94.2%",
      sub: "ciclo: 32 dias",
      icon: <Zap className="w-6 h-6" />,
      tone: "amber",
    },
  ]);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<KPIItem | null>(null);
  const [formData, setFormData] = useState({ label: "", value: "", sub: "" });

  const handleOpenDialog = (kpi?: KPIItem) => {
    if (kpi) {
      setEditingKpi(kpi);
      setFormData({ label: kpi.label, value: kpi.value, sub: kpi.sub });
    } else {
      setEditingKpi(null);
      setFormData({ label: "", value: "", sub: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingKpi) {
      setKpis(kpis.map((k) => (k.id === editingKpi.id ? { ...k, ...formData } : k)));
      toast.success("Indicador estratégico atualizado");
    } else {
      const newKpi: KPIItem = {
        id: Date.now(),
        label: formData.label,
        value: formData.value,
        sub: formData.sub,
        icon: <BarChart3 className="w-6 h-6" />,
        tone: "primary",
      };
      setKpis([...kpis, newKpi]);
      toast.success("Novo KPI adicionado ao dashboard");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setKpis(kpis.filter((k) => k.id !== id));
    toast.error("Indicador removido do BI");
  };

  const toneClass = (tone: string) => {
    if (tone === "emerald") return "bg-emerald-500/10 border-emerald-500/20 text-emerald-400";
    if (tone === "amber") return "bg-amber-500/10 border-amber-500/20 text-amber-400";
    return "bg-primary/10 border-primary/20 text-primary";
  };

  const marketingMetrics: MarketingMetric[] = [
    {
      collection: "Verão 2027",
      product: "Vestido Floral (Ref. 302)",
      color: "Vermelho",
      category: "Vestidos",
      channel: "Meta Ads",
      spendPlanned: 22000,
      spendReal: 26000,
      revenueGenerated: 148000,
      roi: 5.69,
    },
    {
      collection: "Verão 2027",
      product: "Blusa Listrada (Ref. 811)",
      color: "Azul",
      category: "Blusas",
      channel: "Google Ads",
      spendPlanned: 12000,
      spendReal: 9500,
      revenueGenerated: 41000,
      roi: 4.32,
    },
    {
      collection: "Inverno 2026",
      product: "Calça Linho (Ref. 441)",
      color: "Off-White",
      category: "Calças",
      channel: "Instagram",
      spendPlanned: 16000,
      spendReal: 18000,
      revenueGenerated: 52000,
      roi: 2.89,
    },
    {
      collection: "Inverno 2026",
      product: "Casaco Estruturado (Ref. 902)",
      color: "Preto",
      category: "Outwear",
      channel: "TikTok Ads",
      spendPlanned: 9000,
      spendReal: 10200,
      revenueGenerated: 21000,
      roi: 2.06,
    },
  ];

  const marketingTotals = (() => {
    const planned = marketingMetrics.reduce((s, m) => s + m.spendPlanned, 0);
    const real = marketingMetrics.reduce((s, m) => s + m.spendReal, 0);
    const revenue = marketingMetrics.reduce((s, m) => s + m.revenueGenerated, 0);
    const roi = real > 0 ? revenue / real : 0;
    return { planned, real, revenue, roi };
  })();

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <ModuleLayout
      title="BI Executivo"
      subtitle="Indicadores de ROI, ROAS, margem, ticket médio, curva ABC, giro, ruptura, rentabilidade, Marketing e Investimentos."
      version="Intelligence v4.0"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar KPI, relatório ou coleção"
      metrics={[
        { label: "Investimento (real)", value: "R$ 84k", detail: "pago vs previsto" },
        { label: "ROI médio", value: "3.4x", detail: "coleções ativas" },
        { label: "ROAS", value: "5.8x", detail: "marketing moda" },
        { label: "Ruptura", value: "4.2%", detail: "SKUs críticos" },
        { label: "Giro", value: "7.1x", detail: "estoque anualizado" },
      ]}
    >
      <div className="flex justify-end gap-4 mb-8">
        <Button variant="outline" className="text-[10px] tracking-[0.2em] gap-2">
          <Download className="w-4 h-4" /> Exportar Relatórios
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {kpis.map((kpi) => (
          <Card
            key={kpi.id}
            className="glass-card rounded-4xl p-10 flex flex-col justify-between group relative"
          >
            <div className="absolute top-8 right-8">
              <ModuleActionMenu
                onEdit={() => handleOpenDialog(kpi)}
                onDelete={() => handleDelete(kpi.id)}
                onView={() => toast.info(`Relatório analítico de ${kpi.label}`)}
              />
            </div>
            <div className="space-y-4">
              <div
                className={`p-3 rounded-2xl border w-fit group-hover:rotate-6 transition-transform ${toneClass(kpi.tone)}`}
              >
                {kpi.icon}
              </div>
              <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                {kpi.label}
              </h3>
              {kpi.progress !== undefined ? (
                <p className="text-4xl font-bold text-white tracking-tighter">
                  R$ {kpi.value} / <span className="text-primary">R$ {kpi.sub}</span>
                </p>
              ) : (
                <p className="text-4xl font-bold text-white tracking-tighter">{kpi.value}</p>
              )}
            </div>

            {kpi.progress !== undefined ? (
              <div className="space-y-2 mt-8">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-white">
                  <span>Progresso</span>
                  <span>{kpi.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000"
                    style={{ width: `${kpi.progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground font-light italic lowercase mt-8">
                {kpi.sub}
              </p>
            )}
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass-card rounded-4xl p-10 space-y-8 h-125 relative overflow-hidden">
          {/* Seção Diferencial: Dashboard de Marketing */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
              <PieChart className="w-5 h-5 text-primary" /> Dashboard de Marketing
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
              Realizado
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-4xl border border-white/10 bg-white/[0.035] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Investimento previsto x real
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Previsto</span>
                    <span className="text-white">{formatBRL(marketingTotals.planned)}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: "62%" }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Realizado</span>
                    <span className="text-white">{formatBRL(marketingTotals.real)}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-400" style={{ width: "78%" }} />
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-md bg-black/20 border border-white/5 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                  ROI (Receita/Invest.)
                </p>
                <p className="mt-2 text-3xl font-bold text-white">
                  {marketingTotals.roi.toFixed(2)}x
                </p>
              </div>
            </div>

            <div className="rounded-4xl border border-white/10 bg-white/[0.035] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Mix por canal
              </p>
              <div className="mt-5 space-y-3">
                {[
                  { label: "Meta Ads", pct: 44, tone: "bg-primary" },
                  { label: "Google Ads", pct: 28, tone: "bg-emerald-400" },
                  { label: "Instagram", pct: 18, tone: "bg-sky-400" },
                  { label: "TikTok Ads", pct: 10, tone: "bg-amber-300" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                      <span>{row.label}</span>
                      <span className="text-white">{row.pct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full ${row.tone}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-4xl border border-white/10 bg-black/20 p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Performance por coleção
              </p>
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                Top
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: "Verão 2027", revenue: 189000, roi: 5.01 },
                { name: "Inverno 2026", revenue: 73000, roi: 2.48 },
              ].map((c) => (
                <div
                  key={c.name}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-4"
                >
                  <p className="text-sm font-bold text-white">{c.name}</p>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {formatBRL(c.revenue)} • ROI {c.roi.toFixed(2)}x
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass-card rounded-[2.5rem] p-10 space-y-8 h-125 relative overflow-hidden">
          {/* Seção Diferencial: Controle de Investimentos */}
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
              <CircleDollarSign className="w-5 h-5 text-primary" /> Controle de Investimentos
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-4xl border border-white/10 bg-white/[0.035] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Registrar
              </p>
              <div className="mt-4 space-y-3">
                {[
                  "Tráfego pago",
                  "Influenciadores",
                  "Modelos",
                  "Produções fotográficas",
                  "Campanhas",
                ].map((x) => (
                  <div key={x} className="flex items-center justify-between">
                    <span className="text-sm font-bold text-white/90">{x}</span>
                    <button
                      className="rounded-md border border-white/10 bg-black/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary"
                      onClick={() => toast.info(`Registrar: ${x}`)}
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-4xl border border-white/10 bg-white/[0.035] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Comparativos
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Previsto x Realizado</span>
                    <span className="text-white">
                      {marketingTotals.real >= marketingTotals.planned ? "+" : "-"}
                      {Math.abs(marketingTotals.real - marketingTotals.planned) / 1000}k
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    <span>Retorno sobre investimento</span>
                    <span className="text-white">ROI {marketingTotals.roi.toFixed(2)}x</span>
                  </div>
                </div>
                <div className="rounded-md border border-white/10 bg-black/20 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                    Receita gerada
                  </p>
                  <p className="mt-2 text-3xl font-bold text-white">
                    {formatBRL(marketingTotals.revenue)}
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-black/20 p-4">
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-primary" /> Integração Financeiro
                  </p>
                  <p className="mt-2 text-[10px] text-white/85">
                    Valores de “Fonte: marketing” no Financeiro alimentam o realizado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-4xl border border-white/10 bg-black/20 p-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
              Performance por produto / cor / categoria
            </p>
            <div className="mt-4 space-y-3">
              {marketingMetrics.map((m) => (
                <div
                  key={m.product}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">{m.product}</p>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {m.collection} • {m.category} • Cor {m.color}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                        {m.channel}
                      </p>
                      <p className="mt-2 text-lg font-bold text-primary">ROI {m.roi.toFixed(2)}x</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Spend (real)
                      </p>
                      <p className="text-sm font-bold text-white">{formatBRL(m.spendReal)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Receita gerada
                      </p>
                      <p className="text-sm font-bold text-white">
                        {formatBRL(m.revenueGenerated)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass-card rounded-[2.5rem] p-10 space-y-8 relative overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" /> Penetração de Mercado por Região
            </h3>
          </div>
          <div className="space-y-6">
            {[
              { region: "Sudeste", val: "42%", count: "R$ 1.2M" },
              { region: "Sul", val: "28%", count: "R$ 840k" },
              { region: "Nordeste", val: "15%", count: "R$ 450k" },
            ].map((reg, i) => (
              <div key={i} className="flex items-center gap-6 group cursor-pointer">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-24">
                  {reg.region}
                </span>
                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: reg.val }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-primary group-hover:bg-primary/80 transition-colors"
                  />
                </div>
                <span className="text-sm font-bold text-white w-20 text-right">{reg.count}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-[2.5rem] p-10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tighter italic">
              {editingKpi ? "Editar Indicador" : "Adicionar KPI Estratégico"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Nome do Indicador
              </Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: ROI Campanha Digital"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Valor Atual
                </Label>
                <Input
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: 5.2x"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Meta / Subtítulo
                </Label>
                <Input
                  value={formData.sub}
                  onChange={(e) => setFormData({ ...formData, sub: e.target.value })}
                  className="rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: target 6.0x"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-[10px]">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="text-[10px]">
              Salvar Indicador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
