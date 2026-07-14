import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2, Wand2, Download } from "lucide-react";
import { streamImage } from "@/lib/streamImage";
import { toast } from "sonner";

export function AiCroquiPanel({ onSave }: { onSave?: (dataUrl: string) => void }) {
  const [prompt, setPrompt] = useState("");
  const [preset, setPreset] = useState<"croqui" | "foto" | "variacao">("croqui");
  const [src, setSrc] = useState<string | null>(null);
  const [isFinal, setIsFinal] = useState(false);
  const [busy, setBusy] = useState(false);

  const templates: Record<typeof preset, string> = {
    croqui:
      "Fashion technical sketch (croqui de moda) in black ink on white background, front view, clean lines, professional flat illustration: ",
    foto:
      "Photorealistic editorial fashion photograph on model, soft studio light, high fashion magazine style: ",
    variacao:
      "Same garment as described, alternative colorway and styling, keep silhouette identical: ",
  };

  async function generate() {
    if (!prompt.trim()) {
      toast.error("Descreva a peça");
      return;
    }
    setBusy(true);
    setSrc(null);
    setIsFinal(false);
    try {
      await streamImage("/api/generate-image", templates[preset] + prompt, (dataUrl, final) => {
        setSrc(dataUrl);
        if (final) setIsFinal(true);
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao gerar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="glass-card rounded-lg p-6 space-y-4 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
          <Wand2 className="w-4 h-4 text-primary" /> IA Criativa · Moodboard → Croqui → Foto
        </h3>
        <span className="px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase">
          <Sparkles className="w-3 h-3 inline mr-1" /> AI Gateway
        </span>
      </div>

      <div className="flex gap-2 flex-wrap">
        {(["croqui", "foto", "variacao"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPreset(p)}
            className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-md border transition ${
              preset === p
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/[0.02] border-white/10 text-muted-foreground hover:text-white"
            }`}
          >
            {p === "croqui" ? "Croqui" : p === "foto" ? "Foto realista" : "Variação"}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ex.: vestido linho off-white, gola v, mangas curtas, comprimento midi"
          className="h-9 bg-white/5 border-white/10 text-[11px]"
          disabled={busy}
        />
        <Button size="sm" className="gap-1" onClick={generate} disabled={busy}>
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
          Gerar
        </Button>
      </div>

      {src && (
        <div className="grid gap-2">
          <div className="aspect-[3/4] max-w-sm rounded-md overflow-hidden border border-white/10 bg-white/5">
            <img
              src={src}
              alt="AI gerado"
              className={`w-full h-full object-cover transition-[filter] duration-500 ${
                isFinal ? "blur-0" : "blur-lg"
              }`}
            />
          </div>
          {isFinal && (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="text-[10px] gap-1" asChild>
                <a href={src} download={`ai-${preset}-${Date.now()}.png`}>
                  <Download className="w-3 h-3" /> Baixar
                </a>
              </Button>
              {onSave && (
                <Button size="sm" className="text-[10px]" onClick={() => onSave(src)}>
                  Salvar no moodboard
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
