import { describe, expect, it } from "vitest";
import { toMirrorRow } from "./mirror";
import type { LocalEvent } from "./store";

const evt = (over: Partial<LocalEvent> = {}): LocalEvent => ({
  id: "e1",
  entity_type: "color_palette",
  entity_id: "pal-01",
  event_type: "created",
  created_at: "2026-10-09T12:00:00.000Z",
  ...over,
});

describe("toMirrorRow (local → entity_events)", () => {
  it("mapeia colunas diretas e preserva created_at histórico (mirror de evento antigo)", () => {
    const row = toMirrorRow(evt({ note: "Cartela criada", to_status: "Aprovado" }));
    expect(row).toMatchObject({
      entity_type: "color_palette",
      entity_id: "pal-01",
      event_type: "created",
      note: "Cartela criada",
      to_status: "Aprovado",
      created_at: "2026-10-09T12:00:00.000Z",
    });
  });

  it("opcional ausente vira NULL explícito (a coluna do banco é nullable)", () => {
    const row = toMirrorRow(evt());
    expect(row.from_status).toBeNull();
    expect(row.to_status).toBeNull();
    expect(row.note).toBeNull();
  });

  it("payload ganha procedência e local_id — dedupe/idempotência na leitura futura", () => {
    const row = toMirrorRow(evt({ payload: { cores: 12 } }));
    expect(row.payload).toEqual({ cores: 12, mirrored_from: "local-events", local_id: "e1" });
  });
});
