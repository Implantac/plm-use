import { describe, expect, it } from "vitest";
import { pedidosSalvos } from "@/test/pedidos-salvos";
import { useOutsourcingStore } from "@/lib/techsheet/outsourcing-os";
import { INITIAL_GTM_CAMPAIGNS } from "@/lib/techsheet/research-gtm";
import { campanhasSalvas } from "@/test/campanhas-salvas";
import { computeLiveSopSnapshot } from "./live-sop";

describe("Torre Executiva S&OP em Tempo Real (/analytics)", () => {
  it("consolida faturamento B2B, margem ponderada, ROAS GTM e saldo em facção sem entrada manual", () => {
    const snap = computeLiveSopSnapshot({
      orders: pedidosSalvos(),
      campaigns: campanhasSalvas(),
      serviceOrders: useOutsourcingStore.getState().serviceOrders,
    });

    expect(snap.b2bOrderRevenueBrl).toBeGreaterThan(9000);
    expect(snap.b2bWeightedMarginPct).toBeGreaterThan(40);
    expect(snap.gtmBlendedRoas).toBeGreaterThan(4.5);
    expect(snap.totalActivePiecesB2b).toBe(112);
  });
});
