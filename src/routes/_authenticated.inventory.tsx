import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AlertTriangle, Boxes, GitBranch, History, PackageSearch, ArrowRightLeft, ShieldCheck, RefreshCw } from "lucide-react";
import { useEntityDrawer } from "@/components/entity/EntityContext";

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
import { AbcCoveragePanel } from "@/components/inventory/AbcCoveragePanel";
import { MovementDialog } from "@/components/inventory/MovementDialog";
import { ReservationDialog } from "@/components/inventory/ReservationDialog";
import { ReservationsPanel } from "@/components/inventory/ReservationsPanel";
import { useStockItems, type StockItem } from "@/hooks/use-stock";
import { supabase } from "@/integrations/supabase/client";
import { runAbcClassification, upsertStockItem } from "@/lib/inventory/inventory.functions";

export const Route = createFileRoute("/_authenticated/inventory")({
  component: InventoryPage,
});

const abcColors: Record<string, string> = {
  A: "bg-amber-300/10 text-amber-300 border-amber-300/20",
  B: "bg-sky-300/10 text-sky-300 border-sky-300/20",
  C: "bg-slate-300/10 text-slate-300 border-slate-300/20",
};

const emptyForm = {
  code: "",
  name: "",
  category: "insumo",
  unit: "un",
  lead_time_days: "0",
  demand_avg_daily: "0",
  demand_stddev: "0",
  service_factor: "1.65",
  annual_qty: "0",
  annual_revenue: "0",
  unit_price: "0",
  order_cost: "0",
  holding_cost_unit: "0",
};

function InventoryPage() {
  const { items, balances, loading, refetch } = useStockItems();
  const { openEntity } = useEntityDrawer();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMoveOpen, setIsMoveOpen] = useState(false);
  const [isResOpen, setIsResOpen] = useState(false);
  const [moveItemId, setMoveItemId] = useState<string | undefined>();
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState(emptyForm);
  const [busy, setBusy] = useState(false);

  const criticalItems = useMemo(
    () =>
      items.filter((it) => {
        const onHand = Number(balances[it.id]?.qty_on_hand ?? 0);
        return it.reorder_point > 0 && onHand <= it.reorder_point;
      }),
    [items, balances],
  );

  const totalReserved = useMemo(
    () => Object.values(balances).reduce((sum, b) => sum + Number(b.qty_reserved ?? 0), 0),
    [balances],
  );

  const handleOpenDialog = (item?: StockItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        code: item.code,
        name: item.name,
        category: item.category,
        unit: item.unit,
        lead_time_days: String(item.lead_time_days),
        demand_avg_daily: String(item.demand_avg_daily),
        demand_stddev: String(item.demand_stddev),
        service_factor: String(item.service_factor),
        annual_qty: String(item.annual_qty),
        annual_revenue: String(item.annual_revenue),
        unit_price: String(item.unit_price),
        order_cost: String((item as unknown as { order_cost?: number }).order_cost ?? 0),
        holding_cost_unit: String((item as unknown as { holding_cost_unit?: number }).holding_cost_unit ?? 0),
      });
    } else {
      setEditingItem(null);
      setFormData(emptyForm);
    }
    setIsDialogOpen(true);
  };

  const handleOpenMove = (item?: StockItem) => {
    setMoveItemId(item?.id);
    setIsMoveOpen(true);
  };

  const handleSave = async () => {
    setBusy(true);
    const res = await upsertStockItem({
      data: {
        ...(editingItem ? { id: editingItem.id } : {}),
        code: formData.code.trim(),
        name: formData.name.trim(),
        category: formData.category as "tecido" | "aviamento" | "embalagem" | "acabado" | "insumo" | "etiqueta",
        unit: formData.unit || "un",
        lead_time_days: Math.max(0, Math.round(Number(formData.lead_time_days) || 0)),
        demand_avg_daily: Number(formData.demand_avg_daily) || 0,
        demand_stddev: Number(formData.demand_stddev) || 0,
        service_factor: Number(formData.service_factor) || 1.65,
        annual_qty: Number(formData.annual_qty) || 0,
        annual_revenue: Number(formData.annual_revenue) || 0,
        unit_price: Number(formData.unit_price) || 0,
        order_cost: Number(formData.order_cost) || 0,
        holding_cost_unit: Number(formData.holding_cost_unit) || 0,
        is_active: true,
      },
    });
    setBusy(false);
    if (!res.ok) return toast.error(res.reason);
    toast.success(editingItem ? "Insumo atualizado" : "Insumo cadastrado");
    setIsDialogOpen(false);
    void refetch();
  };


  const handleToggleActive = async (item: StockItem) => {
    const { error } = await supabase
      .from("stock_item" as never)
      .update({ is_active: !item.is_active } as never)
      .eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success(item.is_active ? "Insumo inativado" : "Insumo reativado");
    void refetch();
  };

  const handleClassifyAbc = async () => {
    setBusy(true);
    const result = await runAbcClassification();
    setBusy(false);
    if (!result.ok) return toast.error(result.reason);
    toast.success("Curva ABC recalculada");
    void refetch();
  };

  return (
    <ModuleLayout
      title="Almoxarifado Inteligente"
      subtitle="Curva ABC, LEC, ponto do pedido e rastreabilidade por lote."
      version="Inventory v5.0"
      searchPlaceholder="Buscar insumo, código ou fornecedor"
      onAdd={() => handleOpenDialog()}
      metrics={[
        { label: "Insumos ativos", value: String(items.filter((i) => i.is_active).length), detail: `de ${items.length} cadastrados` },
        { label: "Abaixo do PP", value: String(criticalItems.length), detail: "reposição sugerida" },
        { label: "Reservado", value: totalReserved.toFixed(0), detail: "em OPs abertas" },
        { label: "Rastreabilidade", value: "100%", detail: "por lote" },
      ]}
    >
      <div className="flex flex-wrap justify-end gap-3 mb-5">
        <Button
          variant="outline"
          onClick={handleClassifyAbc}
          disabled={busy}
          className="rounded-md px-5 h-11 text-[10px] font-bold uppercase tracking-[0.16em] btn-outline-premium border-white/5 gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Classificar ABC
        </Button>
        <Button
          variant="outline"
          onClick={() => handleOpenMove()}
          className="rounded-md px-5 h-11 text-[10px] font-bold uppercase tracking-[0.16em] btn-outline-premium border-white/5 gap-2"
        >
          <ArrowRightLeft className="w-4 h-4" /> Movimentação
        </Button>
        <Button
          variant="outline"
          onClick={() => setIsResOpen(true)}
          className="rounded-md px-5 h-11 text-[10px] font-bold uppercase tracking-[0.16em] btn-outline-premium border-white/5 gap-2"
        >
          <History className="w-4 h-4" /> Reservar
        </Button>
      </div>

      {criticalItems.length > 0 && (
        <Card className="glass-card rounded-lg border border-rose-400/30 bg-rose-500/[0.06] mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-rose-200">
              <AlertTriangle className="h-4 w-4" />
              {criticalItems.length} insumo{criticalItems.length > 1 ? "s" : ""} abaixo do ponto do pedido
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {criticalItems.slice(0, 6).map((it) => {
                const onHand = Number(balances[it.id]?.qty_on_hand ?? 0);
                const belowSafety = onHand <= it.safety_stock && it.safety_stock > 0;
                return (
                  <button
                    key={it.id}
                    onClick={() => handleOpenDialog(it)}
                    className={`text-left rounded-md border p-3 transition-colors ${belowSafety ? "border-rose-400/50 bg-rose-500/10 hover:bg-rose-500/15" : "border-amber-300/30 bg-amber-300/[0.05] hover:bg-amber-300/[0.09]"}`}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                      {it.code} · {belowSafety ? "Crítico" : "Repor"}
                    </p>
                    <p className="mt-1 text-sm font-bold text-white truncate">{it.name}</p>
                    <p className="mt-1 text-[11px] text-white/80">
                      Saldo {onHand.toFixed(0)}{it.unit} · PP {Number(it.reorder_point).toFixed(0)}{it.unit}
                    </p>
                  </button>
                );
              })}
            </div>
            {criticalItems.length > 6 && (
              <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                +{criticalItems.length - 6} outros itens abaixo do PP na tabela
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <Card className="glass-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1080px] text-left">
              <thead className="border-b border-white/5 bg-white/5">
                <tr>
                  {[
                    "Insumo",
                    "ABC",
                    "Saldo",
                    "PP / SS",
                    "LEC",
                    "Cobertura",
                    "Reserva",
                    "Status",
                    "Ações",
                  ].map((heading) => (
                    <th
                      key={heading}
                      className="px-4 py-4 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
                    >
                      {heading}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-xs text-muted-foreground">
                      Carregando estoque...
                    </td>
                  </tr>
                )}
                {!loading && items.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-10 text-center text-xs text-muted-foreground">
                      Nenhum insumo cadastrado.
                    </td>
                  </tr>
                )}
                {items.map((item) => {
                  const bal = balances[item.id];
                  const onHand = Number(bal?.qty_on_hand ?? 0);
                  const reserved = Number(bal?.qty_reserved ?? 0);
                  const critical = item.reorder_point > 0 && onHand <= item.reorder_point;
                  const coverage =
                    item.demand_avg_daily > 0 ? Math.floor(onHand / item.demand_avg_daily) : null;
                  const usage = Math.min(
                    Math.round((reserved / Math.max(onHand, 1)) * 100),
                    100,
                  );
                  return (
                    <tr key={item.id} className="group hover:bg-white/[0.025] transition-colors">
                      <td className="px-4 py-4">
                        <p className="text-sm font-bold text-white group-hover:text-primary transition-colors">
                          {item.name}
                        </p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                          {item.code} - {item.category}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        {item.abc_class ? (
                          <span
                            className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${abcColors[item.abc_class]}`}
                          >
                            {item.abc_class}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-sm font-bold text-white">
                          {onHand.toFixed(0)}
                          {item.unit}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-white">
                          {Number(item.reorder_point).toFixed(0)}
                          {item.unit}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          seg. {Number(item.safety_stock).toFixed(0)}
                          {item.unit}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-xs text-white">
                        {Number(item.eoq).toFixed(0)}
                        {item.unit}
                      </td>
                      <td className="px-4 py-4">
                        {coverage !== null ? (
                          <p className={`text-xs font-bold ${coverage < item.coverage_days_min ? "text-rose-300" : "text-white"}`}>
                            {coverage} dias
                          </p>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="min-w-24">
                          <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>
                              {reserved.toFixed(0)}
                              {item.unit}
                            </span>
                            <span>{usage}%</span>
                          </div>
                          <Progress value={usage} className="mt-2 h-1.5 bg-white/10" />
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${critical ? "bg-rose-400/10 text-rose-300" : "bg-emerald-300/10 text-emerald-300"}`}
                        >
                          {critical ? (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          ) : (
                            <ShieldCheck className="h-3.5 w-3.5" />
                          )}
                          {critical ? "Repor" : "Regular"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                            title="Abrir na trilha"
                            onClick={() =>
                              openEntity({
                                type: "stock_item",
                                id: item.id,
                                title: item.name,
                                subtitle: `${item.code} · ${item.category}`,
                              })
                            }
                          >
                            <GitBranch className="h-3.5 w-3.5" />
                          </Button>
                          <ModuleActionMenu
                            onEdit={() => handleOpenDialog(item)}
                            onDelete={() => handleToggleActive(item)}
                            onView={() => handleOpenMove(item)}
                          />
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <AbcCoveragePanel items={items} balances={balances} />
          <ReservationsPanel items={items} />



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
              {(["tecido", "aviamento", "etiqueta", "embalagem"] as const).map((cat) => {
                const count = items.filter((i) => i.category === cat).length;
                return (
                  <div
                    key={cat}
                    className="rounded-md border border-white/10 bg-white/[0.035] p-4"
                  >
                    <Boxes className="h-4 w-4 text-primary" />
                    <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white">
                      {cat}
                    </p>
                    <p className="mt-1 text-[10px] text-muted-foreground">{count} itens</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-lg p-6 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">
              {editingItem ? "Editar insumo" : "Cadastrar insumo"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-5">
            {[
              ["code", "Código", "CM-001"],
              ["name", "Nome", "Camiseta Manga Curta"],
              ["category", "Categoria", "insumo | tecido | acabado"],
              ["unit", "Unidade", "un | m | kg"],
              ["lead_time_days", "Lead time (dias)", "12"],
              ["demand_avg_daily", "Demanda média/dia", "845.4"],
              ["demand_stddev", "Desvio padrão", "132.6"],
              ["service_factor", "Fator serviço (1.65=95%)", "1.65"],
              ["annual_qty", "Qtd. anual", "525315"],
              ["annual_revenue", "Faturamento anual R$", "28839793.50"],
              ["unit_price", "Preço unitário R$", "54.90"],
              ["order_cost", "Custo do pedido R$ (S)", "12.88"],
              ["holding_cost_unit", "Custo manutenção un/ano R$ (H)", "8.52"],
            ].map(([key, label, placeholder]) => (
              <div key={key} className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {label}
                </Label>
                <Input
                  value={formData[key as keyof typeof formData]}
                  onChange={(event) =>
                    setFormData({ ...formData, [key]: event.target.value })
                  }
                  className="bg-white/5 border-white/10 rounded-md h-11 focus:border-primary/40 focus:ring-0"
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground -mt-2">
            Estoque de segurança, ponto do pedido e LEC são recalculados automaticamente.
          </p>
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
              disabled={busy}
              className="rounded-md h-10 px-6 text-[10px] font-bold uppercase tracking-widest btn-primary-premium"
            >
              {editingItem ? "Salvar" : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MovementDialog
        open={isMoveOpen}
        onOpenChange={setIsMoveOpen}
        items={items}
        preselectItemId={moveItemId}
        onDone={() => void refetch()}
      />
      <ReservationDialog
        open={isResOpen}
        onOpenChange={setIsResOpen}
        items={items}
        onDone={() => void refetch()}
      />
    </ModuleLayout>
  );
}

