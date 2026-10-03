// Modelos oficiais — tabela de medidas + desenho técnico reais usados como referência pela IA.
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileUp, ImageUp, LoaderCircle, Plus, Ruler, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import {
  OFFICIAL_BUCKET,
  listOfficialModels,
  parseMeasureTable,
  sketchSignedUrl,
  type OfficialMeasure,
  type OfficialModel,
} from "@/lib/official-models";

export const Route = createFileRoute("/_authenticated/official-models")({
  head: () => ({
    meta: [
      { title: "Modelos oficiais — USE MODA PLM" },
      { name: "description", content: "Cadastre tabelas de medidas e desenhos técnicos oficiais para a IA usar como referência." },
      { property: "og:title", content: "Modelos oficiais — USE MODA PLM" },
      { property: "og:description", content: "Tabelas de medidas e desenhos técnicos reais como referência da IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfficialModelsPage,
});

const EMPTY = { id: "", nome: "", categoria: "", tamanho_base: "M", detalhes: "", medidas: [] as OfficialMeasure[], sketch_path: null as string | null };

function OfficialModelsPage() {
  const qc = useQueryClient();
  const { data: models = [], isLoading } = useQuery({ queryKey: ["official-models"], queryFn: listOfficialModels });
  const [form, setForm] = useState(EMPTY);
  const [sketchFile, setSketchFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sketchFile) {
      const url = URL.createObjectURL(sketchFile);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    if (form.sketch_path) void sketchSignedUrl(form.sketch_path).then(setPreview);
    else setPreview(null);
  }, [sketchFile, form.sketch_path]);

  function edit(m: OfficialModel) {
    setSketchFile(null);
    setForm({ id: m.id, nome: m.nome, categoria: m.categoria ?? "", tamanho_base: m.tamanho_base, detalhes: m.detalhes ?? "", medidas: m.medidas, sketch_path: m.sketch_path });
  }

  async function loadTable(file: File) {
    const rows = parseMeasureTable(await file.text());
    if (!rows.length) return toast.error("Não encontrei medidas no arquivo.");
    setForm((f) => ({ ...f, medidas: rows }));
    toast.success(`${rows.length} medidas carregadas.`);
  }

  function setRow(i: number, patch: Partial<OfficialMeasure>) {
    setForm((f) => ({ ...f, medidas: f.medidas.map((m, j) => (j === i ? { ...m, ...patch } : m)) }));
  }

  async function save() {
    if (!form.nome.trim()) return toast.error("Informe o nome do modelo.");
    const medidas = form.medidas.filter((m) => m.point.trim());
    if (!medidas.length) return toast.error("Carregue ou digite ao menos uma medida.");
    setSaving(true);
    try {
      let sketch_path = form.sketch_path;
      if (sketchFile) {
        const ext = sketchFile.name.split(".").pop() || "png";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(OFFICIAL_BUCKET).upload(path, sketchFile, { contentType: sketchFile.type });
        if (error) throw error;
        sketch_path = path;
      }
      const row = { nome: form.nome.trim(), categoria: form.categoria || null, tamanho_base: form.tamanho_base || "M", detalhes: form.detalhes || null, medidas, sketch_path };
      const { error } = form.id
        ? await supabase.from("official_models").update(row).eq("id", form.id)
        : await supabase.from("official_models").insert(row);
      if (error) throw error;
      toast.success("Modelo oficial salvo.");
      setForm(EMPTY);
      setSketchFile(null);
      await qc.invalidateQueries({ queryKey: ["official-models"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(m: OfficialModel) {
    const { error } = await supabase.from("official_models").delete().eq("id", m.id);
    if (error) return toast.error(error.message);
    if (m.sketch_path) await supabase.storage.from(OFFICIAL_BUCKET).remove([m.sketch_path]);
    if (form.id === m.id) setForm(EMPTY);
    await qc.invalidateQueries({ queryKey: ["official-models"] });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold text-foreground"><Ruler className="h-6 w-6 text-primary" /> Modelos oficiais</h1>
        <p className="text-sm text-muted-foreground">Carregue a tabela de medidas e o desenho técnico da sua empresa. No AI Product Studio, escolha o modelo e a IA usa esses dados reais como base.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        <aside className="space-y-2">
          <Button type="button" variant="outline" className="w-full" onClick={() => { setForm(EMPTY); setSketchFile(null); }}>
            <Plus className="mr-2 h-4 w-4" /> Novo modelo
          </Button>
          {isLoading && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {!isLoading && !models.length && <p className="text-sm text-muted-foreground">Nenhum modelo cadastrado.</p>}
          {models.map((m) => (
            <div key={m.id} className={`flex items-center justify-between rounded-md border p-2 ${form.id === m.id ? "border-primary" : "border-border"}`}>
              <button type="button" className="text-left text-sm" onClick={() => edit(m)}>
                <span className="block font-medium text-foreground">{m.nome}</span>
                <span className="text-xs text-muted-foreground">{m.categoria || "—"} · tam. {m.tamanho_base} · {m.medidas.length} medidas</span>
              </button>
              <Button type="button" size="icon" variant="ghost" aria-label={`Excluir ${m.nome}`} onClick={() => void remove(m)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </aside>

        <section className="space-y-4 rounded-md border border-border p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1"><Label htmlFor="om-nome">Nome</Label><Input id="om-nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Camisa feminina base" /></div>
            <div className="space-y-1"><Label htmlFor="om-cat">Categoria</Label><Input id="om-cat" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Camisa" /></div>
            <div className="space-y-1"><Label htmlFor="om-tam">Tamanho base</Label><Input id="om-tam" value={form.tamanho_base} onChange={(e) => setForm({ ...form, tamanho_base: e.target.value })} /></div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Tabela de medidas</Label>
                <Button asChild size="sm" variant="outline">
                  <label className="cursor-pointer"><FileUp className="mr-2 h-4 w-4" /> Carregar CSV
                    <input type="file" accept=".csv,.txt,.tsv" className="sr-only" onChange={(e) => { const f = e.target.files?.[0]; if (f) void loadTable(f); e.target.value = ""; }} />
                  </label>
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Colunas: ponto de medida; valor; tolerância; como medir. Exporte do Excel como CSV.</p>
              <div className="max-h-80 space-y-1 overflow-auto">
                {form.medidas.map((m, i) => (
                  <div key={i} className="grid grid-cols-[1fr_80px_70px_32px] gap-1">
                    <Input aria-label="Ponto de medida" value={m.point} onChange={(e) => setRow(i, { point: e.target.value })} className="h-8 text-xs" />
                    <Input aria-label="Valor" value={m.value} onChange={(e) => setRow(i, { value: e.target.value })} className="h-8 text-xs" />
                    <Input aria-label="Tolerância" value={m.tolerance ?? ""} onChange={(e) => setRow(i, { tolerance: e.target.value })} className="h-8 text-xs" />
                    <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label="Remover medida" onClick={() => setForm({ ...form, medidas: form.medidas.filter((_, j) => j !== i) })}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                ))}
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => setForm({ ...form, medidas: [...form.medidas, { point: "", value: "" }] })}><Plus className="mr-2 h-4 w-4" /> Adicionar medida</Button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Desenho técnico oficial</Label>
                <Button asChild size="sm" variant="outline">
                  <label className="cursor-pointer"><ImageUp className="mr-2 h-4 w-4" /> Carregar imagem
                    <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setSketchFile(e.target.files?.[0] ?? null)} />
                  </label>
                </Button>
              </div>
              <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-border bg-background">
                {preview ? <img src={preview} alt="Desenho técnico oficial" className="h-full w-full object-contain" /> : <span className="text-xs text-muted-foreground">PNG, JPG ou WEBP</span>}
              </div>
              <Label htmlFor="om-det">Detalhes construtivos</Label>
              <Textarea id="om-det" rows={4} value={form.detalhes} onChange={(e) => setForm({ ...form, detalhes: e.target.value })} placeholder="Pesponto 6 mm, 7 botões 11 mm, entretela na gola…" />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={() => void save()} disabled={saving}>
              {saving && <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />} Salvar modelo oficial
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}
