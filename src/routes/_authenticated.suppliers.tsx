import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Star,
  MapPin,
  Mail,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  PackageCheck,
  Clock,
  FileCheck2,
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

export const Route = createFileRoute("/_authenticated/suppliers")({
  component: SuppliersPage,
});

function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([
    {
      id: 1,
      name: "Têxtil Amalfi Ltda",
      type: "Tecidos",
      rating: 4.8,
      location: "SC, Brasil",
      status: "Premium",
      compliance: "98%",
      delivery: "95%",
      openOrders: 8,
      approvals: 3,
      eta: "2 dias",
    },
    {
      id: 2,
      name: "Aviamentos Global",
      type: "Insumos",
      rating: 4.5,
      location: "SP, Brasil",
      status: "Homologado",
      compliance: "92%",
      delivery: "88%",
      openOrders: 12,
      approvals: 5,
      eta: "5 dias",
    },
    {
      id: 3,
      name: "Seda & Cia",
      type: "Tecidos Finos",
      rating: 4.9,
      location: "PR, Brasil",
      status: "Premium",
      compliance: "100%",
      delivery: "97%",
      openOrders: 4,
      approvals: 1,
      eta: "1 dia",
    },
    {
      id: 4,
      name: "Botões do Sul",
      type: "Insumos",
      rating: 4.2,
      location: "RS, Brasil",
      status: "Em Análise",
      compliance: "85%",
      delivery: "82%",
      openOrders: 6,
      approvals: 4,
      eta: "8 dias",
    },
  ]);
  type Supplier = (typeof suppliers)[number];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    location: "",
    status: "Homologado",
  });

  const handleOpenDialog = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      setFormData({
        name: supplier.name,
        type: supplier.type,
        location: supplier.location,
        status: supplier.status,
      });
    } else {
      setEditingSupplier(null);
      setFormData({ name: "", type: "", location: "", status: "Homologado" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingSupplier) {
      setSuppliers(suppliers.map((s) => (s.id === editingSupplier.id ? { ...s, ...formData } : s)));
      toast.success("Fornecedor atualizado");
    } else {
      const newSup = {
        id: Date.now(),
        ...formData,
        rating: 5.0,
        compliance: "100%",
        delivery: "100%",
        openOrders: 0,
        approvals: 0,
        eta: "novo",
      };
      setSuppliers([newSup, ...suppliers]);
      toast.success("Novo fornecedor cadastrado");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setSuppliers(suppliers.filter((s) => s.id !== id));
    toast.error("Fornecedor removido");
  };

  return (
    <ModuleLayout
      title="Fornecedores"
      subtitle="Portal de fornecedores com pedidos, materiais, aprovações, entregas e score de compliance."
      version="Procurement v2.0"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar fornecedor, pedido, material ou aprovação"
      metrics={[
        { label: "Fornecedores", value: String(suppliers.length), detail: "ativos" },
        {
          label: "Pedidos abertos",
          value: String(suppliers.reduce((sum, sup) => sum + sup.openOrders, 0)),
          detail: "portal fornecedor",
        },
        {
          label: "Aprovações",
          value: String(suppliers.reduce((sum, sup) => sum + sup.approvals, 0)),
          detail: "pendentes",
        },
        { label: "OTIF médio", value: "91%", detail: "entrega no prazo" },
      ]}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {suppliers.map((sup) => (
          <Card
            key={sup.id}
            className="glass-card rounded-lg p-6 hover:border-primary/40 transition-all duration-500 group relative"
          >
            <div className="absolute top-5 right-5">
              <ModuleActionMenu
                onEdit={() => handleOpenDialog(sup)}
                onDelete={() => handleDelete(sup.id)}
                onView={() => toast.info(`Visualizando ${sup.name}`)}
              />
            </div>

            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                  <Users className="w-6 h-6 text-white/20 group-hover:text-primary transition-colors" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-bold text-white tracking-tight">{sup.name}</h3>
                    {sup.status === "Premium" && <ShieldCheck className="w-5 h-5 text-primary" />}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                    {sup.type}
                  </p>
                </div>
              </div>
              <div className="text-right pr-12">
                <div className="flex items-center gap-1 text-amber-400 mb-1">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-sm font-bold text-white">{sup.rating}</span>
                </div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                  {sup.status}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5 border-y border-white/5 py-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Local</span>
                </div>
                <p className="text-sm font-medium text-white">{sup.location}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    Compliance
                  </span>
                </div>
                <p className="text-sm font-medium text-emerald-400">{sup.compliance}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">OTIF</span>
                </div>
                <p className="text-sm font-medium text-emerald-400">{sup.delivery}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Canal</span>
                </div>
                <p className="text-sm font-medium text-white">comercial@...</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Pedidos", value: sup.openOrders, icon: PackageCheck },
                { label: "Aprovações", value: sup.approvals, icon: FileCheck2 },
                { label: "Próxima entrega", value: sup.eta, icon: Clock },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-md border border-white/10 bg-white/[0.035] p-3"
                >
                  <item.icon className="h-4 w-4 text-primary" />
                  <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    {item.label}
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <Button
                variant="ghost"
                className="flex-1 h-11 rounded-md border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-bold uppercase tracking-[0.14em] text-white"
              >
                Portal do fornecedor
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-md border border-white/5 bg-white/5 hover:bg-primary/10 hover:text-primary transition-all"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-[2.5rem] p-10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tighter italic">
              {editingSupplier ? "Editar Fornecedor" : "Novo Fornecedor"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Nome da Empresa
              </Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: Têxtil Brasil S.A."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Tipo de Insumo
                </Label>
                <Input
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: Tecidos"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Localização
                </Label>
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: SP, Brasil"
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
              Salvar Fornecedor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
