import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCcw,
  Store,
  PackageX,
  PlugZap,
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
import { motion } from "framer-motion";

export const Route = createFileRoute("/_authenticated/commercial")({
  component: CommercialPage,
});

function CommercialPage() {
  const [salesStats] = useState([
    { label: "Vendas Brutas Mes", value: "R$ 1.2M", change: "+12%", trend: "up" },
    { label: "Ticket Médio", value: "R$ 482,00", change: "+4%", trend: "up" },
    { label: "Taxa de Devolução", value: "2.4%", change: "-0.8%", trend: "up" },
    { label: "Pedidos Ativos", value: "842", change: "+145", trend: "up" },
  ]);

  const [clients, setClients] = useState([
    { id: 1, name: "Luxury Boutique SP", orders: 24, total: "R$ 124k" },
    { id: 2, name: "Moda Carioca Store", orders: 18, total: "R$ 92k" },
    { id: 3, name: "Urban Concept Curitiba", orders: 12, total: "R$ 54k" },
    { id: 4, name: "Style Hub BH", orders: 8, total: "R$ 38k" },
  ]);
  type Client = (typeof clients)[number];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: "", orders: "", total: "" });

  const handleOpenDialog = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setFormData({ name: client.name, orders: client.orders.toString(), total: client.total });
    } else {
      setEditingClient(null);
      setFormData({ name: "", orders: "", total: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingClient) {
      setClients(
        clients.map((c) =>
          c.id === editingClient.id ? { ...c, ...formData, orders: parseInt(formData.orders) } : c,
        ),
      );
      toast.success("Cliente B2B atualizado");
    } else {
      const newClient = {
        id: Date.now(),
        ...formData,
        orders: parseInt(formData.orders) || 0,
      };
      setClients([newClient, ...clients]);
      toast.success("Novo cliente prospectado");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setClients(clients.filter((c) => c.id !== id));
    toast.error("Cliente removido da carteira");
  };

  return (
    <ModuleLayout
      title="Comercial"
      subtitle="Integração com ERP, e-commerce e marketplaces para pedidos, vendas, trocas e devoluções."
      version="Sales Hub v2.0"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar cliente, pedido, canal ou SKU"
      metrics={[
        { label: "Pedidos", value: "842", detail: "ativos" },
        { label: "Vendas", value: "R$ 1,2M", detail: "brutas mês" },
        { label: "Trocas", value: "36", detail: "em análise" },
        { label: "Devoluções", value: "2,4%", detail: "taxa mensal" },
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {salesStats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass-card rounded-lg p-5 group hover:border-primary/40 transition-all duration-500">
              <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground group-hover:text-primary transition-colors">
                  {stat.label}
                </p>
                <div
                  className={`p-1.5 rounded-full ${stat.trend === "up" ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}
                >
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                </div>
              </CardHeader>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-white tracking-tighter">{stat.value}</p>
                <p
                  className={`text-[10px] font-bold uppercase tracking-widest ${stat.trend === "up" ? "text-emerald-400" : "text-rose-400"}`}
                >
                  {stat.change}{" "}
                  <span className="text-muted-foreground font-light lowercase">vs planejado</span>
                </p>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass-card rounded-lg p-6 space-y-8">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-primary" /> Vendas por Canal
          </h3>
          <div className="space-y-6">
            {[
              { channel: "E-commerce Próprio", val: "R$ 540k", perc: 45 },
              { channel: "Marketplaces", val: "R$ 320k", perc: 27 },
              { channel: "Atacado / B2B", val: "R$ 210k", perc: 18 },
              { channel: "Lojas Físicas", val: "R$ 130k", perc: 10 },
            ].map((c, i) => (
              <div key={i} className="space-y-3 group cursor-pointer">
                <div className="flex justify-between items-end">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white group-hover:text-primary transition-colors">
                    {c.channel}
                  </p>
                  <p className="text-sm font-bold text-white">{c.val}</p>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-1000"
                    style={{ width: `${c.perc}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card rounded-lg p-6 space-y-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
              <Users className="w-5 h-5 text-primary" /> Principais Clientes B2B
            </h3>
            <Button
 variant="ghost"
 className="text-[9px] tracking-[0.2em] text-primary"
 >
              Ver Todos
            </Button>
          </div>
          <div className="space-y-4">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 rounded-md bg-white/5 border border-white/5 hover:border-primary/40 transition-all group cursor-pointer relative"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
                    {client.name[0]}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-white tracking-tight">{client.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                      {client.orders} pedidos este ano
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-bold text-white tracking-tighter">{client.total}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-400">
                      Regular
                    </p>
                  </div>
                  <ModuleActionMenu
                    onEdit={() => handleOpenDialog(client)}
                    onDelete={() => handleDelete(client.id)}
                    onView={() => toast.info(`Carteira de ${client.name}`)}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <Card className="glass-card rounded-lg p-6">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5 flex items-center gap-3">
            <PlugZap className="h-4 w-4 text-primary" /> Integrações
          </h3>
          <div className="space-y-3">
            {[
              "ERP Use Moda",
              "E-commerce VTEX",
              "Marketplace Mercado Livre",
              "Marketplace Dafiti",
            ].map((item) => (
              <div
                key={item}
                className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.035] p-3"
              >
                <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                  {item}
                </span>
                <span className="text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
                  Sync
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="glass-card rounded-lg p-6">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5 flex items-center gap-3">
            <RefreshCcw className="h-4 w-4 text-primary" /> Trocas e devoluções
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Trocas abertas", value: "36", icon: RefreshCcw },
              { label: "Devoluções", value: "2,4%", icon: PackageX },
              { label: "Motivo fit", value: "41%", icon: Users },
              { label: "Lojas", value: "18", icon: Store },
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
          </div>
        </Card>

        <Card className="glass-card rounded-lg p-6 border-primary/20 bg-primary/[0.025]">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary mb-4">
            USE AI Comercial
          </h3>
          <p className="text-sm leading-relaxed text-white/85">
            A maior devolução vem de modelagem em pantalonas tamanho M. Recomendação: revisar tabela
            de medidas e pausar reposição em 2 marketplaces.
          </p>
          <Button className="mt-5 w-full text-[10px] tracking-[0.14em]">
            Gerar plano de ação
          </Button>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-[2.5rem] p-10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tighter italic">
              {editingClient ? "Editar Cliente B2B" : "Prospecção de Novo Cliente"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Razão Social / Nome Fantasia
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: Luxury Boutique LTDA"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Pedidos (Total)
                </Label>
                <Input
                  type="number"
                  value={formData.orders}
                  onChange={(e) => setFormData({ ...formData, orders: e.target.value })}
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: 10"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Volume de Venda
                </Label>
                <Input
                  value={formData.total}
                  onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: R$ 50k"
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button
 variant="ghost"
 onClick={() => setIsDialogOpen(false)}
              className="text-[10px]"
            >
              Cancelar
            </Button>
            <Button
 onClick={handleSave}
 className="text-[10px]"
 >
              Salvar na Carteira
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
