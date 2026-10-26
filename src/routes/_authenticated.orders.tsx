// Pedidos — fluxo comercial do PLM (fase 1).
//
// O pedido nasce do CATÁLOGO VALIDADO: o vendedor não digita especificação
// técnica, escolhe produto + opções + grade. Ao enviar, o banco explode o
// catálogo na ficha do pedido (materiais e operações) e a engenharia de custo
// detalha o que falta. Ver supabase/migrations/20261021090100_sales_orders.sql.
//
// A visão de custo é GATE por papel (can_cost): a RLS devolve zero linhas para
// quem não é de custo — esconder botão aqui é conveniência, não proteção.
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Plus, RefreshCw, ShoppingBag, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { OrderDetail } from "@/components/sales/OrderDetail";
import { useAuth, useUserRoles } from "@/hooks/use-auth";
import {
  createCustomer,
  createOrder,
  isMissingTable,
  listCustomers,
  listOrders,
  MIGRATION_HINT,
} from "@/lib/sales/api";
import {
  brl,
  ORDER_STATUS,
  type Customer,
  type SalesOrder,
  type SalesOrderStatus,
} from "@/lib/sales/types";

const searchSchema = z.object({
  q: z.string().optional(),
  pedido: z.string().optional(),
});

type OrdersSearch = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/_authenticated/orders")({
  validateSearch: (raw: Record<string, unknown>): OrdersSearch => {
    const parsed = searchSchema.safeParse(raw);
    return parsed.success ? parsed.data : {};
  },
  head: () => ({
    meta: [
      { title: "Pedidos · USE MODA PLM" },
      {
        name: "description",
        content:
          "Pedido comercial do PLM: produto validado, grade, personalização e custo detalhado pela engenharia.",
      },
    ],
  }),
  component: OrdersPage,
});

const FILTERS: Array<{
  id: "todos" | "abertos" | "custo" | "aprovados" | "cancelados";
  label: string;
}> = [
  { id: "todos", label: "Todos" },
  { id: "abertos", label: "Em aberto" },
  { id: "custo", label: "Aguardando custo" },
  { id: "aprovados", label: "Aprovados" },
  { id: "cancelados", label: "Cancelados" },
];

function statusBucket(status: SalesOrderStatus): "abertos" | "custo" | "aprovados" | "cancelados" {
  if (status === "cancelado") return "cancelados";
  if (status === "aprovado" || status === "liberado_pcp") return "aprovados";
  if (status === "enviado" || status === "em_custo" || status === "custo_concluido") return "custo";
  return "abertos";
}

function OrdersPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const { user } = useAuth();
  const { roles } = useUserRoles(user?.id);

  const canCost = roles.some((r) =>
    ["admin", "manager", "engenharia_custo", "coordenador_produto"].includes(String(r)),
  );
  const canSell = roles.some((r) =>
    ["admin", "manager", "comercial", "diretor_produto"].includes(String(r)),
  );
  const canPlan = roles.some((r) => ["admin", "manager", "pcp"].includes(String(r)));

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("todos");
  const [newOpen, setNewOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);

  const load = useMemo(
    () => async () => {
      setLoading(true);
      const [o, c] = await Promise.all([listOrders(), listCustomers()]);
      if (o.error) {
        setFatal(isMissingTable(o.error) ? MIGRATION_HINT : o.error.message);
        setOrders([]);
      } else {
        setOrders(o.data ?? []);
        setFatal(null);
      }
      setCustomers(c.data ?? []);
      setLoading(false);
    },
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const q = (search.q ?? "").trim().toLowerCase();
  const visible = orders.filter((o) => {
    const bucketOk =
      filter === "todos" ? o.status !== "cancelado" : statusBucket(o.status) === filter;
    const textOk =
      !q || o.number.toLowerCase().includes(q) || (o.customerName ?? "").toLowerCase().includes(q);
    return bucketOk && textOk;
  });

  const metrics = [
    {
      label: "Pedidos ativos",
      value: String(orders.filter((o) => !["cancelado", "liberado_pcp"].includes(o.status)).length),
      detail: "fora do PCP",
    },
    {
      label: "Aguardando custo",
      value: String(
        orders.filter((o) => ["enviado", "em_custo", "custo_concluido"].includes(o.status)).length,
      ),
      detail: "fila da engenharia",
    },
    {
      label: "Carteira",
      value: brl(
        orders.filter((o) => o.status !== "cancelado").reduce((a, o) => a + o.totalValue, 0),
      ),
      detail: "valor comercial",
    },
    {
      label: "No PCP",
      value: String(orders.filter((o) => o.status === "liberado_pcp").length),
      detail: "OPs geradas",
    },
  ];

  const setSearch = (next: Partial<OrdersSearch>) =>
    navigate({ to: "/orders", search: { ...search, ...next }, replace: true });

  if (search.pedido) {
    return (
      <ModuleLayout
        title="Pedidos"
        subtitle="Produto validado → grade e personalização → ficha do pedido → custo → PCP."
        version="Commercial Orders v1.0"
        metrics={metrics}
      >
        <OrderDetail
          orderId={search.pedido}
          canSell={canSell}
          canCost={canCost}
          canPlan={canPlan}
          onClose={() => setSearch({ pedido: undefined })}
        />
      </ModuleLayout>
    );
  }

  return (
    <ModuleLayout
      title="Pedidos"
      subtitle="Pedido comercial de produto já validado. O vendedor informa dados comerciais, grade e personalização; a engenharia de custo detalha as operações do pedido."
      version="Commercial Orders v1.0"
      onAdd={canSell ? () => setNewOpen(true) : undefined}
      onSearch={(value) => setSearch({ q: value || undefined })}
      searchPlaceholder="Buscar por número ou cliente"
      metrics={metrics}
    >
      {fatal && (
        <div className="mb-6 flex items-start gap-3 rounded-md border border-status-progress/30 bg-status-progress/10 p-4">
          <AlertTriangle className="w-4 h-4 text-status-progress mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-semibold text-status-progress">
              Fluxo de pedidos ainda não ativo
            </p>
            <p className="text-xs text-status-progress/80">{fatal}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-md border text-[11px] font-bold uppercase tracking-[0.04em] transition-colors ${
              filter === f.id
                ? "border-primary/40 bg-primary/10 text-primary"
                : "border-white/10 text-muted-foreground hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="flex-1" />
        <Button
          variant="outline"
          onClick={() => void load()}
          className="text-[11px] tracking-[0.04em] gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Atualizar
        </Button>
      </div>

      {loading ? (
        <Card className="glass-card rounded-lg p-8 text-sm text-muted-foreground">
          Carregando pedidos…
        </Card>
      ) : visible.length === 0 ? (
        <Card className="glass-card rounded-lg p-10 text-center space-y-3">
          <ShoppingBag className="w-6 h-6 text-primary mx-auto" />
          <p className="text-sm text-white">Nenhum pedido nesta visão.</p>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Comece pelo catálogo: um produto só entra em pedido depois de <strong>validado</strong>.
            {canSell ? " Depois é só criar o pedido e adicionar os itens." : ""}
          </p>
          {canSell && (
            <Button
              onClick={() => setNewOpen(true)}
              className="text-[11px] tracking-[0.04em] gap-2"
            >
              <Plus className="w-4 h-4" /> Novo pedido
            </Button>
          )}
        </Card>
      ) : (
        <Card className="glass-card rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-[0.04em] text-muted-foreground border-b border-white/10">
                  <th className="px-4 py-3 font-bold">Pedido</th>
                  <th className="px-4 py-3 font-bold">Cliente</th>
                  <th className="px-4 py-3 font-bold">Status</th>
                  <th className="px-4 py-3 font-bold">Entrega</th>
                  <th className="px-4 py-3 font-bold text-right">Valor</th>
                  <th className="px-4 py-3 font-bold text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((o) => {
                  const meta = ORDER_STATUS[o.status];
                  return (
                    <tr
                      key={o.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <span className="text-white font-semibold">{o.number}</span>
                        {o.isQuote && (
                          <span className="ml-2 text-[10px] uppercase tracking-[0.04em] text-status-review">
                            orçamento
                          </span>
                        )}
                        <p className="text-[11px] text-muted-foreground">
                          criado {new Date(o.createdAt).toLocaleDateString("pt-BR")}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{o.customerName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-[0.04em] ${meta.cls}`}
                        >
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {o.dueDate
                          ? new Date(`${o.dueDate}T12:00:00`).toLocaleDateString("pt-BR")
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-white font-semibold">
                        {brl(o.totalValue)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          onClick={() => setSearch({ pedido: o.id })}
                          className="text-[11px] tracking-[0.04em]"
                        >
                          Abrir
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <NewOrderDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        customers={customers}
        onNeedCustomer={() => {
          setNewOpen(false);
          setCustomerOpen(true);
        }}
        onCreated={async (id) => {
          setNewOpen(false);
          await load();
          setSearch({ pedido: id });
        }}
      />

      <NewCustomerDialog
        open={customerOpen}
        onOpenChange={setCustomerOpen}
        onCreated={async () => {
          setCustomerOpen(false);
          await load();
          setNewOpen(true);
        }}
      />
    </ModuleLayout>
  );
}

function NewOrderDialog({
  open,
  onOpenChange,
  customers,
  onNeedCustomer,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  customers: Customer[];
  onNeedCustomer: () => void;
  onCreated: (id: string) => void;
}) {
  const [customerId, setCustomerId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [isQuote, setIsQuote] = useState(true);
  const [validUntil, setValidUntil] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!customerId) {
      toast.error("Selecione o cliente.");
      return;
    }
    setSaving(true);
    const res = await createOrder({
      customerId,
      dueDate: dueDate || undefined,
      isQuote,
      quoteValidUntil: validUntil || undefined,
      paymentTerms,
      notes,
    });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success(`Pedido ${res.data?.number} criado.`);
    setCustomerId("");
    setNotes("");
    onCreated(res.data!.id);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo pedido / orçamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Cliente</Label>
              <button
                onClick={onNeedCustomer}
                className="text-[11px] text-primary uppercase tracking-[0.04em] flex items-center gap-1"
              >
                <UserPlus className="w-3 h-3" /> cadastrar
              </button>
            </div>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white"
            >
              <option value="">Selecione…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-[11px] text-status-progress">
                Nenhum cliente cadastrado — use “cadastrar” ao lado.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Entrega</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Validade do orçamento</Label>
              <Input
                type="date"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
                disabled={!isQuote}
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
            <input
              type="checkbox"
              checked={isQuote}
              onChange={(e) => setIsQuote(e.target.checked)}
            />
            É orçamento (vira pedido quando o cliente aprovar)
          </label>

          <div className="space-y-2">
            <Label>Condição de pagamento</Label>
            <Input
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              placeholder="Ex.: 50% na aprovação, 50% na entrega"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Criando…" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [segment, setSegment] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) {
      toast.error("Informe o nome do cliente.");
      return;
    }
    setSaving(true);
    const res = await createCustomer({ name, taxId, city, state, segment });
    setSaving(false);
    if (res.error) {
      toast.error(res.error.message);
      return;
    }
    toast.success("Cliente cadastrado.");
    setName("");
    setTaxId("");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo cliente</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Razão social / nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>CNPJ / CPF</Label>
            <Input value={taxId} onChange={(e) => setTaxId(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Cidade</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>UF</Label>
              <Input value={state} maxLength={2} onChange={(e) => setState(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Segmento</Label>
            <Input
              value={segment}
              onChange={(e) => setSegment(e.target.value)}
              placeholder="Clube · Empresa · Escola"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? "Salvando…" : "Cadastrar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
