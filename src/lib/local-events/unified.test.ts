import { describe, expect, it } from "vitest";
import { mergeTimelines, serverRowToEvent } from "./unified";
import type { LocalEvent } from "./store";

const local = (over: Partial<LocalEvent> = {}): LocalEvent =>
  ({
    id: "L1",
    entity_type: "color_palette",
    entity_id: "pal-01",
    event_type: "created",
    created_at: "2026-10-09T10:00:00.000Z",
    ...over,
  }) as LocalEvent;

const server = (over: Record<string, unknown> = {}) =>
  ({
    id: "S1",
    entity_type: "color_palette",
    entity_id: "pal-01",
    event_type: "created",
    created_at: "2026-10-09T10:00:05.000Z",
    from_status: null,
    to_status: null,
    note: null,
    actor_name: "Ana",
    payload: {},
    ...over,
  }) as never;

describe("serverRowToEvent", () => {
  it("payload não-objeto (NULL/string do banco) vira {}", () => {
    expect(serverRowToEvent(server({ payload: "lixo" }) as never).payload).toEqual({});
    expect(serverRowToEvent(server({ payload: null }) as never).payload).toEqual({});
  });
});

describe("mergeTimelines (dedupe local↔espelho)", () => {
  it("linha do servidor com payload.local_id faz o par local sumir (cópia do servidor vence)", () => {
    const merged = mergeTimelines([server({ payload: { local_id: "L1" } })], [local()]);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe("S1");
    expect(merged[0].actor_name).toBe("Ana");
  });

  it("evento local ainda não espelhado permanece (janela entre gravar e sincronizar)", () => {
    const merged = mergeTimelines([server({ payload: { local_id: "OUTRO" } })], [local()]);
    expect(merged.map((m) => m.id)).toEqual(["S1", "L1"]);
  });

  it("servidor vazio = tudo local, preservando a ordem do store (mais recente primeiro, empate estável)", () => {
    const merged = mergeTimelines(
      [],
      [local({ id: "L2", created_at: "2026-10-09T11:00:00.000Z" }), local({ id: "L1" })],
    );
    expect(merged.map((m) => m.id)).toEqual(["L2", "L1"]);
    const tie = mergeTimelines([], [local({ id: "L1" }), local({ id: "L2" })]);
    expect(tie.map((m) => m.id)).toEqual(["L1", "L2"]); // mesmo timestamp: não embaralha
  });

  it("ordena por created_at desc regardless da origem", () => {
    const merged = mergeTimelines(
      [server({ created_at: "2026-10-09T09:00:00.000Z" })],
      [local({ created_at: "2026-10-09T12:00:00.000Z" })],
    );
    expect(merged.map((m) => m.id)).toEqual(["L1", "S1"]);
  });
});
