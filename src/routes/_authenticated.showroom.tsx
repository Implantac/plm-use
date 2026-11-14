// H9-09 · Mostruário — página inicial do módulo.
// Reúne peças-mãe, feedback estruturado e decisão de lançamento (Go/No-Go).
// Todas as escritas passam pela RLS: só membros com papel de mostruário editam.
import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { statusToast } from "@/components/ui/status-presets";
import { GlossarioTermos } from "@/components/onboarding/GlossarioTermos";
import {
  CheckCircle2,
  FileText,
  MessageSquarePlus,
  PackageOpen,
  ShoppingBag,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  Undo2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpandImageBadge, ImageLightbox } from "@/components/ui/image-lightbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "@/components/ui/field-message";
import { nativeVisualSvg } from "@/lib/ai/native-visual";
import {
  buildShowroomCatalogItem,
  buildShowroomOrderPrintableHtml,
  type ShowroomPackLine,
} from "@/lib/techsheet/sourcing-rfq";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { sheetProvenance } from "@/lib/techsheet/provenance";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import { useReferences } from "@/hooks/use-references";
import {
  DECISION_LABEL,
  FEEDBACK_DIMENSIONS,
  SAMPLE_STATUS_LABEL,
  useShowroom,
  type ShowroomDecision,
  type ShowroomFeedbackDimension,
  type ShowroomSampleStatus,
} from "@/hooks/use-showroom";

export const Route = createFileRoute("/_authenticated/showroom")({
  component: ShowroomPage,
});

const SAMPLE_NEXT: Record<ShowroomSampleStatus, ShowroomSampleStatus[]> = {
  solicitada: ["recebida"],
  recebida: ["em_curadoria"],
  em_curadoria: ["aprovada", "reprovada"],
  aprovada: ["em_kit"],
  reprovada: ["devolvida"],
  em_kit: ["em_showroom"],
  em_showroom: ["retornada"],
  retornada: ["arquivada"],
  devolvida: [],
  arquivada: [],
};

function ShowroomPage() {
  const { openEntity } = useEntityDrawer();
  const { items: references, loading: refsLoading } = useReferences();
  const {
    samples,
    publications,
    decisions,
    feedbackByReference,
    loading,
    transitionSample,
    captureFeedback,
    recordDecision,
    requestSample,
  } = useShowroom();

  const referenceById = useMemo(() => {
    const m = new Map(references.map((r) => [r.id, r]));
    return m;
  }, [references]);

  const decisionByRef = useMemo(() => {
    const m = new Map<string, ShowroomDecision>();
    for (const d of decisions) m.set(d.reference_id, d.decision as ShowroomDecision);
    return m;
  }, [decisions]);

  const metrics = useMemo(() => {
    const total = samples.length;
    const aprovadas = samples.filter(
      (s) => s.status === "aprovada" || s.status === "em_kit" || s.status === "em_showroom",
    ).length;
    const cobertura = total ? Math.round((aprovadas / total) * 100) : 0;
    const feedbackCount = Array.from(feedbackByReference.values()).reduce(
      (n, arr) => n + arr.length,
      0,
    );
    const go = decisions.filter((d) => d.decision === "go").length;
    return [
      { label: "Peças-mãe", value: String(total), detail: `${aprovadas} aprovadas` },
      { label: "Cobertura", value: `${cobertura}%`, detail: "meta ≥ 98%" },
      { label: "Feedbacks", value: String(feedbackCount), detail: "estruturados" },
      { label: "Go liberados", value: String(go), detail: "para lançamento" },
    ];
  }, [samples, feedbackByReference, decisions]);

  return (
    <ModuleLayout
      title="Mostruário"
      subtitle="Curadoria de peça-mãe, kits por rota, feedback estruturado e decisão de lançamento (H9-09)."
      version="H9-09 · v0.1"
      metrics={metrics}
    >
      {/* Onda 63: siglas medidas no texto desta tela, sem glossário até aqui. */}
      <GlossarioTermos siglas={["CAPA"]} testId="glossario-showroom" />
      <Tabs defaultValue="b2b-rack" className="space-y-4">
        <TabsList>
          <TabsTrigger value="b2b-rack">Vitrine B2B & Pré-Pedido</TabsTrigger>
          <TabsTrigger value="samples">Peças-mãe</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="decisions">Decisão de lançamento</TabsTrigger>
          <TabsTrigger value="publications">Publicações</TabsTrigger>
        </TabsList>

        <TabsContent value="b2b-rack" className="space-y-4">
          <ShowroomB2bRackTab />
        </TabsContent>

        <TabsContent value="samples" className="space-y-3">
          <RequestSampleCard
            references={references}
            onSubmit={async (payload) => {
              const created = await requestSample(payload);
              // Onda 82: a falha já vem com o motivo pelo hook.
              if (created) statusToast.success("Peça-mãe solicitada");
            }}
          />

          {loading || refsLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : samples.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma peça-mãe registrada. Solicite acima para iniciar o mostruário.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {samples.map((s) => {
                const ref = referenceById.get(s.reference_id);
                const next = SAMPLE_NEXT[s.status as ShowroomSampleStatus] ?? [];
                return (
                  <Card key={s.id} className="border-border bg-muted/40">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="text-base">
                            {ref?.code ?? "—"} · {ref?.name ?? "Referência removida"}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground">
                            {s.grade ?? "grade —"} · {s.cor ?? "cor —"} · qtd {s.quantidade}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {SAMPLE_STATUS_LABEL[s.status as ShowroomSampleStatus]}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {s.motivo ? (
                        <p className="text-xs text-muted-foreground">Motivo: {s.motivo}</p>
                      ) : null}
                      <div className="flex flex-wrap gap-2">
                        {next.map((to) => (
                          <Button
                            key={to}
                            size="sm"
                            variant="secondary"
                            onClick={async () => {
                              const ok = await transitionSample(s.id, to);
                              if (ok) statusToast.success(`→ ${SAMPLE_STATUS_LABEL[to]}`);
                              else statusToast.error("Transição bloqueada");
                            }}
                          >
                            {to === "aprovada" && <CheckCircle2 className="h-3.5 w-3.5 mr-1" />}
                            {to === "reprovada" && <ThumbsDown className="h-3.5 w-3.5 mr-1" />}
                            {to === "retornada" && <Undo2 className="h-3.5 w-3.5 mr-1" />}
                            {SAMPLE_STATUS_LABEL[to]}
                          </Button>
                        ))}
                        {ref ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openEntity({ type: "reference", id: ref.id })}
                          >
                            Abrir referência
                          </Button>
                        ) : null}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feedback" className="space-y-3">
          <FeedbackCard
            references={references}
            onSubmit={async (payload) => {
              const created = await captureFeedback(payload);
              if (created) statusToast.success("Feedback registrado");
            }}
          />
          <FeedbackList feedbackByRef={feedbackByReference} referenceById={referenceById} />
        </TabsContent>

        <TabsContent value="decisions" className="space-y-3">
          <DecisionCard
            references={references}
            decisionByRef={decisionByRef}
            onDecide={async (reference_id, decision, justificativa) => {
              const ok = await recordDecision(reference_id, decision, justificativa);
              if (ok) statusToast.success(`Decisão registrada: ${DECISION_LABEL[decision]}`);
              else throw new Error("Falha ao registrar decisão (justificativa obrigatória).");
            }}
          />
        </TabsContent>

        <TabsContent value="publications">
          {publications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhuma publicação criada. Publicações da ficha digital serão administradas por
              Coordenação de Produto.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {publications.map((p) => (
                <Card key={p.id} className="border-border bg-muted/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.titulo}</CardTitle>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      v{p.versao} · {p.reference_ids.length} referências
                    </p>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {p.storytelling ?? "Sem storytelling ainda."}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </ModuleLayout>
  );
}

function RequestSampleCard({
  references,
  onSubmit,
}: {
  references: ReturnType<typeof useReferences>["items"];
  onSubmit: (payload: {
    reference_id: string;
    grade?: string;
    cor?: string;
    quantidade: number;
  }) => Promise<void>;
}) {
  const eligible = references.filter((r) =>
    ["APROVACAO", "ENGENHARIA", "PILOTO", "AJUSTE"].includes(r.status),
  );
  const [refId, setRefId] = useState("");
  const [grade, setGrade] = useState("");
  const [cor, setCor] = useState("");
  const [qtd, setQtd] = useState(1);

  return (
    <Card className="border-border bg-muted/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <PackageOpen className="h-4 w-4" /> Solicitar peça-mãe
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-5">
          <div className="md:col-span-2">
            <Label>Referência</Label>
            <Select value={refId} onValueChange={setRefId}>
              <SelectTrigger aria-label="Referência da peça-mãe">
                <SelectValue placeholder="Escolha uma referência aprovada…" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.code} · {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Grade</Label>
            <Input
              aria-label="Grade"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="P-M-G"
            />
          </div>
          <div>
            <Label>Cor</Label>
            <Input
              aria-label="Cor"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              placeholder="Off-white"
            />
          </div>
          <div>
            <Label>Qtd</Label>
            <Input
              type="number"
              min={1}
              aria-label="Qtd"
              value={qtd}
              onChange={(e) => setQtd(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            disabled={!refId}
            onClick={async () => {
              await onSubmit({
                reference_id: refId,
                grade: grade || undefined,
                cor: cor || undefined,
                quantidade: qtd,
              });
              setRefId("");
              setGrade("");
              setCor("");
              setQtd(1);
            }}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1" /> Solicitar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackCard({
  references,
  onSubmit,
}: {
  references: ReturnType<typeof useReferences>["items"];
  onSubmit: (payload: {
    reference_id: string;
    dimensao: ShowroomFeedbackDimension;
    nota: number;
    comentario?: string;
    autor_tipo: "interno" | "representante" | "buyer" | "showroom";
    rota?: string;
  }) => Promise<void>;
}) {
  const [refId, setRefId] = useState("");
  const [dim, setDim] = useState<ShowroomFeedbackDimension>("caimento");
  const [nota, setNota] = useState(4);
  const [comentario, setComentario] = useState("");
  const [rota, setRota] = useState("");
  const [autorTipo, setAutorTipo] = useState<"interno" | "representante" | "buyer" | "showroom">(
    "interno",
  );

  return (
    <Card className="border-border bg-muted/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4" /> Registrar feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2 space-y-1.5">
            <Label required>Referência</Label>
            <Select value={refId} onValueChange={setRefId}>
              <SelectTrigger aria-label="Referência avaliada" aria-invalid={!refId}>
                <SelectValue placeholder="Escolha…" />
              </SelectTrigger>
              <SelectContent>
                {references.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.code} · {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!refId && (
              <FieldMessage variant="helper">Selecione a referência avaliada.</FieldMessage>
            )}
          </div>
          <div>
            <Label>Dimensão</Label>
            <Select value={dim} onValueChange={(v) => setDim(v as ShowroomFeedbackDimension)}>
              <SelectTrigger aria-label="Dimensão">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FEEDBACK_DIMENSIONS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Nota (1–5)</Label>
            <Input
              type="number"
              min={1}
              max={5}
              aria-label="Nota (1–5)"
              value={nota}
              onChange={(e) => setNota(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <div>
            <Label>Autor</Label>
            <Select value={autorTipo} onValueChange={(v) => setAutorTipo(v as typeof autorTipo)}>
              <SelectTrigger aria-label="Autor">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="interno">Interno</SelectItem>
                <SelectItem value="representante">Representante</SelectItem>
                <SelectItem value="buyer">Buyer</SelectItem>
                <SelectItem value="showroom">Showroom</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Rota</Label>
            <Input
              aria-label="Rota"
              value={rota}
              onChange={(e) => setRota(e.target.value)}
              placeholder="SP-01"
            />
          </div>
        </div>
        <div className="mt-3">
          <Label>Comentário</Label>
          <Textarea
            aria-label="Comentário"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Ex.: caimento excelente no busto, folgou na cintura no tamanho M."
            rows={2}
          />
        </div>
        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            disabled={!refId}
            onClick={async () => {
              await onSubmit({
                reference_id: refId,
                dimensao: dim,
                nota,
                comentario: comentario || undefined,
                autor_tipo: autorTipo,
                rota: rota || undefined,
              });
              setComentario("");
            }}
          >
            <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Registrar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function FeedbackList({
  feedbackByRef,
  referenceById,
}: {
  feedbackByRef: Map<string, ReturnType<typeof useShowroom>["feedback"]>;
  referenceById: Map<string, ReturnType<typeof useReferences>["items"][number]>;
}) {
  const entries = Array.from(feedbackByRef.entries()).filter(([, arr]) => arr.length > 0);
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem feedback registrado ainda.</p>;
  }
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {entries.map(([refId, arr]) => {
        const ref = referenceById.get(refId);
        const avg = arr.reduce((n, f) => n + f.nota, 0) / arr.length;
        return (
          <Card key={refId} className="border-border bg-muted/40">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  {ref?.code ?? "—"} · {ref?.name ?? "Referência removida"}
                </CardTitle>
                <Badge variant="outline">
                  média {avg.toFixed(1)} · {arr.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {arr.slice(0, 5).map((f) => (
                <div key={f.id} className="text-xs">
                  <span className="font-medium">{f.dimensao}</span>{" "}
                  <span className="text-muted-foreground">
                    · nota {f.nota} · {f.autor_tipo}
                  </span>
                  {f.comentario ? <p className="text-muted-foreground">{f.comentario}</p> : null}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function DecisionCard({
  references,
  decisionByRef,
  onDecide,
}: {
  references: ReturnType<typeof useReferences>["items"];
  decisionByRef: Map<string, ShowroomDecision>;
  onDecide: (
    reference_id: string,
    decision: Exclude<ShowroomDecision, "pendente">,
    justificativa: string,
  ) => Promise<void>;
}) {
  const eligible = references.filter((r) => ["APROVACAO", "ENGENHARIA"].includes(r.status));
  const [refId, setRefId] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const missingRef = !refId;
  const missingJust = justificativa.trim().length < 3;
  const canSubmit = !missingRef && !missingJust;

  const submit = async (decision: Exclude<ShowroomDecision, "pendente">) => {
    if (!canSubmit) return;
    setSubmitError(null);
    try {
      await onDecide(refId, decision, justificativa);
      setJustificativa("");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Falha ao registrar decisão.");
    }
  };

  return (
    <Card className="border-border bg-muted/40">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Decisão de lançamento (Go / No-Go / Revisar)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label required>Referência</Label>
            <Select value={refId} onValueChange={setRefId}>
              <SelectTrigger aria-label="Referência para decisão" aria-invalid={missingRef}>
                <SelectValue placeholder="Escolha…" />
              </SelectTrigger>
              <SelectContent>
                {eligible.map((r) => {
                  const d = decisionByRef.get(r.id);
                  return (
                    <SelectItem key={r.id} value={r.id}>
                      {r.code} · {r.name} {d ? `· ${DECISION_LABEL[d]}` : ""}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {missingRef && (
              <FieldMessage variant="helper">Selecione a referência antes de decidir.</FieldMessage>
            )}
          </div>
          <div className="space-y-1.5">
            <Label required>Justificativa</Label>
            <Input
              aria-label="Justificativa"
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Ex.: feedback ≥ 4, cobertura de grade ok, sem CAPA aberta."
              aria-invalid={missingJust && justificativa.length > 0}
            />
            <FieldMessage variant={missingJust && justificativa.length > 0 ? "error" : "helper"}>
              {missingJust && justificativa.length > 0
                ? "A justificativa precisa ter ao menos 3 caracteres."
                : "Obrigatória — registrada na trilha de auditoria."}
            </FieldMessage>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" disabled={!canSubmit} onClick={() => submit("go")}>
            <ThumbsUp className="h-3.5 w-3.5 mr-1" /> Go
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={!canSubmit}
            onClick={() => submit("revisar")}
          >
            Revisar
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!canSubmit}
            onClick={() => submit("no_go")}
          >
            <ThumbsDown className="h-3.5 w-3.5 mr-1" /> No-Go
          </Button>
        </div>
        {submitError && <FieldMessage variant="error">{submitError}</FieldMessage>}
      </CardContent>
    </Card>
  );
}

// -------- Vitrine Digital B2B & Sacola de Pré-Pedido (Showroom Comercial) --------
function ShowroomB2bRackTab() {
  const sheetsMap = useTechSheetStore((s) => s.data);
  const materializadas = useTechSheetStore((s) => s.materializadas);
  const [selectedColorByRef, setSelectedColorByRef] = useState<Record<string, number>>({});
  // Sacola e comprador nascem vazios (Onda 67): o pack pré-preenchido de
  // DEV000006 e o lojista "Boutique Multimarcas Jardins" com CNPJ fictício
  // davam para emitir espelho B2B para comprador que não existe. Só pack
  // adicionado e lojista digitado pelo usuário entram no pedido — mesmo
  // contrato das Ondas 64/66.
  const [packsByKey, setPacksByKey] = useState<Record<string, number>>({});
  const [buyerName, setBuyerName] = useState("");
  const [buyerCnpj, setBuyerCnpj] = useState("");
  const [lightboxItem, setLightboxItem] = useState<{
    src: string;
    title: string;
    subtitle: string;
    baseName: string;
  } | null>(null);

  // O showroom fecha pedido com preço de atacado. Antes plantava as quatro
  // referências de demonstração no catálogo — e a boutique recebia uma ordem
  // com preço de produto que não existe.
  const catalogItems = useMemo(() => {
    return Object.keys(sheetsMap)
      .sort()
      .map((refCode) => {
        const doc = sheetsMap[refCode]!;
        const item = buildShowroomCatalogItem(
          refCode,
          doc,
          sheetProvenance(sheetsMap, refCode, materializadas),
        );
        return { doc, item };
      });
  }, [sheetsMap, materializadas]);

  const orderLines = useMemo<ShowroomPackLine[]>(() => {
    const lines: ShowroomPackLine[] = [];
    for (const { item } of catalogItems) {
      item.colorways.forEach((cw, idx) => {
        const packs = packsByKey[`${item.refCode}:${idx}`] ?? 0;
        // Sem preço não entra no pedido: não há como faturar o que não é cotável.
        if (packs > 0 && item.wholesaleUnitPrice !== null) {
          lines.push({
            refCode: item.refCode,
            refName: item.refName,
            colorName: cw.name,
            colorHex: cw.hex,
            packs,
            piecesPerPack: 12,
            wholesaleUnitPrice: item.wholesaleUnitPrice,
            suggestedRetailPrice: item.suggestedRetailPrice,
            ncm: item.ncm,
            abnt: item.abnt,
          });
        }
      });
    }
    return lines;
  }, [catalogItems, packsByKey]);

  const totalPieces = orderLines.reduce((acc, l) => acc + l.packs * l.piecesPerPack, 0);
  const totalWholesale = orderLines.reduce(
    (acc, l) => acc + l.packs * l.piecesPerPack * (l.wholesaleUnitPrice ?? 0),
    0,
  );
  const totalRetail = orderLines.reduce(
    (acc, l) => acc + l.packs * l.piecesPerPack * (l.suggestedRetailPrice ?? 0),
    0,
  );

  const fmtBrl = (v: number | null) =>
    v === null
      ? "—"
      : v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

  function printB2bOrder() {
    if (orderLines.length === 0) {
      statusToast.error("Adicione ao menos 1 pack na sacola B2B para emitir o espelho.");
      return;
    }
    if (!buyerName.trim() || !buyerCnpj.trim()) {
      statusToast.error("Informe o lojista e o CNPJ antes de emitir o espelho B2B.");
      return;
    }
    const html = buildShowroomOrderPrintableHtml(buyerName, buyerCnpj, orderLines);
    const w = window.open("", "_blank");
    if (!w) {
      statusToast.error("Permita pop-ups para imprimir o Espelho B2B A4.");
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 250);
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 content-start">
        {catalogItems.length === 0 && (
          <Card
            data-testid="showroom-sem-ficha"
            className="md:col-span-2 p-6 border-amber-500/40 bg-amber-500/10 text-xs text-amber-800 dark:text-amber-300 space-y-2"
          >
            <p className="font-semibold">Catálogo vazio: nenhuma ficha salva</p>
            <p className="leading-relaxed">
              O showroom imprime ordem B2B com preço de atacado. Peça sem ficha não entra — o preço
              seria inventado. Salve uma ficha em{" "}
              <Link to="/tech-sheet" className="underline font-medium">
                Ficha Técnica
              </Link>{" "}
              para o produto aparecer aqui.
            </p>
          </Card>
        )}
        {catalogItems.map(({ doc, item }) => {
          const activeIdx = selectedColorByRef[item.refCode] ?? 0;
          const cw = item.colorways[activeIdx] ?? item.colorways[0]!;
          const packKey = `${item.refCode}:${activeIdx}`;
          const packs = packsByKey[packKey] ?? 0;
          const svg = nativeVisualSvg({
            family: item.category,
            category: item.category,
            name: item.refName,
            color: cw.hex,
            view: "frente",
            transparent: true,
          });
          const cutoutSrc =
            doc.image || `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

          return (
            <Card key={item.refCode} className="border-border bg-card overflow-hidden">
              <button
                type="button"
                onClick={() =>
                  setLightboxItem({
                    src: cutoutSrc,
                    title: `${item.refCode} · ${item.refName} (${cw.name})`,
                    subtitle: `${item.abnt} · NCM ${item.ncm} · Atacado ${fmtBrl(item.wholesaleUnitPrice)}`,
                    baseName: `${item.refCode.toLowerCase()}-${cw.name.toLowerCase()}`,
                  })
                }
                aria-label={`Ampliar ${item.refName} em tela cheia`}
                style={{
                  backgroundColor: "#141D2E",
                  backgroundImage:
                    "linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%)",
                  backgroundSize: "18px 18px",
                  backgroundPosition: "0 0, 0 9px, 9px -9px, -9px 0px",
                }}
                className="group relative block h-56 w-full cursor-zoom-in border-b border-border p-3"
              >
                <ExpandImageBadge />
                <img
                  src={cutoutSrc}
                  alt={item.refName}
                  className="h-full w-full object-contain drop-shadow-[0_14px_20px_rgba(0,0,0,0.35)] transition-transform duration-200 group-hover:scale-[1.03]"
                />
              </button>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-2xs text-primary">{item.refCode}</span>
                    <h3 className="text-sm font-semibold text-foreground">{item.refName}</h3>
                    <p className="text-2xs text-muted-foreground">
                      {item.abnt} · NCM {item.ncm}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-muted-foreground block">
                      Atacado B2B
                    </span>
                    <strong className="font-mono text-sm text-primary">
                      {fmtBrl(item.wholesaleUnitPrice)}
                    </strong>
                    <span className="text-[10px] text-muted-foreground block">
                      PVP {fmtBrl(item.suggestedRetailPrice)}
                    </span>
                  </div>
                </div>

                {/* Seleção de variante de cor */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {item.colorways.map((c, idx) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          setSelectedColorByRef((prev) => ({ ...prev, [item.refCode]: idx }))
                        }
                        title={c.name}
                        className={`h-5 w-5 rounded-full border-2 transition ${
                          idx === activeIdx
                            ? "border-primary scale-110"
                            : "border-border opacity-80"
                        }`}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                    <span className="text-2xs text-muted-foreground ml-1">{cw.name}</span>
                  </div>
                  <span className="text-2xs font-mono text-muted-foreground">
                    Pack 12 (2P·4M·4G·2GG)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/60">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() =>
                        setPacksByKey((prev) => ({ ...prev, [packKey]: Math.max(0, packs - 1) }))
                      }
                    >
                      -
                    </Button>
                    <span className="w-16 text-center font-mono text-xs font-semibold">
                      {packs} packs
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 w-7 p-0"
                      onClick={() => setPacksByKey((prev) => ({ ...prev, [packKey]: packs + 1 }))}
                    >
                      +
                    </Button>
                  </div>
                  <span className="font-mono text-xs text-foreground">
                    {packs * 12} pçs ·{" "}
                    {fmtBrl(
                      item.wholesaleUnitPrice === null
                        ? null
                        : packs * 12 * item.wholesaleUnitPrice,
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sacola Comercial B2B */}
      <Card className="h-fit sticky top-4 border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Sacola de Pré-Pedido Showroom B2B
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="space-y-2">
            <div>
              <Label htmlFor="lojista-razao" className="text-2xs uppercase text-muted-foreground">
                Lojista / Razão
              </Label>
              <Input
                id="lojista-razao"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <Label htmlFor="lojista-cnpj" className="text-2xs uppercase text-muted-foreground">
                CNPJ
              </Label>
              <Input
                id="lojista-cnpj"
                value={buyerCnpj}
                onChange={(e) => setBuyerCnpj(e.target.value)}
                className="h-8 font-mono text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5 max-h-56 overflow-y-auto border-y border-border/60 py-2">
            {orderLines.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Adicione packs nas referências ao lado.
              </p>
            ) : (
              orderLines.map((l) => (
                <div
                  key={`${l.refCode}-${l.colorName}`}
                  className="flex items-center justify-between gap-2 rounded bg-muted/40 p-2"
                >
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {l.refCode} · {l.colorName}
                    </p>
                    <p className="text-2xs text-muted-foreground">
                      {l.packs} packs ({l.packs * 12} pçs)
                    </p>
                  </div>
                  <strong className="font-mono text-foreground shrink-0">
                    {fmtBrl(
                      l.wholesaleUnitPrice === null ? null : l.packs * 12 * l.wholesaleUnitPrice,
                    )}
                  </strong>
                </div>
              ))
            )}
          </div>

          <div className="space-y-1 rounded-md border border-primary/30 bg-primary/5 p-2.5">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Peças:</span>
              <strong className="font-mono">{totalPieces} pçs</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Atacado B2B:</span>
              <strong className="font-mono text-primary">{fmtBrl(totalWholesale)}</strong>
            </div>
            <div className="flex justify-between text-2xs">
              <span className="text-muted-foreground">Faturamento Varejo Est. (2,35x):</span>
              <span className="font-mono">{fmtBrl(totalRetail)}</span>
            </div>
          </div>

          <Button type="button" onClick={printB2bOrder} className="w-full gap-1.5 text-xs">
            <FileText className="h-3.5 w-3.5" /> Emitir Espelho B2B (A4)
          </Button>
        </CardContent>
      </Card>

      {lightboxItem && (
        <ImageLightbox
          open={Boolean(lightboxItem)}
          onOpenChange={(next) => {
            if (!next) setLightboxItem(null);
          }}
          items={[
            {
              src: lightboxItem.src,
              alt: lightboxItem.title,
              title: lightboxItem.title,
              subtitle: lightboxItem.subtitle,
              exportBaseName: lightboxItem.baseName,
            },
          ]}
        />
      )}
    </div>
  );
}
