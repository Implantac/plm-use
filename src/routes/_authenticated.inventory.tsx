import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Boxes, History, PackageSearch, ScanLine, ShieldCheck } from "lucide-react";

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
import { ConsumoPanel } from "@/components/inventory/ConsumoPanel";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

type InventoryItem = {
  id: number;
  ref: string;
  name: string;
  category: string;
  supplier: string;
  lot: string;
  stock: number;
  unit: string;
  reserved: number;
  min: number;
  internalColor: string;
  supplierColor: string;
  image: string;
  // Planejamento (BOM × Lotes em produção) — Onda 9.1
  consumoPrevisto: number; // o que a BOM ativa demanda
  consumoReal: number;     // o que de fato saiu para produção
};

const initialItems: InventoryItem[] = [
  {
    id: 1,
    ref: "TEC-001",
    name: "Linho Puro Off-White Amalfi",
    category: "Tecido",
    supplier: "Têxtil Amalfi",
    lot: "L-25-118",
    stock: 240,
    unit: "m",
    reserved: 188,
    min: 80,
    internalColor: "Off USE 01",
    supplierColor: "Natural 110",
    image:
      "https://images.unsplash.com/photo-1584184854125-5162423799b5?auto=format&fit=crop&q=80&w=240",
    consumoPrevisto: 180,
    consumoReal: 195,
  },
  {
    id: 2,
    ref: "AVI-042",
    name: "Botão Madre Pérola 12mm",
    category: "Aviamento",
    supplier: "Aviamentos Global",
    lot: "B-8791",
    stock: 12,
    unit: "un",
    reserved: 10,
    min: 120,
    internalColor: "Pearl",
    supplierColor: "Shell White",
    image:
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&q=80&w=240",
    consumoPrevisto: 1200,
    consumoReal: 1380,
  },
  {
    id: 3,
    ref: "TEC-008",
    name: "Seda Crepe Navy Blue",
    category: "Tecido",
    supplier: "Silk House",
    lot: "S-4408",
    stock: 85,
    unit: "m",
    reserved: 28,
    min: 60,
    internalColor: "Navy USE 07",
    supplierColor: "Blue 92",
    image:
      "https://images.unsplash.com/photo-1614728263952-84ea256f9679?auto=format&fit=crop&q=80&w=240",
    consumoPrevisto: 60,
    consumoReal: 58,
  },
  {
    id: 4,
    ref: "ETI-001",
    name: "Etiqueta Cetim Premium",
    category: "Etiqueta",
    supplier: "Label Co.",
    lot: "E-2510",
    stock: 450,
    unit: "un",
    reserved: 420,
    min: 600,
    internalColor: "Black",
    supplierColor: "Preto 01",
    image:
      "https://images.unsplash.com/photo-1626497741445-562f904bb3a1?auto=format&fit=crop&q=80&w=240",
    consumoPrevisto: 480,
    consumoReal: 432,
  },
];

function InventoryPage() {
  const [items, setItems] = useState(initialItems);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    ref: "",
    name: "",
    category: "",
    supplier: "",
    stock: "",
    lot: "",
  });

  const criticalItems = items.filter((item) => item.stock <= item.min);
  const totalReserved = items.reduce((sum, item) => sum + item.reserved, 0);

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        ref: item.ref,
        name: item.name,
        category: item.category,
        supplier: item.supplier,
        stock: String(item.stock),
        lot: item.lot,
      });
    } else {
      setEditingItem(null);
      setFormData({ ref: "", name: "", category: "", supplier: "", stock: "", lot: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingItem) {
      setItems(
        items.map((item) =>
          item.id === editingItem.id
            ? { ...item, ...formData, stock: Number(formData.stock) || item.stock }
            : item,
        ),
      );
      toast.success("Insumo atualizado");
    } else {
      setItems([
        {
          id: Date.now(),
          ...formData,
          stock: Number(formData.stock) || 0,
          unit: "un",
          reserved: 0,
          min: 20,
          internalColor: "A definir",
          supplierColor: "A definir",
          image:
            "https://images.unsplash.com/photo-1584184854125-5162423799b5?auto=format&fit=crop&q=80&w=240",
          consumoPrevisto: 0,
          consumoReal: 0,
        },
        ...items,
      ]);
      toast.success("Novo lote cadastrado");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setItems(items.filter((item) => item.id !== id));
    toast.error("Insumo removido");
  };

  return (
    <ModuleLayout
      title="Almoxarifado Inteligente"
      subtitle="Materiais, lotes, cores, fornecedores, reservas por OP e rastreabilidade total."
      version="Inventory v4.0"
      searchPlaceholder="Buscar insumo, lote, fornecedor ou cor"
      onAdd={() => handleOpenDialog()}
      metrics={[
        { label: "Insumos ativos", value: String(items.length), detail: "tecidos e aviamentos" },
        { label: "Críticos", value: String(criticalItems.length), detail: "abaixo do mínimo" },
        { label: "Reservado", value: String(totalReserved), detail: "para OPs abertas" },
        { label: "Rastreabilidade", value: "100%", detail: "por lote" },
      ]}
    >
      <div className="flex flex-wrap justify-end gap-3 mb-5">
        <Button
          variant="outline"
          className="rounded-md px-5 h-11 text-[10px] font-bold uppercase tracking-[0.16em] btn-outline-premium border-white/5 gap-2"
        >
          <ScanLine className="w-4 h-4" /> Escanear QR
        </Button>
        <Button
          variant="outline"
          className="rounded-md px-5 h-11 text-[10px] font-bold uppercase tracking-[0.16em] btn-outline-premium border-white/5 gap-2"
        >
          <History className="w-4 h-4" /> Histórico
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <Card className="glass-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left">
              <thead className="border-b border-white/5 bg-white/5">
                <tr>
                  {[
                    "Insumo",
                    "Lote",
                    "Fornecedor",
                    "Cores",
                    "Estoque",
                    "Reserva OP",
                    "Status",
                    "Ações",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-5 py-4 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {items.map((item) => {
                  const usage = Math.min(
                    Math.round((item.reserved / Math.max(item.stock, 1)) * 100),
                    100,
                  );
                  const critical = item.stock <= item.min;
                  return (
                    <tr key={item.id} className="group hover:bg-white/[0.025] transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-md border border-white/10 overflow-hidden">
                            <img
                              src={item.image}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                              {item.name}
                            </p>
                            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                              {item.ref} - {item.category}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs font-bold text-white">{item.lot}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{item.supplier}</td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          <p className="text-[10px] text-white">Interna: {item.internalColor}</p>
                          <p className="text-[10px] text-muted-foreground">
                            Fornecedor: {item.supplierColor}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-white">
                          {item.stock}
                          {item.unit}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          mín. {item.min}
                          {item.unit}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="min-w-32">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>
                              {item.reserved}
                              {item.unit}
                            </span>
                            <span>{usage}%</span>
                          </div>
                          <Progress value={usage} className="mt-2 h-1.5 bg-white/10" />
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${critical ? "bg-rose-400/10 text-rose-300" : "bg-emerald-300/10 text-emerald-300"}`}
                        >
                          {critical ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          {critical ? "Crítico" : "Regular"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <ModuleActionMenu
                          onEdit={() => handleOpenDialog(item)}
                          onDelete={() => handleDelete(item.id)}
                          onView={() => toast.info(`Rastreando lote ${item.lot}`)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="glass-card rounded-lg border-rose-300/20 bg-rose-300/[0.035]">
            <CardHeader className="p-5 border-b border-white/5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Rupturas previstas
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {criticalItems.map((item) => (
                <div key={item.id} className="rounded-md border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-bold text-white">{item.name}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-rose-300">
                    {item.stock}
                    {item.unit} disponível - mínimo {item.min}
                    {item.unit}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg">
            <CardContent className="p-5 space-y-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                <PackageSearch className="h-4 w-4" /> Rastreabilidade
              </p>
              {[
                "Entrada por NF-e",
                "Reserva OP-2501",
                "Baixa por corte",
                "Inspeção de qualidade",
              ].map((event) => (
                <div key={event} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  <p className="text-sm text-white/85">{event}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg">
            <CardContent className="p-5 grid grid-cols-2 gap-3">
              {["Tecidos", "Aviamentos", "Etiquetas", "Embalagens"].map((category) => (
                <div
                  key={category}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-4"
                >
                  <Boxes className="h-4 w-4 text-primary" />
                  <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                    {category}
                  </p>
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
              {editingItem ? "Editar insumo" : "Entrada de lote"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5">
            {[
              ["ref", "Referência", "TEC-001"],
              ["category", "Categoria", "Tecido"],
              ["name", "Nome", "Linho puro"],
              ["supplier", "Fornecedor", "Têxtil Amalfi"],
              ["stock", "Quantidade", "500"],
              ["lot", "Lote", "L-25-118"],
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
              Confirmar entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
