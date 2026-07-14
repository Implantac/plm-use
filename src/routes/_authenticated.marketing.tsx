import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Megaphone,
  Camera,
  TrendingUp,
  Instagram,
  PlayCircle,
  BarChart3,
  Users,
  Image,
  Video,
  MousePointerClick,
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

export const Route = createFileRoute("/_authenticated/marketing")({
  component: MarketingPage,
});

function MarketingPage() {
  const [campaigns, setCampaigns] = useState([
    {
      id: 1,
      name: "Verão 25: Amalfi Launch",
      product: "Coleção Verão 25",
      channel: "Meta Ads",
      reach: "1.2M",
      spend: "R$ 45k",
      sales: "R$ 210k",
      roas: "4.6x",
      status: "Ativa",
      creative: "Fotos + Reels",
      cost: "R$ 18k",
    },
    {
      id: 2,
      name: "Influencers: Camisa Premium",
      product: "Ref. FT-V25-044",
      channel: "Instagram",
      reach: "850k",
      spend: "R$ 12k",
      sales: "R$ 98k",
      roas: "8.1x",
      status: "Ativa",
      creative: "Influenciadores",
      cost: "R$ 32k",
    },
    {
      id: 3,
      name: "Google: Blusa Linho",
      product: "Ref. FT-V25-018",
      channel: "Google Ads",
      reach: "420k",
      spend: "R$ 8k",
      sales: "R$ 15k",
      roas: "1.8x",
      status: "Atenção",
      creative: "Catálogo",
      cost: "R$ 6k",
    },
  ]);
  type Campaign = (typeof campaigns)[number];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [formData, setFormData] = useState({ name: "", channel: "", status: "Planejada" });

  const handleOpenDialog = (campaign?: Campaign) => {
    if (campaign) {
      setEditingCampaign(campaign);
      setFormData({ name: campaign.name, channel: campaign.channel, status: campaign.status });
    } else {
      setEditingCampaign(null);
      setFormData({ name: "", channel: "", status: "Planejada" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingCampaign) {
      setCampaigns(campaigns.map((c) => (c.id === editingCampaign.id ? { ...c, ...formData } : c)));
      toast.success("Campanha atualizada");
    } else {
      const newCamp = {
        id: Date.now(),
        ...formData,
        product: "Ref. ---",
        reach: "0",
        spend: "R$ 0",
        sales: "R$ 0",
        roas: "0.0x",
        creative: "A definir",
        cost: "R$ 0",
      };
      setCampaigns([newCamp, ...campaigns]);
      toast.success("Nova campanha planejada");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setCampaigns(campaigns.filter((c) => c.id !== id));
    toast.error("Campanha removida");
  };

  return (
    <ModuleLayout
      title="Marketing de Moda"
      subtitle="Gestão por produto e coleção: fotos, vídeos, catálogos, influenciadores, mídia paga, custos e ROAS."
      version="Growth v3.0"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar campanha, produto, coleção ou canal"
      metrics={[
        { label: "Campanhas", value: String(campaigns.length), detail: "ativas e planejadas" },
        { label: "Investimento", value: "R$ 65k", detail: "mídia paga" },
        { label: "Produção", value: "R$ 56k", detail: "foto, vídeo, modelos" },
        { label: "ROAS médio", value: "4.8x", detail: "Meta + Google + TikTok" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center mb-4 px-4">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-primary" /> Performance por Produto e Coleção
            </h3>
            <Button
 variant="ghost"
 className="text-[10px] text-primary hover:bg-primary/10"
 >
              Ver Relatório Completo
            </Button>
          </div>

          <div className="space-y-4">
            {campaigns.map((camp) => (
              <Card
                key={camp.id}
                className="glass-card rounded-lg p-5 hover:border-primary/40 transition-all group relative"
              >
                <div className="absolute top-5 right-5">
                  <ModuleActionMenu
                    onEdit={() => handleOpenDialog(camp)}
                    onDelete={() => handleDelete(camp.id)}
                    onView={() => toast.info(`Relatório de ${camp.name}`)}
                  />
                </div>

                <div className="flex flex-col xl:flex-row xl:items-center gap-5">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 rounded-md bg-primary/10 border border-primary/20 text-primary group-hover:scale-110 transition-transform">
                      <Megaphone className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-white tracking-tight">{camp.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
                          {camp.channel}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-white/10" />
                        <span className="text-[10px] text-primary font-bold uppercase tracking-widest">
                          {camp.product}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 xl:pr-12">
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Criativo
                      </p>
                      <p className="text-sm font-bold text-white">{camp.creative}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Produção
                      </p>
                      <p className="text-sm font-bold text-white">{camp.cost}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Investimento
                      </p>
                      <p className="text-sm font-bold text-white">{camp.spend}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Vendas
                      </p>
                      <p className="text-sm font-bold text-white">{camp.sales}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        ROAS
                      </p>
                      <p
                        className={`text-sm font-bold ${parseFloat(camp.roas) > 3 ? "text-emerald-400" : "text-rose-400"}`}
                      >
                        {camp.roas}
                      </p>
                    </div>
                    <div className="text-right w-24">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                        Status
                      </p>
                      <p className="text-sm font-bold text-primary">{camp.status}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <Card className="glass-card rounded-lg p-6 border-primary/20 bg-primary/[0.02]">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-8">
              Ecosystem Sync
            </h3>
            <div className="space-y-6">
              {[
                {
                  label: "Meta Business Hub",
                  status: "Conectado",
                  icon: <Instagram className="w-4 h-4" />,
                },
                {
                  label: "TikTok Ads Manager",
                  status: "Sync Pendente",
                  icon: <PlayCircle className="w-4 h-4" />,
                },
                {
                  label: "Google Analytics 4",
                  status: "Conectado",
                  icon: <BarChart3 className="w-4 h-4" />,
                },
              ].map((sync, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-md bg-black/20 border border-white/5"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-muted-foreground">{sync.icon}</div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white">
                      {sync.label}
                    </p>
                  </div>
                  <span
                    className={`text-[8px] font-bold uppercase tracking-widest ${sync.status === "Conectado" ? "text-emerald-400" : "text-amber-400"}`}
                  >
                    {sync.status}
                  </span>
                </div>
              ))}
            </div>
            <Button className="w-full mt-8 text-[10px] tracking-[0.16em]">
              Gerenciar Conexões
            </Button>
          </Card>

          <Card className="glass-card rounded-lg p-6 overflow-hidden relative">
            <div className="absolute top-0 right-0 p-4">
              <Users className="w-12 h-12 text-white/5" />
            </div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white mb-6">
              Rede de Influenciadores
            </h3>
            <div className="flex -space-x-3 mb-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full border-2 border-background bg-white/5 overflow-hidden"
                >
                  <img src={`https://i.pravatar.cc/150?u=${i}`} alt="user" />
                </div>
              ))}
              <div className="w-12 h-12 rounded-full border-2 border-background bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                +12
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-light leading-relaxed italic">
              selecionamos 12 novos perfis com alto fit para a cápsula verão 24 baseados em
              engajamento real.
            </p>
          </Card>

          <Card className="glass-card rounded-lg p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">
              Biblioteca de ativos
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Fotos", value: "248", icon: Image },
                { label: "Vídeos", value: "54", icon: Video },
                { label: "Catálogos", value: "8", icon: Camera },
                { label: "Cliques", value: "42k", icon: MousePointerClick },
              ].map((asset) => (
                <div
                  key={asset.label}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-4"
                >
                  <asset.icon className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {asset.label}
                  </p>
                  <p className="mt-1 text-lg font-bold text-white">{asset.value}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-[2.5rem] p-10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tighter italic">
              {editingCampaign ? "Editar Campanha" : "Nova Campanha"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Nome da Campanha
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: Lançamento Outono Chic"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Canal de Veiculação
              </Label>
              <Input
                value={formData.channel}
                onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: Meta Ads, Influencers..."
              />
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
 className="text-[10px]"
 >
              Salvar Campanha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
