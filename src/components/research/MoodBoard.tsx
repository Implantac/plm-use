import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImageLightbox } from "@/components/ui/image-lightbox";
import { Palette, Layers, Upload, Plus, Sparkles, Loader2 } from "lucide-react";
import { uploadAsset, signedUrls } from "@/lib/storage/assets";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const REFS = [
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1485518882345-15568b007407?auto=format&fit=crop&q=80&w=600",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&q=80&w=600",
];

const PALETA = ["#1a1d2e", "#d4b896", "#6b8e7f", "#c9a87c", "#3a4a5c", "#e8d5b7"];
const TECIDOS = [
  {
    nome: "Linho Off-White",
    cor: "#ece4d2",
    textura: "linear-gradient(135deg, #ece4d2 0%, #d4c8a8 100%)",
  },
  {
    nome: "Malha Pima",
    cor: "#cdb6a3",
    textura: "linear-gradient(135deg, #cdb6a3 0%, #a89378 100%)",
  },
  {
    nome: "Sarja Verde Sage",
    cor: "#6b8e7f",
    textura: "linear-gradient(135deg, #7ba090 0%, #5a7d6e 100%)",
  },
  {
    nome: "Voil Tabaco",
    cor: "#9a7c5a",
    textura: "linear-gradient(135deg, #b08e6a 0%, #7a5e3e 100%)",
  },
];

export function MoodBoard() {
  const [imgs, setImgs] = useState<string[]>(REFS);
  const [novo, setNovo] = useState("");
  const [uploading, setUploading] = useState(false);
  const [zoomIdx, setZoomIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.storage
        .from("use-moda-assets")
        .list(`moodboard/${u.user.id}`, { sortBy: { column: "created_at", order: "desc" } });
      if (!data || data.length === 0 || cancelled) return;
      const paths = data
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => `moodboard/${u.user!.id}/${f.name}`);
      const urls = await signedUrls(paths, 3600);
      if (!cancelled && urls.length > 0) setImgs((prev) => [...urls, ...prev]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpload = async (file: File) => {
    setUploading(true);
    const path = await uploadAsset(file, "moodboard");
    setUploading(false);
    if (!path) return toast.error("Falha no upload");
    const { data } = await supabase.storage.from("use-moda-assets").createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      setImgs((arr) => [data.signedUrl, ...arr]);
      toast.success("Imagem enviada ao Cloud");
    }
  };

  return (
    <Card className="glass-card rounded-xl p-6 space-y-6 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.06em] text-foreground flex items-center gap-3">
          <Layers className="w-4 h-4 text-primary" /> Mood Board Visual · Clique em qualquer
          referência para ampliar
        </h3>
        <span className="px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-2xs font-semibold uppercase">
          <Sparkles className="w-3 h-3 inline mr-1" /> Cloud Assets + Paleta Pantone/HEX
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {imgs.map((src, i) => (
          <button
            key={src + i}
            type="button"
            onClick={() => setZoomIdx(i)}
            title="Clique para expandir imagem em tela cheia"
            className="aspect-[3/4] rounded-md overflow-hidden border border-border bg-muted/50 group relative cursor-zoom-in"
          >
            <img
              src={src}
              alt={`Referência Moodboard ${i + 1}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          </button>
        ))}
        <label className="aspect-[3/4] rounded-md border border-dashed border-border-strong/70 bg-muted/40 flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 cursor-pointer transition">
          {uploading ? (
            <Loader2 className="w-5 h-5 mb-1 animate-spin" />
          ) : (
            <Upload className="w-5 h-5 mb-1" />
          )}
          <span className="text-2xs uppercase tracking-widest font-bold">
            {uploading ? "Enviando" : "Upload"}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              void handleUpload(f);
            }}
          />
        </label>
      </div>

      <div className="flex gap-2">
        <Input
          aria-label="URL da imagem de referência visual"
          value={novo}
          onChange={(e) => setNovo(e.target.value)}
          placeholder="Cole URL https:// de referência visual..."
          className="text-xs"
        />
        <Button
          size="sm"
          className="gap-1"
          onClick={() => {
            if (novo.trim()) {
              setImgs([novo.trim(), ...imgs]);
              setNovo("");
              toast.success("Referência fixada no Mood Board");
            }
          }}
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 border-t border-border/60 pt-6">
        <div>
          <h4 className="text-2xs font-semibold uppercase tracking-[0.05em] text-foreground flex items-center gap-2 mb-3">
            <Palette className="w-3.5 h-3.5 text-primary" /> Cartela Harmônica
          </h4>
          <div className="flex gap-3 flex-wrap">
            {PALETA.map((c) => (
              <div key={c} className="space-y-1 text-center">
                <div
                  className="w-16 h-20 rounded-md border border-border shadow-sm"
                  style={{ background: c }}
                />
                <span className="text-[10px] font-mono text-muted-foreground uppercase">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-2xs font-semibold uppercase tracking-[0.05em] text-foreground mb-3">
            Amostras de Toque & Textura
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {TECIDOS.map((t) => (
              <div
                key={t.nome}
                className="rounded-md border border-border p-3 flex items-center gap-3 bg-muted/40"
              >
                <div
                  className="w-12 h-12 rounded-md border border-border shrink-0"
                  style={{ background: t.textura }}
                />
                <div>
                  <p className="text-xs font-bold text-foreground">{t.nome}</p>
                  <p className="text-2xs font-mono text-muted-foreground uppercase">{t.cor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {zoomIdx !== null && (
        <ImageLightbox
          open={zoomIdx !== null}
          onOpenChange={(next) => {
            if (!next) setZoomIdx(null);
          }}
          initialIndex={zoomIdx}
          items={imgs.map((src, idx) => ({
            src,
            alt: `Referência Moodboard ${idx + 1}`,
            title: `Mood Board · Referência #${idx + 1}`,
            subtitle: "Painel de Pesquisa Criativa USE MODA PLM",
            exportBaseName: `moodboard-ref-${idx + 1}`,
          }))}
        />
      )}
    </Card>
  );
}
