import { useState, type ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Target, Zap, Globe, Download } from "lucide-react";
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
  const revenueBars = [72, 58, 81, 45, 64, 88, 76, 92, 69, 84, 73, 95];
  const marginBars = [31, 24, 38, 19, 28, 42, 35, 46, 29, 41, 34, 48];
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

  return (
    <ModuleLayout
      title="BI Executivo"
      subtitle="Indicadores de ROI, ROAS, margem, ticket médio, curva ABC, giro, ruptura e rentabilidade."
      version="Intelligence v4.0"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar KPI, relatório ou coleção"
      metrics={[
        { label: "ROI médio", value: "3.4x", detail: "coleções ativas" },
        { label: "ROAS", value: "5.8x", detail: "marketing moda" },
        { label: "Ruptura", value: "4.2%", detail: "SKUs críticos" },
        { label: "Giro", value: "7.1x", detail: "estoque anualizado" },
      ]}
    >
      <div className="flex justify-end gap-4 mb-8">
        <Button
          variant="outline"
          className="rounded-none px-8 h-12 text-[10px] font-bold uppercase tracking-[0.2em] btn-outline-premium border-white/5 gap-2"
        >
          <Download className="w-4 h-4" /> Exportar Relatórios
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {kpis.map((kpi) => (
          <Card
            key={kpi.id}
            className="glass-card rounded-[2.5rem] p-10 flex flex-col justify-between group relative"
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
        <Card className="glass-card rounded-[2.5rem] p-10 space-y-8 h-[500px] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
          <div className="flex justify-between items-center mb-10">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" /> Histórico de Receita e Margem
            </h3>
          </div>
          <div className="flex-1 flex items-end gap-2 h-full pb-10">
            {revenueBars.map((height, i) => (
              <div key={i} className="flex-1 space-y-2 group cursor-pointer relative">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${height}%` }}
                  transition={{ delay: i * 0.05, duration: 1 }}
                  className="w-full bg-primary/20 group-hover:bg-primary/40 rounded-t-lg transition-all"
                />
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${marginBars[i]}%` }}
                  transition={{ delay: i * 0.05, duration: 1 }}
                  className="absolute bottom-6 w-full bg-primary group-hover:bg-primary-foreground/20 rounded-t-lg transition-all"
                />
              </div>
            ))}
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
                className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
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
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
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
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: target 6.0x"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-xl h-12 text-[10px] font-bold uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-xl h-12 px-8 text-[10px] font-bold uppercase tracking-widest btn-primary-premium"
            >
              Salvar Indicador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
