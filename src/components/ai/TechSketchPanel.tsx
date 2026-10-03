import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, LoaderCircle, PencilRuler } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askAgent } from "@/lib/ai/agents.functions";
import { streamImage } from "@/lib/streamImage";

type Measure = { point: string; value: string; tolerance?: string; how?: string };
type SketchSpec = { measures: Measure[]; details: string[] };

function parseSpec(reply: string): SketchSpec | null {
  const match = reply.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const raw = JSON.parse(match[0]) as Partial<SketchSpec>;
    return {
      measures: Array.isArray(raw.measures)
        ? raw.measures.filter((m) => m && m.point).map((m) => ({ point: String(m.point), value: String(m.value ?? ""), tolerance: m.tolerance ? String(m.tolerance) : undefined, how: m.how ? String(m.how) : undefined }))
        : [],
      details: Array.isArray(raw.details) ? raw.details.map(String) : [],
    };
  } catch {
    return null;
  }
}

export function TechSketchPanel({ productName, summary }: { productName: string; summary: string }) {
  const ask = useServerFn(askAgent);
  const [size, setSize] = useState("M");
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [spec, setSpec] = useState<SketchSpec | null>(null);

  async function generate() {
    setBusy(true);
    setImage(null);
    setIsFinal(false);
    setSpec(null);
    try {
      const specPromise = ask({
        data: {
          agent: "fashion",
          message: `Você é modelista. Para a peça abaixo, tamanho ${size}, monte a TABELA DE MEDIDAS DA PEÇA PRONTA (não do corpo) partindo das medidas corporais da norma ABNT NBR 16060 (feminino) / NBR 16933 (masculino) para esse tamanho e somando a folga adequada à silhueta. Use os pontos de medida reais desta peça (ex.: 1/2 busto a 2,5 cm da cava, 1/2 cintura, 1/2 barra, comprimento total do ponto mais alto do ombro, largura de ombro, comprimento de manga, 1/2 punho, altura e circunferência de gola, profundidade de cava). Para cada medida informe valor em cm, tolerância (±) e como medir. Liste os detalhes construtivos com especificações (tipo e largura de costura/pesponto em mm, quantidade e diâmetro de botões, entretela, acabamento de barra). Responda SOMENTE JSON: {"measures":[{"point":"1/2 busto","value":"52 cm","tolerance":"±1 cm","how":"2,5 cm abaixo da cava, de lado a lado"}],"details":["..."]}\n\nPeça: ${summary}`,
        },
      });
      const imagePromise = streamImage(
        "/api/generate-image",
        `Technical fashion flat sketch (desenho técnico / flat drawing) of: ${summary}. Front and back views side by side, black line art on a fully transparent background, precise clean vector-style lines, visible stitching lines, seams, topstitching, buttons and trims, dimension lines with arrows indicating measurement points (no numbers needed). No model, no shading, no color, no logos.`,
        (src, final) => {
          setImage(src);
          if (final) setIsFinal(true);
        },
      ).then(() => setIsFinal(true));
      const [specResult] = await Promise.allSettled([specPromise, imagePromise]).then((r) => {
        if (r[1].status === "rejected") toast.error(r[1].reason instanceof Error ? r[1].reason.message : "Falha ao gerar o desenho.");
        return [r[0]];
      });
      if (specResult.status === "fulfilled") {
        if (specResult.value.ok) {
          const parsed = parseSpec(specResult.value.reply);
          if (parsed) setSpec(parsed);
          else toast.warning("As medidas vieram em formato inesperado.");
        } else toast.error(specResult.value.error);
      } else toast.error("Não foi possível gerar as medidas.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-md border border-white/10 bg-white/[0.025] p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-foreground">
          <PencilRuler className="h-3.5 w-3.5 text-primary" /> Desenho técnico
        </p>
        <div className="flex items-center gap-2">
          <Input value={size} onChange={(e) => setSize(e.target.value)} aria-label="Tamanho base" className="h-8 w-16 text-xs" />
          <Button type="button" size="sm" onClick={() => void generate()} disabled={busy}>
            {busy ? <LoaderCircle className="mr-2 h-4 w-4 animate-spin" /> : <PencilRuler className="mr-2 h-4 w-4" />}
            Gerar esboço
          </Button>
        </div>
      </div>

      {busy && !image && (
        <div className="flex h-56 items-center justify-center gap-2 rounded-md border border-dashed border-white/15 text-sm text-muted-foreground" role="status">
          <LoaderCircle className="h-5 w-5 animate-spin text-primary" /> Desenhando frente e costas…
        </div>
      )}

      {image && (
        <div className="overflow-hidden rounded-md border border-white/10 bg-background">
          <img src={image} alt={`Desenho técnico de ${productName}`} className={`h-72 w-full object-contain transition-[filter] duration-500 ${isFinal ? "" : "blur-md"}`} />
          {isFinal && (
            <div className="flex justify-end p-2 text-xs">
              <a href={image} download={`desenho-tecnico-${Date.now()}.png`} className="inline-flex items-center gap-1 text-primary hover:underline">
                <Download className="h-3.5 w-3.5" /> Baixar
              </a>
            </div>
          )}
        </div>
      )}

      {spec && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <table className="w-full text-xs">
            <caption className="mb-1 text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Medidas da peça pronta · tam. {size} · base ABNT</caption>
            <tbody>
              {spec.measures.map((m) => (
                <tr key={m.point} className="border-b border-white/5">
                  <td className="py-1 text-muted-foreground" title={m.how}>{m.point}{m.how && <span className="block text-[10px] opacity-70">{m.how}</span>}</td>
                  <td className="py-1 text-right font-medium text-foreground">{m.value}</td>
                  <td className="py-1 pl-2 text-right text-muted-foreground">{m.tolerance}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div>
            <p className="mb-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Detalhes construtivos</p>
            <ul className="list-disc space-y-1 pl-4 text-xs text-foreground">
              {spec.details.map((d) => <li key={d}>{d}</li>)}
            </ul>
          </div>
        </div>
      )}

      <p className="mt-3 text-[11px] text-muted-foreground">
        Esboço e medidas são sugestões da IA para iniciar a modelagem — valide com a tabela de medidas oficial antes da ficha técnica.
      </p>
    </div>
  );
}
