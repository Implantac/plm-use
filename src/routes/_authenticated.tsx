import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { AppBreadcrumb } from "@/components/nav/AppBreadcrumb";
import { useRecentRoutes } from "@/hooks/use-recent-routes";
import { useAuth, signOut } from "@/hooks/use-auth";
import { usePCPCloudSync } from "@/lib/pcp/sync";
import { useModulesCloudSync } from "@/lib/cloud-sync";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { AlertsBell } from "@/components/alerts/AlertsBell";
import { PresenceBar } from "@/components/presence/PresenceBar";
import { ActivityFeedButton } from "@/components/activity/ActivityFeedButton";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  
  ChevronDown,
  Zap,
  BarChart3,
  Layers,
  Palette,
  Scissors,
  FileText,
  PenTool,
  Package,
  Truck,
  Users,
  Megaphone,
  DollarSign,
  Box,
  MessageSquare,
  Sparkles,
  ShoppingBag,
  Globe,
  ShieldCheck,
  LockKeyhole,
  Moon,
  Sun,
  Heart,
  Bot,
  Fingerprint,
  FileImage,
  LayoutTemplate,
  Grid3x3,
  Shirt,
  Ruler,
  ClipboardList,
  Star,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const { isAuthenticated, loading, user } = useAuth();
  const navigate = useNavigate();
  usePCPCloudSync(isAuthenticated);
  useModulesCloudSync(isAuthenticated);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("use-moda-theme");
    const initialTheme = savedTheme === "light" ? "light" : "dark";

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const handleLogout = async () => {
    await signOut();
    toast.success("Sessão encerrada.");
    navigate({ to: "/login" });
  };

  const navSections = useMemo(
    () => [
      {
        id: "geral",
        label: "Geral",
        items: [
          { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", href: "/dashboard" },
          { icon: <MessageSquare className="w-4 h-4" />, label: "Colaboração", href: "/feed" },
        ],
      },
      {
        id: "desenvolver",
        label: "1 · Desenvolver Produto",
        items: [
          { icon: <Palette className="w-4 h-4" />, label: "Pesquisa & Moodboard", href: "/research" },
          { icon: <Palette className="w-4 h-4" />, label: "Cartela de Cores", href: "/colors" },
          { icon: <FileImage className="w-4 h-4" />, label: "Cartela de Estampas", href: "/prints" },
          { icon: <LayoutTemplate className="w-4 h-4" />, label: "Painel de Displayagem", href: "/display" },
          { icon: <Shirt className="w-4 h-4" />, label: "Coordenados · Looks", href: "/looks" },
          { icon: <Layers className="w-4 h-4" />, label: "Coleções", href: "/collections" },
          { icon: <Grid3x3 className="w-4 h-4" />, label: "Mapa de Coleção", href: "/collection-map" },
          { icon: <Fingerprint className="w-4 h-4" />, label: "Núcleo · Referências", href: "/references" },
          { icon: <Scissors className="w-4 h-4" />, label: "Desenvolvimento", href: "/development" },
          { icon: <Zap className="w-4 h-4" />, label: "Protótipos", href: "/prototypes" },
          { icon: <PenTool className="w-4 h-4" />, label: "CAD & Modelagem", href: "/cad" },
        ],
      },
      {
        id: "industrializar",
        label: "2 · Industrializar",
        items: [
          { icon: <FileText className="w-4 h-4" />, label: "Ficha Técnica", href: "/tech-sheet" },
          { icon: <Ruler className="w-4 h-4" />, label: "Tabela de Medidas", href: "/measurements" },
          { icon: <ClipboardList className="w-4 h-4" />, label: "Relatório de Peças", href: "/pieces-report" },
          { icon: <ShieldCheck className="w-4 h-4" />, label: "Qualidade", href: "/quality" },
        ],
      },
      {
        id: "planejar",
        label: "3 · Planejar Produção",
        items: [
          { icon: <Zap className="w-4 h-4" />, label: "Planner", href: "/planner" },
          { icon: <Box className="w-4 h-4" />, label: "Almoxarifado", href: "/inventory" },
          { icon: <Truck className="w-4 h-4" />, label: "Fornecedores", href: "/suppliers" },
          { icon: <Truck className="w-4 h-4" />, label: "Portal do Fornecedor", href: "/supplier-portal" },
        ],
      },
      {
        id: "acompanhar",
        label: "4 · Acompanhar Produção",
        items: [
          { icon: <Package className="w-4 h-4" />, label: "Produção", href: "/production" },
          { icon: <Package className="w-4 h-4" />, label: "Produção · Hoje", href: "/production/today" },
        ],
      },
      {
        id: "encerrar",
        label: "5 · Encerrar",
        items: [
          { icon: <Sparkles className="w-4 h-4" />, label: "Lançamento", href: "/launch" },
          { icon: <LayoutTemplate className="w-4 h-4" />, label: "Showroom", href: "/showroom" },
          { icon: <ShoppingBag className="w-4 h-4" />, label: "Comercial", href: "/commercial" },
          { icon: <Megaphone className="w-4 h-4" />, label: "Marketing", href: "/marketing" },
          { icon: <Heart className="w-4 h-4" />, label: "Influencers", href: "/influencers" },
          { icon: <BarChart3 className="w-4 h-4" />, label: "BI Executivo", href: "/analytics" },
          { icon: <DollarSign className="w-4 h-4" />, label: "Financeiro", href: "/financial" },
        ],
      },
      {
        id: "insights",
        label: "Insights & IA",
        items: [
          { icon: <Sparkles className="w-4 h-4" />, label: "USE AI", href: "/ai-center" },
          { icon: <Bot className="w-4 h-4" />, label: "AI Agents", href: "/ai-agents" },
          { icon: <Globe className="w-4 h-4" />, label: "Digital Twin", href: "/digital-twin" },
        ],
      },
      {
        id: "admin",
        label: "Administração",
        items: [
          { icon: <LockKeyhole className="w-4 h-4" />, label: "Segurança", href: "/security" },
          { icon: <ShieldCheck className="w-4 h-4" />, label: "Admin · Usuários", href: "/admin/users" },
          { icon: <ClipboardList className="w-4 h-4" />, label: "Auditoria", href: "/audit" },
        ],
      },
    ],
    [],
  );

  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const bestMatchHref = useMemo(() => {
    const allHrefs = navSections.flatMap((s) => s.items.map((it) => it.href));
    const matches = allHrefs.filter(
      (href) => pathname === href || pathname.startsWith(href + "/"),
    );
    return matches.sort((a, b) => b.length - a.length)[0];
  }, [pathname, navSections]);

  const activeSectionId = useMemo(() => {
    if (!bestMatchHref) return undefined;
    return navSections.find((s) => s.items.some((it) => it.href === bestMatchHref))?.id;
  }, [bestMatchHref, navSections]);

  const isActiveItem = (href: string) => href === bestMatchHref;

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("use-moda-sidebar-sections-v2") : null;
    return stored
      ? (JSON.parse(stored) as Record<string, boolean>)
      : {
          geral: true,
          desenvolver: true,
          industrializar: false,
          planejar: false,
          acompanhar: false,
          encerrar: false,
          insights: false,
          admin: false,
        };
  });

  // Sincroniza o grupo ativo com a rota atual — abre automaticamente a seção do processo em uso.
  useEffect(() => {
    if (!activeSectionId) return;
    setOpenSections((prev) => {
      if (prev[activeSectionId]) return prev;
      const next = { ...prev, [activeSectionId]: true };
      if (typeof window !== "undefined") {
        window.localStorage.setItem("use-moda-sidebar-sections-v2", JSON.stringify(next));
      }
      return next;
    });
  }, [activeSectionId]);

  const toggleSection = (id: string) =>
    setOpenSections((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (typeof window !== "undefined") {
        window.localStorage.setItem("use-moda-sidebar-sections-v2", JSON.stringify(next));
      }
      return next;
    });

  const { favorites, isFavorite, toggleFavorite } = useRecentRoutes();
  const favoriteItems = favorites
    .map((path) => {
      for (const s of navSections) {
        const item = s.items.find((it) => it.href === path);
        if (item) return item;
      }
      return null;
    })
    .filter((v): v is NonNullable<typeof v> => Boolean(v));

  if (loading || !isAuthenticated) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background text-muted-foreground text-xs uppercase tracking-[0.3em]">
        Autenticando...
      </div>
    );
  }

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    window.localStorage.setItem("use-moda-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };


  return (
    <div className="flex h-dvh bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <aside className="w-[276px] glass-sidebar flex flex-col z-30 relative">
        {/* Ambient ember glow no topo da sidebar */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-48 opacity-70"
          style={{
            background:
              "radial-gradient(80% 100% at 30% 0%, hsl(var(--brand-500) / 0.14) 0%, transparent 65%)",
          }}
        />
        <div className="relative px-6 py-5 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0">
              <div className="absolute -inset-1.5 rounded-full bg-ember opacity-30 blur-md" aria-hidden />
              <img src="/assets/logo.png" alt="USE MODA" className="relative h-10 w-10 object-contain" />
            </div>
            <div className="min-w-0">
              <p className="font-heading text-lg leading-none text-foreground truncate">USE MODA</p>
              <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.28em] text-glow">
                PLM · AI
              </p>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 uppercase-label text-status-approved">
            <ShieldCheck className="h-3.5 w-3.5" />
            Multiempresa ativo
          </div>
        </div>

        <div className="relative px-4 py-4">
          <GlobalSearch />
        </div>


        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1 py-1">
            {favoriteItems.length > 0 && (
              <div>
                <div className="px-2 py-1 text-2xs font-bold uppercase tracking-[0.18em] text-primary/70 flex items-center gap-1.5">
                  <Star className="w-3 h-3 fill-primary/40" />
                  Favoritos
                </div>
                <div className="mt-0.5 mb-2 space-y-0.5">
                  {favoriteItems.map((item) => {
                    const active = isActiveItem(item.href);
                    return (
                      <Link
                        key={`fav-${item.href}`}
                        to={item.href}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md uppercase-label transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                      >
                        <span>{item.icon}</span>
                        <span className="flex-1 truncate">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}
            {navSections.map((section) => {
              const open = openSections[section.id] ?? false;
              const sectionActive = section.id === activeSectionId;
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    aria-expanded={open}
                    className={`w-full flex items-center justify-between px-2 py-1 text-2xs font-bold uppercase tracking-[0.18em] transition-colors ${sectionActive ? "text-primary" : "text-muted-foreground/70 hover:text-foreground"}`}
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${open ? "" : "-rotate-90"}`}
                    />
                  </button>
                  {open && (
                    <div className="mt-0.5 mb-1 space-y-0.5">
                      {section.items.map((item) => {
                        const fav = isFavorite(item.href);
                        const active = isActiveItem(item.href);
                        return (
                          <div key={item.label} className="group/nav flex items-center">
                            <Link
                              to={item.href}
                              aria-current={active ? "page" : undefined}
                              className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-md uppercase-label transition-colors ${active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}
                            >
                              <span>{item.icon}</span>
                              <span className="flex-1 truncate">{item.label}</span>
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleFavorite(item.href);
                              }}
                              aria-label={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                              className={`ml-1 p-1 rounded transition-opacity ${fav ? "opacity-100 text-primary" : "opacity-0 group-hover/nav:opacity-60 hover:opacity-100 text-muted-foreground"}`}
                            >
                              <Star className={`w-3 h-3 ${fav ? "fill-primary" : ""}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </ScrollArea>


        <div className="p-4 mt-auto border-t border-sidebar-border">
          <div className="flex items-center gap-3 p-3 rounded-md bg-accent border border-border hover:bg-muted transition-colors group">
            <Avatar className="w-9 h-9 border border-border">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {(user?.email?.[0] ?? "U").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">
                {user?.user_metadata?.full_name ?? user?.email?.split("@")[0] ?? "Usuário"}
              </p>
              <p className="text-2xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>
            <button
              onClick={handleLogout}
              title="Sair"
              aria-label="Sair"
              className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-background/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
        {/* Ambient forge glow — halo ember discreto que amarra o tema */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90 bg-forge"
        />
        <header className="relative h-14 border-b border-border flex items-center justify-between px-6 bg-background/70 backdrop-blur-xl z-20">
          <AppBreadcrumb />

          <div className="flex items-center gap-2">
            <PresenceBar />
            <ActivityFeedButton />
            <AlertsBell />
            <Button
 variant="ghost"
 size="icon"
 onClick={toggleTheme}
 aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
 className="w-9"
 >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button
 size="sm"
 className="gap-2-label text-primary-foreground active:scale-[0.98]"
 >
              <Sparkles className="w-4 h-4" />
              USE AI Copilot
            </Button>
          </div>
        </header>

        <ScrollArea className="relative flex-1">
          <div className="p-6">
            <Outlet />
          </div>
        </ScrollArea>
      </main>

    </div>
  );
}

