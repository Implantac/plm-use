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
        className="w-full sm:max-w-2xl bg-black/95 border-white/10 text-white overflow-y-auto"
      >
        <SheetHeader className="pb-3 border-b border-white/10">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                {loteNumero} • {referencia.ref}
              </p>
              <SheetTitle className="mt-1 text-white text-xl">{referencia.nome}</SheetTitle>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] border-white/20">
                  {referencia.setor_atual}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    referencia.status === "Concluído"
                      ? "border-emerald-400/40 text-emerald-300"
                      : referencia.status === "Ocorrência"
                        ? "border-rose-400/40 text-rose-300"
                        : "border-white/20"
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
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Produzido {referencia.qtd_produzida}</span>
              <span>Pendente {pendenteReferencia(referencia)}</span>
            </div>
            <Progress value={percentualReferencia(referencia)} className="mt-1 h-1.5 bg-white/10" />
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
      <TabsList className="grid w-full grid-cols-9 bg-white/5 h-auto">
        <TabsTrigger value="ficha" className="text-[10px] gap-1">
          <ScrollText className="h-3 w-3" /> Ficha
        </TabsTrigger>
        <TabsTrigger value="pilotos" className="text-[10px] gap-1">
          <Shirt className="h-3 w-3" /> Pilotos
        </TabsTrigger>
        <TabsTrigger value="timeline" className="text-[10px] gap-1">
          <GitBranch className="h-3 w-3" /> Timeline
        </TabsTrigger>
        <TabsTrigger value="layout" className="text-[10px] gap-1">
          <Layers className="h-3 w-3" /> Layout
        </TabsTrigger>
        <TabsTrigger value="p1" className="text-[10px] gap-1">
          <Workflow className="h-3 w-3" /> 1ª Linha
        </TabsTrigger>
        <TabsTrigger value="p2" className="text-[10px] gap-1">
          <Workflow className="h-3 w-3" /> 2ª Linha
        </TabsTrigger>
        <TabsTrigger value="oco" className="text-[10px] gap-1">
          <AlertOctagon className="h-3 w-3" /> Ocorr.
        </TabsTrigger>
        <TabsTrigger value="hist" className="text-[10px] gap-1">
          <History className="h-3 w-3" /> Hist.
        </TabsTrigger>
        <TabsTrigger value="chat" className="text-[10px] gap-1">
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
        <div className="aspect-video rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-muted-foreground text-sm">
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
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Ocorrências registradas
            </p>
            {referencia.ocorrencias.map((o) => (
              <div
                key={o.id}
                className={`rounded-md border p-3 text-[11px] ${
                  o.tipo === "positiva"
                    ? "border-emerald-400/30 bg-emerald-400/5"
                    : o.tipo === "negativa"
                      ? "border-rose-400/30 bg-rose-400/5"
                      : "border-amber-300/30 bg-amber-300/5"
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-bold uppercase tracking-wider">
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
          <p className="text-[11px] text-muted-foreground">Nenhuma passagem registrada ainda.</p>
        ) : (
          referencia.passagens.map((p) => (
            <div
              key={p.id}
              className="rounded-md border border-white/10 bg-white/[0.03] p-3 text-[11px]"
            >
              <div className="flex justify-between">
                <span className="font-bold uppercase tracking-wider text-primary">
                  {p.linha === "1a" ? "Passagem" : "Retrabalho"} • {p.tipo}
                </span>
                <span className="text-white">{p.qtd} pç</span>
              </div>
              <p className="mt-1 text-muted-foreground">
                {p.setor_origem}
                {p.setor_destino ? ` → ${p.setor_destino}` : ""} · {p.responsavel}
              </p>
              {p.defeito && <p className="mt-1 text-rose-300">Defeito: {p.defeito}</p>}
              {p.observacao && <p className="mt-1 text-white">{p.observacao}</p>}
              <p className="mt-1 text-[10px] text-muted-foreground">
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
      ? "text-emerald-300"
      : tone === "neg"
        ? "text-rose-300"
        : tone === "strong"
          ? "text-primary"
          : "text-white";
  return (
    <div className="rounded bg-white/5 py-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}
