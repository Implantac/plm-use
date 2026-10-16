// Ponte referência → ficha técnica: o drawer do PCP mostrava o ciclo de vida mas
// silenciava sobre o estado da engenharia da mesma ref. Este módulo deriva o
// resumo honesto do doc do store de techsheets; "sem ficha" é resposta, não
// erro.
import type { TechSheetData } from "@/lib/techsheet/store";

export interface SheetSummary {
  exists: boolean;
  /** versão no topo do histórico (a mais recente, seja qual for o status) */
  ultima?: string;
  /** última versão Aprovada — a que a fábrica deve seguir */
  ativa?: string;
  /** a mais recente ainda não foi aprovada (Em revisão/Rascunho) */
  pendente?: string;
  /** a mais recente já tem instantâneo (diff estrutural disponível) */
  diffDisponivel: boolean;
  totalVersoes: number;
}

export function summarizeSheet(doc: TechSheetData | undefined): SheetSummary {
  if (!doc || !doc.versoes.length) return { exists: false, diffDisponivel: false, totalVersoes: 0 };
  const [top] = doc.versoes;
  const ativa = doc.versoes.find((v) => v.status === "Aprovada");
  return {
    exists: true,
    ultima: top.versao,
    ativa: ativa?.versao,
    pendente: top.status === "Em revisão" || top.status === "Rascunho" ? top.versao : undefined,
    diffDisponivel: Boolean(top.snapshot),
    totalVersoes: doc.versoes.length,
  };
}

export function formatSheetSummary(s: SheetSummary): string {
  if (!s.exists) return "Sem ficha técnica registrada para esta referência.";
  const parts = [`Ficha ${s.ultima}`];
  if (s.ativa && s.ativa !== s.ultima) parts.push(`fábrica segue ${s.ativa}`);
  if (s.ativa === s.ultima) parts.push("aprovada");
  else if (s.pendente) parts.push("em revisão");
  parts.push(s.diffDisponivel ? "com diff estrutural" : "diff só textual");
  return parts.join(" · ");
}
