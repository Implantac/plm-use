import { describe, expect, it } from "vitest";
import { countByEntityType, feedItemFromRow, feedItemsFromRows, type FeedEventRow } from "./items";

const NOW = Date.parse("2026-10-14T12:00:00.000Z");

function row(overrides: Partial<FeedEventRow> = {}): FeedEventRow {
  return {
    id: "evt-1",
    entity_type: "tech_sheet",
    entity_id: "8f3a2b9c-0000-4000-8000-000000000001",
    event_type: "created",
    created_at: "2026-10-14T11:55:00.000Z",
    ...overrides,
  };
}

describe("feedItemFromRow", () => {
  it("mapeia evento conhecido com ator, verbo, rótulo e rota", () => {
    const item = feedItemFromRow(row({ actor_name: "Marcos Antunes" }), NOW);
    expect(item.actor).toBe("Marcos Antunes");
    expect(item.initials).toBe("MA");
    expect(item.verb).toBe("criou");
    expect(item.target).toBe("ficha técnica");
    expect(item.route).toBe("/tech-sheet");
    expect(item.when).toBe("há 5 min");
  });

  it("usa ator de fallback quando o banco não traz actor_name", () => {
    const item = feedItemFromRow(row({ actor_name: null }), NOW);
    expect(item.actor).toBe("Membro da equipe");
    expect(item.initials).toBe("ME");
  });

  it("traduz a transição de status em texto legível", () => {
    const item = feedItemFromRow(
      row({
        entity_type: "lote",
        event_type: "status_changed",
        from_status: "planejado",
        to_status: "em_producao",
      }),
      NOW,
    );
    expect(item.verb).toBe("mudou o status de");
    expect(item.statusFrom).toBe("planejado");
    expect(item.statusTo).toBe("em producao");
    expect(item.route).toBe("/production");
  });

  it("cai no verbo genérico para eventos customizados pontuados", () => {
    const item = feedItemFromRow(row({ event_type: "launch.performance.updated" }), NOW);
    expect(item.verb).toBe("registrou uma atividade em");
  });

  it("prettifya tipos de entidade fora do vocabulário (enum novo, rótulo nunca 'undefined')", () => {
    const item = feedItemFromRow(row({ entity_type: "print_design" }), NOW);
    expect(item.target).toBe("Estampa"); // vem do LOCAL_ENTITY_LABEL
    const unknown = feedItemFromRow(row({ entity_type: "dye_tub" }), NOW);
    expect(unknown.target).toBe("dye tub");
    expect(unknown.route).toBeUndefined();
  });

  it("so-mente para ignorar id ausente em from/to", () => {
    const item = feedItemFromRow(row({ from_status: "planejado", to_status: null }), NOW);
    expect(item.statusFrom).toBeUndefined();
    expect(item.statusTo).toBeUndefined();
  });

  it("formata tempos relativos nas faixas de 1min/1h/1d e data absoluta após 7 dias", () => {
    const mk = (agoIso: string) => feedItemFromRow(row({ created_at: agoIso }), NOW).when;
    expect(mk("2026-10-14T11:59:30.000Z")).toBe("agora mesmo");
    expect(mk("2026-10-14T10:00:00.000Z")).toBe("há 2 h");
    expect(mk("2026-10-11T12:00:00.000Z")).toBe("há 3 d");
    expect(mk("2026-09-20T12:00:00.000Z")).toBe("20 de set.");
  });
});

describe("feedItemsFromRows + countByEntityType", () => {
  it("preserva a ordem recebida e agrupa por tipo com contagem decrescente", () => {
    const rows = [
      row({ id: "a" }),
      row({ id: "b", entity_type: "lote" }),
      row({ id: "c", entity_type: "lote" }),
    ];
    expect(feedItemsFromRows(rows, NOW).map((i) => i.id)).toEqual(["a", "b", "c"]);
    expect(countByEntityType(rows)).toEqual([
      { type: "lote", label: "lote", count: 2 },
      { type: "tech_sheet", label: "ficha técnica", count: 1 },
    ]);
  });
});
