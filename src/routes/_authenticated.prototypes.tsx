import { useEffect, useState } from "react";
import { onQuickAction } from "@/lib/nav/routes";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CheckCircle2,
  Clock,
  Image,
  MessageSquare,
  Play,
  Scissors,
  Shirt,
  Sparkles,
  UserCheck,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ModuleActionMenu, ModuleLayout } from "@/components/modules/ModuleLayout";
import { OptimizedImage } from "@/components/OptimizedImage";

export const Route = createFileRoute("/_authenticated/prototypes")({
  component: PrototypesPage,
});

type Prototype = {
  id: string;
  name: string;
  version: string;
  stage: string;
  requester: string;
  owner: string;
  adjustments: number;
  progress: number;
  photos: number;
  videos: number;
  status: "Em progresso" | "Ajuste" | "Aprovado" | "Pausado";
  image: string;
};

const initialPrototypes: Prototype[] = [
  {
    id: "PR-2501",
    name: "Blusa Linho Amalfi",
    version: "V2 - ajuste de gola",
    stage: "Costura",
    requester: "Julia Designer",
    owner: "Sandra Pilotagem",
    adjustments: 3,
    progress: 64,
    photos: 12,
    videos: 2,
    status: "Ajuste",
    image:
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "PR-2502",
    name: "Pantalona Riviera",
    version: "V1 - primeiro corte",
    stage: "Modelagem",
    requester: "Livia Produto",
    owner: "Marcio Modelagem",
    adjustments: 1,
    progress: 38,
    photos: 6,
    videos: 1,
    status: "Em progresso",
    image:
      "https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&q=80&w=800",
  },
  {
    id: "PR-2503",
    name: "Vestido Gala Resort",
    version: "V3 - aprovado final",
    stage: "Aprovação",
    requester: "Diretoria Criativa",
    owner: "Ana Qualidade",
    adjustments: 0,
    progress: 100,
    photos: 18,
    videos: 4,
    status: "Aprovado",
    image:
      "https://images.unsplash.com/photo-1566206091558-7f218b696731?auto=format&fit=crop&q=80&w=800",
  },
];

const prototypeStages = [
  "Modelagem",
  "Corte",
  "Costura",
  "Silk",
  "Bordado",
  "Lavanderia",
  "Acabamento",
  "Aprovação",
];

function PrototypesPage() {
  const [prototypes, setPrototypes] = useState(initialPrototypes);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPrototype, setEditingPrototype] = useState<Prototype | null>(null);
  const [formData, setFormData] = useState({ name: "", version: "", requester: "", owner: "" });

  const handleOpenDialog = (prototype?: Prototype) => {
    if (prototype) {
      setEditingPrototype(prototype);
      setFormData({
        name: prototype.name,
        version: prototype.version,
        requester: prototype.requester,
        owner: prototype.owner,
      });
    } else {
      setEditingPrototype(null);
      setFormData({ name: "", version: "", requester: "", owner: "" });
    }
    setIsDialogOpen(true);
  };

  useEffect(() => onQuickAction("quick:new-piloto", () => handleOpenDialog()), []);


  const handleSave = () => {
    if (editingPrototype) {
      setPrototypes(
        prototypes.map((prototype) =>
          prototype.id === editingPrototype.id ? { ...prototype, ...formData } : prototype,
        ),
      );
      toast.success("Protótipo atualizado");
    } else {
      setPrototypes([
        {
          id: `PR-${Math.floor(Math.random() * 9000) + 1000}`,
          ...formData,
          stage: "Modelagem",
          adjustments: 0,
          progress: 0,
          photos: 0,
          videos: 0,
          status: "Em progresso",
          image:
            "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&q=80&w=800",
        },
        ...prototypes,
      ]);
      toast.success("Novo protótipo criado");
    }
    setIsDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    setPrototypes(prototypes.filter((prototype) => prototype.id !== id));
    toast.error("Protótipo removido");
  };

  return (
    <ModuleLayout
      title="Protótipos"
      subtitle="Controle de modelagem, corte, costura, silk, bordado, lavanderia, acabamento e aprovação."
      version="Craft v3.0"
      searchPlaceholder="Buscar protótipo, etapa, ajuste ou responsável"
      onAdd={() => handleOpenDialog()}
      metrics={[
        { label: "Protótipos", value: String(prototypes.length), detail: "em ciclo" },
        {
          label: "Ajustes",
          value: String(prototypes.reduce((sum, item) => sum + item.adjustments, 0)),
          detail: "pendentes/históricos",
        },
        {
          label: "Mídias",
          value: String(prototypes.reduce((sum, item) => sum + item.photos + item.videos, 0)),
          detail: "fotos e vídeos",
        },
        {
          label: "Aprovados",
          value: String(prototypes.filter((item) => item.status === "Aprovado").length),
          detail: "prontos para produção",
        },
      ]}
    >
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {prototypes.map((prototype) => (
            <Card
              key={prototype.id}
              className="glass-card rounded-lg overflow-hidden hover:border-primary/30 transition-colors"
            >
              <div className="relative h-56">
                <OptimizedImage
                  src={prototype.image}
                  alt={prototype.name}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
                <div className="absolute left-4 bottom-4 right-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                      {prototype.id}
                    </p>
                    <h3 className="mt-1 text-xl font-bold text-white">{prototype.name}</h3>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                      {prototype.version}
                    </p>
                  </div>
                  <ModuleActionMenu
                    onEdit={() => handleOpenDialog(prototype)}
                    onDelete={() => handleDelete(prototype.id)}
                    onView={() => toast.info(`Abrindo histórico de ${prototype.name}`)}
                  />
                </div>
              </div>
              <CardContent className="p-5 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: "Etapa", value: prototype.stage, icon: Scissors },
                    { label: "Status", value: prototype.status, icon: CheckCircle2 },
                    { label: "Solicitante", value: prototype.requester, icon: MessageSquare },
                    { label: "Responsável", value: prototype.owner, icon: UserCheck },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-md border border-white/10 bg-white/[0.035] p-3"
                    >
                      <item.icon className="h-4 w-4 text-primary" />
                      <p className="mt-2 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 text-xs font-bold text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
                    <span>Progresso do piloto</span>
                    <span className="text-white">{prototype.progress}%</span>
                  </div>
                  <Progress value={prototype.progress} className="h-2 bg-white/10" />
                </div>
                <div className="flex items-center justify-between border-t border-white/5 pt-4">
                  <div className="flex gap-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Image className="h-3.5 w-3.5" /> {prototype.photos}
                    </span>
                    <span className="flex items-center gap-1">
                      <Video className="h-3.5 w-3.5" /> {prototype.videos}
                    </span>
                    <span className="flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5" /> {prototype.adjustments} ajustes
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="rounded-md text-[10px] font-bold uppercase tracking-[0.14em] text-primary"
                  >
                    Timeline
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className="glass-card rounded-lg">
            <CardHeader className="p-5 border-b border-white/5">
              <CardTitle className="text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                Fluxo do protótipo
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {prototypeStages.map((stage, index) => (
                <div key={stage} className="flex items-center gap-3">
                  <div
                    className={`h-7 w-7 rounded-md border flex items-center justify-center ${index < 3 ? "border-primary/30 bg-primary/10 text-primary" : "border-white/10 bg-white/5 text-muted-foreground"}`}
                  >
                    {index < 3 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                  </div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                    {stage}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg border-primary/20 bg-primary/[0.025]">
            <CardContent className="p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary flex items-center gap-2">
                <Shirt className="h-4 w-4" />
                Próxima aprovação
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/85">
                Blusa Linho Amalfi precisa de validação de gola e vídeo de caimento antes de liberar
                OP piloto.
              </p>
              <Button className="mt-5 w-full rounded-md h-10 text-[10px] font-bold uppercase tracking-[0.14em] btn-primary-premium">
                Solicitar aprovação
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white rounded-lg p-6 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold uppercase tracking-tight">
              {editingPrototype ? "Editar protótipo" : "Novo protótipo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-5">
            {[
              ["name", "Produto", "Ex: Blusa Linho Amalfi"],
              ["version", "Versão / ajuste", "Ex: V2 - ajuste gola"],
              ["requester", "Solicitante", "Ex: Julia Designer"],
              ["owner", "Responsável", "Ex: Sandra Pilotagem"],
            ].map(([key, label, placeholder]) => (
              <div key={key} className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  {label}
                </Label>
                <Input
                  value={formData[key as keyof typeof formData]}
                  onChange={(event) => setFormData({ ...formData, [key]: event.target.value })}
                  className="bg-white/5 border-white/10 rounded-md h-11 focus:border-primary/40 focus:ring-0"
                  placeholder={placeholder}
                />
              </div>
            ))}
          </div>
          <DialogFooter className="gap-3">
            <Button
              variant="ghost"
              onClick={() => setIsDialogOpen(false)}
              className="rounded-md h-10 text-[10px] font-bold uppercase tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="rounded-md h-10 px-6 text-[10px] font-bold uppercase tracking-widest btn-primary-premium"
            >
              Salvar protótipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
