import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ImagePlus,
  Palette,
  Hash,
  Sparkles,
  Shirt,
  SwatchBook,
  Tags,
  BarChart3,
} from "lucide-react";
import { ModuleLayout, ModuleActionMenu } from "@/components/modules/ModuleLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MoodBoard } from "@/components/research/MoodBoard";
import { AiCroquiPanel } from "@/components/research/AiCroquiPanel";

export const Route = createFileRoute("/_authenticated/research")({
  component: ResearchHub,
});

function ResearchHub() {
  const [categories] = useState(["Verão 24", "Cápsula Boho", "Alfaiataria", "Acessórios", "Cores"]);
  const [moodboardItems, setMoodboardItems] = useState([
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e",
      title: "Texturas Naturais",
      tags: ["#linho", "#verao"],
      fabric: "linho",
      model: "top solto",
      category: "feminino/top",
      confidence: "94%",
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1490481651871-ab68de25d43d",
      title: "Minimalismo Urbano",
      tags: ["#urbano", "#preto"],
      fabric: "algodão",
      model: "alfaiataria",
      category: "feminino/work",
      confidence: "89%",
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1445205170230-053b83016050",
      title: "Cores Pastéis",
      tags: ["#soft", "#paleta"],
      fabric: "crepe",
      model: "pantalona",
      category: "bottom",
      confidence: "91%",
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b",
      title: "Alfaiataria Desconstruída",
      tags: ["#chic", "#work"],
      fabric: "lã fria",
      model: "blazer",
      category: "outerwear",
      confidence: "88%",
    },
    {
      id: 5,
      image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f",
      title: "Streetwear Luxe",
      tags: ["#hype", "#street"],
      fabric: "nylon",
      model: "oversized",
      category: "street",
      confidence: "86%",
    },
    {
      id: 6,
      image: "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc",
      title: "Acessórios Gold",
      tags: ["#luxo", "#gold"],
      fabric: "metal",
      model: "acessório",
      category: "acessórios",
      confidence: "92%",
    },
  ]);
  type MoodboardItem = (typeof moodboardItems)[number];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MoodboardItem | null>(null);
  const [formData, setFormData] = useState({ title: "", tags: "" });

  const handleOpenDialog = (item?: MoodboardItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({ title: item.title, tags: item.tags.join(", ") });
    } else {
      setEditingItem(null);
      setFormData({ title: "", tags: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    const tagArray = formData.tags
      .split(",")
      .map((t) => (t.trim().startsWith("#") ? t.trim() : `#${t.trim()}`));
    if (editingItem) {
      setMoodboardItems(
        moodboardItems.map((m) =>
          m.id === editingItem.id ? { ...m, title: formData.title, tags: tagArray } : m,
        ),
      );
      toast.success("Inspiração atualizada");
    } else {
      const newItem = {
        id: Date.now(),
        title: formData.title,
        tags: tagArray,
        image: "https://images.unsplash.com/photo-1558769132-cb1aea458c5e",
        fabric: "a classificar",
        model: "a classificar",
        category: "a classificar",
        confidence: "novo",
      };
      setMoodboardItems([newItem, ...moodboardItems]);
      toast.success("Nova inspiração adicionada ao Moodboard");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: number) => {
    setMoodboardItems(moodboardItems.filter((m) => m.id !== id));
    toast.error("Removido do Hub");
  };

  return (
    <ModuleLayout
      title="Research Hub"
      subtitle="inspiração orientada por dados. capture o zeitgeist antes dele acontecer."
      version="Research v2.1"
      onAdd={() => handleOpenDialog()}
      searchPlaceholder="Buscar tendência, tecido, cor ou concorrente"
      metrics={[
        { label: "Inspirações", value: String(moodboardItems.length), detail: "mood board" },
        { label: "Paletas", value: "12", detail: "em biblioteca" },
        { label: "Concorrentes", value: "8", detail: "benchmark ativo" },
        { label: "IA visual", value: "91%", detail: "confiança média" },
      ]}
    >
      <div className="flex justify-end gap-4 mb-8">
        <Button
 variant="outline"
 className="text-[10px] tracking-[0.16em] gap-2"
 >
          <ImagePlus className="w-4 h-4" /> Importar Inspiração
        </Button>
        <Button
 variant="outline"
 className="text-[10px] tracking-[0.16em] gap-2"
 >
          <Sparkles className="w-4 h-4" /> Gerar Moodboard AI
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6 mb-8">
        <Card className="glass-card rounded-lg p-5 border-primary/20 bg-primary/[0.025]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: "Modelagens", value: "top solto, blazer, pantalona", icon: Shirt },
              { label: "Tecidos", value: "linho, crepe, algodão", icon: SwatchBook },
              { label: "Cores", value: "off-white, navy, pastel", icon: Palette },
              { label: "Categorias", value: "top, bottom, outerwear", icon: Tags },
            ].map((item) => (
              <div key={item.label} className="rounded-md border border-white/10 bg-black/20 p-4">
                <item.icon className="h-4 w-4 text-primary" />
                <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                  {item.label}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{item.value}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card className="glass-card rounded-lg p-5">
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Benchmark
          </h3>
          {[
            "Concorrente A: linho +24%",
            "Concorrente B: alfaiataria leve",
            "Histórico: Verão 24 ROI 3.1x",
          ].map((item) => (
            <div key={item} className="border-b border-white/5 py-3 last:border-0">
              <p className="text-sm text-white/85">{item}</p>
            </div>
          ))}
        </Card>
      </div>

      <div className="flex items-center gap-4 border-b border-white/5 pb-6 mb-8 overflow-x-auto no-scrollbar">
        <Button
 variant="ghost"
 className="text-primary text-[10px] tracking-[0.2em] bg-primary/10"
 >
          Todos
        </Button>
        {categories.map((cat) => (
          <Button
 key={cat}
 variant="ghost"
 className="text-muted-foreground hover:text-white text-[10px] tracking-[0.2em] transition-colors"
 >
            {cat}
          </Button>
        ))}
      </div>

      <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
        {moodboardItems.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="break-inside-avoid relative group"
          >
            <div className="absolute top-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
              <ModuleActionMenu
                onEdit={() => handleOpenDialog(item)}
                onDelete={() => handleDelete(item.id)}
                onView={() => toast.info(`Visualizando mood de ${item.title}`)}
              />
            </div>
            <Card className="glass-card rounded-lg overflow-hidden group hover:border-primary/40 transition-all duration-700">
              <div className="relative overflow-hidden aspect-[4/5]">
                <img
                  src={item.image + "?auto=format&fit=crop&q=80&w=800"}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                  alt={item.title}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8">
                  <div className="flex gap-2 mb-4">
                    <Button
 size="icon"
 variant="ghost"
 className="bg-white/10 backdrop-blur-md text-white"
 >
                      <Palette className="w-4 h-4" />
                    </Button>
                    <Button
 size="icon"
 variant="ghost"
 className="bg-white/10 backdrop-blur-md text-white"
 >
                      <Sparkles className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <CardContent className="p-6">
                <h3 className="text-sm font-bold text-white uppercase tracking-tight mb-2">
                  {item.title}
                </h3>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {[
                    ["Tecido", item.fabric],
                    ["Modelo", item.model],
                    ["Categoria", item.category],
                    ["Confiança", item.confidence],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-md bg-white/[0.035] border border-white/5 p-2"
                    >
                      <p className="text-[8px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                        {label}
                      </p>
                      <p className="mt-1 text-[10px] font-bold text-white">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 flex-wrap">
                  {item.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[9px] font-bold uppercase tracking-wider text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/10 flex items-center gap-1"
                    >
                      <Hash className="w-3 h-3" /> {tag.replace("#", "")}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-[2.5rem] p-10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold uppercase tracking-tighter italic">
              {editingItem ? "Editar Inspiração" : "Nova Inspiração"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Título do Insight
              </Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: Texturas Urbanas"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
                Tags (separadas por vírgula)
              </Label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="rounded-xl h-12 focus:border-primary/40 focus:ring-0"
                placeholder="Ex: linho, verão, chic"
              />
            </div>
          </div>
          <DialogFooter className="gap-4">
            <Button
 variant="ghost"
 onClick={() => setIsDialogOpen(false)}
              className="text-[10px]"
            >
              Cancelar
            </Button>
            <Button
 onClick={handleSave}
 className="text-[10px]"
 >
              Fixar no Board
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <MoodBoard />
      <AiCroquiPanel />
    </ModuleLayout>
  );
}
