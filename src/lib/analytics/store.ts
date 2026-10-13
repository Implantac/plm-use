// Store dos KPIs estratégicos do BI Executivo (rota /analytics).
//
// Histórico: a tela mantinha `useState<KPIItem[]>` local com JSX no objeto —
// editar/remover sumia no F5 (mesma doença que a tela de coleções tinha).
// `icon` agora é NOME de ícone (string persistível); o componente React é
// resolvido na renderização (ICONS no próprio route). O objeto do store é, por
// construção, serializável — é isso que permite o espelho no Supabase via
// `creative-sync` (módulo 8: analytics_kpis).

import { useSyncExternalStore } from "react";

export interface AnalyticsKpi {
  id: number;
  label: string;
  value: string;
  sub: string;
  progress?: number; // 0..100; ausente = KPI sem barra
  iconName: "target" | "trending-up" | "zap" | "bar-chart";
  tone: string; // classe de cor (emerald|amber|primary|…)
}

export const analyticsKpisSeed: AnalyticsKpi[] = [
  {
    id: 1,
    label: "Meta de Coleção",
    value: "2.4M",
    sub: "4M",
    progress: 60,
    iconName: "target",
    tone: "primary",
  },
  {
    id: 2,
    label: "Crescimento YoY",
    value: "+24.8%",
    sub: "vs mercado: +12%",
    iconName: "trending-up",
    tone: "emerald",
  },
  {
    id: 3,
    label: "Eficiência PCP",
    value: "94.2%",
    sub: "ciclo: 32 dias",
    iconName: "zap",
    tone: "amber",
  },
];

let kpis: AnalyticsKpi[] = [...analyticsKpisSeed];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function useAnalyticsKpis(): AnalyticsKpi[] {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => kpis,
    () => kpis,
  );
}

export function listAnalyticsKpis(): AnalyticsKpi[] {
  return kpis;
}

export function subscribeAnalyticsKpis(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function upsertAnalyticsKpi(next: AnalyticsKpi) {
  const idx = kpis.findIndex((k) => k.id === next.id);
  if (idx === -1) kpis = [...kpis, next];
  else kpis = kpis.map((k, i) => (i === idx ? next : k));
  emit();
}

export function removeAnalyticsKpi(id: number) {
  kpis = kpis.filter((k) => k.id !== id);
  emit();
}

// Repositor de hidratação (creative-sync) — ver colors/store.ts.
export function replaceAllAnalyticsKpis(next: AnalyticsKpi[]) {
  kpis = next;
  emit();
}

/** Validação do dialog de KPI — exportada pura p/ teste e reuso no dialog de edição. */
export function validateKpiDraft(d: { label: string; value: string }): string | null {
  if (d.label.trim().length < 2) return "Dê um nome ao indicador (2+ caracteres).";
  if (!d.value.trim()) return 'O valor é obrigatório — use "—" quando ainda não houver número.';
  return null;
}

/** Busca textual do módulo (label/sub) — pura para ser testável. */
export function filterAnalyticsKpis(list: AnalyticsKpi[], q: string): AnalyticsKpi[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((k) => `${k.label} ${k.sub}`.toLowerCase().includes(needle));
}
