// Shared collections dataset used by Collections list and Compare view.
// Simple in-memory store; replace with server fn once collections table exists.
export type Collection = {
  id: number;
  name: string;
  season: string;
  year: number;
  brand: string;
  targetRevenue: string;
  targetSales: string;
  targetMargin: string;
  plannedQty: string;
  plannedMix: number;
  realizedMix: number;
  progress: number;
  roi: string;
  abc: string;
  status: string;
  image: string;
  // KPIs for benchmarking (derived / demo values)
  showroomApproval: number; // % of refs approved in showroom
  avgCost: number; // R$
  avgPrice: number; // R$
  sellThrough: number; // %
  leadTimeDias: number; // dias médios desenvolvimento → produção
};

export const collectionsSeed: Collection[] = [
  {
    id: 1,
    name: "Verão 25 - Amalfi",
    season: "Primavera / Verão",
    year: 2025,
    brand: "Premium Luxe",
    targetRevenue: "R$ 1,8 mi",
    targetSales: "24.000 peças",
    targetMargin: "68%",
    plannedQty: "186 refs",
    plannedMix: 186,
    realizedMix: 142,
    progress: 76,
    roi: "3.4x",
    abc: "A: 28% / B: 44% / C: 28%",
    status: "Produção",
    image:
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?auto=format&fit=crop&q=80&w=900",
    showroomApproval: 82,
    avgCost: 68.5,
    avgPrice: 249,
    sellThrough: 71,
    leadTimeDias: 96,
  },
  {
    id: 2,
    name: "Urban Resort",
    season: "Alto Verão",
    year: 2025,
    brand: "Basic Chic",
    targetRevenue: "R$ 920 mil",
    targetSales: "16.500 peças",
    targetMargin: "61%",
    plannedQty: "92 refs",
    plannedMix: 92,
    realizedMix: 51,
    progress: 55,
    roi: "2.7x",
    abc: "A: 21% / B: 46% / C: 33%",
    status: "Desenvolvimento",
    image:
      "https://images.unsplash.com/photo-1539109136881-3be061694b9b?auto=format&fit=crop&q=80&w=900",
    showroomApproval: 64,
    avgCost: 42.1,
    avgPrice: 139,
    sellThrough: 58,
    leadTimeDias: 78,
  },
  {
    id: 3,
    name: "Essentials Atemporal",
    season: "Continuativo",
    year: 2026,
    brand: "Core",
    targetRevenue: "R$ 640 mil",
    targetSales: "11.200 peças",
    targetMargin: "72%",
    plannedQty: "48 refs",
    plannedMix: 48,
    realizedMix: 18,
    progress: 38,
    roi: "4.1x",
    abc: "A: 35% / B: 40% / C: 25%",
    status: "Aprovação",
    image:
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=900",
    showroomApproval: 88,
    avgCost: 31.2,
    avgPrice: 129,
    sellThrough: 79,
    leadTimeDias: 62,
  },
];
