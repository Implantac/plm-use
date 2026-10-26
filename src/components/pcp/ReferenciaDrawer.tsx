import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertOctagon,
  GitBranch,
  History,
  ScrollText,
  Workflow,
  Layers,
  Shirt,
} from "lucide-react";
import { PilotosPanel } from "./PilotosPanel";
import { PassagemForm } from "./PassagemForm";
import { OcorrenciaForm } from "./OcorrenciaForm";
import { FichaTecnicaResumo } from "./FichaTecnicaResumo";
import { ReferenceTimeline } from "@/components/reference/ReferenceTimeline";
import { useReferenceStore } from "@/lib/reference/store";
import { emptyLifecycle } from "@/types/reference";
import {
  pendenteReferencia,
  percentualReferencia,
  saldoReferencia,
  type ReferenciaLote,
} from "@/types/pcp";
import { CommentsPanel } from "@/components/comments/CommentsPanel";
import { MessageSquare } from "lucide-react";

interface Props {
  loteNumero: string;
  grupo?: string;
  colecao?: string;
  referencia: ReferenciaLote | null;
  open: boolean;
  onClose(): void;
}

export function ReferenciaDrawer({ loteNumero, grupo, colecao, referencia, open, onClose }: Props) {
  if (!referencia) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-2xl bg-popover border-border text-white overflow-y-auto"
      >
        <SheetHeader className="pb-3 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-2xs font-semibold uppercase tracking-[0.05em] text-primary">
                {loteNumero} • {referencia.ref}
              </p>
              <SheetTitle className="mt-1 text-white text-xl">{referencia.nome}</SheetTitle>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-2xs border-border-strong/70">
                  {referencia.setor_atual}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-2xs ${
                    referencia.status === "Concluído"
                      ? "border-status-approved/40 text-status-approved"
                      : referencia.status === "Ocorrência"
                        ? "border-status-rejected/40 text-status-rejected"
                        : "border-border-strong/70"
                  }`}
                >
                  {referencia.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <Metric label="Prog." value={referencia.qtd_programada} />
            <Metric label="Adic." value={referencia.qtd_adicional} tone="pos" />
            <Metric label="Perda" value={referencia.qtd_perdida} tone="neg" />
            <Metric label="Saldo" value={saldoReferencia(referencia)} tone="strong" />
          </div>
          <div>
            <div className="flex justify-between text-2xs uppercase tracking-wider text-muted-foreground">
              <span>Produzido {referencia.qtd_produzida}</span>
              <span>Pendente {pendenteReferencia(referencia)}</span>
            </div>
            <Progress value={percentualReferencia(referencia)} className="mt-1 h-1.5 bg-muted" />
          </div>
        </SheetHeader>

        <ReferenciaTabs
          loteNumero={loteNumero}
          grupo={grupo}
          colecao={colecao}
          referencia={referencia}
        />
      </SheetContent>
    </Sheet>
  );
}

function ReferenciaTabs({
  loteNumero,
  grupo,
  colecao,
  referencia,
}: {
  loteNumero: string;
  grupo?: string;
  colecao?: string;
  referencia: ReferenciaLote;
}) {
  const lifecycles = useReferenceStore((s) => s.lifecycles);
  const lifecycle =
    lifecycles.find((l) => l.ref === referencia.ref) ??
    emptyLifecycle(referencia.ref, referencia.nome);

  return (
    <Tabs defaultValue="ficha" className="mt-4">
      <TabsList className="grid w-full grid-cols-9 bg-muted/50 h-auto">
        <TabsTrigger value="ficha" className="text-2xs gap-1">
          <ScrollText className="h-3 w-3" /> Ficha
        </TabsTrigger>
        <TabsTrigger value="pilotos" className="text-2xs gap-1">
          <Shirt className="h-3 w-3" /> Pilotos
        </TabsTrigger>
        <TabsTrigger value="timeline" className="text-2xs gap-1">
          <GitBranch className="h-3 w-3" /> Timeline
        </TabsTrigger>
        <TabsTrigger value="layout" className="text-2xs gap-1">
          <Layers className="h-3 w-3" /> Layout
        </TabsTrigger>
        <TabsTrigger value="p1" className="text-2xs gap-1">
          <Workflow className="h-3 w-3" /> 1ª Linha
        </TabsTrigger>
        <TabsTrigger value="p2" className="text-2xs gap-1">
          <Workflow className="h-3 w-3" /> 2ª Linha
        </TabsTrigger>
        <TabsTrigger value="oco" className="text-2xs gap-1">
          <AlertOctagon className="h-3 w-3" /> Ocorr.
        </TabsTrigger>
        <TabsTrigger value="hist" className="text-2xs gap-1">
          <History className="h-3 w-3" /> Hist.
        </TabsTrigger>
        <TabsTrigger value="chat" className="text-2xs gap-1">
          <MessageSquare className="h-3 w-3" /> Chat
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pilotos" className="mt-4">
        <PilotosPanel referenciaRef={referencia.ref} referenciaNome={referencia.nome} />
      </TabsContent>

      <TabsContent value="chat" className="mt-4">
        <CommentsPanel
          entityType="pcp_ref"
          entityId={`${loteNumero}/${referencia.ref}`}
          title={`Conversa · ${referencia.ref}`}
        />
      </TabsContent>

      <TabsContent value="ficha" className="mt-4">
        <FichaTecnicaResumo referencia={referencia} grupo={grupo} colecao={colecao} />
      </TabsContent>

      <TabsContent value="timeline" className="mt-4">
        <ReferenceTimeline lifecycle={lifecycle} compact />
      </TabsContent>

      <TabsContent value="layout" className="mt-4">
        <div className="aspect-video rounded-lg border border-border bg-muted/50 flex items-center justify-center text-muted-foreground text-sm">
          Layout de silk/bordado da referência
        </div>
      </TabsContent>

      <TabsContent value="p1" className="mt-4">
        <PassagemForm loteNumero={loteNumero} referencia={referencia} linha="1a" />
      </TabsContent>

      <TabsContent value="p2" className="mt-4">
        <PassagemForm loteNumero={loteNumero} referencia={referencia} linha="2a" />
      </TabsContent>

      <TabsContent value="oco" className="mt-4">
        <OcorrenciaForm loteNumero={loteNumero} referencia={referencia} />
        {referencia.ocorrencias.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-2xs uppercase tracking-wider text-muted-foreground">
              Ocorrências registradas
            </p>
            {referencia.ocorrencias.map((o) => (
              <div
                key={o.id}
                className={`rounded-md border p-3 text-xs ${
                  o.tipo === "positiva"
                    ? "border-status-approved/30 bg-status-approved/5"
                    : o.tipo === "negativa"
                      ? "border-status-rejected/30 bg-status-rejected/5"
                      : "border-status-progress/30 bg-status-progress/5"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-semibold uppercase tracking-wider">
                    {o.tipo} • {o.qtd} pç
                  </span>
                  <span className="text-muted-foreground">{o.setor}</span>
                </div>
                <p className="mt-1 text-white">{o.motivo}</p>
                <p className="mt-1 text-muted-foreground">
                  {o.responsavel} • {new Date(o.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="hist" className="mt-4 space-y-2">
        {referencia.passagens.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nenhuma passagem registrada ainda.</p>
        ) : (
          referencia.passagens.map((p) => (
            <div key={p.id} className="rounded-md border border-border bg-muted/50 p-3 text-xs">
              <div className="flex justify-between">
                <span className="font-semibold uppercase tracking-wider text-primary">
                  {p.linha === "1a" ? "Passagem" : "Retrabalho"} • {p.tipo}
                </span>
                <span className="text-white">{p.qtd} pç</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {p.setor_origem}
                {p.setor_destino ? ` → ${p.setor_destino}` : ""} · {p.responsavel}
              </p>
              {p.defeito && <p className="mt-1 text-status-rejected">Defeito: {p.defeito}</p>}
              {p.observacao && <p className="mt-1 text-white">{p.observacao}</p>}
              <p className="mt-1 text-2xs text-muted-foreground">
                {new Date(p.timestamp).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </TabsContent>
    </Tabs>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "pos" | "neg" | "strong";
}) {
  const color =
    tone === "pos"
      ? "text-status-approved"
      : tone === "neg"
        ? "text-status-rejected"
        : tone === "strong"
          ? "text-primary"
          : "text-white";
  return (
    <div className="rounded bg-muted/50 py-2">
      <p className="text-2xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}
