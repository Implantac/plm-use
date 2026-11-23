import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { GlossarioTermos } from "@/components/onboarding/GlossarioTermos";
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
  buildPurchaseOrderPrintableHtml,
  explodeBomRequirements,
  scoreRfqProposals,
} from "@/lib/techsheet/sourcing-rfq";
import {
  codigoOrdemCompra,
  convitesPendentes,
  quotesComparaveis,
  validarResposta,
  type RfqQuoteRow,
} from "@/lib/suppliers/rfq-quotes";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { operationalCodes } from "@/lib/techsheet/provenance";
import { motivoDe } from "@/lib/supabase/erro-humano";

export const Route = createFileRoute("/_authenticated/supplier-portal")({
  head: () => ({ meta: [{ title: "Portal do fornecedor · USE MODA PLM" }] }),
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

// Onda 119 — cotações persistidas por item da BOM.
function useRfqQuotes(referenceCode: string, bomItemId: string) {
  return useQuery({
    queryKey: ["rfq_quotes", referenceCode, bomItemId],
    enabled: Boolean(referenceCode && bomItemId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfq_quotes")
        .select("*")
        .eq("reference_code", referenceCode)
        .eq("bom_item_id", bomItemId)
        .order("created_at");
      if (error) throw error;
      return data as RfqQuoteRow[];
    },
  });
}

// Fornecedor logado no portal: a qual fornecedor pertence (ou nenhum, se é usuário interno).
function useMeuFornecedor() {
  return useQuery({
    queryKey: ["meu_fornecedor"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) return null;
      const { data, error } = await supabase
        .from("supplier_users")
        .select("supplier_id")
        .eq("user_id", uid)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data?.supplier_id ?? null;
    },
  });
}

function SupplierPortalPage() {
  return (
    <ModuleLayout
      title="Portal do Fornecedor & Sourcing RFQ"
      subtitle="Explosão MRP da BOM, cotações reais com fornecedores cadastrados (o fornecedor responde pelo portal), comparativo TCO, adjudicação que gera a ordem de compra e atualiza a Ficha Técnica."
      version="Sourcing v2.0"
    >
      <MinhasCotacoesPanel />
      {/* Onda 62: siglas medidas no texto desta tela, sem glossário até aqui. */}
      <GlossarioTermos
        siglas={["MOQ", "TCO", "OP", "BOM", "OTIF", "RFQ"]}
        testId="glossario-supplier-portal"
      />
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
    onError: (e) => toast.error(motivoDe(e, "cadastrar o fornecedor")),
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
                    aria-label="Código"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-2xs uppercase">Tipo</Label>
                  <Input
                    aria-label="Tipo"
                    value={form.tipo}
                    onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                    placeholder="confeccao, tecelagem…"
                  />
                </div>
              </div>
              <div>
                <Label className="text-2xs uppercase">Nome</Label>
                <Input
                  aria-label="Nome"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-2xs uppercase">Cidade</Label>
                  <Input
                    aria-label="Cidade"
                    value={form.cidade}
                    onChange={(e) => setForm({ ...form, cidade: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-2xs uppercase">UF</Label>
                  <Input
                    aria-label="UF"
                    value={form.uf}
                    onChange={(e) => setForm({ ...form, uf: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-2xs uppercase">Contato · nome</Label>
                <Input
                  aria-label="Contato · nome"
                  value={form.contato_nome}
                  onChange={(e) => setForm({ ...form, contato_nome: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-2xs uppercase">Contato · e-mail</Label>
                <Input
                  type="email"
                  aria-label="Contato · e-mail"
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
    onError: (e) => toast.error(motivoDe(e, "criar o pedido ao fornecedor")),
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
    onError: (e) => toast.error(motivoDe(e, "mover o pedido")),
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
                  aria-label="Fornecedor"
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
                    aria-label="Código OP"
                    value={form.codigo}
                    onChange={(e) => setForm({ ...form, codigo: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-2xs uppercase">Prazo</Label>
                  <Input
                    type="date"
                    aria-label="Prazo"
                    value={form.prazo}
                    onChange={(e) => setForm({ ...form, prazo: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-2xs uppercase">Descrição</Label>
                <Input
                  aria-label="Descrição"
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-2xs uppercase">Quantidade</Label>
                  <Input
                    type="number"
                    aria-label="Quantidade"
                    value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-2xs uppercase">Unidade</Label>
                  <Input
                    aria-label="Unidade"
                    value={form.unidade}
                    onChange={(e) => setForm({ ...form, unidade: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-2xs uppercase">Observações</Label>
                <Textarea
                  aria-label="Observações"
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
    onError: (e) => toast.error(motivoDe(e, "registrar a decisão da amostra")),
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

  const qc = useQueryClient();
  const suppliersQ = useSuppliers();
  const rfqQ = useRfqQuotes(selectedRef, activeReq?.itemId ?? "");
  const rows = useMemo(() => rfqQ.data ?? [], [rfqQ.data]);
  const supplierLites = useMemo(
    () => (suppliersQ.data ?? []).map((sp) => ({ id: sp.id, name: sp.name, uf: sp.uf ?? null })),
    [suppliersQ.data],
  );
  const activeQuotes = useMemo(() => quotesComparaveis(rows, supplierLites), [rows, supplierLites]);
  const pendentes = useMemo(() => convitesPendentes(rows), [rows]);
  const invalidar = () =>
    qc.invalidateQueries({ queryKey: ["rfq_quotes", selectedRef, activeReq?.itemId ?? ""] });

  const scoredQuotes = useMemo(
    () => (activeReq ? scoreRfqProposals(activeQuotes, activeReq) : []),
    [activeQuotes, activeReq],
  );
  const adjudicada = rows.find((r) => r.status === "adjudicada") ?? null;
  const winner =
    (adjudicada ? scoredQuotes.find((q) => q.id === adjudicada.id) : null) ??
    scoredQuotes.find((q) => q.winner) ??
    null;

  const awardMut = useMutation({
    mutationFn: async (q: (typeof scoredQuotes)[number]) => {
      if (!activeReq || !doc) throw new Error("Selecione um insumo da BOM.");
      const row = rows.find((r) => r.id === q.id);
      if (!row) throw new Error("Proposta não encontrada.");
      const need =
        activeReq.compraLiquidaNecessaria > 0
          ? activeReq.compraLiquidaNecessaria
          : activeReq.necessidadeBrutaLote;
      const prazo = new Date();
      prazo.setDate(prazo.getDate() + q.leadTimeDias);
      const { data: oc, error: e1 } = await supabase
        .from("supplier_orders")
        .insert({
          supplier_id: row.supplier_id,
          codigo: codigoOrdemCompra(selectedRef, activeReq.material),
          descricao: `${activeReq.material} — ficha ${selectedRef} (cotação adjudicada)`,
          quantidade: Math.max(need, q.moq),
          unidade: activeReq.unidade,
          prazo: prazo.toISOString().slice(0, 10),
          status: "enviada",
          observacoes: `R$ ${q.precoUnitario.toFixed(2)}/${activeReq.unidade} · MOQ ${q.moq} · ${q.condicaoPagamento || "pagamento a combinar"}`,
        })
        .select("id")
        .single();
      if (e1) throw e1;
      const { error: e2 } = await supabase
        .from("rfq_quotes")
        .update({ status: "adjudicada", supplier_order_id: oc.id })
        .eq("id", row.id);
      if (e2) throw e2;
      const outros = rows.filter((r) => r.id !== row.id && r.status !== "perdida").map((r) => r.id);
      if (outros.length) {
        const { error: e3 } = await supabase
          .from("rfq_quotes")
          .update({ status: "perdida" })
          .in("id", outros);
        if (e3) throw e3;
      }
      updateBomItem(selectedRef, activeReq.itemId, {
        fornecedor: q.fornecedor,
        custoUnitario: q.precoUnitario,
        custo: Number((q.precoUnitario * activeReq.consumoBrutoUnit).toFixed(2)),
      });
      return q;
    },
    onSuccess: (q) => {
      invalidar();
      qc.invalidateQueries({ queryKey: ["supplier_orders"] });
      toast.success(
        `Adjudicado para ${q.fornecedor} — ordem de compra criada e BOM de ${selectedRef} atualizada.`,
      );
    },
    onError: (e) => toast.error(motivoDe(e, "adjudicar a proposta")),
  });
  function awardWinner(q: (typeof scoredQuotes)[number]) {
    if (adjudicada) {
      toast.info("Este insumo já tem proposta adjudicada.");
      return;
    }
    awardMut.mutate(q);
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
                aria-label="Tiragem Planejada (peças)"
                value={doc?.preCost.tiragemPlanejada || 300}
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
                        <span className="text-amber-600 dark:text-amber-400">
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

      {!activeReq && doc && (
        <Card
          className="p-5 border-dashed border-border bg-muted/30 text-xs text-muted-foreground"
          data-testid="rfq-bom-vazia"
        >
          A ficha {selectedRef} ainda não tem insumos na BOM. Abra a Ficha Técnica, adicione os
          materiais e volte aqui para cotar.
        </Card>
      )}
      {activeReq && (
        <RfqQuotesPanel
          referenceCode={selectedRef}
          req={activeReq}
          rows={rows}
          scored={scoredQuotes}
          pendentes={pendentes}
          suppliers={supplierLites}
          adjudicada={Boolean(adjudicada)}
          carregando={rfqQ.isLoading}
          erro={rfqQ.isError ? motivoDe(rfqQ.error, "carregar as propostas") : null}
          onChanged={invalidar}
          onAward={awardWinner}
          fmtBrl={fmtBrl}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Onda 119 — propostas persistidas: convidar fornecedor cadastrado, registrar a
// proposta recebida (telefone/e-mail) e comparar lado a lado. Nada é inventado:
// sem proposta, o comparativo fica vazio e diz o que fazer.
// ---------------------------------------------------------------------------
type ScoredQuote = ReturnType<typeof scoreRfqProposals>[number];
type Requirement = ReturnType<typeof explodeBomRequirements>[number];

function RfqQuotesPanel(props: {
  referenceCode: string;
  req: Requirement;
  rows: RfqQuoteRow[];
  scored: ScoredQuote[];
  pendentes: RfqQuoteRow[];
  suppliers: { id: string; name: string; uf: string | null }[];
  adjudicada: boolean;
  carregando: boolean;
  erro: string | null;
  onChanged: () => void;
  onAward: (q: ScoredQuote) => void;
  fmtBrl: (v: number) => string;
}) {
  const { referenceCode, req, rows, scored, pendentes, suppliers, adjudicada, fmtBrl } = props;
  const need =
    req.compraLiquidaNecessaria > 0 ? req.compraLiquidaNecessaria : req.necessidadeBrutaLote;
  const jaConvidados = new Set(rows.map((r) => r.supplier_id));
  const disponiveis = suppliers.filter((sp) => !jaConvidados.has(sp.id));

  const [supplierId, setSupplierId] = useState("");
  const [modo, setModo] = useState<"convidar" | "registrar">("convidar");
  const [form, setForm] = useState({ preco: "", moq: "", lead: "", pgto: "", otif: "" });

  const addMut = useMutation({
    mutationFn: async () => {
      if (!supplierId) throw new Error("Escolha um fornecedor cadastrado.");
      const base = {
        reference_code: referenceCode,
        bom_item_id: req.itemId,
        material: req.material,
        unidade: req.unidade,
        quantidade: need,
        supplier_id: supplierId,
      };
      if (modo === "convidar") {
        const { error } = await supabase
          .from("rfq_quotes")
          .insert({ ...base, origem: "fornecedor" });
        if (error) throw error;
        return "Convite registrado — o fornecedor vê a cotação ao entrar no portal.";
      }
      const resposta = {
        precoUnitario: Number(String(form.preco).replace(",", ".")),
        moq: Number(form.moq) || Math.round(need),
        leadTimeDias: Number(form.lead) || 1,
      };
      const erro = validarResposta(resposta);
      if (erro) throw new Error(erro);
      const { error } = await supabase.from("rfq_quotes").insert({
        ...base,
        origem: "comprador",
        status: "respondida",
        preco_unitario: resposta.precoUnitario,
        moq: resposta.moq,
        lead_time_dias: resposta.leadTimeDias,
        otif_pct: Math.min(100, Math.max(0, Number(form.otif) || 0)),
        condicao_pagamento: form.pgto || null,
        respondido_em: new Date().toISOString(),
      });
      if (error) throw error;
      return "Proposta registrada.";
    },
    onSuccess: (msg) => {
      toast.success(msg);
      setSupplierId("");
      setForm({ preco: "", moq: "", lead: "", pgto: "", otif: "" });
      props.onChanged();
    },
    onError: (e) => toast.error(motivoDe(e, "salvar a cotação")),
  });

  const removeMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rfq_quotes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => props.onChanged(),
    onError: (e) => toast.error(motivoDe(e, "remover a proposta")),
  });

  const nome = (id: string) => suppliers.find((sp) => sp.id === id)?.name ?? "Fornecedor";

  return (
    <div className="space-y-3" data-testid="rfq-propostas">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          Propostas · {req.material} (lote {need.toFixed(1)} {req.unidade})
        </h3>
        <span className="text-2xs text-muted-foreground">
          Pesos TCO: 60% preço efetivo (com MOQ) · 25% prazo · 15% OTIF
        </span>
      </div>

      {!adjudicada && (
        <Card className="p-4 border-border bg-card space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[220px]">
              <Label
                htmlFor="rfq-fornecedor"
                className="text-2xs uppercase text-muted-foreground block mb-1"
              >
                Fornecedor cadastrado
              </Label>
              <select
                id="rfq-fornecedor"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-xs text-foreground"
              >
                <option value="">Selecione…</option>
                {disponiveis.map((sp) => (
                  <option key={sp.id} value={sp.id}>
                    {sp.name}
                    {sp.uf ? ` · ${sp.uf}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex rounded-md border border-border overflow-hidden text-xs">
              {(["convidar", "registrar"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModo(m)}
                  aria-pressed={modo === m}
                  className={`px-3 h-9 ${modo === m ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:text-foreground"}`}
                >
                  {m === "convidar" ? "Convidar pelo portal" : "Já tenho a proposta"}
                </button>
              ))}
            </div>
            {modo === "registrar" && (
              <>
                <div>
                  <Label
                    htmlFor="rfq-preco"
                    className="text-2xs uppercase text-muted-foreground block mb-1"
                  >
                    Preço/{req.unidade} (R$)
                  </Label>
                  <Input
                    id="rfq-preco"
                    inputMode="decimal"
                    value={form.preco}
                    onChange={(e) => setForm({ ...form, preco: e.target.value })}
                    className="h-9 w-28 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="rfq-moq"
                    className="text-2xs uppercase text-muted-foreground block mb-1"
                  >
                    Lote mínimo
                  </Label>
                  <Input
                    id="rfq-moq"
                    type="number"
                    min={1}
                    value={form.moq}
                    placeholder={String(Math.round(need))}
                    onChange={(e) => setForm({ ...form, moq: e.target.value })}
                    className="h-9 w-24 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="rfq-lead"
                    className="text-2xs uppercase text-muted-foreground block mb-1"
                  >
                    Prazo (dias)
                  </Label>
                  <Input
                    id="rfq-lead"
                    type="number"
                    min={1}
                    value={form.lead}
                    onChange={(e) => setForm({ ...form, lead: e.target.value })}
                    className="h-9 w-20 font-mono text-xs"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="rfq-pgto"
                    className="text-2xs uppercase text-muted-foreground block mb-1"
                  >
                    Pagamento
                  </Label>
                  <Input
                    id="rfq-pgto"
                    value={form.pgto}
                    placeholder="28/56 DDL"
                    onChange={(e) => setForm({ ...form, pgto: e.target.value })}
                    className="h-9 w-28 text-xs"
                  />
                </div>
                <div>
                  <Label
                    htmlFor="rfq-otif"
                    className="text-2xs uppercase text-muted-foreground block mb-1"
                  >
                    OTIF %
                  </Label>
                  <Input
                    id="rfq-otif"
                    type="number"
                    min={0}
                    max={100}
                    value={form.otif}
                    placeholder="0"
                    onChange={(e) => setForm({ ...form, otif: e.target.value })}
                    className="h-9 w-20 font-mono text-xs"
                  />
                </div>
              </>
            )}
            <Button
              type="button"
              size="sm"
              className="gap-1.5 min-h-11 sm:min-h-9"
              disabled={addMut.isPending || !supplierId}
              onClick={() => addMut.mutate()}
            >
              {modo === "convidar" ? (
                <Send className="h-3.5 w-3.5" />
              ) : (
                <PackagePlus className="h-3.5 w-3.5" />
              )}
              {modo === "convidar" ? "Convidar" : "Registrar proposta"}
            </Button>
          </div>
          {suppliers.length === 0 && (
            <p className="text-2xs text-amber-600 dark:text-amber-400">
              Nenhum fornecedor cadastrado — cadastre na aba Fornecedores para cotar.
            </p>
          )}
        </Card>
      )}

      {pendentes.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
          data-testid="rfq-pendentes"
        >
          <Clock className="h-3.5 w-3.5" />
          Aguardando resposta:
          {pendentes.map((p) => (
            <Badge key={p.id} variant="outline" className="gap-1.5 font-normal">
              {nome(p.supplier_id)}
              {!adjudicada && (
                <button
                  type="button"
                  aria-label={`Cancelar convite de ${nome(p.supplier_id)}`}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => removeMut.mutate(p.id)}
                >
                  <XCircle className="h-3 w-3" />
                </button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {props.erro ? (
        <Card
          className="p-4 border-status-rejected/40 bg-status-rejected/5 text-xs text-foreground"
          data-testid="rfq-erro"
        >
          {props.erro} As propostas ficam salvas no banco — recarregue a página ou tente de novo.
        </Card>
      ) : props.carregando ? (
        <p className="text-xs text-muted-foreground">Carregando propostas…</p>
      ) : scored.length === 0 ? (
        <Card
          className="p-5 border-dashed border-border bg-muted/30 text-xs text-muted-foreground"
          data-testid="rfq-sem-propostas"
        >
          Nenhuma proposta para este insumo ainda. Convide um fornecedor pelo portal ou registre a
          proposta que você já recebeu — o comparativo aparece aqui.
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {scored.map((q) => {
            const row = rows.find((r) => r.id === q.id);
            const ganhou = row?.status === "adjudicada";
            return (
              <Card
                key={q.id}
                className={`p-4 space-y-3 border ${ganhou ? "border-primary ring-1 ring-primary/40" : q.winner && !adjudicada ? "border-primary/50" : "border-border"} bg-card`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{q.fornecedor}</p>
                    <p className="text-2xs text-muted-foreground">
                      {q.uf || "—"} ·{" "}
                      {row?.origem === "fornecedor"
                        ? "respondeu pelo portal"
                        : "proposta registrada pelo comprador"}
                    </p>
                  </div>
                  {ganhou ? (
                    <Badge className="gap-1">
                      <Award className="h-3 w-3" /> Adjudicada
                    </Badge>
                  ) : q.winner && !adjudicada ? (
                    <Badge variant="outline" className="gap-1 border-primary/50 text-primary">
                      Melhor TCO
                    </Badge>
                  ) : null}
                </div>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                  <dt className="text-muted-foreground">Preço/{req.unidade}</dt>
                  <dd className="font-mono text-right font-semibold">{fmtBrl(q.precoUnitario)}</dd>
                  <dt className="text-muted-foreground">Lote mínimo</dt>
                  <dd className="font-mono text-right">
                    {q.moq} {req.unidade}
                    {q.excessoMoq > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400">
                        {" "}
                        (+{q.excessoMoq.toFixed(1)} além da necessidade)
                      </span>
                    ) : null}
                  </dd>
                  <dt className="text-muted-foreground">Prazo</dt>
                  <dd className="font-mono text-right">{q.leadTimeDias} dias</dd>
                  <dt className="text-muted-foreground">Pagamento</dt>
                  <dd className="text-right">{q.condicaoPagamento || "—"}</dd>
                  <dt className="text-muted-foreground">OTIF</dt>
                  <dd className="font-mono text-right">{q.otifPct}%</dd>
                  <dt className="text-muted-foreground">Total do pedido</dt>
                  <dd className="font-mono text-right font-semibold">
                    {fmtBrl(q.valorTotalPedido)}
                  </dd>
                  <dt className="text-muted-foreground">Versus custo atual</dt>
                  <dd
                    className={`font-mono text-right font-semibold ${q.savingLote >= 0 ? "text-status-approved" : "text-status-rejected"}`}
                  >
                    {q.savingLote >= 0 ? "+" : ""}
                    {fmtBrl(q.savingLote)} ({q.savingPct.toFixed(1)}%)
                  </dd>
                  <dt className="text-muted-foreground">Score TCO</dt>
                  <dd className="font-mono text-right">{q.scoreTco.toFixed(1)}</dd>
                </dl>
                {!adjudicada && (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={q.winner ? "default" : "outline"}
                      onClick={() => props.onAward(q)}
                      className="flex-1 gap-1.5 text-xs min-h-11 sm:min-h-9"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Adjudicar e gerar OC
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Remover proposta de ${q.fornecedor}`}
                      onClick={() => removeMut.mutate(q.id)}
                      className="min-h-11 sm:min-h-9"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                {ganhou && row?.supplier_order_id && (
                  <p className="text-2xs text-muted-foreground">
                    Ordem de compra criada — acompanhe na aba Ordens de Produção.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Fornecedor logado: cotações que a marca pediu e ainda não foram respondidas.
function MinhasCotacoesPanel() {
  const meu = useMeuFornecedor();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["minhas_cotacoes", meu.data],
    enabled: Boolean(meu.data),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rfq_quotes")
        .select("*")
        .eq("supplier_id", meu.data as string)
        .in("status", ["convidada", "respondida"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RfqQuoteRow[];
    },
  });
  const [drafts, setDrafts] = useState<
    Record<string, { preco: string; moq: string; lead: string; pgto: string }>
  >({});
  const responder = useMutation({
    mutationFn: async (row: RfqQuoteRow) => {
      const d = drafts[row.id] ?? { preco: "", moq: "", lead: "", pgto: "" };
      const resposta = {
        precoUnitario: Number(String(d.preco).replace(",", ".")),
        moq: Number(d.moq) || Math.round(Number(row.quantidade)) || 1,
        leadTimeDias: Number(d.lead) || 0,
      };
      const erro = validarResposta(resposta);
      if (erro) throw new Error(erro);
      const { error } = await supabase
        .from("rfq_quotes")
        .update({
          status: "respondida",
          preco_unitario: resposta.precoUnitario,
          moq: resposta.moq,
          lead_time_dias: resposta.leadTimeDias,
          condicao_pagamento: d.pgto || null,
          respondido_em: new Date().toISOString(),
        })
        .eq("id", row.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Proposta enviada à marca.");
      qc.invalidateQueries({ queryKey: ["minhas_cotacoes"] });
    },
    onError: (e) => toast.error(motivoDe(e, "enviar a proposta")),
  });
  if (!meu.data || !q.data || q.data.length === 0) return null;
  const pendentes = q.data.filter((r) => r.status === "convidada");
  return (
    <Card className="p-4 border-primary/40 bg-primary/5 space-y-3" data-testid="minhas-cotacoes">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Send className="h-4 w-4 text-primary" />
        Cotações para você responder ({pendentes.length})
      </h2>
      {pendentes.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Todas respondidas — a marca está comparando as propostas.
        </p>
      )}
      {pendentes.map((row) => {
        const d = drafts[row.id] ?? { preco: "", moq: "", lead: "", pgto: "" };
        const set = (patch: Partial<typeof d>) =>
          setDrafts({ ...drafts, [row.id]: { ...d, ...patch } });
        return (
          <div key={row.id} className="rounded-md border border-border bg-card p-3 space-y-2">
            <p className="text-xs font-medium text-foreground">
              {row.material} · {Number(row.quantidade).toFixed(1)} {row.unidade} · ficha{" "}
              {row.reference_code}
            </p>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label
                  htmlFor={`mc-preco-${row.id}`}
                  className="text-2xs uppercase text-muted-foreground block mb-1"
                >
                  Preço/{row.unidade} (R$)
                </Label>
                <Input
                  id={`mc-preco-${row.id}`}
                  inputMode="decimal"
                  value={d.preco}
                  onChange={(e) => set({ preco: e.target.value })}
                  className="h-9 w-28 font-mono text-xs"
                />
              </div>
              <div>
                <Label
                  htmlFor={`mc-moq-${row.id}`}
                  className="text-2xs uppercase text-muted-foreground block mb-1"
                >
                  Lote mínimo
                </Label>
                <Input
                  id={`mc-moq-${row.id}`}
                  type="number"
                  min={1}
                  value={d.moq}
                  placeholder={String(Math.round(Number(row.quantidade)))}
                  onChange={(e) => set({ moq: e.target.value })}
                  className="h-9 w-24 font-mono text-xs"
                />
              </div>
              <div>
                <Label
                  htmlFor={`mc-lead-${row.id}`}
                  className="text-2xs uppercase text-muted-foreground block mb-1"
                >
                  Prazo (dias)
                </Label>
                <Input
                  id={`mc-lead-${row.id}`}
                  type="number"
                  min={1}
                  value={d.lead}
                  onChange={(e) => set({ lead: e.target.value })}
                  className="h-9 w-20 font-mono text-xs"
                />
              </div>
              <div>
                <Label
                  htmlFor={`mc-pgto-${row.id}`}
                  className="text-2xs uppercase text-muted-foreground block mb-1"
                >
                  Pagamento
                </Label>
                <Input
                  id={`mc-pgto-${row.id}`}
                  value={d.pgto}
                  placeholder="28/56 DDL"
                  onChange={(e) => set({ pgto: e.target.value })}
                  className="h-9 w-28 text-xs"
                />
              </div>
              <Button
                type="button"
                size="sm"
                className="gap-1.5 min-h-11 sm:min-h-9"
                disabled={responder.isPending}
                onClick={() => responder.mutate(row)}
              >
                <Send className="h-3.5 w-3.5" /> Enviar proposta
              </Button>
            </div>
          </div>
        );
      })}
    </Card>
  );
}
