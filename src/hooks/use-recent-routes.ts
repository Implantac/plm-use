import { useCallback, useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";

const RECENTS_KEY = "use-moda-recent-routes";
const FAVORITES_KEY = "use-moda-favorite-routes";
const MAX_RECENTS = 8;

function readList(key: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: string[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(list));
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
