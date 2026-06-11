import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Landmark,
  FileText,
  ChevronRight,
  BarChart3,
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

export const Route = createFileRoute("/_authenticated/financial")({
  component: FinancialPage,
});

function FinancialPage() {
  const [financeStats] = useState([
    { label: "Receita Líquida", value: "R$ 942.500", change: "+14.2%", trend: "up" },
    { label: "Custo Mercadoria (CMV)", value: "R$ 342.100", change: "+2.4%", trend: "down" },
    { label: "Margem de Contribuição", value: "62.4%", change: "+3.8%", trend: "up" },
    { label: "EBITDA Projetado", value: "R$ 212k", change: "+8.5%", trend: "up" },
  ]);

  const [transactions, setTransactions] = useState([
    // Mock inicial com fonte (usado pelo BI de Marketing)
    // Em produção, virá do ERP financeiro.

    { id: 1, label: "Contas a Receber (B2B)", val: "R$ 342k", due: "15 dias", source: "vendas" },
    { id: 2, label: "Contas a Pagar (Suppliers)", val: "R$ 124k", due: "08 dias", source: "producao" },
    { id: 3, label: "Impostos/Fiscal", val: "R$ 42k", due: "02 dias", source: "outros" },
  ]);
  type Transaction = (typeof transactions)[number] & { source?: string };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [formData, setFormData] = useState({
    label: "",
    val: "",
    due: "",
    source: "marketing" as "marketing" | "vendas" | "producao" | "estoque" | "outros",
  });

  const handleOpenDialog = (transaction?: Transaction) => {
    if (transaction) {
      setEditingTransaction(transaction);
      setFormData({
        label: transaction.label,
        val: transaction.val,
        due: transaction.due,
        source: (transaction as any).source ?? "marketing",
      });
    } else {
      setEditingTransaction(null);
      setFormData({ label: "", val: "", due: "", source: "marketing" as any });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (editingTransaction) {
      setTransactions(
        transactions.map((t) => (t.id === editingTransaction.id ? { ...t, ...formData } : t)),
      );
      toast.success("Lançamento financeiro atualizado");
    } else {
      const newTrans = {
        id: Date.now(),
        ...formData,
      };

      // Normaliza payload legado caso o usuário não preencha fonte
      if (!newTrans.source) (newTrans as any).source = "marketing";
      setTransactions([newTrans, ...transactions]);
      toast.success("Nova transação registrada");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setTransactions(transactions.filter((t) => t.id !== id));
    toast.error("Lançamento removido");
  };

  return (
    <ModuleLayout
      title="Financeiro"
      subtitle="Apuração automática de custos, receitas, margens e rentabilidade por produto e coleção."
      version="CFO Dashboard v3.0"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar lançamento, coleção ou centro de custo"
      metrics={[
        { label: "Receitas", value: "R$ 942,5k", detail: "realizadas" },
        { label: "Custos", value: "R$ 342,1k", detail: "produto + produção" },
        { label: "Marketing", value: "R$ 84k", detail: "campanhas ativas" },
        { label: "Margem", value: "62,4%", detail: "contribuição" },
      ]}
    >
      <div className="flex justify-end gap-4 mb-8">
        <Button
          variant="outline"
          className="rounded-md px-5 h-11 text-[10px] font-bold uppercase tracking-[0.16em] btn-outline-premium border-white/5 gap-2"
        >
          <FileText className="w-4 h-4" /> DRE Gerencial
        </Button>
        <Button
          variant="outline"
          className="rounded-md px-5 h-11 text-[10px] font-bold uppercase tracking-[0.16em] btn-outline-premium border-white/5 gap-2"
        >
          <Wallet className="w-4 h-4" /> Conciliação
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        {financeStats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="glass-card rounded-[2rem] p-8 group hover:border-primary/40 transition-all duration-500">
              <CardHeader className="p-0 mb-4 flex flex-row items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground group-hover:text-primary transition-colors">
                  {stat.label}
                </p>
                <div className="p-2 rounded-2xl bg-white/5 border border-white/5 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                  <DollarSign className="w-4 h-4" />
                </div>
              </CardHeader>
              <div className="space-y-2">
                <p className="text-3xl font-bold text-white tracking-tighter">{stat.value}</p>
                <div className="flex items-center gap-2">
                  <div
                    className={`p-1 rounded-full ${stat.trend === "up" ? "bg-emerald-400/10 text-emerald-400" : "bg-rose-400/10 text-rose-400"}`}
                  >
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="w-3 h-3" />
                    ) : (
                      <ArrowDownRight className="w-3 h-3" />
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${stat.trend === "up" ? "text-emerald-400" : "text-rose-400"}`}
                  >
                    {stat.change}
                  </span>
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 glass-card rounded-[2.5rem] p-10 space-y-8">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
              <BarChart3 className="w-5 h-5 text-primary" /> Distribuição de Custos por Unidade
            </h3>
            <div className="flex gap-4">
              <span className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                <span className="w-2 h-2 rounded-full bg-primary" /> Matéria-Prima
              </span>
              <span className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Mão de Obra
              </span>
            </div>
          </div>
          <div className="h-75 flex items-end gap-6 relative overflow-hidden pt-10">
            <div className="absolute inset-0 bg-linear-to-t from-primary/5 to-transparent pointer-events-none" />
            {[45, 65, 35, 85, 55, 75, 95].map((h, i) => (
              <div key={i} className="flex-1 space-y-2 group cursor-pointer">
                <div className="relative w-full bg-white/5 rounded-t-xl overflow-hidden h-full flex flex-col justify-end">
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.1, duration: 1.5 }}
                    className="w-full bg-primary group-hover:bg-primary/80 transition-colors"
                  />
                </div>
                <p className="text-[8px] font-bold text-center text-muted-foreground uppercase tracking-widest">
                  Col {i + 1}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-8">
          <Card className="glass-card rounded-[2.5rem] p-10 space-y-8">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white mb-6">
              Ativos em Transação
            </h3>
            <div className="space-y-4">
              {transactions.map((item) => (
                <div
                  key={item.id}
                  className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all group relative"
                >
                  <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ModuleActionMenu
                      onEdit={() => handleOpenDialog(item)}
                      onDelete={() => handleDelete(item.id)}
                      onView={() => toast.info(`Detalhes da transação ${item.label}`)}
                    />
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white">
                      {item.label}
                    </p>
                    <p className="text-sm font-bold text-white">{item.val}</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-widest">
                      Vencimento em {item.due}
                    </p>
                    <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass-card rounded-[2.5rem] p-10 bg-linear-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Saúde Financeira
                </h3>
                <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-widest">
                  Excelente
                </p>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground font-light leading-relaxed italic lowercase">
              o fluxo de caixa projetado para o próximo trimestre indica uma reserva de capital 24%
              superior ao planejado.
            </p>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-[2.5rem] p-10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tighter italic">
              {editingTransaction ? "Editar Lançamento" : "Novo Lançamento Financeiro"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Título / Categoria
              </Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: Contas a Pagar Fornecedor"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Fonte
                </Label>
                <Input
                  value={formData.source}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      source: e.target.value as any,
                    })
                  }
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="marketing"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Valor
                </Label>
                <Input
                  value={formData.val}
                  onChange={(e) => setFormData({ ...formData, val: e.target.value })}
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: R$ 15.000"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                  Vencimento
                </Label>
                <Input
                  value={formData.due}
                  onChange={(e) => setFormData({ ...formData, due: e.target.value })}
                  className="bg-white/5 border-white/10 rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                  placeholder="Ex: 10 dias"
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
              Efetivar Lançamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
