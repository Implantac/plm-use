import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Award,
  CheckCircle2,
  Clock,
  FileSpreadsheet,
  FileText,
  PackagePlus,
  Scale,
  Send,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  buildDefaultQuotesForItem,
  buildPurchaseOrderPrintableHtml,
  explodeBomRequirements,
  scoreRfqProposals,
  type RfqSupplierQuote,
} from "@/lib/techsheet/sourcing-rfq";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { operationalCodes } from "@/lib/techsheet/provenance";

export const Route = createFileRoute("/_authenticated/supplier-portal")({
  component: SupplierPortalPage,
});

type Supplier = {
  id: string;
  code: string;
  name: string;
  tipo: string;
  status: string;
  cidade: string | null;
  uf: string | null;
  contato_nome: string | null;
  contato_email: string | null;
};
type Order = {
  id: string;
  codigo: string;
  supplier_id: string;
  descricao: string | null;
  quantidade: number;
  unidade: string;
  prazo: string | null;
  status: string;
  observacoes: string | null;
  supplier_response: string | null;
  supplier_responded_at: string | null;
  created_at: string;
};
type Sample = {
  id: string;
  supplier_order_id: string;
  supplier_id: string;
  observacoes: string | null;
  decision: string;
  decision_note: string | null;
  created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  enviada: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  aceita: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  em_producao: "bg-status-progress/15 text-status-progress border-status-progress/30",
  amostra_enviada: "bg-status-review/15 text-status-review border-status-review/30",
  aprovada: "bg-status-approved/15 text-status-approved border-status-approved/30",
  rejeitada: "bg-status-rejected/15 text-status-rejected border-status-rejected/30",
  concluida: "bg-status-approved/15 text-status-approved border-status-approved/30",
  cancelada: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
};

function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("suppliers").select("*").order("name");
      if (error) throw error;
      return data as Supplier[];
    },
  });
}
function useOrders() {
  return useQuery({
    queryKey: ["supplier_orders"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Order[];
    },
  });
}
function useSamples() {
  return useQuery({
    queryKey: ["supplier_samples"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_sample_submissions")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sample[];
    },
  });
}

function SupplierPortalPage() {
  return (
    <ModuleLayout
      title="Portal do Fornecedor & Sourcing RFQ"
      subtitle="Explosão MRP da BOM, mapa comparativo TCO de 3 cotações, adjudicação direta na Ficha Técnica e ordens/amostras."
      version="Sourcing v2.0"
    >
      <Tabs defaultValue="rfq-bom" className="w-full">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger value="rfq-bom">RFQ & Cotação BOM (PLM)</TabsTrigger>
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="orders">Ordens de Produção</TabsTrigger>
          <TabsTrigger value="samples">Amostras</TabsTrigger>
        </TabsList>
        <TabsContent value="rfq-bom" className="mt-4">
          <RfqBomTab />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-4">
          <SuppliersTab />
        </TabsContent>
        <TabsContent value="orders" className="mt-4">
          <OrdersTab />
        </TabsContent>
        <TabsContent value="samples" className="mt-4">
          <SamplesTab />
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}

// -------- Fornecedores --------
function SuppliersTab() {
  const { data, isLoading } = useSuppliers();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "",
    name: "",
    tipo: "confeccao",
    cidade: "",
    uf: "",
    contato_nome: "",
    contato_email: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("suppliers").insert({
        ...form,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor criado");
      setOpen(false);
      setForm({
        code: "",
        name: "",
        tipo: "confeccao",
        cidade: "",
        uf: "",
        contato_nome: "",
        contato_email: "",
      });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1">
              <PackagePlus className="w-3.5 h-3.5" /> Novo fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar fornecedor</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-2xs uppercase">Código</Label>
                  <Input
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-2xs uppercase">Tipo</Label>
                  <Input
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    placeholder="confeccao, tecelagem…"
                  />
                </div>
              </div>
              <div>
                <Label className="text-2xs uppercase">Nome</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-2xs uppercase">Cidade</Label>
                  <Input
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-2xs uppercase">UF</Label>
                  <Input
                    value={form.uf}
                    onChange={(e) => setForm({ ...form, uf: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-2xs uppercase">Contato · nome</Label>
                <Input
                  value={form.contato_nome}
                  onChange={(e) => setForm({ ...form, contato_nome: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase">Contato · e-mail</Label>
                <Input
                  type="email"
                  value={form.contato_email}
                  onChange={(e) => setForm({ ...form, contato_email: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => create.mutate()}
                disabled={!form.code || !form.name || create.isPending}
              >
                Cadastrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !data || data.length === 0 ? (
        <Card className="glass-card p-8 text-center text-muted-foreground text-sm">
          Nenhum fornecedor cadastrado ainda.
        </Card>
      ) : (
        <div className="grid gap-2">
          {data.map((s) => (
            <Card key={s.id} className="glass-card p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-white">
                  {s.code} · {s.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.tipo}
                  {s.cidade ? ` · ${s.cidade}/${s.uf}` : ""}
                  {s.contato_nome ? ` · ${s.contato_nome}` : ""}
                </p>
              </div>
              <Badge variant="outline" className="text-2xs uppercase">
                {s.status}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// -------- Ordens --------
function OrdersTab() {
  const { data: suppliers } = useSuppliers();
  const { data: orders, isLoading } = useOrders();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    supplier_id: "",
    codigo: "",
    descricao: "",
    quantidade: 0,
    unidade: "pc",
    prazo: "",
    observacoes: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("supplier_orders").insert({
        supplier_id: form.supplier_id,
        codigo: form.codigo,
        descricao: form.descricao || null,
        quantidade: Number(form.quantidade),
        unidade: form.unidade,
        prazo: form.prazo || null,
        observacoes: form.observacoes || null,
        created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("OP enviada ao fornecedor");
      setOpen(false);
      setForm({
        supplier_id: "",
        codigo: "",
        descricao: "",
        quantidade: 0,
        unidade: "pc",
        prazo: "",
        observacoes: "",
      });
      qc.invalidateQueries({ queryKey: ["supplier_orders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const transition = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("supplier_orders")
        .update({ status, updated_by: user.user?.id })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier_orders"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const supplierName = useMemo(() => {
    const map = new Map((suppliers ?? []).map((s) => [s.id, `${s.code} · ${s.name}`]));
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [suppliers]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" disabled={!suppliers?.length}>
              <Send className="w-3.5 h-3.5" /> Nova OP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova ordem de produção</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label className="text-2xs uppercase">Fornecedor</Label>
                <select
                  className="w-full h-9 rounded-md border border-border bg-muted/50 text-xs px-2"
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                >
                  <option value="">Selecione…</option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} · {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-2xs uppercase">Código OP</Label>
                  <Input
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-2xs uppercase">Prazo</Label>
                  <Input
                    type="date"
                    value={form.prazo}
                    onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-2xs uppercase">Descrição</Label>
                <Input
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-2xs uppercase">Quantidade</Label>
                  <Input
                    type="number"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-2xs uppercase">Unidade</Label>
                  <Input
                    value={form.unidade}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-2xs uppercase">Observações</Label>
                <Textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => create.mutate()}
                disabled={!form.supplier_id || !form.codigo || create.isPending}
              >
                Enviar OP
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !orders || orders.length === 0 ? (
        <Card className="glass-card p-8 text-center text-muted-foreground text-sm">
          Nenhuma OP enviada ainda.
        </Card>
      ) : (
        <div className="grid gap-2">
          {orders.map((o) => (
            <Card key={o.id} className="glass-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-white">
                    {o.codigo} · {supplierName(o.supplier_id)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {o.descricao ?? "—"} · {o.quantidade} {o.unidade}
                    {o.prazo ? ` · prazo ${new Date(o.prazo).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                  {o.supplier_response && (
                    <p className="text-2xs text-cyan-300 mt-1">Fornecedor: {o.supplier_response}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge
                    variant="outline"
                    className={`text-2xs uppercase ${STATUS_COLORS[o.status] ?? ""}`}
                  >
                    {o.status}
                  </Badge>
                  <div className="flex gap-1 mt-1">
                    {o.status === "enviada" && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-2xs gap-1"
                          onClick={() => transition.mutate({ id: o.id, status: "aceita" })}
                        >
                          <CheckCircle2 className="w-3 h-3" /> Aceitar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-2xs gap-1"
                          onClick={() => transition.mutate({ id: o.id, status: "cancelada" })}
                        >
                          <XCircle className="w-3 h-3" /> Cancelar
                        </Button>
                      </>
                    )}
                    {o.status === "aceita" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-2xs gap-1"
                        onClick={() => transition.mutate({ id: o.id, status: "em_producao" })}
                      >
                        <Clock className="w-3 h-3" /> Iniciar produção
                      </Button>
                    )}
                    {o.status === "em_producao" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-2xs"
                        onClick={() => transition.mutate({ id: o.id, status: "concluida" })}
                      >
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// -------- Amostras --------
function SamplesTab() {
  const { data, isLoading } = useSamples();
  const { data: orders } = useOrders();
  const qc = useQueryClient();

  const decide = useMutation({
    mutationFn: async ({ id, decision, note }: { id: string; decision: string; note?: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("supplier_sample_submissions")
        .update({
          decision,
          decision_note: note ?? null,
          decided_by: user.user?.id,
          decided_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["supplier_samples"] }),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const orderCode = useMemo(() => {
    const map = new Map((orders ?? []).map((o) => [o.id, o.codigo]));
    return (id: string) => map.get(id) ?? id.slice(0, 8);
  }, [orders]);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (!data || data.length === 0) {
    return (
      <Card className="glass-card p-8 text-center text-muted-foreground text-sm">
        Nenhuma amostra enviada pelo fornecedor ainda.
      </Card>
    );
  }

  return (
    <div className="grid gap-2">
      {data.map((s) => (
        <Card key={s.id} className="glass-card p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-white">OP {orderCode(s.supplier_order_id)}</p>
            <p className="text-xs text-muted-foreground">{s.observacoes ?? "—"}</p>
            {s.decision_note && (
              <p className="text-2xs text-cyan-300 mt-1">Nota: {s.decision_note}</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge
              variant="outline"
              className={`text-2xs uppercase ${
                s.decision === "aprovada"
                  ? STATUS_COLORS.aprovada
                  : s.decision === "reprovada"
                    ? STATUS_COLORS.rejeitada
                    : STATUS_COLORS.enviada
              }`}
            >
              {s.decision}
            </Badge>
            {s.decision === "pendente" && (
              <div className="flex gap-1 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-2xs gap-1"
                  onClick={() => decide.mutate({ id: s.id, decision: "aprovada" })}
                >
                  <CheckCircle2 className="w-3 h-3" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-2xs gap-1"
                  onClick={() => decide.mutate({ id: s.id, decision: "reprovada" })}
                >
                  <XCircle className="w-3 h-3" /> Reprovar
                </Button>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// -------- RFQ & Cotação Comparativa da BOM (Integrada à Ficha Técnica) --------
function RfqBomTab() {
  const sheetsMap = useTechSheetStore((s) => s.data);
  const materializadas = useTechSheetStore((s) => s.materializadas);
  const updateBomItem = useTechSheetStore((s) => s.updateBomItem);
  const updatePreCost = useTechSheetStore((s) => s.updatePreCost);

  // RFQ negocia com fornecedor de verdade e termina em OC impressa. Só ficha
  // salva entra: antes, as quatro referências de demonstração eram oferecidas
  // como se fossem produto da empresa, e adjudicar gravava preço de fornecedor
  // na BOM de um produto que não existe.
  const availableRefs = useMemo(
    () => operationalCodes(sheetsMap, [], materializadas),
    [sheetsMap, materializadas],
  );

  const [selectedRef, setSelectedRef] = useState("");
  useEffect(() => {
    if (selectedRef && availableRefs.includes(selectedRef)) return;
    setSelectedRef(availableRefs[0] ?? "");
  }, [availableRefs, selectedRef]);

  const doc = selectedRef ? sheetsMap[selectedRef] : undefined;
  const requirements = useMemo(() => (doc ? explodeBomRequirements(doc) : []), [doc]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");

  const activeReq =
    requirements.find((r) => r.itemId === selectedItemId) ?? requirements[0] ?? null;

  const [quotesByKey, setQuotesByKey] = useState<Record<string, RfqSupplierQuote[]>>({});
  const quoteKey = activeReq ? `${selectedRef}:${activeReq.itemId}` : "";
  const activeQuotes = useMemo(() => {
    if (!activeReq) return [];
    return quotesByKey[quoteKey] ?? buildDefaultQuotesForItem(activeReq);
  }, [activeReq, quoteKey, quotesByKey]);

  const scoredQuotes = useMemo(
    () => (activeReq ? scoreRfqProposals(activeQuotes, activeReq) : []),
    [activeQuotes, activeReq],
  );
  const winner = scoredQuotes.find((q) => q.winner) ?? null;

  function patchQuote(quoteId: string, patch: Partial<RfqSupplierQuote>) {
    if (!activeReq) return;
    const next = activeQuotes.map((q) => (q.id === quoteId ? { ...q, ...patch } : q));
    setQuotesByKey((prev) => ({ ...prev, [quoteKey]: next }));
  }

  function awardWinner(q: (typeof scoredQuotes)[number]) {
    if (!activeReq || !doc) return;
    updateBomItem(selectedRef, activeReq.itemId, {
      fornecedor: q.fornecedor,
      custoUnitario: q.precoUnitario,
      custo: Number((q.precoUnitario * activeReq.consumoBrutoUnit).toFixed(2)),
    });
    toast.success(
      `Adjudicado para ${q.fornecedor} (R$ ${q.precoUnitario.toFixed(2)}/${activeReq.unidade}) — BOM de ${selectedRef} atualizada!`,
    );
  }

  function printOc() {
    if (!activeReq || !winner || !doc) return;
    const html = buildPurchaseOrderPrintableHtml(selectedRef, activeReq, winner);
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para emitir a Ordem de Compra A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  const fmtBrl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  if (availableRefs.length === 0) {
    return (
      <Card
        data-testid="rfq-sem-ficha"
        className="p-6 border-amber-500/40 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 space-y-2"
      >
        <p className="font-semibold flex items-center gap-1.5">
          <FileSpreadsheet className="h-4 w-4" />
          Nenhuma ficha salva para cotar
        </p>
        <p className="leading-relaxed">
          A cotação (RFQ) explode a BOM da ficha e termina em ordem de compra assinada. O modelo de
          demonstração não serve: a OC sairia comprando insumo de um produto que não existe. Abra a{" "}
          <Link to="/tech-sheet" className="underline font-medium">
            Ficha Técnica
          </Link>
          , monte a BOM e salve — a referência aparece aqui.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 border-border bg-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                Ficha Técnica (BOM)
              </Label>
              <select
                aria-label="Selecionar Ficha Técnica para RFQ"
                value={selectedRef}
                onChange={(e) => {
                  setSelectedRef(e.target.value);
                  setSelectedItemId("");
                }}
                className="h-9 rounded-md border border-border bg-background px-3 text-xs font-medium text-foreground"
              >
                {availableRefs.map((r) => (
                  <option key={r} value={r}>
                    {r} — {sheetsMap[r]?.meta?.name ?? r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-2xs uppercase text-muted-foreground block mb-1">
                Tiragem Planejada (peças)
              </Label>
              <Input
                type="number"
                min={10}
                step={50}
                value={doc?.preCost.tiragemPlanejada ?? 300}
                disabled={!doc}
                onChange={(e) => {
                  if (!doc) return;
                  updatePreCost(selectedRef, {
                    tiragemPlanejada: Math.max(10, Number(e.target.value) || 300),
                  });
                }}
                className="h-9 w-36 font-mono text-xs"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" asChild className="gap-1.5">
              <Link to="/tech-sheet" search={{ ref: selectedRef } as never}>
                <FileSpreadsheet className="h-3.5 w-3.5 text-primary" /> Abrir Ficha {selectedRef}
              </Link>
            </Button>
            {winner && (
              <Button type="button" size="sm" onClick={printOc} className="gap-1.5">
                <FileText className="h-3.5 w-3.5" /> Emitir OC A4
              </Button>
            )}
          </div>
        </div>

        {/* Explosão MRP da BOM */}
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="p-2.5 text-left">Insumo / Material</th>
                <th className="p-2.5 text-left">Fornecedor Atual</th>
                <th className="p-2.5 text-right">Consumo Bruto/pç</th>
                <th className="p-2.5 text-right">Necessidade Bruta</th>
                <th className="p-2.5 text-right">Estoque ALM</th>
                <th className="p-2.5 text-right">Compra Líquida</th>
                <th className="p-2.5 text-right">Custo Unit. Atual</th>
              </tr>
            </thead>
            <tbody>
              {requirements.map((r) => {
                const isSelected = activeReq?.itemId === r.itemId;
                return (
                  <tr
                    key={r.itemId}
                    onClick={() => setSelectedItemId(r.itemId)}
                    className={`cursor-pointer border-t border-border/60 transition-colors ${
                      isSelected ? "bg-primary/10" : "hover:bg-muted/40"
                    }`}
                  >
                    <td className="p-2.5 font-medium text-foreground">
                      <span className="text-2xs uppercase text-primary font-mono mr-1.5">
                        [{r.tipo}]
                      </span>
                      {r.material}
                    </td>
                    <td className="p-2.5 text-muted-foreground">{r.fornecedorAtual}</td>
                    <td className="p-2.5 text-right font-mono">
                      {r.consumoBrutoUnit.toFixed(2)} {r.unidade} (+{r.perdaPct}%)
                    </td>
                    <td className="p-2.5 text-right font-mono font-semibold text-foreground">
                      {r.necessidadeBrutaLote.toFixed(1)} {r.unidade}
                    </td>
                    <td className="p-2.5 text-right font-mono text-muted-foreground">
                      {r.estoqueDisponivel.toFixed(1)} {r.unidade}
                    </td>
                    <td className="p-2.5 text-right font-mono font-semibold">
                      {r.compraLiquidaNecessaria > 0 ? (
                        <span className="text-amber-500">
                          {r.compraLiquidaNecessaria.toFixed(1)} {r.unidade}
                        </span>
                      ) : (
                        <span className="text-emerald-500">Coberto ALM</span>
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono">{fmtBrl(r.custoUnitarioAtual)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Mapa Comparativo TCO (3 propostas) */}
      {activeReq && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" />
              Mapa Comparativo TCO · {activeReq.material} (Lote{" "}
              {(activeReq.compraLiquidaNecessaria > 0
                ? activeReq.compraLiquidaNecessaria
                : activeReq.necessidadeBrutaLote
              ).toFixed(1)}{" "}
              {activeReq.unidade})
            </h3>
            <span className="text-2xs text-muted-foreground">
              Pesos TCO: 60% Preço Efetivo (c/ MOQ) · 25% Lead Time · 15% OTIF
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {scoredQuotes.map((q) => (
              <Card
                key={q.id}
                className={`p-4 space-y-3 transition-all ${
                  q.winner
                    ? "border-primary bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <Input
                      value={q.fornecedor}
                      onChange={(e) => patchQuote(q.id, { fornecedor: e.target.value })}
                      className="h-8 text-xs font-semibold"
                    />
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      q.winner
                        ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 text-2xs gap-1"
                        : "text-2xs"
                    }
                  >
                    {q.winner && <Award className="h-3 w-3" />} TCO {q.scoreTco.toFixed(1)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <Label className="text-2xs uppercase text-muted-foreground">
                      Preço R$/{activeReq.unidade}
                    </Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0.05"
                      value={q.precoUnitario}
                      onChange={(e) =>
                        patchQuote(q.id, {
                          precoUnitario: Math.max(0.05, Number(e.target.value) || 0),
                        })
                      }
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-2xs uppercase text-muted-foreground">
                      MOQ ({activeReq.unidade})
                    </Label>
                    <Input
                      type="number"
                      step="10"
                      min="1"
                      value={q.moq}
                      onChange={(e) =>
                        patchQuote(q.id, { moq: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-2xs uppercase text-muted-foreground">
                      Lead Time (d)
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      value={q.leadTimeDias}
                      onChange={(e) =>
                        patchQuote(q.id, { leadTimeDias: Math.max(1, Number(e.target.value) || 1) })
                      }
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-2xs uppercase text-muted-foreground">OTIF (%)</Label>
                    <Input
                      type="number"
                      min="50"
                      max="100"
                      value={q.otifPct}
                      onChange={(e) =>
                        patchQuote(q.id, {
                          otifPct: Math.min(100, Math.max(0, Number(e.target.value) || 90)),
                        })
                      }
                      className="h-8 font-mono text-xs"
                    />
                  </div>
                </div>

                <div className="rounded-md border border-border/70 bg-muted/30 p-2.5 text-2xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Pedido (c/ MOQ):</span>
                    <strong className="font-mono text-foreground">
                      {fmtBrl(q.valorTotalPedido)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Excesso Lote Mínimo:</span>
                    <span className="font-mono">
                      {q.excessoMoq.toFixed(1)} {activeReq.unidade}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Saving no Lote:</span>
                    <strong
                      className={`font-mono ${
                        q.savingLote >= 0
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-500"
                      }`}
                    >
                      {q.savingLote >= 0 ? "+" : ""}
                      {fmtBrl(q.savingLote)} ({q.savingPct.toFixed(1)}%)
                    </strong>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  variant={q.winner ? "default" : "outline"}
                  onClick={() => awardWinner(q)}
                  className="w-full gap-1.5 text-xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Adjudicar & Atualizar BOM
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
