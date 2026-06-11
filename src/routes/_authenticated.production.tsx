import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Factory,
  Gauge,
  PackageCheck,
  Play,
  Scissors,
  Timer,
  Truck,
  Users,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ModuleActionMenu, ModuleLayout } from "@/components/modules/ModuleLayout";

export const Route = createFileRoute("/_authenticated/production")({
  component: ProductionPage,
});

type Order = {
  id: string;
  product: string;
  qty: string;
  unit: string;
  owner: string;
  mode: "Interna" | "Facção" | "Terceiro";
  start: string;
  end: string;
  stage: string;
  progress: number;
  risk: "Baixo" | "Médio" | "Alto";
};

const initialOrders: Order[] = [
  {
    id: "OP-2501",
    product: "Blusa Linho Amalfi",
    qty: "1.200 un",
    unit: "Unidade SP",
    owner: "Sandra",
    mode: "Interna",
    start: "12 Jun",
    end: "21 Jun",
    stage: "Costura",
    progress: 64,
    risk: "Baixo",
  },
  {
    id: "OP-2502",
    product: "Pantalona Riviera",
    qty: "860 un",
    unit: "Facção Bela Vista",
    owner: "Ricardo",
    mode: "Facção",
    start: "14 Jun",
    end: "26 Jun",
    stage: "Corte",
    progress: 38,
    risk: "Médio",
  },
  {
    id: "OP-2503",
    product: "Vestido Gala Resort",
    qty: "420 un",
    unit: "Terceiro Premium",
    owner: "Luís",
    mode: "Terceiro",
    start: "10 Jun",
    end: "19 Jun",
    stage: "Acabamento",
    progress: 82,
    risk: "Alto",
  },
  {
    id: "OP-2504",
    product: "Chemise Linen Office",
    qty: "620 un",
    unit: "Unidade SC",
    owner: "Marina",
    mode: "Interna",
    start: "16 Jun",
    end: "28 Jun",
    stage: "Lavanderia",
    progress: 24,
    risk: "Baixo",
  },
];

const stages = [
  { label: "Modelagem", icon: Scissors, load: 88 },
  { label: "Corte", icon: Scissors, load: 72 },
  { label: "Costura", icon: Factory, load: 91 },
  { label: "Silk/Bordado", icon: Users, load: 54 },
  { label: "Lavanderia", icon: Timer, load: 63 },
  { label: "Acabamento", icon: CheckCircle2, load: 79 },
  { label: "Expedição", icon: Truck, load: 47 },
];

function ProductionPage() {
  const [orders, setOrders] = useState(initialOrders);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [formData, setFormData] = useState({ product: "", qty: "", unit: "", owner: "" });

  const handleOpenDialog = (order?: Order) => {
    if (order) {
      setEditingOrder(order);
      setFormData({ product: order.product, qty: order.qty, unit: order.unit, owner: order.owner });
    } else {
      setEditingOrder(null);
      setFormData({ product: "", qty: "", unit: "", owner: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingOrder) {
      setOrders(
        orders.map((order) => (order.id === editingOrder.id ? { ...order, ...formData } : order)),
      );
      toast.success("Ordem de produção atualizada");
    } else {
      setOrders([
        {
          id: `OP-${Math.floor(Math.random() * 9000) + 1000}`,
          ...formData,
          mode: "Interna",
          start: "Hoje",
          end: "D+14",
          stage: "Modelagem",
          progress: 0,
          risk: "Baixo",
        },
        ...orders,
      ]);
      toast.success("Nova ordem de produção criada");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setOrders(orders.filter((order) => order.id !== id));
    toast.error("Ordem cancelada");
  };

  const delayedOrders = orders.filter((order) => order.risk === "Alto").length;
  const averageProgress = Math.round(
    orders.reduce((sum, order) => sum + order.progress, 0) / orders.length,
  );

  return (
    <ModuleLayout
      title="PCP e Produção"
      subtitle="Planejamento, ordens, lotes, capacidade, facções e monitoramento em tempo real."
      version="PCP Core v5.0"
      searchPlaceholder="Buscar OP, produto, unidade ou responsável"
      onAdd={() => handleOpenDialog()}
      metrics={[
        { label: "OPs ativas", value: String(orders.length), detail: "internas e externas" },
        { label: "Capacidade", value: "84%", detail: "alocação fabril" },
        { label: "Progresso médio", value: `${averageProgress}%`, detail: "por lote" },
        { label: "Risco alto", value: String(delayedOrders), detail: "ordens críticas" },
      ]}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
        <div className="space-y-6">
          <Card className="glass-card rounded-lg">
            <CardHeader className="p-5 border-b border-white/5 flex flex-row items-center justify-between">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Cronograma Gantt visual
              </CardTitle>
              <Button
                variant="outline"
                className="rounded-md h-9 text-[10px] font-bold uppercase tracking-[0.14em] border-white/10"
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Semana
              </Button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {orders.map((order, index) => (
                <div
                  key={order.id}
                  className="grid grid-cols-1 lg:grid-cols-[220px_1fr_88px] gap-4 rounded-md border border-white/10 bg-white/[0.035] p-4"
                >
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                      {order.id}
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">{order.product}</p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {order.qty} - {order.unit}
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      <span>{order.start}</span>
                      <span className="text-white">{order.stage}</span>
                      <span>{order.end}</span>
                    </div>
                    <div className="h-8 rounded-md bg-white/5 p-1">
                      <div
                        className="h-full rounded bg-primary/80"
                        style={{
                          width: `${Math.max(order.progress, 10)}%`,
                          marginLeft: `${index * 4}%`,
                          maxWidth: `${100 - index * 4}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <ModuleActionMenu
                      onEdit={() => handleOpenDialog(order)}
                      onDelete={() => handleDelete(order.id)}
                      onView={() => toast.info(`Monitorando ${order.id}`)}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {orders.map((order) => (
              <Card
                key={order.id}
                className="glass-card rounded-lg hover:border-primary/30 transition-colors"
              >
                <CardContent className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                        {order.id} - {order.mode}
                      </p>
                      <h3 className="mt-2 text-lg font-bold text-white">{order.product}</h3>
                    </div>
                    <span
                      className={`rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${order.risk === "Alto" ? "bg-rose-400/10 text-rose-300" : order.risk === "Médio" ? "bg-amber-300/10 text-amber-300" : "bg-emerald-300/10 text-emerald-300"}`}
                    >
                      {order.risk}
                    </span>
                  </div>
                  <Progress value={order.progress} className="h-2 bg-white/10" />
                  <div className="flex items-center justify-between border-t border-white/5 pt-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-white/10">
                        <AvatarImage src={`https://i.pravatar.cc/100?u=${order.owner}`} />
                        <AvatarFallback>{order.owner[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Responsável
                        </p>
                        <p className="text-xs font-bold text-white">{order.owner}</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="rounded-md text-muted-foreground hover:text-primary"
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="glass-card rounded-lg">
            <CardHeader className="p-5 border-b border-white/5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Capacidade por etapa
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {stages.map((stage) => (
                <div key={stage.label} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <stage.icon className="h-4 w-4 text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                        {stage.label}
                      </span>
                    </div>
                    <span className="text-[10px] font-bold text-muted-foreground">
                      {stage.load}%
                    </span>
                  </div>
                  <Progress value={stage.load} className="h-1.5 bg-white/10" />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg border-amber-300/20 bg-amber-300/[0.04]">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Gargalo detectado
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                Costura está em 91% de ocupação. A IA sugere mover 240 peças para a Facção Bela
                Vista e antecipar corte do lote OP-2504.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg">
            <CardContent className="p-5 grid grid-cols-2 gap-3">
              {[
                { label: "Interna", value: "2 OPs", icon: Factory },
                { label: "Facção", value: "1 OP", icon: Users },
                { label: "Terceiro", value: "1 OP", icon: Truck },
                { label: "Eficiência", value: "92%", icon: Gauge },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-4"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">{item.value}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-lg p-6 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">
              {editingOrder ? "Editar ordem" : "Nova ordem de produção"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-5">
            {[
              ["product", "Produto / referência", "Ex: Blusa Linho Amalfi"],
              ["qty", "Quantidade / lote", "Ex: 1.200 un"],
              ["unit", "Unidade / facção", "Ex: Unidade SP"],
              ["owner", "Responsável", "Ex: Sandra"],
            ].map(([key, label, placeholder]) => (
              <div key={key} className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {label}
                </Label>
                <Input
                  value={formData[key as keyof typeof formData]}
                  onChange={(event) => setFormData({ ...formData, [key]: event.target.value })}
                  className="bg-white/5 border-white/10 rounded-md h-11 focus:border-primary/40 focus:ring-0"
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-md h-10 text-[10px] font-bold uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-md h-10 px-6 text-[10px] font-bold uppercase tracking-widest btn-primary-premium"
            >
              Salvar OP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
