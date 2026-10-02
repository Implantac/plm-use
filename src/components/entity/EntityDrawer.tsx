// Drawer universal de entidade — o painel padronizado exigido pelo manifesto.
// Abas: Resumo · Timeline · Relações · Workflow.
// Hoje entende referência com detalhe; outras entidades caem em modo genérico.
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Check,
  Circle,
  GitBranch,
  History,
  ImageOff,
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
import { OptimizedImage } from "@/components/OptimizedImage";
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
  supplier: "Fornecedor",
};

const PRODUCT_LIFECYCLE = [
  "IDEIA",
  "CROQUI",
  "MODELAGEM",
  "PILOTO",
  "AJUSTE",
  "APROVACAO",
  "ENGENHARIA",
  "PRODUCAO",
  "FINALIZADA",
] as const;

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
          <Button variant="ghost" size="sm" onClick={onClose} className="w-8 p-0">
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
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState("summary");
  const [newTimelineCount, setNewTimelineCount] = useState(0);
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
    setLoadError(false);
    supabase
      .from("references")
      .select("*")
      .eq("id", id)
      .maybeSingle()
      .then(
        ({ data, error }) => {
          if (cancelled) return;
          setRow((data as ReferenceRow | null) ?? null);
          setLoadError(Boolean(error));
          setLoading(false);
        },
        () => {
          if (cancelled) return;
          setLoadError(true);
          setLoading(false);
        },
      );
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
        {loadError
          ? "Não foi possível carregar esta referência. Verifique a conexão e tente novamente."
          : "Referência não encontrada."}
      </div>
    );
  }

  const lifecycleIndex = PRODUCT_LIFECYCLE.indexOf(
    row.status as (typeof PRODUCT_LIFECYCLE)[number],
  );
  const currentNext = next[0];
  const metadata = row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? (row.metadata as Record<string, unknown>)
    : {};
  const generatedImages = Array.isArray(metadata.generated_images)
    ? metadata.generated_images.flatMap((entry) => {
        if (!entry || typeof entry !== "object" || Array.isArray(entry)) return [];
        const image = entry as Record<string, unknown>;
        return typeof image.storage_path === "string" && typeof image.view === "string"
          ? [{ path: image.storage_path, view: image.view }]
          : [];
      })
    : [];

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
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="w-full justify-start overflow-x-auto bg-white/[0.04] border border-white/10">
        <TabsTrigger value="summary" className="text-[10px] gap-1">
          <Package className="h-3 w-3" /> Produto
        </TabsTrigger>
        <TabsTrigger value="workflow" className="text-[10px] gap-1">
          <GitBranch className="h-3 w-3" /> Workflow
        </TabsTrigger>
        <TabsTrigger value="timeline" className="text-[10px] gap-1 relative">
          <History className="h-3 w-3" /> Timeline
          {newTimelineCount > 0 && (
            <Badge className="ml-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] leading-none flex items-center justify-center animate-pulse">
              {newTimelineCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="relations" className="text-[10px] gap-1">
          <Link2 className="h-3 w-3" /> Relações
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary" className="mt-4 space-y-5">
        <section className="grid gap-4 sm:grid-cols-[minmax(150px,0.75fr)_1.25fr]">
          <div className="overflow-hidden rounded-md border border-white/10 bg-white/[0.03]">
            {row.image_url ? (
              <OptimizedImage
                src={row.image_url}
                alt={`Imagem principal de ${row.name}`}
                aspectRatio="portrait"
                priority
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[3/4] flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
                <ImageOff className="h-6 w-6" />
                <span className="text-xs">Imagem principal ainda não adicionada</span>
              </div>
            )}
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-semibold uppercase text-primary">{row.code}</p>
              <h2 className="mt-1 text-xl font-semibold text-white">{row.name}</h2>
              <Badge className="mt-2 bg-primary/15 text-primary border-primary/30">
                {REFERENCE_STATUS_LABEL[row.status]}
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <Field label="Coleção" value={row.collection_id ?? "Não vinculada"} />
              <Field label="Linha" value={row.line ?? "Não definida"} />
              <Field label="Tema" value={row.theme ?? "Não definido"} />
              <Field label="Temporada" value={row.season ?? "Não definida"} />
              <Field label="Prioridade" value={row.priority} />
              <Field
                label="Meta de custo (não realizado)"
                value={
                  row.target_cost != null ? `R$ ${Number(row.target_cost).toFixed(2)}` : "Sem meta"
                }
              />
              <Field
                label="Meta de preço (não realizado)"
                value={
                  row.target_price != null
                    ? `R$ ${Number(row.target_price).toFixed(2)}`
                    : "Sem meta"
                }
              />
              <Field label="ERP" value={row.erp_product_id ?? "Ainda não vinculado"} />
            </div>
          </div>
        </section>

        {generatedImages.length > 0 && (
          <section aria-labelledby="reference-ai-images-title" className="space-y-3">
            <div>
              <h3 id="reference-ai-images-title" className="text-sm font-semibold text-white">
                Conceitos visuais gerados
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Imagens conceituais salvas no armazenamento do projeto.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {generatedImages.map((image, index) => (
                <div key={`${image.path}-${index}`} className="overflow-hidden rounded-md border border-white/10">
                  <OptimizedImage
                    src={`storage://use-moda-assets/${image.path}`}
                    alt={`Conceito visual ${image.view} de ${row.name}`}
                    aspectRatio="portrait"
                  />
                  <p className="px-2 py-1.5 text-xs capitalize text-muted-foreground">{image.view}</p>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Conceitos de IA para exploração. Validar a peça e sua construção antes do desenvolvimento.
            </p>
          </section>
        )}

        <section aria-labelledby="reference-lifecycle-title" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 id="reference-lifecycle-title" className="text-sm font-semibold text-white">
              Ciclo de vida
            </h3>
            <span className="text-[10px] text-muted-foreground">
              Etapa atual: {REFERENCE_STATUS_LABEL[row.status]}
            </span>
          </div>
          {row.status === "ARQUIVADA" ? (
            <p className="rounded-md border border-white/10 bg-white/[0.02] p-3 text-xs text-muted-foreground">
              Esta referência está arquivada e permanece disponível no histórico.
            </p>
          ) : (
            <ol className="flex gap-2 overflow-x-auto pb-2">
              {PRODUCT_LIFECYCLE.map((status, index) => {
                const complete = lifecycleIndex >= 0 && index < lifecycleIndex;
                const current = index === lifecycleIndex;
                return (
                  <li
                    key={status}
                    className="flex min-w-[76px] flex-1 flex-col items-center gap-2 text-center"
                  >
                    <span
                      aria-current={current ? "step" : undefined}
                      className={`flex h-7 w-7 items-center justify-center rounded-full border ${
                        current
                          ? "border-primary bg-primary/15 text-primary"
                          : complete
                            ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                            : "border-white/15 text-muted-foreground"
                      }`}
                    >
                      {complete ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Circle className="h-2.5 w-2.5" />
                      )}
                    </span>
                    <span
                      className={`text-[9px] leading-tight ${current ? "text-primary" : "text-muted-foreground"}`}
                    >
                      {REFERENCE_STATUS_LABEL[status]}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </section>

        <section className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-white">Próximo passo</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Transições disponíveis conforme o workflow desta referência.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setTab("relations")}>
              <Link2 className="mr-1.5 h-3.5 w-3.5" /> Ver vínculos
            </Button>
          </div>
          {currentNext ? (
            <Button size="sm" onClick={() => void doTransition(currentNext)}>
              Avançar para {REFERENCE_STATUS_LABEL[currentNext]}
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhuma transição disponível nesta etapa.
            </p>
          )}
        </section>

        <section className="rounded-md border border-dashed border-white/15 bg-white/[0.02] p-4">
          <h3 className="text-sm font-medium text-white">Documentos e ficha técnica</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Os anexos da referência ainda não estão conectados a este workspace. A rota de ficha
            técnica atual não está vinculada a um registro real desta referência.
          </p>
        </section>
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
                  className="border-primary/30 text-primary hover:bg-primary/10"
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
        <EntityTimeline
          entityType="reference"
          entityId={row.id}
          active={tab === "timeline"}
          onNewCountChange={setNewTimelineCount}
        />
      </TabsContent>

      <TabsContent value="relations" className="mt-4">
        <EntityRelations entityType="reference" entityId={row.id} />
      </TabsContent>
    </Tabs>
  );
}

// ---------- Genérico ----------

function GenericBody({ entity }: { entity: EntityRef }) {
  const [tab, setTab] = useState("timeline");
  const [newTimelineCount, setNewTimelineCount] = useState(0);

  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList className="bg-white/[0.04] border border-white/10">
        <TabsTrigger value="timeline" className="text-[10px] gap-1 relative">
          <History className="h-3 w-3" /> Timeline
          {newTimelineCount > 0 && (
            <Badge className="ml-1 h-4 min-w-4 px-1 rounded-full bg-primary text-primary-foreground text-[9px] leading-none flex items-center justify-center animate-pulse">
              {newTimelineCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="relations" className="text-[10px] gap-1">
          <Link2 className="h-3 w-3" /> Relações
        </TabsTrigger>
        <TabsTrigger value="raw" className="text-[10px] gap-1">
          <Layers className="h-3 w-3" /> ID
        </TabsTrigger>
      </TabsList>
      <TabsContent value="timeline" className="mt-4">
        <EntityTimeline
          entityType={entity.type}
          entityId={entity.id}
          active={tab === "timeline"}
          onNewCountChange={setNewTimelineCount}
        />
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
