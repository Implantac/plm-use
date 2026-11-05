// Motor Industrial de Terceirização, Facções de Costura, Lavanderia/Beneficiamento,
// Homologação ABVTEX/OTIF/AQL e Remessa/Retorno de Industrialização (CFOP 5901/5902/5124).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DocumentoNaoEmitivelError,
  buildQrMatrixSvg,
  resolveReferenceTechSheet,
} from "./dpp-expedition";
import { defaultEtiquetagemFor, type TechSheetData } from "./store";
import { round2 } from "./textile";

export type PartnerCategory =
  | "Facção Costura"
  | "Lavanderia & Beneficiamento"
  | "Estamparia & Bordado"
  | "Tecelagem & Malharia"
  | "Aviamentos";

export type ComplianceBadge = "Certificado ABVTEX" | "Homologado" | "Em Auditoria";

export interface IndustrialPartner {
  id: string;
  name: string;
  cnpj: string;
  city: string;
  uf: string;
  category: PartnerCategory;
  compliance: ComplianceBadge;
  machinesSummary: string;
  capacityMinutesMonth: number;
  qualityScore: number; // 0-100 (AQL)
  otifScore: number; // 0-100 (Prazo)
  costScore: number; // 0-100 (Competitividade)
  reliabilityScore: number; // 0-100
  leadTimeDays: number;
  contactEmail: string;
}

export type ExternalServiceType =
  "Costura Externa" | "Lavanderia & Beneficiamento" | "Bordado & Estamparia";

export interface ExternalServiceOrder {
  id: string;
  osNumber: string;
  opNumber: string;
  refCode: string;
  partnerId: string;
  serviceType: ExternalServiceType;
  processRecipe: string;
  unitLaborBrl: number;
  lossTolerancePct: number;
  qtySent: number;
  qtyReturnedFirst: number;
  qtyReturnedSecond: number;
  qtyLost: number;
  issuedAt: string;
  dueDate: string;
}

export interface ComputedPartnerMetrics {
  overallScore: number;
  tier: "A+" | "A" | "B" | "C";
  allocatedMinutes: number;
  capacityUtilizationPct: number;
  openOrdersCount: number;
  piecesInPossession: number;
}

export interface ComputedServiceOrder {
  cfopRemessa: "5901" | "6901";
  cfopRetorno: "5902" | "6902";
  cfopCobranca: "5124" | "6124";
  balanceInThirdParty: number;
  completionPct: number;
  lossPct: number;
  excessLossPieces: number;
  penaltyGlosaBrl: number;
  grossLaborPayableBrl: number;
  netPayableBrl: number;
  samPerPieceMin: number;
  totalMinutesAllocated: number;
  status: "Concluída" | "Retorno Parcial" | "Em Terceiro" | "Alerta Quebra";
  qrSvgDataUrl: string;
  traceUri: string;
}

function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function computePartnerScore(
  p: Pick<IndustrialPartner, "qualityScore" | "otifScore" | "costScore" | "reliabilityScore">,
): { overallScore: number; tier: "A+" | "A" | "B" | "C" } {
  const overallScore = Math.round(
    p.qualityScore * 0.35 + p.otifScore * 0.3 + p.costScore * 0.15 + p.reliabilityScore * 0.2,
  );
  const tier =
    overallScore >= 90 ? "A+" : overallScore >= 80 ? "A" : overallScore >= 70 ? "B" : "C";
  return { overallScore, tier };
}

export function estimateSamMinutes(doc: TechSheetData): number {
  const sum = (doc.bop ?? []).reduce((acc, s) => acc + Math.max(0, Number(s.tempoMin) || 0), 0);
  return sum > 0 ? round2(sum) : 8.5;
}

export function computeServiceOrderMetrics(
  os: ExternalServiceOrder,
  partner: IndustrialPartner,
  doc: TechSheetData,
  issuerUf = "PR",
): ComputedServiceOrder {
  const interstate = partner.uf.trim().toUpperCase() !== issuerUf.trim().toUpperCase();
  const cfopRemessa = interstate ? "6901" : "5901";
  const cfopRetorno = interstate ? "6902" : "5902";
  const cfopCobranca = interstate ? "6124" : "5124";

  const sent = Math.max(0, Math.round(os.qtySent));
  const ret1 = Math.max(0, Math.round(os.qtyReturnedFirst));
  const ret2 = Math.max(0, Math.round(os.qtyReturnedSecond));
  const lost = Math.max(0, Math.round(os.qtyLost));

  const accounted = ret1 + ret2 + lost;
  const balanceInThirdParty = Math.max(0, sent - accounted);
  const completionPct = sent > 0 ? Math.min(100, Math.round((accounted / sent) * 100)) : 0;
  const lossPct = sent > 0 ? round2(((ret2 + lost) / sent) * 100) : 0;

  const allowedLossPieces = Math.floor((sent * Math.max(0, os.lossTolerancePct)) / 100);
  const excessLossPieces = Math.max(0, lost + ret2 - allowedLossPieces);

  // Glosa contratual sobre peças extraviadas/2ª qualidade acima da franquia técnica (R$ 28/pç matéria-prima média)
  const rawMaterialRefBrl = Math.max(
    18,
    round2((doc.bom ?? []).reduce((acc, b) => acc + (Number(b.custo) || 0), 0)),
  );
  const penaltyGlosaBrl = round2(excessLossPieces * rawMaterialRefBrl);
  const grossLaborPayableBrl = round2(ret1 * Math.max(0, os.unitLaborBrl));
  const netPayableBrl = round2(Math.max(0, grossLaborPayableBrl - penaltyGlosaBrl));

  const samPerPieceMin = estimateSamMinutes(doc);
  const totalMinutesAllocated = round2(
    (balanceInThirdParty > 0 ? balanceInThirdParty : sent) * samPerPieceMin,
  );

  const status: ComputedServiceOrder["status"] =
    excessLossPieces > 0
      ? "Alerta Quebra"
      : balanceInThirdParty === 0 && sent > 0
        ? "Concluída"
        : ret1 + ret2 > 0
          ? "Retorno Parcial"
          : "Em Terceiro";

  const traceUri = `https://os.usemoda.ind.br/${encodeURIComponent(os.osNumber)}?op=${encodeURIComponent(os.opNumber)}&cfop=${cfopRemessa}`;
  const qrSvg = buildQrMatrixSvg(traceUri);
  const qrSvgDataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`;

  return {
    cfopRemessa,
    cfopRetorno,
    cfopCobranca,
    balanceInThirdParty,
    completionPct,
    lossPct,
    excessLossPieces,
    penaltyGlosaBrl,
    grossLaborPayableBrl,
    netPayableBrl,
    samPerPieceMin,
    totalMinutesAllocated,
    status,
    qrSvgDataUrl,
    traceUri,
  };
}

export function computePartnerMetrics(
  partner: IndustrialPartner,
  orders: ExternalServiceOrder[],
  sheetsMap: Record<string, TechSheetData>,
): ComputedPartnerMetrics {
  const { overallScore, tier } = computePartnerScore(partner);
  const partnerOrders = orders.filter((o) => o.partnerId === partner.id);

  let allocatedMinutes = 0;
  let openOrdersCount = 0;
  let piecesInPossession = 0;

  for (const o of partnerOrders) {
    // SAM por peça vem da ficha. Se ela não foi salva, o número é do modelo de
    // demonstração e não pode entrar na ocupação de capacidade do parceiro.
    const ref = resolveReferenceTechSheet(o.refCode, sheetsMap);
    if (!ref.emitivel || !ref.doc) continue;
    const m = computeServiceOrderMetrics(o, partner, ref.doc);
    if (m.balanceInThirdParty > 0) {
      openOrdersCount += 1;
      piecesInPossession += m.balanceInThirdParty;
      allocatedMinutes += m.balanceInThirdParty * m.samPerPieceMin;
    }
  }

  const cap = Math.max(1, partner.capacityMinutesMonth);
  const capacityUtilizationPct =
    partner.category === "Tecelagem & Malharia" || partner.category === "Aviamentos"
      ? 0
      : Math.min(100, Math.round((allocatedMinutes / cap) * 100));

  return {
    overallScore,
    tier,
    allocatedMinutes: round2(allocatedMinutes),
    capacityUtilizationPct,
    openOrdersCount,
    piecesInPossession,
  };
}

export function buildRemessaNfeXml400(
  os: ExternalServiceOrder,
  partner: IndustrialPartner,
  doc: TechSheetData,
): string {
  const m = computeServiceOrderMetrics(os, partner, doc);
  const etq = doc.etiquetagem ?? defaultEtiquetagemFor();
  // `padEnd(8, "0")` transformava qualquer NCM curto num código válido de
  // mentira. Agora NCM ausente derruba a emissão, não vira 61099000.
  const ncmDigits = (etq.ncm ?? "").replace(/\D/g, "");
  if (ncmDigits.length !== 8) {
    throw new DocumentoNaoEmitivelError([{ refCode: os.refCode, motivo: "sem-ncm" }]);
  }
  const ncm = ncmDigits;
  const cnpj = partner.cnpj.replace(/\D/g, "").padEnd(14, "0").slice(0, 14);
  const symbolicUnitBrl = round2(
    Math.max(
      12,
      (doc.bom ?? []).reduce((acc, b) => acc + (Number(b.custo) || 0), 0),
    ),
  );
  const totalSymbolicBrl = round2(symbolicUnitBrl * os.qtySent);

  return `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe versao="4.00" Id="NFeREMESSA${escapeXml(os.osNumber.replace(/\W/g, ""))}">
    <ide>
      <natOp>REMESSA PARA INDUSTRIALIZACAO POR ENCOMENDA</natOp>
      <mod>55</mod>
      <tpNF>1</tpNF>
    </ide>
    <emit>
      <xNome>USE MODA INDUSTRIA DO VESTUARIO LTDA</xNome>
      <UF>PR</UF>
    </emit>
    <dest>
      <CNPJ>${escapeXml(cnpj)}</CNPJ>
      <xNome>${escapeXml(partner.name)}</xNome>
      <UF>${escapeXml(partner.uf.toUpperCase())}</UF>
    </dest>
    <det nItem="1">
      <prod>
        <cProd>${escapeXml(os.refCode)}-CORTE</cProd>
        <xProd>FARDOS CORTADOS P/ INDUSTRIALIZACAO ${escapeXml(doc.meta?.name || os.refCode)} (${escapeXml(os.opNumber)})</xProd>
        <NCM>${escapeXml(ncm)}</NCM>
        <CFOP>${m.cfopRemessa}</CFOP>
        <uCom>UN</uCom>
        <qCom>${os.qtySent.toFixed(4)}</qCom>
        <vUnCom>${symbolicUnitBrl.toFixed(4)}</vUnCom>
        <vProd>${totalSymbolicBrl.toFixed(2)}</vProd>
      </prod>
      <imposto>
        <ICMS>
          <ICMS50>
            <orig>0</orig>
            <CST>50</CST>
          </ICMS50>
        </ICMS>
      </imposto>
    </det>
    <infAdic>
      <infCpl>Suspensao do ICMS na remessa p/ industrializacao. Retorno previsto sob CFOP ${m.cfopRetorno} e mao de obra sob CFOP ${m.cfopCobranca}. OS ${escapeXml(os.osNumber)}.</infCpl>
    </infAdic>
  </infNFe>
</NFe>`;
}

export function buildBlindServiceOrderHtml(
  os: ExternalServiceOrder,
  partner: IndustrialPartner,
  doc: TechSheetData,
): string {
  const m = computeServiceOrderMetrics(os, partner, doc);
  const bopRows = (doc.bop ?? [])
    .map(
      (s, idx) => `<tr>
      <td>${idx + 1}</td>
      <td><strong>${escapeXml(s.etapa)}</strong></td>
      <td>${escapeXml(s.maquina ?? "Manual")}</td>
      <td style="text-align:right">${Number(s.tempoMin || 0).toFixed(2)} min</td>
    </tr>`,
    )
    .join("");

  const pomRows = (doc.medidas?.pontos ?? [])
    .map(
      (p) => `<tr>
      <td><strong>${escapeXml(p.codigo)}</strong> — ${escapeXml(p.nome)}</td>
      <td>${escapeXml(p.comoMedir ?? "—")}</td>
      <td style="text-align:right">${p.valorBase} cm (±${p.toleranciaCm} cm)</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8" />
<title>Guia OS Externa (Ficha Cega Comercial) · ${escapeXml(os.osNumber)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: Inter, -apple-system, sans-serif; color: #0f172a; margin: 0; font-size: 11px; }
  .hdr { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
  h1 { font-size: 15px; margin: 0; text-transform: uppercase; }
  .pill { display: inline-block; padding: 2px 6px; border: 1px solid #0f172a; border-radius: 4px; font-weight: 700; font-size: 10px; }
  .box { border: 1px solid #cbd5e1; border-radius: 6px; padding: 8px 10px; background: #f8fafc; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 5px 7px; text-align: left; }
  th { background: #f1f5f9; font-size: 9px; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="hdr">
    <div>
      <span class="pill">FICHA TÉCNICA CEGA · USO EXCLUSIVO FACÇÃO / BENEFICIAMENTO</span>
      <h1 style="margin-top:6px">Ordem de Serviço Externa ${escapeXml(os.osNumber)} · ${escapeXml(os.serviceType)}</h1>
      <div>Destinatário: <strong>${escapeXml(partner.name)} (${escapeXml(partner.city)}/${escapeXml(partner.uf)})</strong> · CNPJ ${escapeXml(partner.cnpj)}</div>
      <div>Referência: <strong>${escapeXml(os.refCode)} — ${escapeXml(doc.meta?.name || os.refCode)}</strong> · OP Origem: <strong>${escapeXml(os.opNumber)}</strong></div>
      <div>CFOP Remessa: <strong>${m.cfopRemessa}</strong> · Retorno: <strong>${m.cfopRetorno}</strong> · Mão de Obra: <strong>${m.cfopCobranca}</strong></div>
    </div>
    <img src="${m.qrSvgDataUrl}" alt="QR OS" style="width:82px;height:82px;border:1px solid #cbd5e1;padding:3px;border-radius:4px" />
  </div>

  <div class="box">
    <strong>Volume Remetido:</strong> ${os.qtySent} peças ·
    <strong>Prazo Retorno:</strong> ${escapeXml(os.dueDate)} ·
    <strong>Franquia Máxima de Quebra:</strong> ${os.lossTolerancePct}% ·
    <strong>SAM Referência:</strong> ${m.samPerPieceMin} min/peça<br/>
    <strong>Instrução / Receita de Processo:</strong> ${escapeXml(os.processRecipe)}
  </div>

  <h2 style="font-size:11px;text-transform:uppercase;margin:8px 0 4px">Sequência Operacional de Costura & Acabamento (Sem Valores Comerciais)</h2>
  <table>
    <thead><tr><th>#</th><th>Operação</th><th>Máquina</th><th style="text-align:right">SAM</th></tr></thead>
    <tbody>${bopRows || "<tr><td colspan='4'>Seguir ficha piloto lacrada</td></tr>"}</tbody>
  </table>

  <h2 style="font-size:11px;text-transform:uppercase;margin:8px 0 4px">Pontos de Medida Críticos (Inspeção AQL 2.5 no Retorno)</h2>
  <table>
    <thead><tr><th>Ponto POM</th><th>Como Medir</th><th style="text-align:right">Medida Base & Tolerância</th></tr></thead>
    <tbody>${pomRows || "<tr><td colspan='3'>Conferir grade piloto aprovada</td></tr>"}</tbody>
  </table>
</body>
</html>`;
}

export const INITIAL_PARTNERS: IndustrialPartner[] = [
  {
    id: "11111111-1111-4111-8111-111111111111",
    name: "Facção Costura Fina Vale",
    cnpj: "19.840.220/0001-31",
    city: "Apucarana",
    uf: "PR",
    category: "Facção Costura",
    compliance: "Certificado ABVTEX",
    machinesSummary: "18 Retas Eletrônicas · 12 Overloques 4F · 6 Galoneiras",
    capacityMinutesMonth: 92_000,
    qualityScore: 95,
    otifScore: 93,
    costScore: 88,
    reliabilityScore: 94,
    leadTimeDays: 6,
    contactEmail: "pcp@costurafinavale.ind.br",
  },
  {
    id: "22222222-2222-4222-8222-222222222222",
    name: "Lavanderia EcoWash Têxtil",
    cnpj: "24.115.908/0001-77",
    city: "Maringá",
    uf: "PR",
    category: "Lavanderia & Beneficiamento",
    compliance: "Certificado ABVTEX",
    machinesSummary: "Tambor Ozônio · Laser Jeans · Banho Enzimático Zero-Discharge",
    capacityMinutesMonth: 65_000,
    qualityScore: 93,
    otifScore: 90,
    costScore: 84,
    reliabilityScore: 91,
    leadTimeDays: 4,
    contactEmail: "receitas@ecowashtextil.com.br",
  },
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Estamparia & Bordados Blumenau",
    cnpj: "08.774.310/0001-05",
    city: "Blumenau",
    uf: "SC",
    category: "Estamparia & Bordado",
    compliance: "Homologado",
    machinesSummary: "Barudan 15 Cabeças · Calandra Sublimação 1,80m · Silk Carrossel",
    capacityMinutesMonth: 54_000,
    qualityScore: 89,
    otifScore: 86,
    costScore: 91,
    reliabilityScore: 87,
    leadTimeDays: 7,
    contactEmail: "os@bordadosblumenau.com.br",
  },
  {
    id: "44444444-4444-4444-8444-444444444444",
    name: "Têxtil Camargo Malharia",
    cnpj: "61.402.880/0001-92",
    city: "Americana",
    uf: "SP",
    category: "Tecelagem & Malharia",
    compliance: "Certificado ABVTEX",
    machinesSummary: "Teares Circulares Mayer & Cie · Tinturaria Contínua",
    capacityMinutesMonth: 120_000,
    qualityScore: 96,
    otifScore: 91,
    costScore: 82,
    reliabilityScore: 95,
    leadTimeDays: 10,
    contactEmail: "comercial@textilcamargo.com.br",
  },
];

export const INITIAL_SERVICE_ORDERS: ExternalServiceOrder[] = [
  {
    id: "os-101",
    osNumber: "OS-2026-041",
    opNumber: "OP-2026-104",
    refCode: "DEV000006",
    partnerId: "11111111-1111-4111-8111-111111111111",
    serviceType: "Costura Externa",
    processRecipe:
      "Fechamento completo em Overloque 4F ponto cadeia + bainha Galoneira 2 agulhas; agulha ponta bola SES 75/11.",
    unitLaborBrl: 6.4,
    lossTolerancePct: 1.5,
    qtySent: 600,
    qtyReturnedFirst: 420,
    qtyReturnedSecond: 4,
    qtyLost: 0,
    issuedAt: "2026-10-28",
    dueDate: "2026-11-06",
  },
  {
    id: "os-102",
    osNumber: "OS-2026-042",
    opNumber: "OP-2026-108",
    refCode: "U25-014",
    partnerId: "22222222-2222-4222-8222-222222222222",
    serviceType: "Lavanderia & Beneficiamento",
    processRecipe:
      "Lavagem enzimática antipilling 40°C (20 min) + amaciamento siliconado hidrofílico; secagem controlada máx 60°C.",
    unitLaborBrl: 4.85,
    lossTolerancePct: 1.0,
    qtySent: 400,
    qtyReturnedFirst: 392,
    qtyReturnedSecond: 5,
    qtyLost: 3,
    issuedAt: "2026-10-25",
    dueDate: "2026-11-04",
  },
  {
    id: "os-103",
    osNumber: "OS-2026-043",
    opNumber: "OP-2026-112",
    refCode: "V24-001",
    partnerId: "33333333-3333-4333-8333-333333333333",
    serviceType: "Bordado & Estamparia",
    processRecipe:
      "Bordado peito esquerdo 4.200 pontos fio poliéster trilobal + entretela hidrossolúvel.",
    unitLaborBrl: 3.2,
    lossTolerancePct: 1.5,
    qtySent: 480,
    qtyReturnedFirst: 0,
    qtyReturnedSecond: 0,
    qtyLost: 0,
    issuedAt: "2026-11-01",
    dueDate: "2026-11-09",
  },
];

interface OutsourcingStoreState {
  partners: IndustrialPartner[];
  serviceOrders: ExternalServiceOrder[];
  upsertPartner: (partner: IndustrialPartner) => void;
  deletePartner: (id: string) => void;
  addServiceOrder: (order: ExternalServiceOrder) => void;
  updateOrderReturns: (
    id: string,
    patch: Pick<ExternalServiceOrder, "qtyReturnedFirst" | "qtyReturnedSecond" | "qtyLost">,
  ) => void;
  deleteServiceOrder: (id: string) => void;
}

export const useOutsourcingStore = create<OutsourcingStoreState>()(
  persist(
    (set) => ({
      partners: INITIAL_PARTNERS,
      serviceOrders: INITIAL_SERVICE_ORDERS,
      upsertPartner: (partner) =>
        set((s) => {
          const exists = s.partners.some((p) => p.id === partner.id);
          return {
            partners: exists
              ? s.partners.map((p) => (p.id === partner.id ? partner : p))
              : [partner, ...s.partners],
          };
        }),
      deletePartner: (id) =>
        set((s) => ({
          partners: s.partners.filter((p) => p.id !== id),
        })),
      addServiceOrder: (order) =>
        set((s) => ({
          serviceOrders: [order, ...s.serviceOrders],
        })),
      updateOrderReturns: (id, patch) =>
        set((s) => ({
          serviceOrders: s.serviceOrders.map((o) => (o.id === id ? { ...o, ...patch } : o)),
        })),
      deleteServiceOrder: (id) =>
        set((s) => ({
          serviceOrders: s.serviceOrders.filter((o) => o.id !== id),
        })),
    }),
    { name: "use-moda:outsourcing-v1" },
  ),
);
