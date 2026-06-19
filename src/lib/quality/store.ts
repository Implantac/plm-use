// Quality / CAPA store. Deriva defeitos das ocorrências do PCP + CAPA própria.
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Lote } from "@/types/pcp";

export type CapaAction = {
  id: string;
  ref?: string;
  lote?: string;
  defeito: string;
  setor: string;
  fornecedor?: string;
  tipo: "Corretiva" | "Preventiva";
  responsavel: string;
  prazo: string;
  status: "Aberta" | "Em andamento" | "Concluída";
  criada: string;
};

const uid = () => Math.random().toString(36).slice(2, 9);
const today = () => new Date().toISOString().slice(0, 10);

const SEED: CapaAction[] = [
  { id: uid(), defeito: "Silk torto inutilizado", setor: "Silk", responsavel: "Marcos", tipo: "Corretiva", prazo: "2026-06-22", status: "Em andamento", criada: today(), ref: "CM712", lote: "LOTE 2601" },
  { id: uid(), defeito: "Defeito de malha recorrente", setor: "Corte", fornecedor: "Têxtil Camargo", responsavel: "Sandra Lima", tipo: "Preventiva", prazo: "2026-06-30", status: "Aberta", criada: today() },
];

interface State {
  capa: CapaAction[];
  addCapa(c: Omit<CapaAction, "id" | "criada" | "status">): void;
  updateStatus(id: string, status: CapaAction["status"]): void;
  remove(id: string): void;
}

export const useQualityStore = create<State>()(persist((set) => ({
  capa: SEED,
  addCapa(c) {
    set((s) => ({ capa: [{ id: uid(), criada: today(), status: "Aberta", ...c }, ...s.capa] }));
  },
  updateStatus(id, status) {
    set((s) => ({ capa: s.capa.map((x) => (x.id === id ? { ...x, status } : x)) }));
  },
  remove(id) {
    set((s) => ({ capa: s.capa.filter((x) => x.id !== id) }));
  },
}), { name: "use-moda:quality" }));

export type DefectRow = { motivo: string; qtd: number; setor: string; lote: string; ref: string; responsavel: string; timestamp: string };

export function defeitosDosLotes(lotes: Lote[]): DefectRow[] {
  const out: DefectRow[] = [];
  for (const l of lotes) {
    for (const r of l.referencias) {
      for (const o of r.ocorrencias) {
        if (o.tipo === "negativa") {
          out.push({ motivo: o.motivo, qtd: o.qtd, setor: o.setor, lote: l.numero, ref: r.ref, responsavel: o.responsavel, timestamp: o.timestamp });
        }
      }
    }
  }
  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function rankingPorChave<T extends string>(rows: DefectRow[], key: T extends "setor" | "motivo" ? T : never) {
  const map = new Map<string, number>();
  for (const r of rows) map.set((r as any)[key], (map.get((r as any)[key]) ?? 0) + r.qtd);
  return [...map.entries()].sort((a, b) => b[1] - a[1]);
}
