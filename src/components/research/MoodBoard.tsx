import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  { nome: "Linho Off-White", cor: "#ece4d2", textura: "linear-gradient(135deg, #ece4d2 0%, #d4c8a8 100%)" },
  { nome: "Malha Pima", cor: "#cdb6a3", textura: "linear-gradient(135deg, #cdb6a3 0%, #a89378 100%)" },
  { nome: "Sarja Verde Sage", cor: "#6b8e7f", textura: "linear-gradient(135deg, #7ba090 0%, #5a7d6e 100%)" },
  { nome: "Voil Tabaco", cor: "#9a7c5a", textura: "linear-gradient(135deg, #b08e6a 0%, #7a5e3e 100%)" },
];

export function MoodBoard() {
  const [imgs, setImgs] = useState<string[]>(REFS);
  const [novo, setNovo] = useState("");
  const [uploading, setUploading] = useState(false);

  // hidrata: lista arquivos da pasta moodboard do bucket e gera signed URLs
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
    const { data } = await supabase.storage
      .from("use-moda-assets")
      .createSignedUrl(path, 3600);
    if (data?.signedUrl) {
      setImgs((arr) => [data.signedUrl, ...arr]);
      toast.success("Imagem enviada ao Cloud");
    }
  };

  return (
    <Card className="glass-card rounded-lg p-6 space-y-6 mt-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.3em] text-white flex items-center gap-3">
          <Layers className="w-4 h-4 text-primary" /> Mood Board · Pré-Verão 2026
        </h3>
        <span className="px-3 py-1 rounded-md bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase">
          <Sparkles className="w-3 h-3 inline mr-1" /> IA de tendência
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {imgs.map((src, i) => (
          <div key={src + i} className="aspect-[3/4] rounded-md overflow-hidden border border-white/10 bg-white/5 group relative">
            <img src={src} alt={`ref ${i}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          </div>
        ))}
        <label className="aspect-[3/4] rounded-md border border-dashed border-white/15 bg-white/[0.02] flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 cursor-pointer transition">
          {uploading ? (
            <Loader2 className="w-5 h-5 mb-1 animate-spin" />
          ) : (
            <Upload className="w-5 h-5 mb-1" />
          )}
          <span className="text-[9px] uppercase tracking-widest font-bold">
            {uploading ? "Enviando" : "Upload"}
          </span>
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(e) => {
            const f = e.target.files?.[0]; if (!f) return;
            void handleUpload(f);
          }} />
        </label>
      </div>

      <div className="flex gap-2">
        <Input value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Cole URL de referência" className="h-9 bg-white/5 border-white/10 text-[11px]" />
        <Button size="sm" className="gap-1" onClick={() => { if (novo) { setImgs([novo, ...imgs]); setNovo(""); } }}><Plus className="w-3.5 h-3.5" /> Adicionar</Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 border-t border-white/5 pt-6">
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2 mb-3">
            <Palette className="w-3.5 h-3.5 text-primary" /> Cartela de cores
          </h4>
          <div className="flex gap-3 flex-wrap">
            {PALETA.map((c) => (
              <div key={c} className="space-y-1 text-center">
                <div className="w-16 h-20 rounded-md border border-white/10 shadow-lg" style={{ background: c }} />
                <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-[0.22em] text-white flex items-center gap-2 mb-3">
            <Layers className="w-3.5 h-3.5 text-primary" /> Cartela de tecidos
          </h4>
          <div className="space-y-2">
            {TECIDOS.map((t) => (
              <div key={t.nome} className="flex items-center gap-3 p-2 rounded-md border border-white/10 bg-white/[0.02]">
                <div className="w-14 h-10 rounded-md border border-white/10" style={{ background: t.textura }} />
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-white">{t.nome}</p>
                  <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{t.cor}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
