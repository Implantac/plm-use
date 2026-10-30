import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FieldMessage } from "@/components/ui/field-message";
import { ExpandImageBadge, ImageLightbox } from "@/components/ui/image-lightbox";
import { Sparkles, Loader2, Wand2, Download, Camera } from "lucide-react";
import { streamImage } from "@/lib/streamImage";
import {
  buildPhotorealisticGarmentPrompt,
  LIGHTING_PRESETS,
  type LightingPresetId,
} from "@/lib/ai/photorealism";
import { toast } from "sonner";

export function AiCroquiPanel({ onSave }: { onSave?: (dataUrl: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState<"croqui" | "foto" | "variacao">("foto");
  const [lighting, setLighting] = useState<LightingPresetId>("softbox_neutro");
  const [src, setSrc] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);

  async function generate() {
    if (!prompt.trim()) {
      setPromptError("Descreva a peça antes de gerar.");
      return;
    }
    setPromptError(null);
    setBusy(true);
    setSrc(null);
    setIsFinal(false);
    try {
      if (preset === "croqui") {
        const sketchPrompt = `Industrial technical fashion flat sketch (desenho técnico de engenharia do vestuário) of: ${prompt}. Clean black vector-precision ink lines on a 100% pure alpha-channel transparent PNG background, front and back orthographic views side by side, crisp topstitching, overlock/coverstitch seam lines, accurate collar stand and hem proportions, zero human model, zero backdrop, zero text or watermarks.`;
        await streamImage(
          "/api/generate-image",
          sketchPrompt,
          (dataUrl, final) => {
            setSrc(dataUrl);
            if (final) setIsFinal(true);
          },
          undefined,
          { background: "transparent", size: "1536x1024", inputFidelity: "high" },
        );
      } else {
        const plan = buildPhotorealisticGarmentPrompt({
          productName: prompt,
          materials: [prompt],
          preset: preset === "foto" ? "editorial_model" : "ghost_mannequin",
          lighting,
          transparentCutout: true,
          view: preset === "foto" ? "editorial" : "frente",
        });
        await streamImage(
          "/api/generate-image",
          plan.prompt,
          (dataUrl, final) => {
            setSrc(dataUrl);
            if (final) setIsFinal(true);
          },
          undefined,
          { background: "transparent", size: plan.size, inputFidelity: "high" },
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="glass-card rounded-lg p-6 space-y-4 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-3">
          <Wand2 className="w-4 h-4 text-primary" /> IA Criativa · Moodboard → Croqui → Foto
          Médio-Formato
        </h3>
        <span className="px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-2xs font-semibold uppercase">
          <Sparkles className="w-3 h-3 inline mr-1" /> Motor Fotorrealista HD · PNG Transparente
        </span>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {(["foto", "variacao", "croqui"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPreset(p)}
              className={`text-2xs uppercase tracking-widest font-bold px-3 py-1.5 rounded-md border transition ${
                preset === p
                  ? "bg-primary/20 border-primary/40 text-primary"
                  : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "croqui"
                ? "Croqui Técnico"
                : p === "foto"
                  ? "Foto Editorial 85mm"
                  : "Ghost Mannequin 3D"}
            </button>
          ))}
        </div>

        {preset !== "croqui" && (
          <div className="flex items-center gap-1.5 text-2xs">
            <Camera className="w-3.5 h-3.5 text-muted-foreground" />
            <select
              aria-label="Iluminação do estúdio"
              value={lighting}
              onChange={(e) => setLighting(e.target.value as LightingPresetId)}
              className="h-7 rounded-md border border-border bg-background px-2 text-2xs text-foreground"
            >
              {Object.values(LIGHTING_PRESETS).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex gap-2">
          <Input
            value={prompt}
            onChange={(e) => {
              setPrompt(e.target.value);
              if (e.target.value.trim()) setPromptError(null);
            }}
            placeholder="Ex.: vestido linho puro off-white 180 g/m², gola V, pesponto aparente, comprimento midi"
            className="text-xs"
            disabled={busy}
            aria-invalid={!!promptError}
          />
          <Button size="sm" className="gap-1" onClick={generate} disabled={busy}>
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Wand2 className="w-3.5 h-3.5" />
            )}
            Gerar
          </Button>
        </div>
        {promptError && <FieldMessage variant="error">{promptError}</FieldMessage>}
      </div>

      {src && (
        <div className="grid gap-2">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            aria-label="Ampliar imagem gerada em tela cheia"
            style={{
              backgroundColor: "#141D2E",
              backgroundImage:
                "linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%)",
              backgroundSize: "20px 20px",
              backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
            }}
            className="group relative aspect-[2/3] max-w-sm cursor-zoom-in rounded-md overflow-hidden border border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ExpandImageBadge />
            <img
              src={src}
              alt="AI gerado"
              className={`w-full h-full object-contain transition-[filter,transform] duration-500 group-hover:scale-[1.02] ${
                isFinal ? "blur-0" : "blur-lg"
              }`}
            />
          </button>
          {isFinal && (
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="text-2xs gap-1" asChild>
                <a href={src} download={`ai-${preset}-${Date.now()}.png`}>
                  <Download className="w-3 h-3" /> Baixar PNG Transparente
                </a>
              </Button>
              {onSave && (
                <Button size="sm" className="text-2xs" onClick={() => onSave(src)}>
                  Salvar no moodboard
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {src && (
        <ImageLightbox
          open={lightboxOpen}
          onOpenChange={setLightboxOpen}
          items={[
            {
              src,
              alt: prompt || "Conceito visual IA",
              title:
                preset === "croqui"
                  ? "Croqui Técnico IA"
                  : preset === "foto"
                    ? "Foto Editorial 85mm IA"
                    : "Ghost Mannequin 3D IA",
              subtitle: `${prompt} · Fundo PNG transparente`,
              exportBaseName: `ai-${preset}`,
            },
          ]}
        />
      )}
    </Card>
  );
}
