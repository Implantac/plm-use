import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { GlobalSearch } from "@/components/search/GlobalSearch";
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
  ChevronRight,
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
        id: "plm",
        label: "PLM · Produto",
        items: [
          { icon: <Fingerprint className="w-4 h-4" />, label: "Núcleo · Referências", href: "/references" },
          { icon: <Palette className="w-4 h-4" />, label: "Pesquisa", href: "/research" },
          { icon: <Palette className="w-4 h-4" />, label: "Cartela de Cores", href: "/colors" },
          { icon: <FileImage className="w-4 h-4" />, label: "Cartela de Estampas", href: "/prints" },
          { icon: <LayoutTemplate className="w-4 h-4" />, label: "Painel de Displayagem", href: "/display" },
          { icon: <Shirt className="w-4 h-4" />, label: "Coordenados · Looks", href: "/looks" },
          { icon: <Layers className="w-4 h-4" />, label: "Coleções", href: "/collections" },
          { icon: <Grid3x3 className="w-4 h-4" />, label: "Mapa de Coleção", href: "/collection-map" },
          { icon: <Scissors className="w-4 h-4" />, label: "Desenvolvimento", href: "/development" },
          { icon: <Zap className="w-4 h-4" />, label: "Protótipos", href: "/prototypes" },
          { icon: <FileText className="w-4 h-4" />, label: "Ficha Técnica", href: "/tech-sheet" },
          { icon: <PenTool className="w-4 h-4" />, label: "CAD & Modelagem", href: "/cad" },
        ],
      },
      {
        id: "pcp",
        label: "PCP · Produção",
        items: [
          { icon: <Package className="w-4 h-4" />, label: "Produção", href: "/production" },
          { icon: <Zap className="w-4 h-4" />, label: "Planner", href: "/planner" },
          { icon: <ShieldCheck className="w-4 h-4" />, label: "Qualidade", href: "/quality" },
        ],
      },
      {
        id: "supply",
        label: "Supply Chain",
        items: [
          { icon: <Box className="w-4 h-4" />, label: "Almoxarifado", href: "/inventory" },
          { icon: <Truck className="w-4 h-4" />, label: "Fornecedores", href: "/suppliers" },
          { icon: <Truck className="w-4 h-4" />, label: "Portal do Fornecedor", href: "/supplier-portal" },
        ],
      },
      {
        id: "gtm",
        label: "Go-to-Market",
        items: [
          { icon: <Megaphone className="w-4 h-4" />, label: "Marketing", href: "/marketing" },
          { icon: <ShoppingBag className="w-4 h-4" />, label: "Comercial", href: "/commercial" },
          { icon: <Heart className="w-4 h-4" />, label: "Influencers", href: "/influencers" },
        ],
      },
      {
        id: "insights",
        label: "Insights & IA",
        items: [
          { icon: <BarChart3 className="w-4 h-4" />, label: "BI Executivo", href: "/analytics" },
          { icon: <DollarSign className="w-4 h-4" />, label: "Financeiro", href: "/financial" },
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
        ],
      },
    ],
    [],
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const path = typeof window !== "undefined" ? window.location.pathname : "";
    const initial: Record<string, boolean> = {
      geral: true,
      plm: false,
      pcp: false,
      supply: false,
      gtm: false,
      insights: false,
      admin: false,
    };
    navSections.forEach((s) => {
      if (s.items.some((it) => path.startsWith(it.href))) initial[s.id] = true;
    });
    return initial;
  });

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  if (loading || !isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground text-xs uppercase tracking-[0.3em]">
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
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <aside className="w-[276px] glass-sidebar flex flex-col z-30">
        <div className="px-6 py-5 border-b border-sidebar-border">
          <img src="/assets/logo.png" alt="USE MODA" className="h-9 w-auto" />
          <div className="mt-4 flex items-center gap-2 uppercase-label text-status-approved">
            <ShieldCheck className="h-3.5 w-3.5" />
            Multiempresa ativo
          </div>
        </div>

        <div className="px-4 py-4">
          <GlobalSearch />
        </div>

        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1 py-1">
            {navSections.map((section) => {
              const open = openSections[section.id] ?? false;
              return (
                <div key={section.id}>
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="w-full flex items-center justify-between px-2 py-1 text-2xs font-bold uppercase tracking-[0.18em] text-muted-foreground/70 hover:text-foreground transition-colors"
                  >
                    <span>{section.label}</span>
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${open ? "" : "-rotate-90"}`}
                    />
                  </button>
                  {open && (
                    <div className="mt-0.5 mb-1 space-y-0.5">

                      {section.items.map((item) => (
                        <Link
                          key={item.label}
                          to={item.href}
                          className="flex items-center gap-3 px-3 py-2 rounded-md uppercase-label transition-colors text-muted-foreground hover:text-foreground hover:bg-accent [&.active]:bg-primary/10 [&.active]:text-primary"
                        >
                          <span>{item.icon}</span>
                          <span>{item.label}</span>
                        </Link>
                      ))}
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
        <header className="h-14 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3 uppercase-label text-muted-foreground">
            <span className="hover:text-foreground transition-colors cursor-pointer">USE MODA AI</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-40" />
            <span className="text-foreground">PLM Cockpit</span>
          </div>
          <div className="flex items-center gap-2">
            <PresenceBar />
            <ActivityFeedButton />
            <AlertsBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
              className="w-9 h-9"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button size="sm" className="gap-2 h-9 uppercase-label">
              <Sparkles className="w-4 h-4" />
              USE AI Copilot
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-6">
            <Outlet />
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}

