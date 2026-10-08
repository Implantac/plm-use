// Cenários reais do PCP por OP contra o banco, como usuário logado.
// Uso: bun tests/db/pcp-op-scenarios.ts  (precisa de ~/.cache/lovable-auth/session.json)
// Cria a OP-TESTE e a apaga no final.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { homedir } from "os";

const s = JSON.parse(readFileSync(`${homedir()}/.cache/lovable-auth/session.json`, "utf8"));
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i), l.slice(i + 1).replace(/^"|"$/g, "")];
    }),
);
const db = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: false },
});
await db.auth.setSession({
  access_token: s.session.access_token,
  refresh_token: s.session.refresh_token,
});

const must = <T>(r: { data: T; error: unknown }) => {
  if (r.error) throw r.error;
  return r.data;
};
const check = (ok: boolean, msg: string) => {
  if (!ok) throw new Error("FALHA: " + msg);
  console.log("OK", msg);
};
const routes = must(
  await db
    .from("production_routes")
    .select("id, code, production_route_steps(id, sequence)")
    .in("code", ["R01", "R02"]),
);
const steps = (code: string) =>
  [...routes.find((r) => r.code === code)!.production_route_steps]
    .sort((a, b) => a.sequence - b.sequence)
    .map((x) => x.id);
const [c1, k1] = steps("R01");
const [c2, b2] = steps("R02");
const r1 = routes.find((r) => r.code === "R01")!.id,
  r2 = routes.find((r) => r.code === "R02")!.id;

const op = must(
  await db
    .from("production_orders")
    .insert({ number: "OP-TESTE", status: "em_producao", priority: "media" })
    .select("id")
    .single(),
);
try {
  const items = must(
    await db
      .from("production_order_items")
      .insert([
        {
          production_order_id: op.id,
          reference_code: "T-1",
          color: "Preto",
          route_id: r1,
          quantity_planned: 500,
        },
        {
          production_order_id: op.id,
          reference_code: "T-2",
          color: "Branco",
          route_id: r2,
          quantity_planned: 100,
        },
      ])
      .select("id, reference_code"),
  );
  const it1 = items.find((i) => i.reference_code === "T-1")!.id,
    it2 = items.find((i) => i.reference_code === "T-2")!.id;
  const bal = async (item: string, step: string) =>
    (
      must(
        await db
          .from("production_item_step_balance")
          .select("quantity")
          .eq("item_id", item)
          .eq("step_id", step)
          .maybeSingle(),
      ) as { quantity: number } | null
    )?.quantity ?? 0;
  const pass = (moves: object[], obs?: string) =>
    db.rpc("register_passages", { _moves: moves as never, _observation: obs });

  must(await pass([{ item_id: it1, origin_step_id: c1, quantity: 200, type: "parcial" }]));
  check(
    (await bal(it1, k1)) === 200 && (await bal(it1, c1)) === 300,
    "passagem parcial (200 para a Costura, 300 no Corte)",
  );
  check(
    !!(await pass([{ item_id: it1, origin_step_id: c1, quantity: 999, type: "parcial" }])).error,
    "bloqueia passar mais que o disponível",
  );
  must(
    await pass([
      { item_id: it1, origin_step_id: c1, quantity: 300, type: "total" },
      { item_id: it2, origin_step_id: c2, quantity: 100, type: "total" },
    ]),
  );
  check((await bal(it1, k1)) === 500, "passagem total em bloco");
  check(
    (await bal(it2, b2)) === 100,
    "item com rota diferente vai para a própria próxima etapa (Bordado)",
  );
  check(
    !!(
      await pass([
        {
          item_id: it1,
          origin_step_id: k1,
          destination_step_id: c1,
          quantity: 50,
          type: "retorno",
        },
      ])
    ).error,
    "retorno sem motivo é recusado",
  );
  must(
    await pass(
      [
        {
          item_id: it1,
          origin_step_id: k1,
          destination_step_id: c1,
          quantity: 50,
          type: "retorno",
        },
      ],
      "Retrabalho de costura",
    ),
  );
  check((await bal(it1, c1)) === 50 && (await bal(it1, k1)) === 450, "retorno de etapa com motivo");
  const ev = must(
    await db
      .from("entity_events")
      .select("event_type")
      .eq("entity_type", "production_order")
      .eq("entity_id", op.id),
  );
  check(
    ev.some((e) => e.event_type === "production.order.created") &&
      ev.filter((e) => e.event_type.startsWith("production.passage.")).length >= 4,
    `linha do tempo (${ev.length} eventos)`,
  );
} finally {
  console.log("OP de teste criada:", op.id);
}
