import { useCallback, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { gravarLocal, lerLocal } from "@/lib/armazenamento-local";

const RECENTS_KEY = "use-moda-recent-routes";
const FAVORITES_KEY = "use-moda-favorite-routes";
const MAX_RECENTS = 8;

const O_QUE: Record<string, string> = {
  [RECENTS_KEY]: "as rotas recentes",
  [FAVORITES_KEY]: "as rotas favoritas",
};

function readList(key: string): string[] {
  const parsed = lerLocal<unknown[]>(key, O_QUE[key] ?? "a navegação", [], Array.isArray);
  return parsed.filter((v): v is string => typeof v === "string");
}

function writeList(key: string, list: string[]) {
  gravarLocal(key, O_QUE[key] ?? "a navegação", list);
}

export function useRecentRoutes() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [recents, setRecents] = useState<string[]>(() => readList(RECENTS_KEY));
  const [favorites, setFavorites] = useState<string[]>(() => readList(FAVORITES_KEY));

  // Registrar rota atual
  useEffect(() => {
    if (!pathname || pathname === "/") return;
    setRecents((prev) => {
      const next = [pathname, ...prev.filter((p) => p !== pathname)].slice(0, MAX_RECENTS);
      writeList(RECENTS_KEY, next);
      return next;
    });
  }, [pathname]);

  const toggleFavorite = useCallback((path: string) => {
    setFavorites((prev) => {
      const next = prev.includes(path) ? prev.filter((p) => p !== path) : [...prev, path];
      writeList(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((path: string) => favorites.includes(path), [favorites]);

  return { recents, favorites, toggleFavorite, isFavorite };
}
