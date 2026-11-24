// Onda 122 — catálogo de eventos de webhook e validação de URL (puro; seguro no navegador).
export const EVENTOS_WEBHOOK = [
  { id: "sales_order.created", descricao: "Pedido de venda criado" },
  {
    id: "sales_order.status_changed",
    descricao: "Pedido mudou de status (ex.: aprovado, liberado p/ PCP)",
  },
  { id: "production_order.created", descricao: "Ordem de produção criada" },
  { id: "production_order.status_changed", descricao: "OP mudou de status" },
  { id: "tech_sheet.created", descricao: "Ficha técnica criada" },
  { id: "tech_sheet.updated", descricao: "Ficha técnica alterada (BOM/BOP/versão)" },
  { id: "ping", descricao: "Teste manual enviado de Segurança → Webhooks" },
] as const;
export type EventoWebhook = (typeof EVENTOS_WEBHOOK)[number]["id"];

export function urlWebhookValida(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return "URL inválida.";
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return "Use http:// ou https://.";
  const h = u.hostname;
  if (
    h === "localhost" ||
    h.endsWith(".local") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === "0.0.0.0" ||
    h === "169.254.169.254"
  )
    return "Endereços internos não são permitidos (proteção contra SSRF).";
  return null;
}
