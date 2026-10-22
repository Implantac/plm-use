// Detalhe do pedido: itens, grade, opções, ficha do pedido e custo.
//
// Regra de ouro herdada do resto do app: a tela ESPELHA o que o banco garante.
// O botão "Enviar para custo" chama submit_sales_order() — as validações
// (produto validado, mínimo, grade = quantidade, preço) rodam no Postgres e a
// mensagem de erro dele é o que o usuário lê.
import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  Clock,
  Factory,
  Layers,
  Plus,
  Ruler,
  FileText,
  Pencil,
  Send,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TechnicalSheetDialog } from "./TechnicalSheetDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  addMaterial,
  addOperation,
  addItem,
  approveItem,
  deleteItem,
  getOrder,
  isMissingTable,
  listCatalog,
  listCosts,
  listItems,
  listOperations,
  listOrderEvents,
  listMaterials,
  MIGRATION_HINT,
  recalcItem,
  releaseToPcp,
  submitOrder,
  updateOperation,
  updateMaterial,
  deleteMaterial,
  deleteOperation,
} from "@/lib/sales/api";
import { StockItemSelect } from "@/components/sales/StockItemSelect";
import { computeItemCost, marginPct, priceForMargin, round2 } from "@/lib/sales/cost";
import {
  brl,
  ITEM_COST_STATUS,
  ORDER_STATUS,
  sumSizes,
  type CatalogProduct,
  type ItemCost,
  type MaterialLine,
  type OperationLine,
  type OrderEvent,
  type SalesOrder,
  type SalesOrderItem,
} from "@/lib/sales/types";

type Props = {
  orderId: string;
  canSell: boolean;
  canCost: boolean;
  canPlan: boolean;
  onClose: () => void;
};

type ItemSheet = { materials: MaterialLine[]; operations: OperationLine[] };
type OpEditPatch = { id: string; driverQty: number; unitCost: number; setupCost: number };
type MatEditPatch = {
  id: string;
  consumption: number;
  wastePct: number;
  unitCost: number;
  stockItemId?: string | null;
};
type AddOpFields = {
  sector: string;
  operation: string;
  driver: OperationLine["driver"];
  driverQty: number;
  unitCost: number;
  setupCost: number;
  outsourced?: boolean;
};
type AddMatFields = {
  kind: string;
  material: string;
  unit: string;
  consumption: number;
  wastePct: number;
  unitCost: number;
  notes?: string;
  stockItemId?: string | null;
};

const fmtDate = (iso?: string) =>
  iso ? new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";

export function OrderDetail({ orderId, canSell, canCost, canPlan, onClose }: Props) {
  const [order, setOrder] = useState<SalesOrder | null>(null);
  const [items, setItems] = useState<SalesOrderItem[]>([]);
  const [costs, setCosts] = useState<ItemCost[]>([]);
  const [events, setEvents] = useState<OrderEvent[]>([]);
  const [sheets, setSheets] = useState<Record<string, ItemSheet>>({});
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [o, i, c, e] = await Promise.all([
      getOrder(orderId),
      listItems(orderId),
      listCosts(orderId),
      listOrderEvents(orderId),
    ]);
    if (o.error) {
      setFatal(isMissingTable(o.error) ? MIGRATION_HINT : o.error.message);
      setLoading(false);
      return;
    }
    setOrder(o.data);
    setItems(i.data ?? []);
    setCosts(c.data ?? []);
    setEvents(e.data ?? []);
    setFatal(null);
    setLoading(false);

    if (canCost && i.data && i.data.length > 0) {
      const entries = await Promise.all(
        i.data.map(async (item) => {
          const [m, op] = await Promise.all([listMaterials(item.id), listOperations(item.id)]);
          return [item.id, { materials: m.data ?? [], operations: op.data ?? [] }] as const;
        }),
      );
      setSheets(Object.fromEntries(entries));
    }
  }, [orderId, canCost]);

  useEffect(() => {
    void load();
  }, [load]);

  const costOf = (itemId: string) => costs.find((c) => c.itemId === itemId);
  const editable = !!order && ["rascunho", "enviado"].includes(order.status) && canSell;
  const total = useMemo(() => items.reduce((acc, i) => acc + i.quantity * i.unitPrice, 0), [items]);
  const pendingCost = items.filter((i) => i.costStatus !== "aprovado").length;

  async function run(
    key: string,
    fn: () => Promise<{ error: { message: string } | null }>,
    ok: string,
  ) {
    setBusy(key);
    const res = await fn();
    setBusy(null);
    if (res.error) {
      toast.error(res.error.message);
      return false;
    }
    toast.success(ok);
    await load();
    return true;
  }

  if (loading) {
    return (
      <Card className="glass-card rounded-lg p-8 text-sm text-muted-foreground">
        Carregando pedido…
      </Card>
    );
  }

  if (fatal || !order) {
    return (
      <Card className="glass-card rounded-lg p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-white">Não foi possível abrir o pedido</p>
            <p className="text-xs text-muted-foreground mt-1">
              {fatal ?? "Pedido não encontrado."}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onClose} className="text-[10px] tracking-[0.16em] gap-2">
          <ArrowLeft className="w-4 h-4" /> Voltar para a lista
        </Button>
      </Card>
    );
  }

  const status = ORDER_STATUS[order.status];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-[10px] tracking-[0.16em] gap-2 -ml-2 text-muted-foreground"
          >
            <ArrowLeft className="w-4 h-4" /> Pedidos
          </Button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-white tracking-tight">{order.number}</h2>
            <span
              className={`px-2.5 py-1 rounded-md border text-[9px] font-bold uppercase tracking-[0.14em] ${status.cls}`}
            >
              {status.label}
            </span>
            {order.isQuote && (
              <span className="px-2.5 py-1 rounded-md border border-sky-400/30 bg-sky-400/10 text-sky-300 text-[9px] font-bold uppercase tracking-[0.14em]">
                Orçamento
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {order.customerName ?? "Cliente"} · entrega {fmtDate(order.dueDate)} · {status.hint}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="text-[10px] tracking-[0.16em] gap-2"
            onClick={() => setSheetOpen(true)}
          >
            <FileText className="w-4 h-4" /> Ficha técnica
          </Button>
          {(order.status === "rascunho" || order.status === "enviado") && canSell && (
            <Button
              onClick={() =>
                run("submit", () => submitOrder(order.id), "Pedido enviado para o custo.")
              }
              disabled={busy === "submit" || items.length === 0}
              className="text-[10px] tracking-[0.16em] gap-2"
            >
              <Send className="w-4 h-4" /> Enviar para custo
            </Button>
          )}
          {order.status === "aprovado" && canPlan && (
            <Button
              onClick={() =>
                run("release", () => releaseToPcp(order.id), "OP gerada no PCP.").then(() =>
                  onClose(),
                )
              }
              disabled={busy === "release"}
              className="text-[10px] tracking-[0.16em] gap-2"
            >
              <Factory className="w-4 h-4" /> Liberar para PCP
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Valor comercial" value={brl(total)} detail={`${items.length} item(ns)`} />
        <Metric
          label="Prazo"
          value={fmtDate(order.dueDate)}
          detail={order.isQuote ? "orçamento" : "pedido"}
        />
        <Metric
          label="Custo pendente"
          value={String(pendingCost)}
          detail={pendingCost === 0 ? "tudo aprovado" : "item(ns)"}
        />
        <Metric
          label="Total de peças"
          value={String(items.reduce((acc, i) => acc + i.quantity, 0))}
          detail="somatório dos itens"
        />
      </div>

      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" /> Itens do pedido
        </h3>
        {editable && (
          <Button
            variant="outline"
            onClick={() => setAddOpen(true)}
            className="text-[10px] tracking-[0.16em] gap-2"
          >
            <Plus className="w-4 h-4" /> Adicionar item
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="glass-card rounded-lg p-8 text-center space-y-3">
          <p className="text-sm text-white">Nenhum item ainda.</p>
          <p className="text-xs text-muted-foreground">
            O vendedor escolhe um produto <strong>validado</strong> no catálogo, informa grade,
            personalização e preço. As operações (bordado, silk, costura) entram sozinhas na ficha.
          </p>
          {editable && (
            <Button
              onClick={() => setAddOpen(true)}
              className="text-[10px] tracking-[0.16em] gap-2"
            >
              <Plus className="w-4 h-4" /> Adicionar o primeiro item
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              cost={costOf(item.id)}
              sheet={sheets[item.id]}
              canCost={canCost}
              editable={editable}
              busy={busy}
              onDelete={() =>
                run(`del-${item.id}`, () => deleteItem(item.id, order.id), "Item removido.").catch(
                  () => undefined,
                )
              }
              onRecalc={() =>
                run(`recalc-${item.id}`, () => recalcItem(item.id), "Custo recalculado.")
              }
              onApprove={() =>
                run(`approve-${item.id}`, () => approveItem(item.id), "Custo aprovado.")
              }
              costEditable={
                canCost &&
                ["enviado", "em_custo", "custo_concluido"].includes(order.status) &&
                item.costStatus !== "aprovado"
              }
              onUpdateOp={(patch) =>
                run(
                  `op-${patch.id}`,
                  async () => {
                    const up = await updateOperation(patch);
                    return up.error ? up : recalcItem(item.id);
                  },
                  "Linha da ficha atualizada.",
                )
              }
              onAddOp={(fields) =>
                run(
                  `addop-${item.id}`,
                  async () => {
                    const ins = await addOperation({ itemId: item.id, ...fields });
                    return ins.error ? ins : recalcItem(item.id);
                  },
                  "Operação adicionada.",
                )
              }
              onAddMat={(fields) =>
                run(
                  `addmat-${item.id}`,
                  async () => {
                    const ins = await addMaterial({ itemId: item.id, ...fields });
                    return ins.error ? ins : recalcItem(item.id);
                  },
                  "Material adicionado.",
                )
              }
              onUpdateMat={(patch) =>
                run(
                  `mat-${patch.id}`,
                  async () => {
                    const up = await updateMaterial(patch);
                    return up.error ? up : recalcItem(item.id);
                  },
                  "Material da ficha atualizado.",
                )
              }
              onDeleteOp={(id) =>
                run(
                  `delop-${id}`,
                  async () => {
                    const del = await deleteOperation(id);
                    return del.error ? del : recalcItem(item.id);
                  },
                  "Operação removida.",
                )
              }
              onDeleteMat={(id) =>
                run(
                  `delmat-${id}`,
                  async () => {
                    const del = await deleteMaterial(id);
                    return del.error ? del : recalcItem(item.id);
                  },
                  "Material removido.",
                )
              }
            />
          ))}
        </div>
      )}

      <Card className="glass-card rounded-lg p-5">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-2 mb-4">
          <Clock className="w-4 h-4 text-primary" /> Timeline
        </h3>
        {events.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem eventos — o pedido ainda não andou.</p>
        ) : (
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex items-start gap-3 text-xs">
                <span className="mt-1 w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                <span className="text-muted-foreground">
                  <span className="text-white font-medium">{e.eventType}</span>
                  {e.fromStatus && e.toStatus ? ` · ${e.fromStatus} → ${e.toStatus}` : ""}
                  {e.actorName ? ` · ${e.actorName}` : ""} ·{" "}
                  {new Date(e.createdAt).toLocaleString("pt-BR")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {order.notes && (
        <Card className="glass-card rounded-lg p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2">
            Observações
          </p>
          <p className="text-sm text-white whitespace-pre-wrap">{order.notes}</p>
        </Card>
      )}

      <TechnicalSheetDialog
        orderId={order.id}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
      />

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        orderId={order.id}
        lineNo={items.length + 1}
        onSaved={async () => {
          setAddOpen(false);
          await load();
        }}
      />
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-black/20 p-3">
      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </p>
      <p className="text-lg font-bold text-white tracking-tight mt-1">{value}</p>
      {detail && (
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{detail}</p>
      )}
    </div>
  );
}

function ItemCard({
  item,
  cost,
  sheet,
  canCost,
  editable,
  busy,
  onDelete,
  onRecalc,
  onApprove,
  costEditable,
  onUpdateOp,
  onAddOp,
  onAddMat,
  onUpdateMat,
  onDeleteOp,
  onDeleteMat,
}: {
  item: SalesOrderItem;
  cost?: ItemCost;
  sheet?: ItemSheet;
  canCost: boolean;
  editable: boolean;
  busy: string | null;
  onDelete: () => void;
  onRecalc: () => void;
  onApprove: () => void;
  costEditable: boolean;
  onUpdateOp: (patch: OpEditPatch) => Promise<boolean>;
  onAddOp: (fields: AddOpFields) => Promise<boolean>;
  onAddMat: (fields: AddMatFields) => Promise<boolean>;
  onUpdateMat: (patch: MatEditPatch) => Promise<boolean>;
  onDeleteOp: (id: string) => Promise<boolean>;
  onDeleteMat: (id: string) => Promise<boolean>;
}) {
  const parseNum = (v: string | undefined, fallback = 0): number => {
    const raw = (v ?? "").trim();
    if (!raw) return fallback;
    const n = Number(raw.replace(",", "."));
    return Number.isFinite(n) ? n : fallback;
  };
  const [editOpId, setEditOpId] = useState<string | null>(null);
  const [editVals, setEditVals] = useState({ driverQty: "", unitCost: "", setupCost: "" });
  const [editMatId, setEditMatId] = useState<string | null>(null);
  const [matVals, setMatVals] = useState({
    consumption: "",
    wastePct: "",
    unitCost: "",
    stockItemId: "",
  });
  const [addKind, setAddKind] = useState<null | "op" | "mat">(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const setF = (key: string) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  async function saveEditOp() {
    if (!editOpId) return;
    const ok = await onUpdateOp({
      id: editOpId,
      driverQty: parseNum(editVals.driverQty, 0),
      unitCost: parseNum(editVals.unitCost, 0),
      setupCost: parseNum(editVals.setupCost, 0),
    });
    if (ok) setEditOpId(null);
  }
  async function saveEditMat() {
    if (!editMatId) return;
    const ok = await onUpdateMat({
      id: editMatId,
      consumption: parseNum(matVals.consumption, 0),
      wastePct: parseNum(matVals.wastePct, 0),
      unitCost: parseNum(matVals.unitCost, 0),
      stockItemId: matVals.stockItemId || null,
    });
    if (ok) setEditMatId(null);
  }
  async function removeOp(id: string) {
    const ok = await onDeleteOp(id);
    if (ok) setEditOpId(null);
  }
  async function removeMat(id: string) {
    const ok = await onDeleteMat(id);
    if (ok) setEditMatId(null);
  }
  async function submitAddOp() {
    const ok = await onAddOp({
      sector: (form.opSector ?? "").trim() || "Producao",
      operation: (form.opName ?? "").trim(),
      driver: (form.opDriver || "peca") as OperationLine["driver"],
      driverQty: parseNum(form.opQty, 1),
      unitCost: parseNum(form.opUnitCost, 0),
      setupCost: parseNum(form.opSetup, 0),
      outsourced: form.opOutsourced === "1",
    });
    if (ok) {
      setAddKind(null);
      setForm({});
    }
  }
  async function submitAddMat() {
    const ok = await onAddMat({
      kind: form.matKind || "tecido",
      material: (form.matName ?? "").trim(),
      unit: (form.matUnit ?? "").trim() || "m",
      consumption: parseNum(form.matConsumption, 1),
      wastePct: parseNum(form.matWaste, 0),
      unitCost: parseNum(form.matUnitCost, 0),
      notes: (form.matNotes ?? "").trim() || undefined,
      stockItemId: form.matStock || null,
    });
    if (ok) {
      setAddKind(null);
      setForm({});
    }
  }
  const costStatus = ITEM_COST_STATUS[item.costStatus];
  const preview = useMemo(() => {
    if (!sheet) return null;
    return computeItemCost({
      quantity: item.quantity,
      overheadPct: cost?.overheadPct ?? 8,
      materials: sheet.materials,
      operations: sheet.operations,
    });
  }, [sheet, item.quantity, cost?.overheadPct]);

  const unitCost = cost?.unitCost ?? preview?.unitCost ?? 0;
  const margin = cost?.marginPct ?? marginPct(item.unitPrice, unitCost);

  return (
    <Card className="glass-card rounded-lg p-5 space-y-4">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
              Item {item.lineNo}
            </span>
            <span
              className={`px-2 py-0.5 rounded border text-[8px] font-bold uppercase tracking-[0.14em] ${costStatus.cls}`}
            >
              {costStatus.label}
            </span>
            {item.referenceCode && (
              <span className="text-[9px] text-muted-foreground uppercase tracking-widest">
                ref {item.referenceCode}
              </span>
            )}
          </div>
          <p className="text-white font-semibold">{item.description}</p>
          <p className="text-xs text-muted-foreground">
            {item.color ? `${item.color} · ` : ""}
            {item.quantity} peças · {brl(item.unitPrice)}/peça ·{" "}
            <span className="text-white">{brl(item.quantity * item.unitPrice)}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCost && (
            <>
              <Button
                variant="outline"
                onClick={onRecalc}
                disabled={busy === `recalc-${item.id}`}
                className="text-[9px] tracking-[0.14em] gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" /> Recalcular
              </Button>
              <Button
                variant="outline"
                onClick={onApprove}
                disabled={busy === `approve-${item.id}` || item.costStatus !== "custo_concluido"}
                className="text-[9px] tracking-[0.14em] gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
              </Button>
            </>
          )}
          {editable && (
            <Button
              variant="ghost"
              onClick={onDelete}
              disabled={busy === `del-${item.id}`}
              className="text-[9px] tracking-[0.14em] gap-1.5 text-red-300"
            >
              <Trash2 className="w-3.5 h-3.5" /> Remover
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2 flex items-center gap-1.5">
            <Ruler className="w-3 h-3" /> Grade
          </p>
          {item.sizes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              sem grade — soma {sumSizes(item.sizes)} de {item.quantity}
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {item.sizes.map((s) => (
                <span
                  key={s.size}
                  className="px-2 py-1 rounded border border-white/10 bg-white/5 text-[10px] text-white"
                >
                  {s.size} <span className="text-muted-foreground">×{s.quantity}</span>
                </span>
              ))}
              <span className="text-[10px] text-muted-foreground self-center ml-1">
                = {sumSizes(item.sizes)} peças
              </span>
            </div>
          )}
        </div>
        <div className="rounded-md border border-white/10 bg-black/20 p-3">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted-foreground mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" /> Personalização
          </p>
          {item.options.length === 0 ? (
            <p className="text-xs text-muted-foreground">sem opções</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {item.options.map((o) => (
                <span
                  key={o.optionId}
                  className="px-2 py-1 rounded border border-primary/20 bg-primary/10 text-[10px] text-primary"
                >
                  {o.name}
                  {o.quantity > 1 ? ` ×${o.quantity}` : ""}
                  {o.driverQty ? ` · ${o.driverQty}` : ""}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {canCost && (
        <div className="rounded-md border border-primary/20 bg-primary/[0.04] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-primary">
              Ficha do pedido · custo
            </p>
            {margin !== null && (
              <span
                className={`text-[9px] font-bold uppercase tracking-[0.14em] px-2 py-0.5 rounded border ${
                  margin >= 25
                    ? "border-emerald-400/30 text-emerald-300"
                    : "border-amber-400/30 text-amber-300"
                }`}
              >
                margem {margin.toFixed(1)}%
              </span>
            )}
          </div>

          {!sheet || (sheet.operations.length === 0 && sheet.materials.length === 0) ? (
            <p className="text-xs text-muted-foreground">
              A ficha é gerada na explosão do catálogo ao enviar o pedido para o custo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-muted-foreground text-left">
                    <th className="font-medium pb-1">Operação</th>
                    <th className="font-medium pb-1">Setor</th>
                    <th className="font-medium pb-1">Driver</th>
                    <th className="font-medium pb-1 text-right">Qtd</th>
                    <th className="font-medium pb-1 text-right">R$/un</th>
                    <th className="font-medium pb-1 text-right">Setup</th>
                    <th className="font-medium pb-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sheet.operations.map((op) => (
                    <Fragment key={op.id ?? op.seq}>
                      <tr className="border-t border-white/5">
                        <td className="py-1 text-white">{op.operation}</td>
                        <td className="py-1 text-muted-foreground">{op.sector}</td>
                        <td className="py-1 text-muted-foreground">{op.driver}</td>
                        <td className="py-1 text-right">{op.driverQty}</td>
                        <td className="py-1 text-right">{brl(op.unitCost)}</td>
                        <td className="py-1 text-right">
                          {op.setupCost ? brl(op.setupCost) : "—"}
                        </td>
                        <td className="py-1 text-right text-white">
                          {brl(op.driverQty * op.unitCost + op.setupCost)}
                        </td>
                        {costEditable && op.id && (
                          <td className="py-1 text-right">
                            <button
                              type="button"
                              aria-label={`Editar linha ${op.operation}`}
                              className="text-muted-foreground hover:text-white"
                              onClick={() => {
                                if (editOpId === op.id) {
                                  setEditOpId(null);
                                  return;
                                }
                                setEditOpId(op.id ?? null);
                                setEditVals({
                                  driverQty: String(op.driverQty),
                                  unitCost: String(op.unitCost),
                                  setupCost: String(op.setupCost),
                                });
                              }}
                            >
                              <Pencil className="w-3 h-3 inline" />
                            </button>
                          </td>
                        )}
                      </tr>
                      {costEditable && editOpId === op.id && (
                        <tr className="border-t border-primary/10">
                          <td colSpan={8} className="py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                {op.operation}
                              </span>
                              <Input
                                aria-label="Qtd do driver"
                                className="h-7 w-24 text-[11px]"
                                value={editVals.driverQty}
                                onChange={(e) =>
                                  setEditVals((v) => ({ ...v, driverQty: e.target.value }))
                                }
                              />
                              <Input
                                aria-label="R$ por unidade"
                                className="h-7 w-24 text-[11px]"
                                value={editVals.unitCost}
                                onChange={(e) =>
                                  setEditVals((v) => ({ ...v, unitCost: e.target.value }))
                                }
                              />
                              <Input
                                aria-label="Custo de setup"
                                className="h-7 w-24 text-[11px]"
                                value={editVals.setupCost}
                                onChange={(e) =>
                                  setEditVals((v) => ({ ...v, setupCost: e.target.value }))
                                }
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!!busy}
                                onClick={saveEditOp}
                              >
                                Salvar linha
                              </Button>
                              {op.source === "custo" && op.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-400 hover:text-red-300"
                                  disabled={!!busy}
                                  onClick={() => removeOp(op.id!)}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Remover linha
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setEditOpId(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                  {sheet.materials.map((m) => (
                    <Fragment key={m.id ?? m.material}>
                      <tr className="border-t border-white/5 text-muted-foreground">
                        <td className="py-1">
                          {m.material}
                          {m.stockItemCode && (
                            <span className="ml-1 text-[9px] text-primary">{m.stockItemCode}</span>
                          )}
                        </td>
                        <td className="py-1">material</td>
                        <td className="py-1">{m.unit}</td>
                        <td className="py-1 text-right">
                          {m.consumption}×{item.quantity}
                        </td>
                        <td className="py-1 text-right">{brl(m.unitCost)}</td>
                        <td className="py-1 text-right">{m.wastePct ? `${m.wastePct}%` : "—"}</td>
                        <td className="py-1 text-right text-white">
                          {brl(m.consumption * (1 + m.wastePct / 100) * m.unitCost * item.quantity)}
                        </td>
                        {costEditable && m.id && (
                          <td className="py-1 text-right">
                            <button
                              type="button"
                              aria-label={`Editar linha ${m.material}`}
                              className="text-muted-foreground hover:text-white"
                              onClick={() => {
                                if (editMatId === m.id) {
                                  setEditMatId(null);
                                  return;
                                }
                                setEditMatId(m.id ?? null);
                                setMatVals({
                                  consumption: String(m.consumption),
                                  wastePct: String(m.wastePct),
                                  unitCost: String(m.unitCost),
                                  stockItemId: m.stockItemId ?? "",
                                });
                              }}
                            >
                              <Pencil className="w-3 h-3 inline" />
                            </button>
                          </td>
                        )}
                      </tr>
                      {costEditable && editMatId === m.id && (
                        <tr className="border-t border-primary/10">
                          <td colSpan={8} className="py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                                {m.material}
                              </span>
                              <Input
                                aria-label="Consumo do material"
                                className="h-7 w-24 text-[11px]"
                                value={matVals.consumption}
                                onChange={(e) =>
                                  setMatVals((v) => ({ ...v, consumption: e.target.value }))
                                }
                              />
                              <Input
                                aria-label="Perda do material (%)"
                                className="h-7 w-20 text-[11px]"
                                value={matVals.wastePct}
                                onChange={(e) =>
                                  setMatVals((v) => ({ ...v, wastePct: e.target.value }))
                                }
                              />
                              <Input
                                aria-label="Custo unitário do material (R$)"
                                className="h-7 w-24 text-[11px]"
                                value={matVals.unitCost}
                                onChange={(e) =>
                                  setMatVals((v) => ({ ...v, unitCost: e.target.value }))
                                }
                              />
                              <StockItemSelect
                                value={matVals.stockItemId}
                                onChange={(id) => setMatVals((v) => ({ ...v, stockItemId: id }))}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!!busy}
                                onClick={saveEditMat}
                              >
                                Salvar material
                              </Button>
                              {m.source === "custo" && m.id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-red-400 hover:text-red-300"
                                  disabled={!!busy}
                                  onClick={() => removeMat(m.id!)}
                                >
                                  <Trash2 className="w-3 h-3 mr-1" /> Remover material
                                </Button>
                              )}
                              <Button size="sm" variant="ghost" onClick={() => setEditMatId(null)}>
                                Cancelar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {costEditable && (
            <div className="space-y-2 pt-1">
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddKind(addKind === "op" ? null : "op");
                    setForm({});
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Nova operação
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setAddKind(addKind === "mat" ? null : "mat");
                    setForm({});
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" /> Novo material
                </Button>
              </div>
              {addKind === "op" && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/[0.03] p-2">
                  <Input
                    aria-label="Setor"
                    className="h-7 w-28 text-[11px]"
                    placeholder="Setor"
                    onChange={setF("opSector")}
                  />
                  <Input
                    aria-label="Operação"
                    className="h-7 w-40 text-[11px]"
                    placeholder="Operação"
                    onChange={setF("opName")}
                  />
                  <select
                    aria-label="Driver"
                    className="h-7 rounded border border-input bg-transparent px-2 text-[11px]"
                    value={form.opDriver ?? "peca"}
                    onChange={setF("opDriver")}
                  >
                    <option value="peca">peça</option>
                    <option value="minuto">minuto</option>
                    <option value="mil_pontos">mil pontos</option>
                    <option value="m2">m²</option>
                    <option value="cor">cor</option>
                    <option value="lote">lote</option>
                  </select>
                  <Input
                    aria-label="Qtd do driver"
                    className="h-7 w-20 text-[11px]"
                    placeholder="Qtd"
                    defaultValue="1"
                    onChange={setF("opQty")}
                  />
                  <Input
                    aria-label="R$ por unidade"
                    className="h-7 w-20 text-[11px]"
                    placeholder="R$/un"
                    onChange={setF("opUnitCost")}
                  />
                  <Input
                    aria-label="Custo de setup"
                    className="h-7 w-20 text-[11px]"
                    placeholder="Setup"
                    onChange={setF("opSetup")}
                  />
                  <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <input
                      type="checkbox"
                      aria-label="Terceirizada"
                      checked={form.opOutsourced === "1"}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, opOutsourced: e.target.checked ? "1" : "" }))
                      }
                    />
                    terceirizada
                  </label>
                  <Button
                    size="sm"
                    disabled={!!busy || !(form.opName ?? "").trim()}
                    onClick={submitAddOp}
                  >
                    Adicionar operação
                  </Button>
                </div>
              )}
              {addKind === "mat" && (
                <div className="flex flex-wrap items-center gap-2 rounded-md border border-primary/20 bg-primary/[0.03] p-2">
                  <Input
                    aria-label="Material"
                    className="h-7 w-40 text-[11px]"
                    placeholder="Material"
                    onChange={setF("matName")}
                  />
                  <select
                    aria-label="Tipo de material"
                    className="h-7 rounded border border-input bg-transparent px-2 text-[11px]"
                    value={form.matKind ?? "tecido"}
                    onChange={setF("matKind")}
                  >
                    <option value="tecido">tecido</option>
                    <option value="aviamento">aviamento</option>
                    <option value="linha">linha</option>
                    <option value="embalagem">embalagem</option>
                    <option value="servico">serviço</option>
                  </select>
                  <Input
                    aria-label="Unidade"
                    className="h-7 w-16 text-[11px]"
                    placeholder="un"
                    defaultValue="m"
                    onChange={setF("matUnit")}
                  />
                  <Input
                    aria-label="Consumo por peça"
                    className="h-7 w-20 text-[11px]"
                    placeholder="Consumo"
                    defaultValue="1"
                    onChange={setF("matConsumption")}
                  />
                  <Input
                    aria-label="Perda (%)"
                    className="h-7 w-16 text-[11px]"
                    placeholder="Perda"
                    onChange={setF("matWaste")}
                  />
                  <Input
                    aria-label="Custo unitário (R$)"
                    className="h-7 w-20 text-[11px]"
                    placeholder="R$/un"
                    onChange={setF("matUnitCost")}
                  />
                  <Input
                    aria-label="Observações"
                    className="h-7 w-32 text-[11px]"
                    placeholder="Obs."
                    onChange={setF("matNotes")}
                  />
                  <StockItemSelect
                    value={form.matStock ?? ""}
                    onChange={(id) => setForm((f) => ({ ...f, matStock: id }))}
                  />
                  <Button
                    size="sm"
                    disabled={!!busy || !(form.matName ?? "").trim()}
                    onClick={submitAddMat}
                  >
                    Adicionar material
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t border-white/5">
            <CostCell
              label="Materiais"
              value={cost ? brl(cost.materialsTotal) : preview ? brl(preview.materialsTotal) : "—"}
            />
            <CostCell
              label="Operações"
              value={
                cost ? brl(cost.operationsTotal) : preview ? brl(preview.operationsTotal) : "—"
              }
            />
            <CostCell
              label="Setup"
              value={cost ? brl(cost.setupTotal) : preview ? brl(preview.setupTotal) : "—"}
            />
            <CostCell
              label="Custo/peça"
              value={brl(unitCost)}
              accent
              detail={
                cost?.suggestedPrice
                  ? `sugerido ${brl(cost.suggestedPrice)}`
                  : unitCost
                    ? `preço p/ 30% ${brl(priceForMargin(unitCost, 30))}`
                    : undefined
              }
            />
          </div>
          {preview && cost && round2(preview.unitCost) !== round2(cost.unitCost) && (
            <p className="text-[10px] text-amber-300">
              Prévia pela ficha ({brl(preview.unitCost)}) difere do custo gravado (
              {brl(cost.unitCost)}) — recalcule para alinhar.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function CostCell({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail?: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className={`text-sm font-semibold ${accent ? "text-primary" : "text-white"}`}>{value}</p>
      {detail && <p className="text-[9px] text-muted-foreground">{detail}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Novo item: produto validado + grade + opções + preço
// ---------------------------------------------------------------------------
function AddItemDialog({
  open,
  onOpenChange,
  orderId,
  lineNo,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orderId: string;
  lineNo: number;
  onSaved: () => void;
}) {
  const [catalog, setCatalog] = useState<CatalogProduct[]>([]);
  const [productId, setProductId] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("");
  const [quantity, setQuantity] = useState("10");
  const [price, setPrice] = useState("");
  const [sizes, setSizes] = useState<Record<string, string>>({});
  const [options, setOptions] = useState<
    Record<string, { on: boolean; qty: string; spec: string }>
  >({});
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    void listCatalog().then((res) => {
      if (res.error) {
        setHint(isMissingTable(res.error) ? MIGRATION_HINT : res.error.message);
        return;
      }
      const valid = (res.data ?? []).filter((p) => p.status === "validado");
      setCatalog(valid);
      setHint(
        valid.length === 0 ? "Nenhum produto validado no catálogo — valide em /catalog." : null,
      );
    });
  }, [open]);

  const product = catalog.find((p) => p.id === productId);

  function pickProduct(id: string) {
    setProductId(id);
    const p = catalog.find((x) => x.id === id);
    if (!p) return;
    setDescription(p.name);
    setPrice(String(p.basePrice || ""));
    setQuantity(String(p.minQty || 10));
    setSizes(Object.fromEntries(p.grade.map((g) => [g, ""])));
    setOptions(Object.fromEntries(p.options.map((o) => [o.id, { on: false, qty: "1", spec: "" }])));
  }

  const selected = Object.entries(options).filter(([, v]) => v.on);
  const sizeSum = Object.values(sizes).reduce((acc, v) => acc + (Number(v) || 0), 0);
  const qty = Number(quantity) || 0;

  async function save() {
    if (!product) return;
    if (!description.trim()) {
      toast.error("Informe a descrição do item.");
      return;
    }
    if (qty < product.minQty) {
      toast.error(`Quantidade mínima deste produto é ${product.minQty} peças.`);
      return;
    }
    if (sizeSum > 0 && sizeSum !== qty) {
      toast.error(`A grade soma ${sizeSum} peças, mas o item tem ${qty}.`);
      return;
    }
    setSaving(true);
    const res = await addItem({
      orderId,
      lineNo,
      catalogProductId: product.id,
      description,
      color,
      quantity: qty,
      unitPrice: Number(String(price).replace(",", ".")) || 0,
      sizes: Object.entries(sizes)
        .map(([size, value]) => ({ size, quantity: Number(value) || 0 }))
        .filter((s) => s.quantity > 0),
      options: selected.map(([optionId, v]) => ({
        optionId,
        quantity: Number(v.qty) || 1,
        driverQty: v.spec ? Number(String(v.spec).replace(",", ".")) : undefined,
      })),
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Item adicionado.");
    setProductId("");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar item ao pedido</DialogTitle>
        </DialogHeader>

        {hint && (
          <div className="flex items-start gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 p-3">
            <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
            <p className="text-[11px] text-amber-100">{hint}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Produto validado</Label>
            <select
              value={productId}
              onChange={(e) => pickProduct(e.target.value)}
              className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
            >
              <option value="">Selecione…</option>
              {catalog.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
            {product && (
              <p className="text-[10px] text-muted-foreground">
                mínimo {product.minQty} peças · grade {product.grade.join(" · ")} · base{" "}
                {brl(product.basePrice)}
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Descrição no pedido</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cor / acabamento</Label>
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                placeholder="Ex.: Preto"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Preço unitário (R$)</Label>
              <Input
                inputMode="decimal"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0,00"
              />
            </div>
          </div>

          {product && product.grade.length > 0 && (
            <div className="space-y-2">
              <Label>Grade</Label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {product.grade.map((size) => (
                  <div key={size} className="space-y-1">
                    <p className="text-[9px] uppercase tracking-widest text-muted-foreground">
                      {size}
                    </p>
                    <Input
                      type="number"
                      min={0}
                      value={sizes[size] ?? ""}
                      onChange={(e) => setSizes({ ...sizes, [size]: e.target.value })}
                      className="h-9"
                    />
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground">
                Soma da grade: {sizeSum} de {qty || 0} peças
                {sizeSum > 0 && sizeSum !== qty ? " — precisa bater com a quantidade." : ""}
              </p>
            </div>
          )}

          {product && product.options.length > 0 && (
            <div className="space-y-2">
              <Label>Personalização</Label>
              <div className="space-y-2">
                {product.options.map((o) => {
                  const state = options[o.id] ?? { on: false, qty: "1", spec: "" };
                  const needsSpec = o.driver !== "peca" && o.driver !== "lote";
                  return (
                    <div
                      key={o.id}
                      className="flex flex-col md:flex-row md:items-center gap-2 rounded-md border border-white/10 bg-black/20 p-2.5"
                    >
                      <label className="flex items-center gap-2 flex-1 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={state.on}
                          onChange={(e) =>
                            setOptions({ ...options, [o.id]: { ...state, on: e.target.checked } })
                          }
                        />
                        <span className="text-xs text-white">{o.name}</span>
                        {o.groupName && (
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">
                            {o.groupName}
                          </span>
                        )}
                        {o.operationName && (
                          <span className="text-[9px] text-primary">
                            {o.sector ?? "produção"} · {o.driver}
                          </span>
                        )}
                      </label>
                      {state.on && (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min={1}
                            value={state.qty}
                            onChange={(e) =>
                              setOptions({ ...options, [o.id]: { ...state, qty: e.target.value } })
                            }
                            className="h-8 w-16"
                            title="Quantidade da opção no item"
                          />
                          {needsSpec && (
                            <Input
                              inputMode="decimal"
                              value={state.spec}
                              onChange={(e) =>
                                setOptions({
                                  ...options,
                                  [o.id]: { ...state, spec: e.target.value },
                                })
                              }
                              className="h-8 w-24"
                              placeholder={
                                o.driver === "mil_pontos"
                                  ? "mil pontos"
                                  : o.driver === "m2"
                                    ? "m²"
                                    : "qtd"
                              }
                              title="Quantidade do driver por peça (ex.: 6,5 mil pontos)"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving || !product}>
            {saving ? "Salvando…" : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
