import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { GlobalSearch } from "@/components/search/GlobalSearch";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Settings,
  Bell,
  ChevronRight,
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
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("use-moda-theme");
    const initialTheme = savedTheme === "light" ? "light" : "dark";

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    window.localStorage.setItem("use-moda-theme", nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
  };

  const navItems = [
    { icon: <LayoutDashboard className="w-4 h-4" />, label: "Dashboard", href: "/dashboard" },
    { icon: <Palette className="w-4 h-4" />, label: "Pesquisa", href: "/research" },
    { icon: <Layers className="w-4 h-4" />, label: "Coleções", href: "/collections" },
    { icon: <Scissors className="w-4 h-4" />, label: "Desenvolvimento", href: "/development" },
    { icon: <Zap className="w-4 h-4" />, label: "Protótipos", href: "/prototypes" },
    { icon: <FileText className="w-4 h-4" />, label: "Ficha Técnica", href: "/tech-sheet" },
    { icon: <PenTool className="w-4 h-4" />, label: "CAD & Modelagem", href: "/cad" },
    { icon: <Package className="w-4 h-4" />, label: "Produção", href: "/production" },
    { icon: <Box className="w-4 h-4" />, label: "Almoxarifado", href: "/inventory" },
    { icon: <Users className="w-4 h-4" />, label: "Fornecedores", href: "/suppliers" },
    { icon: <Megaphone className="w-4 h-4" />, label: "Marketing", href: "/marketing" },
    { icon: <ShoppingBag className="w-4 h-4" />, label: "Comercial", href: "/commercial" },
    { icon: <DollarSign className="w-4 h-4" />, label: "Financeiro", href: "/financial" },
    { icon: <BarChart3 className="w-4 h-4" />, label: "BI Executivo", href: "/analytics" },
    { icon: <Sparkles className="w-4 h-4" />, label: "USE AI", href: "/ai-center" },
    { icon: <Globe className="w-4 h-4" />, label: "Digital Twin", href: "/digital-twin" },
    { icon: <MessageSquare className="w-4 h-4" />, label: "Colaboração", href: "/feed" },
    { icon: <LockKeyhole className="w-4 h-4" />, label: "Segurança", href: "/security" },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden font-sans selection:bg-primary/30">
      <aside className="w-[276px] glass-sidebar flex flex-col z-30">
        <div className="px-6 py-5 border-b border-white/5">
          <img src="/assets/logo.png" alt="USE MODA" className="h-9 w-auto" />
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Multiempresa ativo
          </div>
        </div>

        <div className="px-4 py-4">
          <GlobalSearch />
        </div>

        <ScrollArea className="flex-1 px-4">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-[0.16em] transition-all duration-300 group text-muted-foreground hover:text-white hover:bg-white/5 [&.active]:bg-primary/10 [&.active]:text-primary [&.active]:border [&.active]:border-primary/20"
              >
                <span className="transition-transform group-hover:scale-110 duration-300">
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 mt-auto border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 transition-all cursor-pointer group shadow-sm">
            <Avatar className="w-9 h-9 border-2 border-primary/20 transition-transform group-hover:scale-105">
              <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">UA</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white truncate">
                Diretoria de Produto
              </p>
              <p className="text-[9px] text-muted-foreground font-light italic truncate">
                Admin Master
              </p>
            </div>
            <Settings className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors hover:rotate-45 duration-300" />
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 bg-background relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.02]"
          style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}
        />
        <header className="h-[72px] border-b border-white/5 flex items-center justify-between px-8 bg-background/35 backdrop-blur-xl z-20">
          <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            <span className="hover:text-white transition-colors cursor-pointer">USE MODA AI</span>
            <ChevronRight className="w-3.5 h-3.5 opacity-30" />
            <span className="text-white border-b border-primary/50 pb-0.5 uppercase">
              PLM Cockpit
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 transition-all relative group"
            >
              <Bell className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
              <div className="absolute top-3 right-3 w-1.5 h-1.5 bg-primary rounded-full ring-4 ring-background" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Ativar modo claro" : "Ativar modo escuro"}
              className="w-10 h-10 rounded-md bg-white/5 border border-white/5 hover:bg-white/10 transition-all group"
            >
              {theme === "dark" ? (
                <Sun className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
              ) : (
                <Moon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              )}
            </Button>
            <Button
              size="sm"
              className="rounded-md gap-3 px-5 h-10 text-[10px] font-bold uppercase tracking-[0.16em] btn-primary-premium"
            >
              <Sparkles className="w-4 h-4 fill-current" />
              USE AI Copilot
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-8 max-w-[1680px] mx-auto">
            <Outlet />
          </div>
        </ScrollArea>
      </main>
    </div>
  );
}
