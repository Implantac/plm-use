// Copiloto Industrial Determinístico + Híbrido (USE AI Agents v2.17):
// Sintetiza diagnósticos numéricos auditáveis a partir dos stores reais
// (Fichas Técnicas, Fila de Custos Private Label, PCP e Campanhas/Drops GTM),
// garantindo resposta imediata mesmo offline ou sem chave externa de LLM.

import { evaluateOrderCosting, type PrivateLabelOrder } from "@/lib/sales/private-label-queue";
import {
  campanhasOperacionais,
  computeCampaignRoas,
  type GtmDropCampaign,
} from "@/lib/techsheet/research-gtm";
import type { TechSheetData } from "@/lib/techsheet/store";

export type IndustrialAgentId = "fashion" | "engenharia" | "pcp" | "marketing";

export interface CopilotSnapshotInput {
  agent: IndustrialAgentId;
  question: string;
  sheets: Record<string, TechSheetData>;
  privateLabelOrders: PrivateLabelOrder[];
  lotesSummary: Array<{ numero: string; grupo: string; prontoPct: number; pendentePcs: number }>;
  drops: GtmDropCampaign[];
}

export function runDeterministicAgentAnalysis(input: CopilotSnapshotInput): string {
  const sheetList = Object.values(input.sheets);
  // Onda 38: mesmo que um chamador esqueça de filtrar, a vitrine GTM não vira
  // ROAS de diagnóstico. `sheets` já chega sem `seedFor` da rota de AI Agents.
  const drops = campanhasOperacionais(input.drops);

  if (input.agent === "engenharia") {
    const evaluatedOrders = input.privateLabelOrders.map((o) => ({
      order: o,
      ev: evaluateOrderCosting(o),
    }));
    const belowMargin = evaluatedOrders.filter((x) => !x.ev.marginHealthy);
    // Onda 38. Com `sheets` vazio a versão antiga imprimia "0 fichas ativas ·
    // SAM médio 0.0 min/peça" — zero com cara de apuração. Sem engenharia
    // salva, o SAM é declarado ausente, não calculado.
    const escopoEng =
      sheetList.length > 0
        ? `${sheetList.length} fichas ativas · SAM médio ${(
            sheetList.reduce((acc, s) => acc + s.bop.reduce((b, st) => b + st.tempoMin, 0), 0) /
            sheetList.length
          ).toFixed(1)} min/peça`
        : "sem ficha salva · SAM médio —";

    const lines = [
      `📐 **Diagnóstico Engenharia & Custos Industriais** (${escopoEng}):`,
      belowMargin.length > 0
        ? `• **Alerta Crítico de Margem (${belowMargin.length} pedido(s))**: ${belowMargin
            .map(
              ({ order, ev }) =>
                `${order.orderNumber} (${order.productName}, ${ev.totalPieces} pçs) opera com margem real de **${ev.realMarginPct?.toFixed(1) ?? "0"}%** (meta ${order.minMarginPct}%) devido ao setup de R$ ${ev.setupPerPieceBrl.toFixed(2)}/pç — preço mínimo recomendado: **R$ ${ev.suggestedMinPriceBrl.toFixed(2)}**`,
            )
            .join("; ")}.`
        : "• Todos os pedidos da Fila Private Label atingem a meta mínima de margem industrial.",
      `• **Recomendação Técnica p/ "${input.question.slice(0, 60)}"**: diluir setup de sublimação/bordado em lotes ≥ 30 peças ou aplicar taxa destacada de clichê/matriz B2B.`,
    ];
    return lines.join("\n\n");
  }

  if (input.agent === "pcp") {
    const totalPend = input.lotesSummary.reduce((a, l) => a + l.pendentePcs, 0);
    const slowest = [...input.lotesSummary].sort((a, b) => a.prontoPct - b.prontoPct)[0];
    return [
      `🏭 **Diagnóstico PCP & Balanceamento de Chão de Fábrica** (${input.lotesSummary.length} lotes monitorados · ${totalPend} peças pendentes):`,
      slowest
        ? `• **Lote Prioritário de Atenção**: **${slowest.numero}** (${slowest.grupo}) está em **${slowest.prontoPct}%** concluído com **${slowest.pendentePcs} peças** em fila.`
        : "• Nenhuma fila crítica pendente nos lotes atuais.",
      `• **Plano de Ação Imediato**: executar sequenciamento EDD em **/planner** e emitir Guia de Remessa Cega A4 (CFOP 5901) em **/suppliers** caso a ocupação da Costura ultrapasse 95%.`,
    ].join("\n\n");
  }

  if (input.agent === "marketing") {
    const metrics = drops.map((d) => ({ drop: d, roas: computeCampaignRoas(d) }));
    const best = [...metrics].sort((a, b) => b.roas - a.roas)[0];
    // As campanhas de demonstração são filtradas por `campanhasOperacionais`
    // antes de chegar aqui. Sem drops salvos, ROAS não é apurável.
    const escopoGtm =
      drops.length > 0
        ? `${drops.length} drops monitorados`
        : "sem drops salvos · ROAS não apurável";
    return [
      `📣 **Diagnóstico Go-To-Market, Drops & ROAS** (${escopoGtm}):`,
      best
        ? `• **Melhor Eficiência de Mídia**: **${best.drop.name}** projeta ROAS de **${best.roas.toFixed(2)}x** e receita atribuída de **R$ ${best.drop.attributedSalesBrl.toLocaleString("pt-BR")}** (${best.drop.skuRefs.length} SKUs âncora).`
        : "• Cadastre ao menos 1 Drop em /marketing para projetar ROAS.",
      `• **Recomendação Comercial**: exportar o Feed Omnichannel GTIN/EAN-13 em **/launch** e concentrar verba de mídia nos SKUs com prontidão Go-Live ≥ 80%.`,
    ].join("\n\n");
  }

  // fashion
  const refsSummary = sheetList
    .slice(0, 4)
    .map((s) => `${s.ref} (${s.meta?.name ?? "Peça"})`)
    .join(", ");
  const escopoModa =
    sheetList.length > 0
      ? `${sheetList.length} referências técnicas mapeadas: ${refsSummary}`
      : "sem ficha salva · nenhuma referência técnica mapeada";
  return [
    `✨ **Diagnóstico Criação, Mix & Tendência Têxtil** (${escopoModa}):`,
    `• **Diretriz de Produto**: priorizar bases respiráveis de alta rotação (Malha Pima / Dry UV50+ / Linho Viscose) com conversão direta de Briefing em 1 clique em **/research** e croquis em PNG transparente no **AI Product Studio**.`,
    `• **Equilíbrio de Mix**: combinar 60% básicos de margem recorrente B2B com 40% cápsulas sazonais de alto valor percebido.`,
  ].join("\n\n");
}
