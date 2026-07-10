// Measurements library store (Tabela de Medidas / Size Charts)
// In-memory pattern like colors/prints/looks. Swap with a Supabase table
// when the schema lands.

export type MeasurementPoint = {
  id: string;
  code: string; // "PA" (peito), "CI" (cintura), "QU" (quadril)
  label: string; // "Peito", "Cintura"
  toleranceCm: number; // tolerância +/-
};

export type MeasurementGradeRow = {
  size: string; // "PP" | "P" | "M" | "G" | "36" | "38"
  values: Record<string, number>; // pointCode -> value in cm
};

export type MeasurementChart = {
  id: string;
  code: string; // "TM-BLU-01"
  name: string; // "Blusas Slim Feminino"
  category: "Top" | "Bottom" | "Dress" | "Outwear" | "Underwear" | "Kids";
  segment: "Feminino" | "Masculino" | "Unissex" | "Infantil";
  fit?: "slim" | "regular" | "oversized" | "relaxed";
  unit: "cm" | "in";
  brand?: string;
  linkedRefs: number;
  status: "rascunho" | "aprovada" | "arquivada";
  updatedAt: string;
  updatedBy: string;
  points: MeasurementPoint[];
  grade: MeasurementGradeRow[];
  notes?: string;
};

export const measurementsSeed: MeasurementChart[] = [
  {
    id: "tm-01",
    code: "TM-BLU-01",
    name: "Blusas Slim Feminino",
    category: "Top",
    segment: "Feminino",
    fit: "slim",
    unit: "cm",
    brand: "Premium Luxe",
    linkedRefs: 18,
    status: "aprovada",
    updatedAt: "2026-06-22",
    updatedBy: "Modelagem",
    notes: "Grade base para blusas ajustadas linha premium.",
    points: [
      { id: "p1", code: "PA", label: "Peito", toleranceCm: 1.0 },
      { id: "p2", code: "CI", label: "Cintura", toleranceCm: 1.0 },
      { id: "p3", code: "QU", label: "Quadril", toleranceCm: 1.0 },
      { id: "p4", code: "OM", label: "Ombro", toleranceCm: 0.5 },
      { id: "p5", code: "CO", label: "Comprimento", toleranceCm: 1.0 },
    ],
    grade: [
      { size: "PP", values: { PA: 82, CI: 66, QU: 88, OM: 36, CO: 58 } },
      { size: "P", values: { PA: 86, CI: 70, QU: 92, OM: 37, CO: 60 } },
      { size: "M", values: { PA: 90, CI: 74, QU: 96, OM: 38, CO: 62 } },
      { size: "G", values: { PA: 94, CI: 78, QU: 100, OM: 39, CO: 64 } },
      { size: "GG", values: { PA: 98, CI: 82, QU: 104, OM: 40, CO: 66 } },
    ],
  },
  {
    id: "tm-02",
    code: "TM-CAL-02",
    name: "Calças Alfaiataria Feminino",
    category: "Bottom",
    segment: "Feminino",
    fit: "regular",
    unit: "cm",
    brand: "Basic Chic",
    linkedRefs: 9,
    status: "aprovada",
    updatedAt: "2026-05-14",
    updatedBy: "Modelagem",
    points: [
      { id: "p1", code: "CI", label: "Cintura", toleranceCm: 0.5 },
      { id: "p2", code: "QU", label: "Quadril", toleranceCm: 1.0 },
      { id: "p3", code: "GA", label: "Gancho", toleranceCm: 0.5 },
      { id: "p4", code: "CX", label: "Coxa", toleranceCm: 0.5 },
      { id: "p5", code: "EN", label: "Entrepernas", toleranceCm: 1.0 },
      { id: "p6", code: "BA", label: "Barra", toleranceCm: 0.5 },
    ],
    grade: [
      { size: "36", values: { CI: 62, QU: 90, GA: 24, CX: 54, EN: 76, BA: 34 } },
      { size: "38", values: { CI: 66, QU: 94, GA: 25, CX: 56, EN: 77, BA: 35 } },
      { size: "40", values: { CI: 70, QU: 98, GA: 26, CX: 58, EN: 78, BA: 36 } },
      { size: "42", values: { CI: 74, QU: 102, GA: 27, CX: 60, EN: 79, BA: 37 } },
      { size: "44", values: { CI: 78, QU: 106, GA: 28, CX: 62, EN: 80, BA: 38 } },
    ],
  },
  {
    id: "tm-03",
    code: "TM-VES-01",
    name: "Vestidos Longos Premium",
    category: "Dress",
    segment: "Feminino",
    fit: "regular",
    unit: "cm",
    brand: "Premium Luxe",
    linkedRefs: 5,
    status: "rascunho",
    updatedAt: "2026-07-05",
    updatedBy: "Estilo",
    notes: "Grade em revisão para lançamento Resort.",
    points: [
      { id: "p1", code: "PA", label: "Peito", toleranceCm: 1.0 },
      { id: "p2", code: "CI", label: "Cintura", toleranceCm: 1.0 },
      { id: "p3", code: "QU", label: "Quadril", toleranceCm: 1.0 },
      { id: "p4", code: "CO", label: "Comprimento total", toleranceCm: 2.0 },
    ],
    grade: [
      { size: "P", values: { PA: 86, CI: 70, QU: 92, CO: 138 } },
      { size: "M", values: { PA: 90, CI: 74, QU: 96, CO: 140 } },
      { size: "G", values: { PA: 94, CI: 78, QU: 100, CO: 142 } },
    ],
  },
];

type Listener = () => void;
const listeners = new Set<Listener>();
let charts = [...measurementsSeed];

export function listCharts(): MeasurementChart[] {
  return charts;
}

export function getChart(id: string): MeasurementChart | undefined {
  return charts.find((c) => c.id === id);
}

export function upsertChart(next: MeasurementChart) {
  const idx = charts.findIndex((c) => c.id === next.id);
  if (idx === -1) charts = [next, ...charts];
  else charts = charts.map((c, i) => (i === idx ? next : c));
  listeners.forEach((l) => l());
}

export function deleteChart(id: string) {
  charts = charts.filter((c) => c.id !== id);
  listeners.forEach((l) => l());
}

export function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}
