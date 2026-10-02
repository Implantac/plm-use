import * as React from "react";
import {
  Search,
  Layers,
  Package,
  Command as CommandIcon,
  ArrowRight,
  ShieldCheck,
  Heart,
  Sparkles,
  LayoutDashboard,
  Palette,
  Scissors,
  Zap,
  FileText,
  PenTool,
  Users,
  Megaphone,
  ShoppingBag,
  DollarSign,
  BarChart3,
  Globe,
  MessageSquare,
  LockKeyhole,
  Box,
  Bot,
  Star,
  Clock,
  Zap as ZapAction,
} from "lucide-react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useRecentRoutes } from "@/hooks/use-recent-routes";
import { ROUTE_REGISTRY, findRouteMeta, dispatchQuickAction } from "@/lib/nav/routes";
import { usePCPStore } from "@/lib/pcp/store";
import { useQualityStore } from "@/lib/quality/store";
import { useInfluencersStore } from "@/lib/influencers/store";

type Entry = {
  id: string;
  title: string;
  subtitle?: string;
  module: string;
  icon: React.ReactNode;
  path: string;
};

const MODULES: Entry[] = [
  { id: "m-dash", title: "Dashboard", module: "Navegação", icon: <LayoutDashboard className="w-4 h-4" />, path: "/dashboard" },
  { id: "m-research", title: "Pesquisa & Mood", module: "Navegação", icon: <Palette className="w-4 h-4" />, path: "/research" },
  { id: "m-coll", title: "Coleções", module: "Navegação", icon: <Layers className="w-4 h-4" />, path: "/collections" },
  { id: "m-dev", title: "Desenvolvimento", module: "Navegação", icon: <Scissors className="w-4 h-4" />, path: "/development" },
  { id: "m-proto", title: "Protótipos", module: "Navegação", icon: <Zap className="w-4 h-4" />, path: "/prototypes" },
  { id: "m-ft", title: "Ficha Técnica", module: "Navegação", icon: <FileText className="w-4 h-4" />, path: "/tech-sheet" },
  { id: "m-cad", title: "CAD & Modelagem", module: "Navegação", icon: <PenTool className="w-4 h-4" />, path: "/cad" },
  { id: "m-prod", title: "Produção / PCP", module: "Navegação", icon: <Package className="w-4 h-4" />, path: "/production" },
  { id: "m-qa", title: "Qualidade & CAPA", module: "Navegação", icon: <ShieldCheck className="w-4 h-4" />, path: "/quality" },
  { id: "m-plan", title: "Planner", module: "Navegação", icon: <Zap className="w-4 h-4" />, path: "/planner" },
  { id: "m-inv", title: "Almoxarifado", module: "Navegação", icon: <Box className="w-4 h-4" />, path: "/inventory" },
  { id: "m-sup", title: "Fornecedores", module: "Navegação", icon: <Users className="w-4 h-4" />, path: "/suppliers" },
  { id: "m-mkt", title: "Marketing", module: "Navegação", icon: <Megaphone className="w-4 h-4" />, path: "/marketing" },
  { id: "m-com", title: "Comercial", module: "Navegação", icon: <ShoppingBag className="w-4 h-4" />, path: "/commercial" },
  { id: "m-fin", title: "Financeiro", module: "Navegação", icon: <DollarSign className="w-4 h-4" />, path: "/financial" },
  { id: "m-bi", title: "BI Executivo", module: "Navegação", icon: <BarChart3 className="w-4 h-4" />, path: "/analytics" },
  { id: "m-inf", title: "Influencers", module: "Navegação", icon: <Heart className="w-4 h-4" />, path: "/influencers" },
  { id: "m-ai", title: "AI Product Studio", module: "Navegação", icon: <Sparkles className="w-4 h-4" />, path: "/ai-center" },
  { id: "m-agents", title: "AI Agents", module: "Navegação", icon: <Bot className="w-4 h-4" />, path: "/ai-agents" },
  { id: "m-twin", title: "Digital Twin", module: "Navegação", icon: <Globe className="w-4 h-4" />, path: "/digital-twin" },
  { id: "m-feed", title: "Colaboração", module: "Navegação", icon: <MessageSquare className="w-4 h-4" />, path: "/feed" },
  { id: "m-sec", title: "Segurança", module: "Navegação", icon: <LockKeyhole className="w-4 h-4" />, path: "/security" },
];

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();
  const lotes = usePCPStore((s) => s.lotes);
  const capas = useQualityStore((s) => s.capa);
  const influencers = useInfluencersStore((s) => s.influencers);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { recents, favorites, toggleFavorite, isFavorite } = useRecentRoutes();
  const currentMeta = React.useMemo(() => findRouteMeta(pathname), [pathname]);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const metaByPath = React.useMemo(() => {
    const map = new Map<string, (typeof ROUTE_REGISTRY)[number]>();
    for (const r of ROUTE_REGISTRY) map.set(r.path, r);
    return map;
  }, []);

  const recentEntries: Entry[] = React.useMemo(
    () =>
      recents
        .map((p) => metaByPath.get(p))
        .filter((m): m is NonNullable<typeof m> => Boolean(m) && m!.path !== pathname)
        .slice(0, 6)
        .map((m) => ({
          id: `recent-${m.path}`,
          title: m.label,
          subtitle: m.crumbs?.join(" · "),
          module: "Recentes",
          icon: <Clock className="w-4 h-4" />,
          path: m.path,
        })),
    [recents, metaByPath, pathname],
  );

  const favoriteEntries: Entry[] = React.useMemo(
    () =>
      favorites
        .map((p) => metaByPath.get(p))
        .filter((m): m is NonNullable<typeof m> => Boolean(m))
        .map((m) => ({
          id: `fav-${m.path}`,
          title: m.label,
          subtitle: m.crumbs?.join(" · "),
          module: "Favoritos",
          icon: <Star className="w-4 h-4" />,
          path: m.path,
        })),
    [favorites, metaByPath],
  );


  const pcpEntries: Entry[] = React.useMemo(() => {
    const out: Entry[] = [];
    for (const l of lotes) {
      out.push({
        id: `lote-${l.numero}`,
        title: `Lote ${l.numero}`,
        subtitle: `${l.grupo} · ${l.referencias.length} ref.`,
        module: "PCP · Lote",
        icon: <Package className="w-4 h-4" />,
        path: "/production",
      });
      for (const r of l.referencias) {
        out.push({
          id: `ref-${l.numero}-${r.ref}`,
          title: `${r.ref} — ${r.nome}`,
          subtitle: `Lote ${l.numero} · ${r.qtd_programada} un`,
          module: "PCP · Referência",
          icon: <Layers className="w-4 h-4" />,
          path: "/production",
        });
      }
    }
    return out;
  }, [lotes]);

  const capaEntries: Entry[] = React.useMemo(
    () =>
      capas.map((c) => ({
        id: `capa-${c.id}`,
        title: c.defeito,
        subtitle: `${c.setor} · ${c.tipo} · ${c.status}`,
        module: "Qualidade · CAPA",
        icon: <ShieldCheck className="w-4 h-4" />,
        path: "/quality",
      })),
    [capas],
  );

  const infEntries: Entry[] = React.useMemo(
    () =>
      influencers.map((i) => ({
        id: `inf-${i.id}`,
        title: `${i.nome} ${i.handle}`,
        subtitle: `${i.segmento} · ${i.regiao} · ${i.seguidores.toLocaleString("pt-BR")} seguidores`,
        module: "Influencers",
        icon: <Heart className="w-4 h-4" />,
        path: "/influencers",
      })),
    [influencers],
  );

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 border border-white/5 text-muted-foreground hover:text-white cursor-pointer transition-all hover:bg-white/10 group shadow-sm"
      >
        <Search className="w-4 h-4" />
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] flex-1">Comandos</span>
        <span className="text-[9px] font-black border border-white/10 rounded-md px-1.5 py-0.5 bg-black/20 group-hover:border-primary/40 transition-colors">
          ⌘K
        </span>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <div className="glass-card border-none bg-black/95">
          <CommandInput
            placeholder="Buscar lotes, referências, CAPAs, influencers ou módulos…"
            className="h-16 text-white border-none focus:ring-0 placeholder:text-muted-foreground/50"
          />
          <CommandList className="max-h-[450px] overflow-y-auto no-scrollbar pb-4">
            <CommandEmpty className="py-12 text-center">
              <div className="flex flex-col items-center gap-4">
                <Search className="w-10 h-10 text-white/10" />
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
                  Nenhum registro encontrado
                </p>
              </div>
            </CommandEmpty>

            {currentMeta?.quickActions && currentMeta.quickActions.length > 0 && (
              <>
                <CommandGroup heading={`Ações rápidas · ${currentMeta.label}`}>
                  {currentMeta.quickActions.map((qa) => (
                    <CommandItem
                      key={qa.id}
                      onSelect={() => runCommand(() => dispatchQuickAction(qa.event))}
                      className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/5 group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                        <ZapAction className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-white">{qa.label}</p>
                        <p className="text-[9px] text-muted-foreground uppercase italic tracking-tighter">
                          Aqui no {currentMeta.label}
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator className="bg-white/5 my-2" />
              </>
            )}

            <CommandGroup heading="Ações globais">
              <CommandItem
                onSelect={() => runCommand(() => navigate({ to: "/ai-center" }))}
                className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <CommandIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white">AI Product Studio</p>
                  <p className="text-[9px] text-muted-foreground uppercase italic tracking-tighter">
                    Consultar inteligência aplicada
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CommandItem>
              {currentMeta && (
                <CommandItem
                  onSelect={() => runCommand(() => toggleFavorite(currentMeta.path))}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/5 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                    <Star className={`w-4 h-4 ${isFavorite(currentMeta.path) ? "fill-primary" : ""}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-white">
                      {isFavorite(currentMeta.path) ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                    </p>
                    <p className="text-[9px] text-muted-foreground uppercase italic tracking-tighter">
                      {currentMeta.label}
                    </p>
                  </div>
                </CommandItem>
              )}
            </CommandGroup>

            {favoriteEntries.length > 0 && (
              <>
                <CommandSeparator className="bg-white/5 my-2" />
                <CommandGroup heading="Favoritos">
                  {favoriteEntries.map((e) => (
                    <EntryRow key={e.id} entry={e} onSelect={() => runCommand(() => navigate({ to: e.path }))} />
                  ))}
                </CommandGroup>
              </>
            )}

            {recentEntries.length > 0 && (
              <>
                <CommandSeparator className="bg-white/5 my-2" />
                <CommandGroup heading="Recentes">
                  {recentEntries.map((e) => (
                    <EntryRow key={e.id} entry={e} onSelect={() => runCommand(() => navigate({ to: e.path }))} />
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator className="bg-white/5 my-2" />

            <CommandGroup heading="Módulos">
              {MODULES.map((m) => (
                <EntryRow key={m.id} entry={m} onSelect={() => runCommand(() => navigate({ to: m.path }))} />
              ))}
            </CommandGroup>


            {pcpEntries.length > 0 && (
              <>
                <CommandSeparator className="bg-white/5 my-2" />
                <CommandGroup heading="PCP · Lotes & Referências">
                  {pcpEntries.map((e) => (
                    <EntryRow key={e.id} entry={e} onSelect={() => runCommand(() => navigate({ to: e.path }))} />
                  ))}
                </CommandGroup>
              </>
            )}

            {capaEntries.length > 0 && (
              <>
                <CommandSeparator className="bg-white/5 my-2" />
                <CommandGroup heading="Qualidade · CAPAs">
                  {capaEntries.map((e) => (
                    <EntryRow key={e.id} entry={e} onSelect={() => runCommand(() => navigate({ to: e.path }))} />
                  ))}
                </CommandGroup>
              </>
            )}

            {infEntries.length > 0 && (
              <>
                <CommandSeparator className="bg-white/5 my-2" />
                <CommandGroup heading="Influencers">
                  {infEntries.map((e) => (
                    <EntryRow key={e.id} entry={e} onSelect={() => runCommand(() => navigate({ to: e.path }))} />
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>

          <div className="p-4 border-t border-white/5 flex justify-between items-center bg-black/40">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Navegar</span>
                <div className="flex gap-1">
                  <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[7px] text-white font-black">↑</span>
                  <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[7px] text-white font-black">↓</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Abrir</span>
                <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[7px] text-white font-black">ENTER</span>
              </div>
            </div>
            <p className="text-[8px] font-bold text-primary/40 uppercase tracking-[0.3em]">
              USE MODA Neural Search · live
            </p>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}

function EntryRow({ entry, onSelect }: { entry: Entry; onSelect: () => void }) {
  return (
    <CommandItem
      onSelect={onSelect}
      value={`${entry.title} ${entry.subtitle ?? ""} ${entry.module}`}
      className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/5 group"
    >
      <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all">
        {entry.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold text-white group-hover:text-primary transition-colors truncate">
          {entry.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            {entry.module}
          </span>
          {entry.subtitle && (
            <>
              <span className="w-1 h-1 rounded-full bg-white/10" />
              <span className="text-[8px] font-medium text-muted-foreground/50 italic truncate">
                {entry.subtitle}
              </span>
            </>
          )}
        </div>
      </div>
      <ArrowRight className="w-3 h-3 text-white/5 group-hover:text-primary transition-all opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0" />
    </CommandItem>
  );
}
