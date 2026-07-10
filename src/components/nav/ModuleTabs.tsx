import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type Tab = { to: string; label: string };

const GROUPS: Record<string, Tab[]> = {
  collections: [
    { to: "/collections", label: "Visão Geral" },
    { to: "/collection-map", label: "Mapa" },
    { to: "/collections/compare", label: "Comparativo" },
  ],
  ai: [
    { to: "/ai-center", label: "Copilot" },
    { to: "/ai-agents", label: "Agentes" },
  ],
  admin: [
    { to: "/admin/users", label: "Usuários" },
    { to: "/security", label: "Segurança" },
    { to: "/audit", label: "Auditoria" },
  ],
};

export function ModuleTabs({ group }: { group: keyof typeof GROUPS }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const tabs = GROUPS[group];
  return (
    <div className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-white/[0.02] p-1.5">
      {tabs.map((t) => {
        const active = pathname === t.to;
        return (
          <Link
            key={t.to}
            to={t.to}
            className={cn(
              "px-3.5 py-2 rounded-md text-[10px] font-bold uppercase tracking-[0.16em] transition-colors",
              active
                ? "bg-primary/15 text-primary border border-primary/30"
                : "text-muted-foreground hover:text-white hover:bg-white/5 border border-transparent",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
