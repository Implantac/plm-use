// H9-09 · Mostruário — página inicial do módulo.
// Reúne peças-mãe, feedback estruturado e decisão de lançamento (Go/No-Go).
// Todas as escritas passam pela RLS: só membros com papel de mostruário editam.
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { statusToast } from "@/components/ui/status-presets";
import { CheckCircle2, MessageSquarePlus, PackageOpen, Sparkles, ThumbsDown, ThumbsUp, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldMessage } from "@/components/ui/field-message";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
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
    const aprovadas = samples.filter((s) => s.status === "aprovada" || s.status === "em_kit" || s.status === "em_showroom").length;
    const cobertura = total ? Math.round((aprovadas / total) * 100) : 0;
    const feedbackCount = Array.from(feedbackByReference.values()).reduce((n, arr) => n + arr.length, 0);
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
      <Tabs defaultValue="samples" className="space-y-4">
        <TabsList>
          <TabsTrigger value="samples">Peças-mãe</TabsTrigger>
          <TabsTrigger value="feedback">Feedback</TabsTrigger>
          <TabsTrigger value="decisions">Decisão de lançamento</TabsTrigger>
          <TabsTrigger value="publications">Publicações</TabsTrigger>
        </TabsList>

        <TabsContent value="samples" className="space-y-3">
          <RequestSampleCard
            references={references}
            onSubmit={async (payload) => {
              const created = await requestSample(payload);
              if (created) statusToast.success("Peça-mãe solicitada");
              else statusToast.error("Falha ao solicitar peça-mãe");
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
                  <Card key={s.id} className="border-white/10 bg-white/[0.02]">
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
                        <Badge variant="outline">{SAMPLE_STATUS_LABEL[s.status as ShowroomSampleStatus]}</Badge>
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
              else statusToast.error("Falha ao registrar feedback");
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
              Nenhuma publicação criada. Publicações da ficha digital serão administradas por Coordenação de Produto.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {publications.map((p) => (
                <Card key={p.id} className="border-white/10 bg-white/[0.02]">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base">{p.titulo}</CardTitle>
                      <Badge variant="outline">{p.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">v{p.versao} · {p.reference_ids.length} referências</p>
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
    <Card className="border-white/10 bg-white/[0.02]">
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
              <SelectTrigger><SelectValue placeholder="Escolha uma referência aprovada…" /></SelectTrigger>
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
            <Input value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="P-M-G" />
          </div>
          <div>
            <Label>Cor</Label>
            <Input value={cor} onChange={(e) => setCor(e.target.value)} placeholder="Off-white" />
          </div>
          <div>
            <Label>Qtd</Label>
            <Input
              type="number"
              min={1}
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
              setRefId(""); setGrade(""); setCor(""); setQtd(1);
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
  const [autorTipo, setAutorTipo] = useState<"interno" | "representante" | "buyer" | "showroom">("interno");

  return (
    <Card className="border-white/10 bg-white/[0.02]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquarePlus className="h-4 w-4" /> Registrar feedback
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-6">
          <div className="md:col-span-2">
            <Label>Referência</Label>
            <Select value={refId} onValueChange={setRefId}>
              <SelectTrigger><SelectValue placeholder="Escolha…" /></SelectTrigger>
              <SelectContent>
                {references.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.code} · {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Dimensão</Label>
            <Select value={dim} onValueChange={(v) => setDim(v as ShowroomFeedbackDimension)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FEEDBACK_DIMENSIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
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
              value={nota}
              onChange={(e) => setNota(Math.min(5, Math.max(1, Number(e.target.value) || 1)))}
            />
          </div>
          <div>
            <Label>Autor</Label>
            <Select value={autorTipo} onValueChange={(v) => setAutorTipo(v as typeof autorTipo)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
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
            <Input value={rota} onChange={(e) => setRota(e.target.value)} placeholder="SP-01" />
          </div>
        </div>
        <div className="mt-3">
          <Label>Comentário</Label>
          <Textarea
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
          <Card key={refId} className="border-white/10 bg-white/[0.02]">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  {ref?.code ?? "—"} · {ref?.name ?? "Referência removida"}
                </CardTitle>
                <Badge variant="outline">média {avg.toFixed(1)} · {arr.length}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {arr.slice(0, 5).map((f) => (
                <div key={f.id} className="text-xs">
                  <span className="font-medium">{f.dimensao}</span>{" "}
                  <span className="text-muted-foreground">· nota {f.nota} · {f.autor_tipo}</span>
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
  const eligible = references.filter((r) =>
    ["APROVACAO", "ENGENHARIA"].includes(r.status),
  );
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
    <Card className="border-white/10 bg-white/[0.02]">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Decisão de lançamento (Go / No-Go / Revisar)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5">
            <Label required>Referência</Label>
            <Select value={refId} onValueChange={setRefId}>
              <SelectTrigger aria-invalid={missingRef}><SelectValue placeholder="Escolha…" /></SelectTrigger>
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
          <Button
 size="sm"
 disabled={!canSubmit}
 onClick={() => submit("go")}
          >
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
