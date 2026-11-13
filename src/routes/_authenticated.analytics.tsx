import { useMemo, useState } from "react";
import { GlossarioTermos } from "@/components/onboarding/GlossarioTermos";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  BarChart3,
  TrendingUp,
  Target,
  Zap,
  Globe,
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
import { parseQSearch, type QSearch } from "@/lib/url-search";
import { ExportMenu } from "@/components/export/ExportMenu";
import { LiveSopBoard } from "@/components/analytics/LiveSopBoard";
import {
  useAnalyticsKpis,
  upsertAnalyticsKpi,
  removeAnalyticsKpi,
  validateKpiDraft,
  filterAnalyticsKpis,
  type AnalyticsKpi,
} from "@/lib/analytics/store";

// O store persiste o NOME do ícone (é o que cabe no banco); o ReactNode nasce aqui.
const ICONS = {
  target: Target,
  "trending-up": TrendingUp,
  zap: Zap,
  "bar-chart": BarChart3,
} as const;
function iconFor(name: AnalyticsKpi["iconName"]) {
  const Icon = ICONS[name] ?? BarChart3;
  return <Icon className="w-6 h-6" />;
}

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

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
  validateSearch: parseQSearch,
});

function AnalyticsPage() {
  const allKpis = useAnalyticsKpis();
  const navigate = useNavigate({ from: Route.fullPath });
  const { q } = Route.useSearch();
  const setQ = (v: string) =>
    navigate({
      search: (prev: QSearch) => ({ ...prev, q: v.trim() ? v : undefined }),
      replace: true,
    });
  const kpis = useMemo(() => filterAnalyticsKpis(allKpis, q ?? ""), [allKpis, q]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingKpi, setEditingKpi] = useState<AnalyticsKpi | null>(null);
  const [formData, setFormData] = useState({ label: "", value: "", sub: "" });

  const handleOpenDialog = (kpi?: AnalyticsKpi) => {
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
    const invalid = validateKpiDraft(formData);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    if (editingKpi) {
      upsertAnalyticsKpi({ ...editingKpi, ...formData });
      toast.success("Indicador estratégico atualizado");
    } else {
      upsertAnalyticsKpi({
        id: Date.now(),
        label: formData.label,
        value: formData.value,
        sub: formData.sub,
        iconName: "bar-chart",
        tone: "primary",
      });
      toast.success("Novo KPI adicionado ao dashboard");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    const alvo = allKpis.find((k) => k.id === id);
    if (!window.confirm('Remover o KPI "' + (alvo?.label ?? id) + '" do dashboard?')) return;
    removeAnalyticsKpi(id);
    toast.error("Indicador removido do BI");
  };

  const toneClass = (tone: string) => {
    if (tone === "emerald")
      return "bg-status-approved/10 border-status-approved/20 text-status-approved";
    if (tone === "amber")
      return "bg-status-progress/10 border-status-progress/20 text-status-progress";
    return "bg-primary/10 border-primary/20 text-primary";
  };

  // Dashboard de Marketing de demonstração (Onda 70): os 4 produtos com
  // spend/receita/ROI fictícios davam para ler como marketing real da
  // empresa. Sem campanha salva, o painel nasce vazio — mesmo contrato
  // das coleções (Onda 51) e dos creators (Onda 59).
  const marketingMetrics: MarketingMetric[] = [];

  // Onda 73: a penetração por região era um vetor fixo ("Sudeste 42% / R$
  // 1.2M", "Sul 28% / R$ 840k", "Nordeste 15% / R$ 450k"). Não há fonte real
  // de receita por UF (o PLM não é ERP); até existir pedido salvo com UF, a
  // resposta honesta é a lista vazia com `—` e aviso — nunca percentual
  // inventado.
  const regioesVenda: { region: string; val: string; count: string }[] = [];

  // Onda 73: "Mix por canal" (44/28/18/10%) e "Performance por coleção"
  // (R$ 189.000 ROI 5.01x / R$ 73.000 ROI 2.48x) eram vetores fixos lidos
  // como realizado. Só campanha salva com investimento e coleção com receita
  // apurada podem preencher — até lá, vazio declarado.
  const mixCanal: { label: string; pct: number; tone: string }[] = [];
  const performanceColecao: { name: string; revenue: number; roi: number }[] = [];

  const marketingTotals = (() => {
    const planned = marketingMetrics.reduce((s, m) => s + m.spendPlanned, 0);
    const real = marketingMetrics.reduce((s, m) => s + m.spendReal, 0);
    const revenue = marketingMetrics.reduce((s, m) => s + m.revenueGenerated, 0);
    const roi = real > 0 ? revenue / real : 0;
    return { planned, real, revenue, roi };
  })();

  // As barras tinham largura fixa (62%/78%) mesmo sem dado: agora refletem a
  // proporção real do previsto x realizado (0 sem campanha salva).
  const pctPrevisto = marketingTotals.planned > 0 ? 100 : 0;
  const pctRealizado =
    marketingTotals.planned > 0
      ? Math.min(100, Math.round((marketingTotals.real / marketingTotals.planned) * 100))
      : 0;

  const formatBRL = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <ModuleLayout
      title="BI Executivo"
      subtitle="Indicadores de ROI, ROAS, margem, ticket médio, curva ABC, giro, ruptura, rentabilidade, Marketing e Investimentos."
      version="Intelligence v4.0"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar KPI, relatório ou coleção"
      onSearch={setQ}
      metrics={[
        {
          label: "Investimento (real)",
          value: "—",
          detail: "sem campanha salva",
          demo: true,
        },
        { label: "ROI médio", value: "—", detail: "sem campanha salva", demo: true },
        { label: "ROAS", value: "—", detail: "sem campanha salva", demo: true },
        { label: "Ruptura", value: "—", detail: "sem campanha salva", demo: true },
        { label: "Giro", value: "—", detail: "sem campanha salva", demo: true },
      ]}
    >
      {/* Onda 58: 7 siglas medidas no texto desta tela, sem glossário até aqui. */}
      <GlossarioTermos
        siglas={["ROI", "ROAS", "S&OP", "GTM", "CRP", "MRP", "PCP"]}
        testId="glossario-analytics"
      />
      <LiveSopBoard />

      <div
        data-testid="analytics-demo"
        className="mb-6 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-[11px] leading-relaxed text-muted-foreground"
      >
        <strong className="text-foreground">BI de demonstração.</strong> Os KPIs estratégicos, o
        dashboard de marketing e a penetração por região abaixo são do seed do sistema e ilustram a
        tela — <strong>não são apurados como reais</strong>. Só KPI e campanha salvos pelo usuário
        entram no BI. O PLM não é ERP: nenhum ROI, ROAS ou receita de vitrine é apurado como real.
      </div>

      <div className="flex justify-end gap-4 mb-8">
        <ExportMenu
          title="KPIs estratégicos — BI Executivo"
          filename={"kpis-analytics-" + new Date().toISOString().slice(0, 10)}
          rows={kpis.map((k) => ({
            label: k.label,
            valor: k.value,
            detalhe: k.sub,
            progresso: k.progress ?? "",
          }))}
          label="Exportar Relatórios"
        />
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
                // Onda 75: "Visualizar" só mostrava toast com o nome do KPI —
                // promessa sem ação. O card já exibe o KPI; o item sai do menu.
              />
            </div>
            <div className="space-y-4">
              <div
                className={`p-3 rounded-lg border w-fit group-hover:rotate-6 transition-transform ${toneClass(kpi.tone)}`}
              >
                {iconFor(kpi.iconName)}
              </div>
              <h3 className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
                {kpi.label}
              </h3>
              {kpi.progress !== undefined ? (
                <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight">
                  R$ {kpi.value} / <span className="text-primary">R$ {kpi.sub}</span>
                </p>
              ) : (
                <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight">
                  {kpi.value}
                </p>
              )}
            </div>

            {kpi.progress !== undefined ? (
              <div className="space-y-2 mt-8">
                <div className="flex justify-between text-2xs font-semibold uppercase tracking-widest text-white">
                  <span>Progresso</span>
                  <span>{kpi.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000"
                    style={{ width: `${kpi.progress}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="text-2xs text-muted-foreground font-light italic lowercase mt-8">
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
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-white flex items-center gap-3">
              <PieChart className="w-5 h-5 text-primary" /> Dashboard de Marketing
            </h3>
            <span
              className={`text-2xs font-semibold uppercase tracking-widest ${
                marketingMetrics.length > 0 ? "text-status-approved" : "text-muted-foreground"
              }`}
            >
              {marketingMetrics.length > 0 ? "Realizado" : "Sem campanha salva"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-4xl border border-border bg-muted/60 p-5">
              <p className="text-2xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Investimento previsto x real
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <span>Previsto</span>
                    <span className="text-white">{formatBRL(marketingTotals.planned)}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${pctPrevisto}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <span>Realizado</span>
                    <span className="text-white">{formatBRL(marketingTotals.real)}</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-status-approved"
                      style={{ width: `${pctRealizado}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="mt-5 rounded-md bg-black/20 border border-border/60 p-4">
                <p className="text-2xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  ROI (Receita/Invest.)
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
                  {marketingTotals.roi.toFixed(2)}x
                </p>
              </div>
            </div>

            <div className="rounded-4xl border border-border bg-muted/60 p-5">
              <p className="text-2xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Mix por canal
              </p>
              <div className="mt-5 space-y-3">
                {mixCanal.length === 0 && (
                  <p
                    data-testid="analytics-mix-vazio"
                    className="text-2xs leading-relaxed text-muted-foreground"
                  >
                    Nenhuma campanha salva com investimento por canal. O mix que aparecia aqui era
                    de demonstração e foi removido.
                  </p>
                )}
                {mixCanal.map((row) => (
                  <div key={row.label}>
                    <div className="flex justify-between text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                      <span>{row.label}</span>
                      <span className="text-white">{row.pct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full ${row.tone}`} style={{ width: `${row.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-4xl border border-border bg-black/20 p-5">
            <div className="flex items-center justify-between">
              <p className="text-2xs font-semibold uppercase tracking-[0.05em] text-white">
                Performance por coleção
              </p>
              <span className="text-2xs font-semibold uppercase tracking-[0.04em] text-primary">
                Top
              </span>
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {performanceColecao.length === 0 && (
                <p
                  data-testid="analytics-performance-vazia"
                  className="text-2xs leading-relaxed text-muted-foreground"
                >
                  Nenhuma coleção com receita apurada. Os números de receita/ROI por coleção que
                  apareciam aqui eram de demonstração e foram removidos.
                </p>
              )}
              {performanceColecao.map((c) => (
                <div key={c.name} className="rounded-md border border-border bg-muted/60 p-4">
                  <p className="text-sm font-bold text-white">{c.name}</p>
                  <p className="mt-2 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {formatBRL(c.revenue)} • ROI {c.roi.toFixed(2)}x
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="glass-card rounded-full p-10 space-y-8 h-125 relative overflow-hidden">
          {/* Seção Diferencial: Controle de Investimentos */}
          <div className="flex items-center justify-between mb-10">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-white flex items-center gap-3">
              <CircleDollarSign className="w-5 h-5 text-primary" /> Controle de Investimentos
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-4xl border border-border bg-muted/60 p-5">
              <p className="text-2xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
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
                      className="rounded-md border border-border bg-black/20 px-3 py-1 text-2xs font-semibold uppercase tracking-widest text-primary"
                      // Onda 75: "Adicionar" só mostrava toast ("Registrar: X")
                      // sem registrar nada. O investimento é registrado como
                      // campanha em /marketing — o botão leva para lá.
                      onClick={() => navigate({ to: "/marketing" })}
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-4xl border border-border bg-muted/60 p-5">
              <p className="text-2xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Comparativos
              </p>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="flex justify-between text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <span>Previsto x Realizado</span>
                    <span className="text-white">
                      {marketingTotals.real >= marketingTotals.planned ? "+" : "-"}
                      {Math.abs(marketingTotals.real - marketingTotals.planned) / 1000}k
                    </span>
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                    <span>Retorno sobre investimento</span>
                    <span className="text-white">ROI {marketingTotals.roi.toFixed(2)}x</span>
                  </div>
                </div>
                <div className="rounded-md border border-border bg-black/20 p-4">
                  <p className="text-2xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                    Receita gerada
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-foreground tabular-nums">
                    {formatBRL(marketingTotals.revenue)}
                  </p>
                </div>
                <div className="rounded-md border border-border bg-black/20 p-4">
                  <p className="text-2xs font-semibold uppercase tracking-[0.04em] text-muted-foreground flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-primary" /> Integração Financeiro
                  </p>
                  <p className="mt-2 text-2xs text-white/85">
                    Valores de “Fonte: marketing” no Financeiro alimentam o realizado.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 rounded-4xl border border-border bg-black/20 p-5">
            <p className="text-2xs font-semibold uppercase tracking-[0.05em] text-white">
              Performance por produto / cor / categoria
            </p>
            <div className="mt-4 space-y-3">
              {marketingMetrics.map((m) => (
                <div key={m.product} className="rounded-md border border-border bg-muted/60 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-bold text-white">{m.product}</p>
                      <p className="mt-1 text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {m.collection} • {m.category} • Cor {m.color}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {m.channel}
                      </p>
                      <p className="mt-2 text-lg font-bold text-primary">ROI {m.roi.toFixed(2)}x</p>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
                        Spend (real)
                      </p>
                      <p className="text-sm font-bold text-white">{formatBRL(m.spendReal)}</p>
                    </div>
                    <div>
                      <p className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground">
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

        <Card className="glass-card rounded-full p-10 space-y-8 relative overflow-hidden">
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-white flex items-center gap-3">
              <Globe className="w-5 h-5 text-primary" /> Penetração de Mercado por Região
            </h3>
          </div>
          <div className="space-y-6">
            {regioesVenda.length === 0 && (
              <div
                data-testid="analytics-regioes-vazias"
                className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 text-[11px] leading-relaxed text-muted-foreground space-y-2"
              >
                <p>
                  <strong className="text-foreground">Nenhuma venda registrada por região.</strong>{" "}
                  A penetração por região que aparecia aqui era de demonstração e foi removida — o
                  PLM não é ERP e não apura receita por UF sem pedido salvo.
                </p>
                <Button size="sm" variant="outline" className="h-7 text-2xs" asChild>
                  <a href="/orders">Ver pedidos salvos</a>
                </Button>
              </div>
            )}
            {regioesVenda.map((reg, i) => (
              <div key={i} className="flex items-center gap-6 group cursor-pointer">
                <span className="text-2xs font-semibold uppercase tracking-widest text-muted-foreground w-24">
                  {reg.region}
                </span>
                <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
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
        <DialogContent className="glass-card border-border bg-popover text-white rounded-xl p-10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold uppercase tracking-tighter italic">
              {editingKpi ? "Editar Indicador" : "Adicionar KPI Estratégico"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <Label className="text-2xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                Nome do Indicador
              </Label>
              <Input
                aria-label="Nome do Indicador"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="rounded-lg h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: ROI Campanha Digital"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-2xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  Valor Atual
                </Label>
                <Input
                  aria-label="Valor Atual"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  className="rounded-lg h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: 5.2x"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-2xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">
                  Meta / Subtítulo
                </Label>
                <Input
                  aria-label="Meta / Subtítulo"
                  value={formData.sub}
                  onChange={(e) => setFormData({ ...formData, sub: e.target.value })}
                  className="rounded-lg h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: target 6.0x"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button variant="ghost" onClick={() => setIsDialogOpen(false)} className="text-2xs">
              Cancelar
            </Button>
            <Button onClick={handleSave} className="text-2xs">
              Salvar Indicador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
