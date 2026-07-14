// Valida que o contador do badge da Timeline não infla com replays/reconexões.
// O componente dedupa por id em duas camadas: useMemo(uniqueItems) e diff
// contra baselineIdsRef (Set de ids), ambos idempotentes.
import { describe, it, expect, vi } from "vitest";
import { render, act } from "@testing-library/react";
import { useState } from "react";

// Mock do hook antes do import do componente.
type FakeEvent = {
  id: string;
  entity_type: string;
  entity_id: string;
  event_type: string;
  created_at: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  actor_name: string | null;
  actor: string | null;
  payload: Record<string, unknown>;
};

let currentItems: FakeEvent[] = [];
let currentLoading = true;

vi.mock("@/hooks/use-entity-events", () => ({
  useEntityTimeline: () => ({ items: currentItems, loading: currentLoading }),
}));

import { EntityTimeline } from "./EntityTimeline";

function mkEvent(id: string): FakeEvent {
  return {
    id,
    entity_type: "supplier",
    entity_id: "sup-1",
    event_type: "updated",
    created_at: new Date().toISOString(),
    from_status: null,
    to_status: null,
    note: null,
    actor_name: null,
    actor: null,
    payload: {},
  };
}

function Harness({ onCount }: { onCount: (n: number) => void }) {
  const [active] = useState(false); // aba não está ativa → conta diff
  return (
    <EntityTimeline
      entityType="supplier"
      entityId="sup-1"
      active={active}
      onNewCountChange={onCount}
    />
  );
}

describe("EntityTimeline dedupe", () => {
  it("não infla o contador com replays do mesmo evento", async () => {
    const onCount = vi.fn();

    // Baseline: 1 evento existente, aba inativa.
    currentItems = [mkEvent("a")];
    currentLoading = false;

    const { rerender } = render(<Harness onCount={onCount} />);

    // Após snapshot inicial, baseline registra {a} → count = 0
    expect(onCount).toHaveBeenLastCalledWith(0);

    // Chega evento novo "b" → count = 1
    await act(async () => {
      currentItems = [mkEvent("b"), mkEvent("a")];
      rerender(<Harness onCount={onCount} />);
    });
    expect(onCount).toHaveBeenLastCalledWith(1);

    // Replay/reconexão: mesmo "b" duplicado no array + "a" duplicado.
    await act(async () => {
      currentItems = [
        mkEvent("b"),
        mkEvent("b"),
        mkEvent("a"),
        mkEvent("a"),
        mkEvent("b"),
      ];
      rerender(<Harness onCount={onCount} />);
    });
    // Ainda apenas 1 id novo relativo ao baseline {a}.
    expect(onCount).toHaveBeenLastCalledWith(1);

    // Novo evento genuíno "c" chega junto de mais replays.
    await act(async () => {
      currentItems = [
        mkEvent("c"),
        mkEvent("b"),
        mkEvent("b"),
        mkEvent("a"),
        mkEvent("c"),
      ];
      rerender(<Harness onCount={onCount} />);
    });
    // Ids novos vs baseline {a}: {b, c} → 2
    expect(onCount).toHaveBeenLastCalledWith(2);
  });
});
