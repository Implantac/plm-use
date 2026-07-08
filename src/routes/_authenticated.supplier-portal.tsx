import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Factory, PackagePlus, Send, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/supplier-portal")({
  component: SupplierPortalPage,
});

type Supplier = {
  id: string; code: string; name: string; tipo: string; status: string;
  cidade: string | null; uf: string | null; contato_nome: string | null;
  contato_email: string | null;
};
type Order = {
  id: string; codigo: string; supplier_id: string; descricao: string | null;
  quantidade: number; unidade: string; prazo: string | null; status: string;
  observacoes: string | null; supplier_response: string | null;
  supplier_responded_at: string | null; created_at: string;
};
type Sample = {
  id: string; supplier_order_id: string; supplier_id: string; observacoes: string | null;
  decision: string; decision_note: string | null; created_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  enviada: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  aceita: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  em_producao: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  amostra_enviada: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  aprovada: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejeitada: "bg-red-500/15 text-red-300 border-red-500/30",
  concluida: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  cancelada: "bg-neutral-500/15 text-neutral-300 border-neutral-500/30",
};

function useSuppliers() {
  return useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers").select("*").order("name");
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
        .from("supplier_orders").select("*").order("created_at", { ascending: false });
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
        .from("supplier_sample_submissions").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Sample[];
    },
  });
}

function SupplierPortalPage() {
  return (
    <ModuleLayout
      title="Portal do Fornecedor"
      subtitle="Cadastro, ordens de produção e amostras — visão interna + espaço do fornecedor externo"
      version="v1.0"
    >
      <Tabs defaultValue="suppliers" className="w-full">
        <TabsList className="bg-white/5 border border-white/10">
          <TabsTrigger value="suppliers">Fornecedores</TabsTrigger>
          <TabsTrigger value="orders">Ordens de Produção</TabsTrigger>
          <TabsTrigger value="samples">Amostras</TabsTrigger>
        </TabsList>
        <TabsContent value="suppliers" className="mt-4"><SuppliersTab /></TabsContent>
        <TabsContent value="orders" className="mt-4"><OrdersTab /></TabsContent>
        <TabsContent value="samples" className="mt-4"><SamplesTab /></TabsContent>
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
    code: "", name: "", tipo: "confeccao", cidade: "", uf: "",
    contato_nome: "", contato_email: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("suppliers").insert({
        ...form, created_by: user.user?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Fornecedor criado");
      setOpen(false);
      setForm({ code: "", name: "", tipo: "confeccao", cidade: "", uf: "", contato_nome: "", contato_email: "" });
      qc.invalidateQueries({ queryKey: ["suppliers"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="btn-primary-premium gap-1">
              <PackagePlus className="w-3.5 h-3.5" /> Novo fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Cadastrar fornecedor</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px] uppercase">Código</Label>
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></div>
                <div><Label className="text-[10px] uppercase">Tipo</Label>
                  <Input value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })} placeholder="confeccao, tecelagem…" /></div>
              </div>
              <div><Label className="text-[10px] uppercase">Nome</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px] uppercase">Cidade</Label>
                  <Input value={form.cidade} onChange={(e) => setForm({ ...form, cidade: e.target.value })} /></div>
                <div><Label className="text-[10px] uppercase">UF</Label>
                  <Input value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value })} /></div>
              </div>
              <div><Label className="text-[10px] uppercase">Contato · nome</Label>
                <Input value={form.contato_nome} onChange={(e) => setForm({ ...form, contato_nome: e.target.value })} /></div>
              <div><Label className="text-[10px] uppercase">Contato · e-mail</Label>
                <Input type="email" value={form.contato_email} onChange={(e) => setForm({ ...form, contato_email: e.target.value })} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()} disabled={!form.code || !form.name || create.isPending}>
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
                <p className="text-[11px] text-muted-foreground">
                  {s.tipo}{s.cidade ? ` · ${s.cidade}/${s.uf}` : ""}
                  {s.contato_nome ? ` · ${s.contato_nome}` : ""}
                </p>
              </div>
              <Badge variant="outline" className="text-[10px] uppercase">{s.status}</Badge>
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
    supplier_id: "", codigo: "", descricao: "",
    quantidade: 0, unidade: "pc", prazo: "", observacoes: "",
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
      setForm({ supplier_id: "", codigo: "", descricao: "", quantidade: 0, unidade: "pc", prazo: "", observacoes: "" });
      qc.invalidateQueries({ queryKey: ["supplier_orders"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Falha"),
  });

  const transition = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data: user } = await supabase.auth.getUser();
      const { error } = await supabase.from("supplier_orders")
        .update({ status, updated_by: user.user?.id }).eq("id", id);
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
            <Button size="sm" className="btn-primary-premium gap-1" disabled={!suppliers?.length}>
              <Send className="w-3.5 h-3.5" /> Nova OP
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova ordem de produção</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div>
                <Label className="text-[10px] uppercase">Fornecedor</Label>
                <select
                  className="w-full h-9 rounded-md border border-white/10 bg-white/5 text-[12px] px-2"
                  value={form.supplier_id}
                  onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                >
                  <option value="">Selecione…</option>
                  {(suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>{s.code} · {s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px] uppercase">Código OP</Label>
                  <Input value={form.codigo} onChange={(e) => setForm({ ...form, codigo: e.target.value })} /></div>
                <div><Label className="text-[10px] uppercase">Prazo</Label>
                  <Input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} /></div>
              </div>
              <div><Label className="text-[10px] uppercase">Descrição</Label>
                <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-[10px] uppercase">Quantidade</Label>
                  <Input type="number" value={form.quantidade}
                    onChange={(e) => setForm({ ...form, quantidade: Number(e.target.value) })} /></div>
                <div><Label className="text-[10px] uppercase">Unidade</Label>
                  <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} /></div>
              </div>
              <div><Label className="text-[10px] uppercase">Observações</Label>
                <Textarea value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} rows={2} /></div>
            </div>
            <DialogFooter>
              <Button onClick={() => create.mutate()}
                disabled={!form.supplier_id || !form.codigo || create.isPending}>
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
                  <p className="text-[11px] text-muted-foreground">
                    {o.descricao ?? "—"} · {o.quantidade} {o.unidade}
                    {o.prazo ? ` · prazo ${new Date(o.prazo).toLocaleDateString("pt-BR")}` : ""}
                  </p>
                  {o.supplier_response && (
                    <p className="text-[10px] text-cyan-300 mt-1">Fornecedor: {o.supplier_response}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline" className={`text-[10px] uppercase ${STATUS_COLORS[o.status] ?? ""}`}>
                    {o.status}
                  </Badge>
                  <div className="flex gap-1 mt-1">
                    {o.status === "enviada" && (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                          onClick={() => transition.mutate({ id: o.id, status: "aceita" })}>
                          <CheckCircle2 className="w-3 h-3" /> Aceitar
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                          onClick={() => transition.mutate({ id: o.id, status: "cancelada" })}>
                          <XCircle className="w-3 h-3" /> Cancelar
                        </Button>
                      </>
                    )}
                    {o.status === "aceita" && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                        onClick={() => transition.mutate({ id: o.id, status: "em_producao" })}>
                        <Clock className="w-3 h-3" /> Iniciar produção
                      </Button>
                    )}
                    {o.status === "em_producao" && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px]"
                        onClick={() => transition.mutate({ id: o.id, status: "concluida" })}>
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
      const { error } = await supabase.from("supplier_sample_submissions").update({
        decision, decision_note: note ?? null,
        decided_by: user.user?.id, decided_at: new Date().toISOString(),
      }).eq("id", id);
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
            <p className="text-[11px] text-muted-foreground">{s.observacoes ?? "—"}</p>
            {s.decision_note && <p className="text-[10px] text-cyan-300 mt-1">Nota: {s.decision_note}</p>}
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={`text-[10px] uppercase ${
              s.decision === "aprovada" ? STATUS_COLORS.aprovada :
              s.decision === "reprovada" ? STATUS_COLORS.rejeitada : STATUS_COLORS.enviada
            }`}>{s.decision}</Badge>
            {s.decision === "pendente" && (
              <div className="flex gap-1 mt-1">
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                  onClick={() => decide.mutate({ id: s.id, decision: "aprovada" })}>
                  <CheckCircle2 className="w-3 h-3" /> Aprovar
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
                  onClick={() => decide.mutate({ id: s.id, decision: "reprovada" })}>
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
