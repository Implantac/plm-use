// Onda 125 — Conector Bling (API v3): parte pura (sem rede, sem segredo), testável.
import type { PedidoEntrada } from "@/lib/api/escrita-v1";

export const BLING_AUTH_URL = "https://www.bling.com.br/Api/v3/oauth/authorize";
export const BLING_TOKEN_URL = "https://www.bling.com.br/Api/v3/oauth/token";
export const BLING_API_URL = "https://api.bling.com.br/Api/v3";
export const BLING_FONTE = "bling";
/** Situações do pedido de venda no Bling que NÃO viram pedido no PLM. */
export const BLING_SITUACOES_IGNORADAS: Record<number, string> = { 12: "Cancelado" };

export type BlingPedidoResumo = {
  id: number;
  numero: number;
  data?: string;
  situacao?: { id: number; valor?: number };
};

export type BlingPedidoDetalhe = {
  id: number;
  numero: number;
  data?: string;
  dataPrevista?: string | null;
  total?: number;
  observacoes?: string | null;
  situacao?: { id: number };
  contato?: {
    id?: number;
    nome?: string;
    tipoPessoa?: string;
    numeroDocumento?: string;
    email?: string;
    celular?: string;
    telefone?: string;
    endereco?: { geral?: { municipio?: string; uf?: string } };
  };
  itens?: {
    codigo?: string;
    descricao?: string;
    quantidade?: number;
    valor?: number;
    desconto?: number;
    produto?: { id?: number };
  }[];
  parcelas?: { dataVencimento?: string; valor?: number }[];
};

export function urlAutorizacaoBling(clientId: string, state: string): string {
  const q = new URLSearchParams({ response_type: "code", client_id: clientId, state });
  return `${BLING_AUTH_URL}?${q.toString()}`;
}

const soDigitos = (s?: string) => (s ?? "").replace(/\D/g, "");
const dataIso = (s?: string | null) =>
  s && /^\d{4}-\d{2}-\d{2}/.test(s) && !s.startsWith("0000") ? s.slice(0, 10) : null;

export type MapeamentoBling =
  { ok: true; pedido: PedidoEntrada } | { ok: false; motivo: string; ignorar?: boolean };

/** Converte o pedido do Bling no contrato já aceito pelo POST /api/v1/sales-orders. */
export function mapearPedidoBling(d: BlingPedidoDetalhe): MapeamentoBling {
  const sit = d.situacao?.id;
  if (sit != null && BLING_SITUACOES_IGNORADAS[sit])
    return {
      ok: false,
      ignorar: true,
      motivo: `Situação ${BLING_SITUACOES_IGNORADAS[sit]} no Bling.`,
    };
  const itens = d.itens ?? [];
  if (itens.length === 0) return { ok: false, motivo: "Pedido sem itens." };
  const semSku = itens.filter((i) => !i.codigo || !i.codigo.trim());
  if (semSku.length)
    return {
      ok: false,
      motivo: `${semSku.length} item(ns) sem SKU no Bling (campo "código" do produto) — o PLM casa pelo código do Catálogo.`,
    };
  const doc = soDigitos(d.contato?.numeroDocumento);
  const code = doc || (d.contato?.id ? `BLING-${d.contato.id}` : "");
  if (!code)
    return { ok: false, motivo: "Pedido sem cliente identificável (sem CNPJ/CPF nem id)." };
  const nome = d.contato?.nome?.trim() || `Cliente Bling ${code}`;
  const parcelas = d.parcelas?.length
    ? `${d.parcelas.length}x (${d.parcelas.map((p) => dataIso(p.dataVencimento) ?? "?").join(", ")})`
    : null;
  const uf = d.contato?.endereco?.geral?.uf?.trim().toUpperCase();
  const pedido: PedidoEntrada = {
    source: BLING_FONTE,
    external_ref: String(d.numero || d.id),
    customer: {
      code,
      name: nome,
      tax_id: doc || undefined,
      email: d.contato?.email?.trim() || undefined,
      phone: (d.contato?.celular || d.contato?.telefone || "").trim() || undefined,
      city: d.contato?.endereco?.geral?.municipio?.trim() || undefined,
      state: uf && /^[A-Z]{2}$/.test(uf) ? uf : undefined,
    },
    is_quote: false,
    due_date: dataIso(d.dataPrevista),
    payment_terms: parcelas,
    notes: [d.observacoes?.trim() || null, `Bling pedido nº ${d.numero} (id ${d.id})`]
      .filter(Boolean)
      .join("\n"),
    items: itens.map((i) => {
      const qtd = Math.max(0, Number(i.quantidade) || 0);
      const bruto = Math.max(0, Number(i.valor) || 0);
      const desc = Math.max(0, Number(i.desconto) || 0); // % no Bling
      return {
        product_code: i.codigo!.trim(),
        description: i.descricao?.trim() || undefined,
        quantity: qtd,
        unit_price: Math.round(bruto * (1 - desc / 100) * 100) / 100,
      };
    }),
  };
  return { ok: true, pedido };
}

export type ResumoSyncBling = {
  inicio: string;
  fim: string;
  desde: string;
  lidos: number;
  criados: number;
  existentes: number;
  ignorados: number;
  rejeitados: { numero: string; motivo: string }[];
  erro?: string;
};

export function resumoVazio(desde: string): ResumoSyncBling {
  const agora = new Date().toISOString();
  return {
    inicio: agora,
    fim: agora,
    desde,
    lidos: 0,
    criados: 0,
    existentes: 0,
    ignorados: 0,
    rejeitados: [],
  };
}

/** Data inicial da busca: 1 dia antes da última sincronização (sobreposição segura) ou N dias atrás. */
export function dataInicialSync(
  lastSyncAt: string | null | undefined,
  diasPadrao = 30,
  agora = new Date(),
): string {
  const d = lastSyncAt ? new Date(lastSyncAt) : new Date(agora.getTime() - diasPadrao * 86_400_000);
  if (lastSyncAt) d.setTime(d.getTime() - 86_400_000);
  return d.toISOString().slice(0, 10);
}
