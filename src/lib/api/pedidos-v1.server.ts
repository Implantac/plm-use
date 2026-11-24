// Onda 123 — cria um pedido vindo da loja/ERP (service role, após chave com escopo write).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { PedidoEntrada } from "./escrita-v1";

type Admin = SupabaseClient<Database>;
export type ResultadoPedido =
  | { status: 200 | 201; corpo: Record<string, unknown> }
  | { status: 422 | 503 | 500; erro: string; detalhes?: Record<string, unknown> };

export async function criarPedidoExterno(
  admin: Admin,
  p: PedidoEntrada,
  origemChave: string,
): Promise<ResultadoPedido> {
  // 1) idempotência
  const ja = await admin
    .from("sales_orders")
    .select("id, number, status, total_value, created_at")
    .eq("external_source", p.source)
    .eq("external_ref", p.external_ref)
    .maybeSingle();
  if (ja.error) {
    if (ja.error.code === "42703")
      return {
        status: 503,
        erro: "Migration pendente: colunas external_source/external_ref (20261124120000).",
      };
    return { status: 500, erro: "Falha ao consultar pedidos." };
  }
  if (ja.data) return { status: 200, corpo: { data: ja.data, already_existed: true } };

  // 2) produtos do catálogo por código (ativos)
  const codigos = [...new Set(p.items.map((i) => i.product_code))];
  const prod = await admin
    .from("catalog_products")
    .select("id, code, name, status, active")
    .in("code", codigos);
  if (prod.error) return { status: 500, erro: "Falha ao consultar o catálogo." };
  const porCodigo = new Map((prod.data ?? []).map((r) => [r.code, r]));
  const desconhecidos = codigos.filter((c) => !porCodigo.has(c));
  const inativos = codigos.filter(
    (c) =>
      porCodigo.get(c) &&
      (porCodigo.get(c)!.active === false || porCodigo.get(c)!.status === "descontinuado"),
  );
  if (desconhecidos.length || inativos.length)
    return {
      status: 422,
      erro: "Há produtos que o PLM não reconhece. Cadastre-os no Catálogo (Comercial) ou ajuste o product_code.",
      detalhes: { product_codes_desconhecidos: desconhecidos, product_codes_inativos: inativos },
    };

  // 3) cliente por código (cria se não existir; atualiza dados enviados)
  let customerId: string;
  const cli = await admin.from("customers").select("id").eq("code", p.customer.code).maybeSingle();
  if (cli.error) return { status: 500, erro: "Falha ao consultar clientes." };
  const dadosCliente = {
    name: p.customer.name,
    trade_name: p.customer.trade_name,
    tax_id: p.customer.tax_id,
    email: p.customer.email,
    phone: p.customer.phone,
    city: p.customer.city,
    state: p.customer.state,
  };
  const limpos = Object.fromEntries(
    Object.entries(dadosCliente).filter(([, v]) => v !== undefined),
  ) as Partial<Record<keyof typeof dadosCliente, string>>;
  if (cli.data) {
    customerId = cli.data.id;
    if (Object.keys(limpos).length)
      await admin.from("customers").update(limpos).eq("id", customerId);
  } else {
    if (!p.customer.name)
      return {
        status: 422,
        erro: `Cliente ${p.customer.code} não existe no PLM: envie customer.name para criá-lo.`,
      };
    const novo = await admin
      .from("customers")
      .insert({
        code: p.customer.code,
        name: p.customer.name,
        ...limpos,
        notes: `Criado pela API (${p.source})`,
      })
      .select("id")
      .single();
    if (novo.error) return { status: 500, erro: "Falha ao criar o cliente." };
    customerId = novo.data.id;
  }

  // 4) número + cabeçalho
  const num = await admin.rpc("next_sales_order_number");
  if (num.error) return { status: 500, erro: "Falha ao numerar o pedido." };
  const total = p.items.reduce((a, i) => a + i.quantity * i.unit_price, 0);
  const notas = [
    p.notes,
    `Origem: ${p.source} #${p.external_ref} (via chave de API "${origemChave}")`,
  ]
    .filter(Boolean)
    .join("\n");
  const ped = await admin
    .from("sales_orders")
    .insert({
      number: String(num.data),
      customer_id: customerId,
      is_quote: p.is_quote,
      due_date: p.due_date,
      payment_terms: p.payment_terms,
      notes: notas,
      total_value: total,
      external_source: p.source,
      external_ref: p.external_ref,
    })
    .select("id, number, status, total_value, created_at")
    .single();
  if (ped.error) {
    if (ped.error.code === "23505") {
      // corrida: outro envio criou primeiro — devolve o existente
      const de = await admin
        .from("sales_orders")
        .select("id, number, status, total_value, created_at")
        .eq("external_source", p.source)
        .eq("external_ref", p.external_ref)
        .maybeSingle();
      if (de.data) return { status: 200, corpo: { data: de.data, already_existed: true } };
    }
    return { status: 500, erro: "Falha ao criar o pedido." };
  }

  // 5) itens + grade
  const itensCriados: Record<string, unknown>[] = [];
  for (let i = 0; i < p.items.length; i++) {
    const it = p.items[i]!;
    const prodRow = porCodigo.get(it.product_code)!;
    const item = await admin
      .from("sales_order_items")
      .insert({
        order_id: ped.data.id,
        line_no: i + 1,
        catalog_product_id: prodRow.id,
        description: it.description ?? prodRow.name,
        color: it.color,
        quantity: it.quantity,
        unit_price: it.unit_price,
        reference_code: it.product_code,
        notes: it.notes,
      })
      .select("id, line_no, quantity, unit_price")
      .single();
    if (item.error) {
      await admin.from("sales_orders").delete().eq("id", ped.data.id);
      return { status: 500, erro: `Falha ao gravar o item ${i + 1}; pedido desfeito.` };
    }
    if (it.sizes?.length) {
      const sz = it.sizes
        .filter((s) => s.quantity > 0)
        .map((s) => ({ item_id: item.data.id, size: s.size, quantity: s.quantity }));
      if (sz.length) await admin.from("sales_order_item_sizes").insert(sz);
    }
    itensCriados.push({ ...item.data, product_code: it.product_code });
  }
  return {
    status: 201,
    corpo: {
      data: { ...ped.data, customer_id: customerId, items: itensCriados },
      already_existed: false,
    },
  };
}
