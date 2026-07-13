import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { onQuickAction } from "@/lib/nav/routes";
import {
  useLooks,
  upsertLook,
  removeLook,
  duplicateLook,
  setLookStatus,
  removeItemFromLook,
  addItemToLook,
  OCCASION_LABEL,
  STATUS_LABEL,
  type Look,
  type LookOccasion,
  type LookStatus,
  type LookItem,
} from "@/lib/looks/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Copy, Trash2, Sparkles, Shirt, X } from "lucide-react";
import { toast } from "sonner";
import { LocalHistoryButton } from "@/components/entity/LocalHistoryButton";

export const Route = createFileRoute("/_authenticated/looks")({
  component: LooksPage,
});

const OCCASIONS: LookOccasion[] = [
  "casual",
  "trabalho",
  "festa",
  "resort",
  "esporte",
  "streetwear",
];
const STATUSES: LookStatus[] = ["rascunho", "aprovado", "arquivado"];

const STATUS_TONE: Record<LookStatus, string> = {
  rascunho: "bg-muted text-muted-foreground",
  aprovado: "bg-status-approved/15 text-status-approved",
  arquivado: "bg-status-blocked/15 text-status-blocked",
};

function LooksPage() {
  const looks = useLooks();
  const [selectedId, setSelectedId] = useState<string | null>(looks[0]?.id ?? null);
  const [statusFilter, setStatusFilter] = useState<LookStatus | "all">("all");
  const [occasionFilter, setOccasionFilter] = useState<LookOccasion | "all">("all");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => onQuickAction("quick:new-look", () => setDialogOpen(true)), []);

  const filtered = useMemo(() => {
    return looks.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (occasionFilter !== "all" && l.occasion !== occasionFilter) return false;
      if (
        search &&
        !`${l.name} ${l.season} ${l.tags.join(" ")}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
        return false;
      return true;
    });
  }, [looks, statusFilter, occasionFilter, search]);

  const selected = looks.find((l) => l.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Coordenados · Looks</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Agrupe referências em looks reutilizáveis para displayagem, showroom e
            catálogo comercial.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2" disabled>
            <Sparkles className="w-4 h-4" />
            Sugerir com IA
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" /> Novo look
              </Button>
            </DialogTrigger>
            <NewLookDialog
              onCreated={(id) => {
                setSelectedId(id);
                setDialogOpen(false);
              }}
            />
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[220px]">
            <label className="uppercase-label text-muted-foreground">Buscar</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Nome, tag, coleção…"
            />
          </div>
          <div className="w-40">
            <label className="uppercase-label text-muted-foreground">Status</label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LookStatus | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <label className="uppercase-label text-muted-foreground">Ocasião</label>
            <Select value={occasionFilter} onValueChange={(v) => setOccasionFilter(v as LookOccasion | "all")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {OCCASIONS.map((o) => (
                  <SelectItem key={o} value={o}>{OCCASION_LABEL[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground pb-2">
            {filtered.length} de {looks.length} looks
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((look) => (
            <button
              key={look.id}
              onClick={() => setSelectedId(look.id)}
              className={`text-left rounded-lg border transition-all overflow-hidden ${
                selected?.id === look.id
                  ? "border-primary shadow-lg shadow-primary/10"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div
                className="h-28 relative"
                style={{
                  background: `linear-gradient(135deg, ${look.coverColor} 0%, ${look.coverColor}88 100%)`,
                }}
              >
                <div className="absolute inset-0 flex items-end p-3 gap-1">
                  {look.items.slice(0, 5).map((it) => (
                    <div
                      key={it.refCode}
                      className="h-6 w-6 rounded-full border-2 border-background"
                      style={{ background: it.colorHex ?? "#999" }}
                      title={it.refName}
                    />
                  ))}
                </div>
              </div>
              <div className="p-3 bg-card">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-foreground truncate">{look.name}</p>
                  <Badge className={`text-2xs ${STATUS_TONE[look.status]}`}>
                    {STATUS_LABEL[look.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {look.season} · {OCCASION_LABEL[look.occasion]}
                </p>
                <div className="flex items-center gap-1 mt-2 text-2xs text-muted-foreground">
                  <Shirt className="w-3 h-3" /> {look.items.length} peças
                </div>
              </div>
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-sm text-muted-foreground border border-dashed border-border rounded-lg">
              Nenhum look encontrado com os filtros atuais.
            </div>
          )}
        </div>

        {selected && <LookDetail look={selected} />}
      </div>
    </div>
  );
}

function LookDetail({ look }: { look: Look }) {
  return (
    <Card className="h-fit sticky top-4">
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base">{look.name}</CardTitle>
            <CardDescription>
              {look.season} · {OCCASION_LABEL[look.occasion]}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LocalHistoryButton
              entityType="look"
              entityId={look.id}
              entityLabel={look.name}
              variant="outline"
              size="sm"
              className="gap-1.5 h-7"
            />
            <Badge className={`text-2xs ${STATUS_TONE[look.status]}`}>
              {STATUS_LABEL[look.status]}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="uppercase-label text-muted-foreground mb-1">Styling notes</p>
          <p className="text-sm text-foreground leading-relaxed">{look.stylingNotes}</p>
        </div>

        <div>
          <p className="uppercase-label text-muted-foreground mb-2">Tags</p>
          <div className="flex flex-wrap gap-1">
            {look.tags.map((t) => (
              <Badge key={t} variant="outline" className="text-2xs">{t}</Badge>
            ))}
          </div>
        </div>

        <div>
          <p className="uppercase-label text-muted-foreground mb-2">
            Peças ({look.items.length})
          </p>
          <div className="space-y-1.5">
            {look.items.map((item) => (
              <div
                key={item.refCode}
                className="flex items-center gap-2 p-2 rounded-md border border-border bg-accent/30"
              >
                <div
                  className="h-6 w-6 rounded-full border border-border shrink-0"
                  style={{ background: item.colorHex ?? "#999" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {item.refName}
                  </p>
                  <p className="text-2xs text-muted-foreground">
                    {item.refCode} · {item.role}
                  </p>
                </div>
                <button
                  onClick={() => removeItemFromLook(look.id, item.refCode)}
                  className="text-muted-foreground hover:text-status-blocked"
                  title="Remover"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <AddItemForm lookId={look.id} />
        </div>

        <div className="pt-3 border-t border-border space-y-2">
          <div className="flex items-center gap-2">
            <Select
              value={look.status}
              onValueChange={(v) => {
                setLookStatus(look.id, v as LookStatus);
                toast.success(`Look marcado como ${STATUS_LABEL[v as LookStatus]}`);
              }}
            >
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1"
              onClick={() => {
                duplicateLook(look.id);
                toast.success("Look duplicado como rascunho.");
              }}
            >
              <Copy className="w-3.5 h-3.5" /> Duplicar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-1 text-status-blocked hover:text-status-blocked"
              onClick={() => {
                if (confirm(`Excluir "${look.name}"?`)) {
                  removeLook(look.id);
                  toast.success("Look excluído.");
                }
              }}
            >
              <Trash2 className="w-3.5 h-3.5" /> Excluir
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AddItemForm({ lookId }: { lookId: string }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#888888");
  const [role, setRole] = useState<LookItem["role"]>("complemento");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!code.trim() || !name.trim()) return;
        addItemToLook(lookId, {
          refCode: code.trim().toUpperCase(),
          refName: name.trim(),
          role,
          colorHex: color,
        });
        setCode(""); setName("");
        toast.success("Peça adicionada.");
      }}
      className="mt-3 grid grid-cols-2 gap-2"
    >
      <Input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="REF-…"
        className="h-8 text-xs col-span-1"
      />
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome da peça"
        className="h-8 text-xs col-span-1"
      />
      <Select value={role} onValueChange={(v) => setRole(v as LookItem["role"])}>
        <SelectTrigger className="h-8 text-xs col-span-1"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="peça-chave">Peça-chave</SelectItem>
          <SelectItem value="complemento">Complemento</SelectItem>
          <SelectItem value="acessório">Acessório</SelectItem>
          <SelectItem value="calçado">Calçado</SelectItem>
        </SelectContent>
      </Select>
      <div className="flex gap-1 col-span-1">
        <Input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-8 w-10 p-0.5 shrink-0"
        />
        <Button type="submit" size="sm" className="h-8 flex-1 text-xs">Adicionar</Button>
      </div>
    </form>
  );
}

function NewLookDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [name, setName] = useState("");
  const [season, setSeason] = useState("Alto Verão 26");
  const [occasion, setOccasion] = useState<LookOccasion>("casual");
  const [color, setColor] = useState("#c8b6a0");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Novo look</DialogTitle>
      </DialogHeader>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          const id = `look-${Math.random().toString(36).slice(2, 8)}`;
          upsertLook({
            id,
            name: name.trim(),
            season: season.trim(),
            occasion,
            status: "rascunho",
            tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
            stylingNotes: notes.trim(),
            items: [],
            coverColor: color,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          toast.success("Look criado como rascunho.");
          onCreated(id);
        }}
        className="space-y-3"
      >
        <div>
          <label className="uppercase-label text-muted-foreground">Nome</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="uppercase-label text-muted-foreground">Coleção</label>
            <Input value={season} onChange={(e) => setSeason(e.target.value)} />
          </div>
          <div>
            <label className="uppercase-label text-muted-foreground">Ocasião</label>
            <Select value={occasion} onValueChange={(v) => setOccasion(v as LookOccasion)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {OCCASIONS.map((o) => (
                  <SelectItem key={o} value={o}>{OCCASION_LABEL[o]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-3">
          <div>
            <label className="uppercase-label text-muted-foreground">Cor</label>
            <Input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-9 p-1"
            />
          </div>
          <div>
            <label className="uppercase-label text-muted-foreground">Tags (vírgula)</label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="denim, oversized, monocromia" />
          </div>
        </div>
        <div>
          <label className="uppercase-label text-muted-foreground">Styling notes</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Como combinar as peças…"
          />
        </div>
        <DialogFooter>
          <Button type="submit">Criar look</Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
