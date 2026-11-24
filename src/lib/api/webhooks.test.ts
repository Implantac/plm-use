// Onda 122 — trava dos webhooks: assinatura, backoff, SSRF, despacho real contra servidor HTTP local.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import {
  assinarWebhook,
  EVENTOS_WEBHOOK,
  MAX_TENTATIVAS,
  montarCorpoWebhook,
  proximaTentativaEm,
  urlWebhookValida,
  verificarAssinaturaWebhook,
} from "./webhooks";
import { despacharPendentes } from "./webhooks.server";
import { WEBHOOK_EVENT_IDS, gerarOpenApi } from "./recursos-v1";
import { validarPatchOp, STATUS_OP } from "./escrita-v1";

describe("assinatura", () => {
  it("assina e verifica; rejeita segredo errado, corpo alterado e timestamp velho", () => {
    const corpo = JSON.stringify({ a: 1 });
    const h = assinarWebhook(corpo, "whsec_x", 1_000_000);
    expect(h).toMatch(/^t=1000000,v1=[0-9a-f]{64}$/);
    expect(verificarAssinaturaWebhook(corpo, h, "whsec_x", 300, 1_000_010)).toBe(true);
    expect(verificarAssinaturaWebhook(corpo, h, "outro", 300, 1_000_010)).toBe(false);
    expect(verificarAssinaturaWebhook(corpo + " ", h, "whsec_x", 300, 1_000_010)).toBe(false);
    expect(verificarAssinaturaWebhook(corpo, h, "whsec_x", 300, 1_000_900)).toBe(false);
    expect(verificarAssinaturaWebhook(corpo, null, "whsec_x")).toBe(false);
  });
  it("backoff cresce e termina em falha definitiva", () => {
    expect(proximaTentativaEm(1)).toBe(60_000);
    expect(proximaTentativaEm(2)).toBe(5 * 60_000);
    expect(proximaTentativaEm(5)).toBe(720 * 60_000);
    expect(proximaTentativaEm(MAX_TENTATIVAS)).toBeNull();
  });
  it("bloqueia endereços internos (SSRF)", () => {
    expect(urlWebhookValida("https://erp.empresa.com.br/hook")).toBeNull();
    expect(urlWebhookValida("http://localhost:3000")).toMatch(/internos/);
    expect(urlWebhookValida("http://10.0.0.5/x")).toMatch(/internos/);
    expect(urlWebhookValida("http://169.254.169.254/")).toMatch(/internos/);
    expect(urlWebhookValida("ftp://x")).toMatch(/http/);
    expect(urlWebhookValida("nada")).toMatch(/inválida/);
  });
  it("catálogo de eventos bate com o espelho do OpenAPI", () => {
    expect(EVENTOS_WEBHOOK.map((e) => e.id)).toEqual([...WEBHOOK_EVENT_IDS]);
    const doc = gerarOpenApi("https://x");
    expect(doc.paths["/api/v1/production-orders/{id}"]).toHaveProperty("patch");
    expect([...doc["x-webhooks"].events]).toEqual([...WEBHOOK_EVENT_IDS]);
  });
});

describe("escrita v1 — PATCH OP", () => {
  it("aceita só campos e status conhecidos", () => {
    expect(validarPatchOp({ status: "concluida", erp_op_id: "OP-ERP-77" })).toMatchObject({
      ok: true,
    });
    expect(validarPatchOp({ status: "feita" })).toMatchObject({ ok: false });
    expect(validarPatchOp({ number: "x" })).toMatchObject({ ok: false });
    expect(validarPatchOp({ planned_end: "22/11/2026" })).toMatchObject({ ok: false });
    expect(validarPatchOp({})).toMatchObject({ ok: false });
    expect(validarPatchOp([])).toMatchObject({ ok: false });
    expect(STATUS_OP).toContain("em_producao");
  });
});

// --- despacho de verdade: servidor HTTP local + Supabase fake em memória ---
type Row = Record<string, unknown>;
function fakeAdmin(deliveries: Row[], subs: Row[]) {
  const tabelas: Record<string, Row[]> = {
    webhook_deliveries: deliveries,
    webhook_subscriptions: subs,
  };
  const from = (t: string) => {
    const rows = tabelas[t]!;
    const filtros: ((r: Row) => boolean)[] = [];
    let upd: Row | null = null;
    const q = {
      select: () => q,
      eq: (k: string, v: unknown) => (filtros.push((r) => r[k] === v), q),
      lte: (k: string, v: string) => (filtros.push((r) => String(r[k]) <= v), q),
      in: (k: string, vs: unknown[]) => (filtros.push((r) => vs.includes(r[k])), q),
      order: () => q,
      limit: () => q,
      update: (p: Row) => ((upd = p), q),
      then: (res: (v: { data: Row[]; error: null }) => void) => {
        const sel = rows.filter((r) => filtros.every((f) => f(r)));
        if (upd) for (const r of sel) Object.assign(r, upd);
        res({ data: sel, error: null });
      },
    };
    return q;
  };
  return { from } as unknown as Parameters<typeof despacharPendentes>[0];
}

describe("despacho", () => {
  let server: Server;
  let url = "";
  const recebidos: { headers: Record<string, string | string[] | undefined>; body: string }[] = [];
  let modo: "ok" | "erro" = "ok";
  beforeAll(async () => {
    server = createServer((req, res) => {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        recebidos.push({ headers: req.headers, body });
        res.statusCode = modo === "ok" ? 200 : 500;
        res.end();
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const a = server.address();
    url = `http://127.0.0.1:${typeof a === "object" && a ? a.port : 0}/hook`;
  });
  afterAll(() => server.close());

  it("entrega com assinatura válida e marca delivered; falha reagenda com backoff", async () => {
    const subs = [{ id: "s1", url, secret: "whsec_teste", active: true }];
    const deliveries: Row[] = [
      {
        id: "d1",
        subscription_id: "s1",
        event: "ping",
        payload: { x: 1 },
        attempts: 0,
        status: "pending",
        next_attempt_at: "2000-01-01T00:00:00.000Z",
        created_at: "2026-11-23T10:00:00.000Z",
      },
    ];
    const r = await despacharPendentes(fakeAdmin(deliveries, subs), 10);
    expect(r).toEqual({ processadas: 1, entregues: 1, reagendadas: 0, falhas: 0 });
    expect(deliveries[0]!.status).toBe("delivered");
    expect(deliveries[0]!.response_status).toBe(200);
    const rec = recebidos[0]!;
    expect(rec.headers["x-plm-event"]).toBe("ping");
    expect(rec.headers["x-plm-delivery"]).toBe("d1");
    expect(
      verificarAssinaturaWebhook(rec.body, String(rec.headers["x-plm-signature"]), "whsec_teste"),
    ).toBe(true);
    expect(JSON.parse(rec.body)).toMatchObject({
      id: "d1",
      event: "ping",
      data: { x: 1 },
      api_version: "1",
    });
    expect(rec.body).toBe(
      montarCorpoWebhook({
        deliveryId: "d1",
        event: "ping",
        payload: { x: 1 },
        createdAt: "2026-11-23T10:00:00.000Z",
      }),
    );

    modo = "erro";
    const d2: Row[] = [{ ...deliveries[0]!, id: "d2", status: "pending", attempts: 0 }];
    const r2 = await despacharPendentes(fakeAdmin(d2, subs), 10);
    expect(r2.reagendadas).toBe(1);
    expect(d2[0]!.status).toBe("pending");
    expect(d2[0]!.last_error).toBe("HTTP 500");
    expect(new Date(String(d2[0]!.next_attempt_at)).getTime()).toBeGreaterThan(Date.now() + 50_000);

    const d3: Row[] = [
      { ...deliveries[0]!, id: "d3", status: "pending", attempts: MAX_TENTATIVAS - 1 },
    ];
    const r3 = await despacharPendentes(fakeAdmin(d3, subs), 10);
    expect(r3.falhas).toBe(1);
    expect(d3[0]!.status).toBe("failed");
  });
  it("assinatura pausada → falha sem chamar a URL", async () => {
    const antes = recebidos.length;
    const d: Row[] = [
      {
        id: "d9",
        subscription_id: "s2",
        event: "ping",
        payload: {},
        attempts: 0,
        status: "pending",
        next_attempt_at: "2000-01-01",
        created_at: "2026-01-01",
      },
    ];
    const r = await despacharPendentes(
      fakeAdmin(d, [{ id: "s2", url, secret: "x", active: false }]),
      10,
    );
    expect(r.falhas).toBe(1);
    expect(recebidos.length).toBe(antes);
  });
});
