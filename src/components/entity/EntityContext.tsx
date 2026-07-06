// Contexto global de "abrir entidade no drawer" — chamável de qualquer módulo.
// Uso: const { openEntity } = useEntityDrawer(); openEntity({type:'reference', id});
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { EntityType } from "@/hooks/use-entity-events";
import { EntityDrawer } from "@/components/entity/EntityDrawer";

export type EntityRef = { type: EntityType; id: string; title?: string; subtitle?: string };

type Ctx = {
  current: EntityRef | null;
  openEntity: (ref: EntityRef) => void;
  closeEntity: () => void;
};

const EntityDrawerCtx = createContext<Ctx | null>(null);

export function EntityDrawerProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<EntityRef | null>(null);
  const openEntity = useCallback((ref: EntityRef) => setCurrent(ref), []);
  const closeEntity = useCallback(() => setCurrent(null), []);

  return (
    <EntityDrawerCtx.Provider value={{ current, openEntity, closeEntity }}>
      {children}
      <EntityDrawer entity={current} onClose={closeEntity} />
    </EntityDrawerCtx.Provider>
  );
}

export function useEntityDrawer() {
  const ctx = useContext(EntityDrawerCtx);
  if (!ctx) {
    // Safe no-op fallback quando montado fora do provider (evita quebrar telas legadas).
    return {
      current: null,
      openEntity: () => undefined,
      closeEntity: () => undefined,
    } satisfies Ctx;
  }
  return ctx;
}
