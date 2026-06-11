import * as React from "react";
import {
  Search,
  Layers,
  Users,
  Box,
  Megaphone,
  Package,
  FileText,
  BarChart3,
  Command as CommandIcon,
  ArrowRight,
  PenTool,
  LockKeyhole,
  Sparkles,
  Globe,
  MessageSquare,
  DollarSign,
  ShoppingBag,
} from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export function GlobalSearch() {
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const searchResults = [
    {
      id: "col-1",
      title: "Verão 24 - Amalfi",
      module: "Coleções",
      icon: <Layers className="w-4 h-4" />,
      path: "/collections",
    },
    {
      id: "col-2",
      title: "Outono 24 - Urban",
      module: "Coleções",
      icon: <Layers className="w-4 h-4" />,
      path: "/collections",
    },
    {
      id: "sup-1",
      title: "Têxtil Amalfi Ltda",
      module: "Fornecedores",
      icon: <Users className="w-4 h-4" />,
      path: "/suppliers",
    },
    {
      id: "sup-2",
      title: "Aviamentos Global",
      module: "Fornecedores",
      icon: <Users className="w-4 h-4" />,
      path: "/suppliers",
    },
    {
      id: "inv-1",
      title: "Linho Puro Off-White",
      module: "Inventário",
      icon: <Box className="w-4 h-4" />,
      path: "/inventory",
    },
    {
      id: "inv-2",
      title: "Botão Madre Pérola",
      module: "Inventário",
      icon: <Box className="w-4 h-4" />,
      path: "/inventory",
    },
    {
      id: "mkt-1",
      title: "Campanha Verão 24",
      module: "Marketing",
      icon: <Megaphone className="w-4 h-4" />,
      path: "/marketing",
    },
    {
      id: "prod-1",
      title: "OP-2024-101 Vestido Seda",
      module: "Produção",
      icon: <Package className="w-4 h-4" />,
      path: "/production",
    },
    {
      id: "tech-1",
      title: "FT-V24-001 Blusa Linho",
      module: "Ficha Técnica",
      icon: <FileText className="w-4 h-4" />,
      path: "/tech-sheet",
    },
    {
      id: "cad-1",
      title: "Molde Blusa Amalfi DXF",
      module: "CAD & Modelagem",
      icon: <PenTool className="w-4 h-4" />,
      path: "/cad",
    },
    {
      id: "com-1",
      title: "Pedidos Marketplace",
      module: "Comercial",
      icon: <ShoppingBag className="w-4 h-4" />,
      path: "/commercial",
    },
    {
      id: "fin-1",
      title: "Margem Coleção Verão 25",
      module: "Financeiro",
      icon: <DollarSign className="w-4 h-4" />,
      path: "/financial",
    },
    {
      id: "bi-1",
      title: "ROI Coleção Verão",
      module: "BI Executivo",
      icon: <BarChart3 className="w-4 h-4" />,
      path: "/analytics",
    },
    {
      id: "ai-1",
      title: "Gerador de Coleções",
      module: "USE AI",
      icon: <Sparkles className="w-4 h-4" />,
      path: "/ai-center",
    },
    {
      id: "twin-1",
      title: "Digital Twin Verão 25",
      module: "Digital Twin",
      icon: <Globe className="w-4 h-4" />,
      path: "/digital-twin",
    },
    {
      id: "feed-1",
      title: "Aprovação Blusa Amalfi",
      module: "Colaboração",
      icon: <MessageSquare className="w-4 h-4" />,
      path: "/feed",
    },
    {
      id: "sec-1",
      title: "RBAC Admin Master",
      module: "Segurança",
      icon: <LockKeyhole className="w-4 h-4" />,
      path: "/security",
    },
  ] as const;

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
            placeholder="Pesquisar em todo o ecossistema..."
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

            <CommandGroup heading="Ações Rápidas">
              <CommandItem
                onSelect={() => runCommand(() => navigate({ to: "/ai-center" }))}
                className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/5 group"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <CommandIcon className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-white">
                    USE AI Copilot
                  </p>
                  <p className="text-[9px] text-muted-foreground uppercase italic tracking-tighter">
                    Consultar inteligência aplicada
                  </p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
              </CommandItem>
            </CommandGroup>

            <CommandSeparator className="bg-white/5 my-2" />

            <CommandGroup heading="Registros Localizados">
              {searchResults.map((item) => (
                <CommandItem
                  key={item.id}
                  onSelect={() => runCommand(() => navigate({ to: item.path }))}
                  className="flex items-center gap-4 p-4 rounded-xl cursor-pointer hover:bg-white/5 group"
                >
                  <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:border-primary/20 transition-all">
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-white group-hover:text-primary transition-colors">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                        {item.module}
                      </span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span className="text-[8px] font-medium text-muted-foreground/40 italic">
                        Ref: {item.id.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-white/5 group-hover:text-primary transition-all opacity-0 group-hover:opacity-100 translate-x-[-10px] group-hover:translate-x-0" />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>

          <div className="p-4 border-t border-white/5 flex justify-between items-center bg-black/40">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                  Navegar
                </span>
                <div className="flex gap-1">
                  <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[7px] text-white font-black">
                    ↑
                  </span>
                  <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[7px] text-white font-black">
                    ↓
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">
                  Abrir
                </span>
                <span className="px-1.5 py-0.5 rounded border border-white/10 bg-white/5 text-[7px] text-white font-black">
                  ENTER
                </span>
              </div>
            </div>
            <p className="text-[8px] font-bold text-primary/40 uppercase tracking-[0.3em]">
              USE MODA Neural Search
            </p>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
