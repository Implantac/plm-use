import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { findRouteMeta } from "@/lib/nav/routes";

export function AppBreadcrumb() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const meta = findRouteMeta(pathname);
  const crumbs = meta?.crumbs ?? [];
  const label = meta?.label ?? "Cockpit";

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-3 uppercase-label text-muted-foreground min-w-0"
    >
      <Link to="/dashboard" className="hover:text-foreground transition-colors shrink-0">
        USE MODA
      </Link>
      {crumbs.map((c) => (
        <span key={c} className="flex items-center gap-3 shrink-0">
          <ChevronRight className="w-3.5 h-3.5 opacity-40" />
          <span className="text-muted-foreground/80">{c}</span>
        </span>
      ))}
      <ChevronRight className="w-3.5 h-3.5 opacity-40 shrink-0" />
      <span className="text-foreground truncate">{label}</span>
    </nav>
  );
}
