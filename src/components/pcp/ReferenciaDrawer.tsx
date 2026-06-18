import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  AlertOctagon,
  History,
  ImageIcon,
  Layers,
  Package,
  ScrollText,
  Workflow,
} from "lucide-react";
import { PassagemForm } from "./PassagemForm";
import { OcorrenciaForm } from "./OcorrenciaForm";
import {
  pendenteReferencia,
  percentualReferencia,
  saldoReferencia,
  type ReferenciaLote,
} from "@/types/pcp";

interface Props {
  loteNumero: string;
  ref: ReferenciaLote | null;
  open: boolean;
  onClose(): void;
}

export function ReferenciaDrawer({ loteNumero, ref, open, onClose }: Props) {
  if (!ref) return null;

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
                {loteNumero} • {ref.ref}
              </p>
              <SheetTitle className="mt-1 text-white text-xl">
                {ref.nome}
              </SheetTitle>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] border-white/20">
                  {ref.setor_atual}
                </Badge>
                <Badge
                  variant="outline"
                  className={`text-[10px] ${
                    ref.status === "Concluído"
                      ? "border-emerald-400/40 text-emerald-300"
                      : ref.status === "Ocorrência"
                        ? "border-rose-400/40 text-rose-300"
                        : "border-white/20"
                  }`}
                >
                  {ref.status}
                </Badge>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-4 gap-2 text-center">
            <Metric label="Prog." value={ref.qtd_programada} />
            <Metric label="Adic." value={ref.qtd_adicional} tone="pos" />
            <Metric label="Perda" value={ref.qtd_perdida} tone="neg" />
            <Metric
              label="Saldo"
              value={saldoReferencia(ref)}
              tone="strong"
            />
          </div>
          <div>
            <div className="flex justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
              <span>Produzido {ref.qtd_produzida}</span>
              <span>Pendente {pendenteReferencia(ref)}</span>
            </div>
            <Progress
              value={percentualReferencia(ref)}
              className="mt-1 h-1.5 bg-white/10"
            />
          </div>
        </SheetHeader>

        <Tabs defaultValue="ficha" className="mt-4">
          <TabsList className="grid w-full grid-cols-6 bg-white/5 h-auto">
            <TabsTrigger value="ficha" className="text-[10px] gap-1">
              <ScrollText className="h-3 w-3" /> Ficha
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
          </TabsList>

          <TabsContent value="ficha" className="mt-4 space-y-3">
            <div className="aspect-video rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-muted-foreground">
              <ImageIcon className="h-12 w-12 opacity-40" />
            </div>
            <FichaRow label="Grupo / Coleção" value="ver lote" />
            <FichaRow
              label="Grade"
              value={
                ref.grade
                  ? Object.entries(ref.grade)
                      .map(([k, v]) => `${k}:${v}`)
                      .join(" • ")
                  : "—"
              }
            />
            <FichaRow label="Tecido principal" value="Linho 100%" />
            <FichaRow label="Aviamentos" value="Botão madrepérola, linha 120" />
            <FichaRow
              label="Sequência operacional"
              value="Corte → Silk → Costura → Acabamento → Expedição"
            />
            <p className="pt-3 text-[10px] text-muted-foreground italic flex items-center gap-2">
              <Package className="h-3 w-3" />
              Ficha técnica completa disponível no módulo de Ficha Técnica.
            </p>
          </TabsContent>

          <TabsContent value="layout" className="mt-4">
            <div className="aspect-video rounded-lg border border-white/10 bg-white/[0.03] flex items-center justify-center text-muted-foreground text-sm">
              Layout de silk/bordado da referência
            </div>
          </TabsContent>

          <TabsContent value="p1" className="mt-4">
            <PassagemForm loteNumero={loteNumero} ref={ref} linha="1a" />
          </TabsContent>

          <TabsContent value="p2" className="mt-4">
            <PassagemForm loteNumero={loteNumero} ref={ref} linha="2a" />
          </TabsContent>

          <TabsContent value="oco" className="mt-4">
            <OcorrenciaForm loteNumero={loteNumero} ref={ref} />
            {ref.ocorrencias.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Ocorrências registradas
                </p>
                {ref.ocorrencias.map((o) => (
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
            {ref.passagens.length === 0 ? (
              <p className="text-[11px] text-muted-foreground">
                Nenhuma passagem registrada ainda.
              </p>
            ) : (
              ref.passagens.map((p) => (
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
                    {p.setor_destino ? ` → ${p.setor_destino}` : ""} •{" "}
                    {p.responsavel}
                  </p>
                  {p.defeito && (
                    <p className="mt-1 text-rose-300">Defeito: {p.defeito}</p>
                  )}
                  {p.observacao && (
                    <p className="mt-1 text-white">{p.observacao}</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(p.timestamp).toLocaleString()}
                  </p>
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
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
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

function FichaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-white/5 py-2 text-[11px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-white text-right">{value}</span>
    </div>
  );
}
