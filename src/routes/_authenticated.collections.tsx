import { useEffect, useState } from "react";
import { onQuickAction } from "@/lib/nav/routes";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ArrowUpRight,
  CalendarClock,
  CircleDollarSign,
  Layers3,
  PackageCheck,
  PieChart,
  Target,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";

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
import { ModuleTabs } from "@/components/nav/ModuleTabs";
import { OptimizedImage } from "@/components/OptimizedImage";
import { CollectionROI } from "@/components/collections/CollectionROI";
import { CollectionPerformance } from "@/components/collections/CollectionPerformance";

export const Route = createFileRoute("/_authenticated/collections")({
  component: CollectionsPage,
});

type Collection = {
  id: number;
  name: string;
  season: string;
  year: number;
  brand: string;
  targetRevenue: string;
  targetSales: string;
  targetMargin: string;
  plannedQty: string;
  plannedMix: number;
  realizedMix: number;
  progress: number;
  roi: string;
  abc: string;
  status: string;
  image: string;
};

const initialCollections: Collection[] = [
  {
    id: 1,
    name: "Verão 25 - Amalfi",
    season: "Primavera / Verão",
    year: 2025,
    brand: "Premium Luxe",
    targetRevenue: "R$ 1,8 mi",
    targetSales: "24.000 peças",
    targetMargin: "68%",
    plannedQty: "186 refs",
    plannedMix: 186,
    realizedMix: 142,
    progress: 76,
    roi: "3.4x",
    abc: "A: 28% / B: 44% / C: 28%",
    status: "Produção",
    image:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=900",
  },
  {
    id: 2,
    name: "Urban Resort",
    season: "Alto Verão",
    year: 2025,
    brand: "Basic Chic",
    targetRevenue: "R$ 920 mil",
    targetSales: "16.500 peças",
    targetMargin: "61%",
    plannedQty: "92 refs",
    plannedMix: 92,
    realizedMix: 51,
    progress: 55,
    roi: "2.7x",
    abc: "A: 21% / B: 46% / C: 33%",
    status: "Desenvolvimento",
    image:
      "https://images.unsplash.com/photo-1539109136881-3be061694b9b?auto=format&fit=crop&q=80&w=900",
  },
  {
    id: 3,
    name: "Essentials Atemporal",
    season: "Continuativo",
    year: 2026,
    brand: "Core",
    targetRevenue: "R$ 640 mil",
    targetSales: "11.200 peças",
    targetMargin: "72%",
    plannedQty: "48 refs",
    plannedMix: 48,
    realizedMix: 18,
    progress: 38,
    roi: "4.1x",
    abc: "A: 35% / B: 40% / C: 25%",
    status: "Aprovação",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=900",
  },
];

function CollectionsPage() {
  const [collections, setCollections] = useState(initialCollections);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    season: "",
    brand: "",
    targetRevenue: "",
    targetSales: "",
    targetMargin: "",
    plannedQty: "",
  });

  const totals = collections.reduce(
    (acc, collection) => {
      acc.planned += collection.plannedMix;
      acc.realized += collection.realizedMix;
      return acc;
    },
    { planned: 0, realized: 0 },
  );

  const handleOpenDialog = (collection?: Collection) => {
    if (collection) {
      setEditingCollection(collection);
      setFormData({
        name: collection.name,
        season: collection.season,
        brand: collection.brand,
        targetRevenue: collection.targetRevenue,
        targetSales: collection.targetSales,
        targetMargin: collection.targetMargin,
        plannedQty: collection.plannedQty,
      });
    } else {
      setEditingCollection(null);
      setFormData({
        name: "",
        season: "Primavera / Verão",
        brand: "",
        targetRevenue: "",
        targetSales: "",
        targetMargin: "",
        plannedQty: "",
      });
    }
    setIsDialogOpen(true);
  };

  useEffect(() => onQuickAction("quick:new-collection", () => handleOpenDialog()), []);


  const handleSave = () => {
    if (editingCollection) {
      setCollections(
        collections.map((collection) =>
          collection.id === editingCollection.id ? { ...collection, ...formData } : collection,
        ),
      );
      toast.success("Coleção atualizada");
    } else {
      setCollections([
        {
          id: Date.now(),
          ...formData,
          year: 2026,
          plannedMix: Number.parseInt(formData.plannedQty, 10) || 0,
          realizedMix: 0,
          progress: 0,
          roi: "0.0x",
          abc: "A: 0% / B: 0% / C: 0%",
          status: "Planejamento",
          image:
            "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=900",
        },
        ...collections,
      ]);
      toast.success("Nova coleção criada");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setCollections(collections.filter((collection) => collection.id !== id));
    toast.error("Coleção removida");
  };

  return (
    <ModuleLayout
      title="Coleções"
      subtitle="Planeje metas financeiras, mix, margem, ciclo, ROI e curva ABC de cada coleção."
      version="Strategy v2.0"
      searchPlaceholder="Buscar coleção, marca ou temporada"
      onAdd={() => handleOpenDialog()}
      metrics={[
        { label: "Coleções ativas", value: String(collections.length), detail: "multi marca" },
        { label: "Mix planejado", value: String(totals.planned), detail: "referências" },
        { label: "Mix realizado", value: String(totals.realized), detail: "em ciclo" },
        { label: "Meta combinada", value: "R$ 3,36 mi", detail: "receita alvo" },
      ]}
    >
      <div className="mb-4"><ModuleTabs group="collections" /></div>
      <div className="mb-4 flex justify-end">
        <Button
 asChild
 variant="ghost"
 className="border text-[10px] tracking-[0.14em]"
 >
          <Link to="/collections/compare">
            <ArrowLeftRight className="mr-2 h-3.5 w-3.5" /> Comparar coleções
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          {collections.map((collection) => (
            <Card
              key={collection.id}
              className="glass-card rounded-lg overflow-hidden hover:border-primary/30 transition-colors"
            >
              <CardContent className="p-0">
                <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr]">
                  <div className="relative h-56 lg:h-full min-h-[220px]">
                    <OptimizedImage
                      src={collection.image}
                      alt={collection.name}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                    <span className="absolute left-4 top-4 rounded-md bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur">
                      {collection.status}
                    </span>
                  </div>

                  <div className="p-5 space-y-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                          {collection.brand} - {collection.season} {collection.year}
                        </p>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight text-white">
                          {collection.name}
                        </h2>
                      </div>
                      <ModuleActionMenu
                        onEdit={() => handleOpenDialog(collection)}
                        onDelete={() => handleDelete(collection.id)}
                        onView={() => toast.info(`Abrindo ${collection.name}`)}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        {
                          label: "Meta financeira",
                          value: collection.targetRevenue,
                          icon: CircleDollarSign,
                        },
                        { label: "Meta vendas", value: collection.targetSales, icon: Target },
                        { label: "Margem alvo", value: collection.targetMargin, icon: TrendingUp },
                        {
                          label: "Qtd. planejada",
                          value: collection.plannedQty,
                          icon: PackageCheck,
                        },
                      ].map((item) => (
                        <div
                          key={item.label}
                          className="rounded-md border border-white/10 bg-white/[0.035] p-3"
                        >
                          <div className="flex items-center gap-2 text-primary">
                            <item.icon className="h-3.5 w-3.5" />
                            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                              {item.label}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-bold text-white">{item.value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px_180px] gap-4 items-end">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          <span>Ciclo da coleção</span>
                          <span className="text-white">{collection.progress}%</span>
                        </div>
                        <Progress value={collection.progress} className="h-2 bg-white/10" />
                      </div>
                      <div className="rounded-md border border-white/10 bg-black/25 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          Curva ABC
                        </p>
                        <p className="mt-2 text-[11px] font-bold text-white">{collection.abc}</p>
                      </div>
                      <div className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3">
                        <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-emerald-300">
                          ROI coleção
                        </p>
                        <p className="mt-2 text-lg font-bold text-white">{collection.roi}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <CollectionPerformance collections={collections} />
          <Card className="glass-card rounded-lg">
            <CardHeader className="p-5 border-b border-white/5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Timeline visual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {[
                { label: "Pesquisa e tendências", icon: PieChart, done: true },
                { label: "Mix planejado", icon: Layers3, done: true },
                { label: "Desenvolvimento", icon: CalendarClock, done: true },
                { label: "Produção piloto", icon: PackageCheck, done: false },
                { label: "Lançamento comercial", icon: ArrowUpRight, done: false },
              ].map((step, index, arr) => (
                <div key={step.label} className="grid grid-cols-[32px_1fr] gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-md border ${step.done ? "border-primary/30 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-muted-foreground"}`}
                    >
                      <step.icon className="h-4 w-4" />
                    </div>
                    {index < arr.length - 1 && <div className="h-6 w-px bg-white/10" />}
                  </div>
                  <div className="pt-1">
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                      {step.label}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {step.done ? "concluído e versionado" : "aguardando aprovações"}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg border-primary/20 bg-primary/[0.025]">
            <CardContent className="p-5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                USE AI
              </p>
              <p className="text-sm leading-relaxed text-white/85">
                A coleção Verão 25 tem melhor potencial em camisaria premium. A IA recomenda
                realocar 12 refs da curva C para tops de linho.
              </p>
              <Button
 asChild
 className="w-full text-[10px] tracking-[0.14em]"
 >
                <Link to="/ai-center">Simular novo mix</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-lg p-6 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">
              {editingCollection ? "Editar coleção" : "Nova coleção"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5">
            {[
              ["name", "Nome da coleção", "Ex: Verão 26 - Resort"],
              ["season", "Temporada", "Ex: Primavera / Verão"],
              ["brand", "Marca", "Ex: Premium Luxe"],
              ["targetRevenue", "Meta financeira", "Ex: R$ 1,2 mi"],
              ["targetSales", "Meta de vendas", "Ex: 18.000 peças"],
              ["targetMargin", "Meta de margem", "Ex: 68%"],
              ["plannedQty", "Quantidade planejada", "Ex: 120 refs"],
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
              className="text-[10px]"
            >
              Cancelar
            </Button>
            <Button
 onClick={handleSave}
 className="text-[10px]"
 >
              Salvar coleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <CollectionROI />
    </ModuleLayout>
  );
}
