import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  FileDown,
  GitCompare,
  History,
  Layers,
  Link2,
  Scissors,
  Ruler,
  Paintbrush,
  Sparkles,
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
import { ReferenceTimeline } from "@/components/reference/ReferenceTimeline";
import { useReferenceStore } from "@/lib/reference/store";
import { emptyLifecycle } from "@/types/reference";
import { BomBopPanel } from "@/components/techsheet/BomBopPanel";
import { TechSheetVersions } from "@/components/techsheet/TechSheetVersions";
import { PreCostPanel } from "@/components/techsheet/PreCostPanel";
import { OperationSequencePanel } from "@/components/techsheet/OperationSequencePanel";


const techSheetSearchSchema = z.object({
  ref: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/tech-sheet")({
  validateSearch: techSheetSearchSchema,
  component: TechSheetPage,
});

function TechSheetPage() {
  const { ref: refFromPcp } = Route.useSearch();
  const [productInfo] = useState({
    ref: refFromPcp ?? "V24-001",
    name: "Blusa Linho Amalfi",
    category: "Feminino / Top",
    status: "Protótipo Aprovado",
    cost: "R$ 84,20",
  });

  const [materials, setMaterials] = useState([
    { id: 1, type: "Tecido", name: "Linho Puro Off-White", qty: "1.2m", cost: "R$ 42,00" },
    { id: 2, type: "Aviamento", name: "Botão Madre Pérola", qty: "4 un", cost: "R$ 12,00" },
    { id: 3, type: "Linha", name: "Linha Poliéster 120", qty: "200m", cost: "R$ 2,50" },
    { id: 4, type: "Embalagem", name: "Tag Luxury + Polybag", qty: "1 un", cost: "R$ 4,50" },
  ]);
  type Material = (typeof materials)[number];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({ name: "", type: "", qty: "", cost: "" });

  const handleOpenDialog = (material?: Material) => {
    if (material) {
      setEditingMaterial(material);
      setFormData({
        name: material.name,
        type: material.type,
        qty: material.qty,
        cost: material.cost,
      });
    } else {
      setEditingMaterial(null);
      setFormData({ name: "", type: "", qty: "", cost: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingMaterial) {
      setMaterials(materials.map((m) => (m.id === editingMaterial.id ? { ...m, ...formData } : m)));
      toast.success("Item da ficha técnica atualizado");
    } else {
      const newItem = {
        id: Date.now(),
        ...formData,
      };
      setMaterials([...materials, newItem]);
      toast.success("Novo material adicionado à ficha");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setMaterials(materials.filter((m) => m.id !== id));
    toast.error("Material removido da ficha");
  };

  return (
    <ModuleLayout
      title="Ficha Técnica"
      subtitle="Engenharia de produto com materiais, processos, custos, arquivos CAD, versões e inteligência de viabilidade."
      version="Documentation v4.2"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar ficha, material, processo ou arquivo"
      metrics={[
        { label: "Versão ativa", value: "v4.2", detail: "3 revisões" },
        { label: "Custo industrial", value: productInfo.cost, detail: "por peça" },
        { label: "Materiais", value: String(materials.length), detail: "sincronizados" },
        { label: "Fit comercial", value: "87%", detail: "previsão IA" },
      ]}
    >
      {refFromPcp && (
        <div className="mb-6 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.18em] text-primary flex items-center gap-2">
            <Link2 className="h-3.5 w-3.5" /> Aberto a partir do PCP · referência{" "}
            <span className="font-bold text-white">{refFromPcp}</span>
          </p>
        </div>
      )}

      <div className="flex justify-end gap-4 mb-8">
        <Button
 variant="outline"
 className="text-[10px] tracking-[0.16em] gap-2"
 >
          <History className="w-4 h-4" /> Histórico
        </Button>
        <Button
 variant="outline"
 className="text-[10px] tracking-[0.16em] gap-2"
 >
          <GitCompare className="w-4 h-4" /> Comparar Versões
        </Button>
        <Button
 variant="outline"
 className="text-[10px] tracking-[0.16em] gap-2"
 >
          <FileDown className="w-4 h-4" /> Exportar PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass-card rounded-lg p-6 space-y-8">
          <div className="flex justify-between items-start border-b border-white/5 pb-8">
            <div className="flex gap-8">
              <div className="w-48 h-64 rounded-lg bg-white/5 border border-white/5 overflow-hidden relative group">
                <img
                  src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=600"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  alt={productInfo.name}
                />
                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div className="space-y-4 pt-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">
                  {productInfo.ref}
                </span>
                <h2 className="text-3xl font-bold text-white tracking-tight">{productInfo.name}</h2>
                <p className="text-xs text-muted-foreground uppercase tracking-widest">
                  {productInfo.category}
                </p>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                    {productInfo.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                Custo Industrial
              </p>
              <p className="text-3xl font-bold text-white tracking-tighter">{productInfo.cost}</p>
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
                <Layers className="w-4 h-4 text-primary" /> Materiais e Insumos (Integração Estoque)
              </h3>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                  Sincronizado com ERP
                </span>
              </div>
            </div>
            <div className="rounded-lg border border-white/5 bg-white/[0.02] overflow-hidden">
              <table className="w-full text-left">
                <thead className="border-b border-white/5 bg-white/5">
                  <tr>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      Tipo
                    </th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      Material
                    </th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      Consumo
                    </th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
                      Custo Unit.
                    </th>
                    <th className="px-6 py-4 text-[9px] font-bold uppercase tracking-widest text-muted-foreground text-right">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {materials.map((m) => (
                    <tr key={m.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 text-[10px] font-bold uppercase text-primary/70">
                        {m.type}
                      </td>
                      <td className="px-6 py-4 text-[11px] font-medium text-white">{m.name}</td>
                      <td className="px-6 py-4 text-[11px] text-muted-foreground">{m.qty}</td>
                      <td className="px-6 py-4 text-[11px] text-muted-foreground">{m.cost}</td>
                      <td className="px-6 py-4 text-right">
                        <ModuleActionMenu
                          onEdit={() => handleOpenDialog(m)}
                          onDelete={() => handleDelete(m.id)}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-5 rounded-lg bg-primary/5 border border-primary/20 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary">
                  Inteligência Comercial (Previsão de Viabilidade)
                </h4>
                <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[8px] font-bold uppercase">
                  Probabilidade de Sucesso: 87%
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed italic">
                Baseado no histórico de vendas da categoria "Feminino / Top" e na curva ABC da
                última coleção, este produto apresenta alto fit comercial.
                <span className="text-white font-bold ml-1">
                  Sugestão: Produzir 1.200 peças para o lançamento inicial.
                </span>
              </p>
            </div>
          </div>
        </Card>

        <div className="space-y-8">
          <Card className="glass-card rounded-lg p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
                <History className="w-4 h-4 text-primary" /> Linha do Tempo do Produto
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              <TimelineDoProduto refAtual={productInfo.ref} nome={productInfo.name} />
            </div>
          </Card>

          <Card className="glass-card rounded-lg p-6">
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
                <Scissors className="w-4 h-4 text-primary" /> Processos Operacionais
              </CardTitle>
            </CardHeader>
            <div className="space-y-4">
              {[
                { label: "Corte Industrial", time: "12 min", cost: "R$ 4,50" },
                { label: "Costura Reta/Overloque", time: "45 min", cost: "R$ 18,00" },
                { label: "Passadoria", time: "08 min", cost: "R$ 3,20" },
                { label: "Expedição/QC", time: "05 min", cost: "R$ 2,00" },
              ].map((proc, i) => (
                <div
                  key={i}
                  className="flex justify-between items-center p-4 rounded-md bg-white/5 border border-white/5 hover:border-primary/30 transition-all cursor-pointer group"
                >
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white">
                      {proc.label}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase">{proc.time}</p>
                  </div>
                  <p className="text-[11px] font-bold text-primary group-hover:scale-110 transition-transform">
                    {proc.cost}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass-card rounded-lg p-6 border-primary/20 bg-primary/[0.02]">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-6">
              Ações Rápidas
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <Button
 variant="ghost"
 className="h-20 flex flex-col gap-2 border bg-white/5 hover:bg-white/10 text-[9px] tracking-[0.16em] text-white"
 >
                <Ruler className="w-5 h-5" /> Tabela Medidas
              </Button>
              <Button
 variant="ghost"
 className="h-20 flex flex-col gap-2 border bg-white/5 hover:bg-white/10 text-[9px] tracking-[0.16em] text-white"
 >
                <Paintbrush className="w-5 h-5" /> Variantes
              </Button>
            </div>
          </Card>

          <Card className="glass-card rounded-lg p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5 flex items-center gap-3">
              <FileDown className="w-4 h-4 text-primary" /> Arquivos técnicos
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {["PDF", "AI", "CDR", "DXF", "PLT", "SVG"].map((format) => (
                <div
                  key={format}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-3 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-white"
                >
                  {format}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md border border-primary/20 bg-primary/10 p-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" /> IA de ficha técnica
              </p>
              <p className="mt-2 text-sm text-white/80">
                Gerar ficha inicial, validar consumo e apontar divergências entre versões.
              </p>
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <BomBopPanel refAtual={productInfo.ref} />
        <PreCostPanel refAtual={productInfo.ref} />
        <OperationSequencePanel refAtual={productInfo.ref} />
        <TechSheetVersions refAtual={productInfo.ref} />

      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-lg p-6 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tighter italic">
              {editingMaterial ? "Editar Item" : "Adicionar Material"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Tipo
                </Label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: Tecido"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Consumo
                </Label>
                <Input
                  value={formData.qty}
                  onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                  className="rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: 1.5m"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Nome do Material
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: Algodão Pima"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Custo Unitário
              </Label>
              <Input
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                className="rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: R$ 35,00"
              />
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
              Salvar na Ficha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}

function TimelineDoProduto({ refAtual, nome }: { refAtual: string; nome: string }) {
  const lifecycles = useReferenceStore((s) => s.lifecycles);
  const lc =
    lifecycles.find((l) => l.ref === refAtual) ??
    emptyLifecycle(refAtual, nome);
  return <ReferenceTimeline lifecycle={lc} compact />;
}
