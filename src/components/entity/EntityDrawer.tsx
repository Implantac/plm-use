// Drawer universal de entidade — o painel padronizado exigido pelo manifesto.
// Abas: Resumo · Timeline · Relações · Workflow.
// Hoje entende referência com detalhe; outras entidades caem em modo genérico.
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  GitBranch,
  History,
  Layers,
  Link2,
  Loader2,
  Package,
  Sparkles,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useReferences, REFERENCE_STATUS_LABEL, type ReferenceRow } from "@/hooks/use-references";
import { useEventEmitter } from "@/hooks/use-entity-events";
import { EntityTimeline } from "@/components/entity/EntityTimeline";
import { EntityRelations } from "@/components/entity/EntityRelations";
import type { EntityRef } from "@/components/entity/EntityContext";

const ENTITY_LABEL: Record<string, string> = {
  reference: "Referência",
  lote: "Lote",
  tech_sheet: "Ficha Técnica",
  piloto: "Piloto",
  capa: "CAPA",
  engenharia: "Engenharia",
  facao_order: "Ordem de Facção",
};

export function EntityDrawer({
  entity,
  onClose,
}: {
  entity: EntityRef | null;
  onClose: () => void;
}) {
  const open = !!entity;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl border-l border-white/10 bg-black/95 text-white p-0 overflow-y-auto"
      >
        {entity && <DrawerBody entity={entity} onClose={onClose} />}
      </SheetContent>
    </Sheet>
  );
}

function DrawerBody({ entity, onClose }: { entity: EntityRef; onClose: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <SheetHeader className="p-5 border-b border-white/10">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
              {ENTITY_LABEL[entity.type] ?? entity.type}
            </p>
            <SheetTitle className="text-xl text-white mt-1">
              {entity.title ?? entity.id.slice(0, 8)}
            </SheetTitle>
            {entity.subtitle && (
              <p className="text-[11px] text-muted-foreground mt-0.5">{entity.subtitle}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto p-5">
        {entity.type === "reference" ? (
          <ReferenceBody id={entity.id} />
        ) : (
          <GenericBody entity={entity} />
        )}
      </div>
    </div>
  );
}

// ---------- Referência ----------

function ReferenceBody({ id }: { id: string }) {
  const { items, nextStatuses, transition } = useReferences();
  const [row, setRow] = useState<ReferenceRow | null>(null);
  const [loading, setLoading] = useState(true);
  const { emit } = useEventEmitter();

  useEffect(() => {
    const found = items.find((r) => r.id === id);
    if (found) {
      setRow(found);
      setLoading(false);
      return;
    }
    // fallback direto ao banco
    let cancelled = false;
    setLoading(true);
    supabase
      .from("references")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setRow((data as ReferenceRow | null) ?? null);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, items]);

  const next = useMemo(() => (row ? nextStatuses(row.status) : []), [row, nextStatuses]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Carregando referência…
      </div>
    );
  }

  if (!row) {
    return (
      <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[11px] text-muted-foreground">
        Referência não encontrada.
      </div>
    );
  }

  const doTransition = async (to: typeof row.status) => {
    const ok = await transition(row, to);
    if (ok) {
      await emit({
        entity_type: "reference",
        entity_id: row.id,
        event_type: "status_changed",
        from_status: row.status,
        to_status: to,
        note: `Transição manual via drawer`,
      });
      toast.success(`Status → ${REFERENCE_STATUS_LABEL[to]}`);
    } else {
      toast.error("Transição não permitida");
    }
  };

  return (
    <Tabs defaultValue="summary">
      <TabsList className="bg-white/[0.04] border border-white/10">
        <TabsTrigger value="summary" className="text-[10px] gap-1">
          <Package className="h-3 w-3" /> Resumo
        </TabsTrigger>
        <TabsTrigger value="workflow" className="text-[10px] gap-1">
          <GitBranch className="h-3 w-3" /> Workflow
        </TabsTrigger>
        <TabsTrigger value="timeline" className="text-[10px] gap-1">
          <History className="h-3 w-3" /> Timeline
        </TabsTrigger>
        <TabsTrigger value="relations" className="text-[10px] gap-1">
          <Link2 className="h-3 w-3" /> Relações
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="mt-4 space-y-3">
        <div className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] p-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Código</p>
            <p className="text-lg font-bold text-white">{row.code}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Status</p>
            <Badge className="mt-1 bg-primary/15 text-primary border-primary/30">
              {REFERENCE_STATUS_LABEL[row.status]}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <Field label="Nome" value={row.name} />
          <Field label="Coleção" value={row.collection_id ?? "—"} />
          <Field label="Linha" value={row.line ?? "—"} />
          <Field label="Tema" value={row.theme ?? "—"} />
          <Field label="Temporada" value={row.season ?? "—"} />
          <Field label="Prioridade" value={row.priority} />
          <Field
            label="Custo alvo"
            value={row.target_cost != null ? `R$ ${Number(row.target_cost).toFixed(2)}` : "—"}
          />
          <Field
            label="Preço alvo"
            value={row.target_price != null ? `R$ ${Number(row.target_price).toFixed(2)}` : "—"}
          />
          <Field label="ERP produto" value={row.erp_product_id ?? "—"} />
          <Field label="Criada em" value={new Date(row.created_at).toLocaleDateString("pt-BR")} />
        </div>
      </TabsContent>

      <TabsContent value="workflow" className="mt-4">
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Próximas transições permitidas
          </p>
          {next.length === 0 ? (
            <div className="text-[11px] text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Nenhuma transição a partir de{" "}
              <b className="text-white">{REFERENCE_STATUS_LABEL[row.status]}</b>.
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {next.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  className="border-primary/30 text-primary hover:bg-primary/10 h-8"
                  onClick={() => doTransition(s)}
                >
                  <ArrowRight className="h-3 w-3 mr-1" />
                  {REFERENCE_STATUS_LABEL[s]}
                </Button>
              ))}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="timeline" className="mt-4">
        <EntityTimeline entityType="reference" entityId={row.id} />
      </TabsContent>

      <TabsContent value="relations" className="mt-4">
        <EntityRelations entityType="reference" entityId={row.id} />
      </TabsContent>
    </Tabs>
  );
}

// ---------- Genérico ----------

function GenericBody({ entity }: { entity: EntityRef }) {
  return (
    <Tabs defaultValue="timeline">
      <TabsList className="bg-white/[0.04] border border-white/10">
        <TabsTrigger value="timeline" className="text-[10px] gap-1">
          <History className="h-3 w-3" /> Timeline
        </TabsTrigger>
        <TabsTrigger value="relations" className="text-[10px] gap-1">
          <Link2 className="h-3 w-3" /> Relações
        </TabsTrigger>
        <TabsTrigger value="raw" className="text-[10px] gap-1">
          <Layers className="h-3 w-3" /> ID
        </TabsTrigger>
      </TabsList>
      <TabsContent value="timeline" className="mt-4">
        <EntityTimeline entityType={entity.type} entityId={entity.id} />
      </TabsContent>
      <TabsContent value="relations" className="mt-4">
        <EntityRelations entityType={entity.type} entityId={entity.id} />
      </TabsContent>
      <TabsContent value="raw" className="mt-4">
        <div className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[11px] font-mono text-muted-foreground break-all">
          {entity.type} · {entity.id}
        </div>
      </TabsContent>
    </Tabs>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.03] p-2.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="text-[12px] text-white truncate">{value}</p>
    </div>
  );
}
