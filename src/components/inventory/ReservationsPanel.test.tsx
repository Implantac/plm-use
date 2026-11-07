// @vitest-environment jsdom
//
// Onda 37. Medição do bundle publicado (entry index-DDU6Ug_A.js, 221 chunks):
// o card "Reservas ativas" exibia "Consumo e liberação são automáticos" de
// forma INCONDICIONAL, enquanto o banco devolvia 404 PGRST205 na view de aging
// e PGRST202 nas três RPCs do ciclo. `useStockLifecycle()` e
// `MENSAGEM_MIGRACAO_PENDENTE` já estavam importados no painel desde a Onda 26,
// mas `ciclo` nunca era lido. Estes testes impedem que a promessa volte a
// aparecer sem a sonda.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const { estado, toast } = vi.hoisted(() => ({
  estado: { value: "pendente" as "verificando" | "ativa" | "pendente" },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    in: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }),
  };
  return { supabase: { from: () => chain, rpc: vi.fn() } };
});
vi.mock("@/lib/inventory/stock-lifecycle", () => ({
  useStockLifecycle: () => estado.value,
  MENSAGEM_MIGRACAO_PENDENTE:
    "O ciclo automático da reserva (Ondas 21 e 24) ainda não está aplicado neste banco. " +
    "Aplique docs/producao/APLICAR-ONDA-21-24.sql no SQL editor do projeto.",
}));
vi.mock("@/lib/inventory/inventory.functions", () => ({
  updateReservationStatus: vi.fn().mockResolvedValue({ ok: true }),
}));
vi.mock("sonner", () => ({ toast }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

const { ReservationsPanel } = await import("./ReservationsPanel");

const PROMESSA = /Consumo e liberação são automáticos/;

beforeEach(() => {
  estado.value = "pendente";
  toast.success.mockClear();
  toast.error.mockClear();
});
afterEach(cleanup);

describe("ReservationsPanel — promessa condicionada ao banco (Onda 37)", () => {
  it("com migração pendente avisa e NÃO promete automação", () => {
    estado.value = "pendente";
    render(<ReservationsPanel items={[]} />);
    expect(screen.getByTestId("reserva-migracao-pendente")).toBeTruthy();
    expect(screen.getByText(/APLICAR-ONDA-21-24\.sql/)).toBeTruthy();
    expect(screen.queryByText(PROMESSA)).toBeNull();
    expect(screen.queryByTestId("reserva-ciclo-ativo")).toBeNull();
  });

  it("enquanto verifica, não promete nem acusa ausência", () => {
    estado.value = "verificando";
    render(<ReservationsPanel items={[]} />);
    expect(screen.getByTestId("reserva-ciclo-verificando")).toBeTruthy();
    expect(screen.queryByText(PROMESSA)).toBeNull();
    expect(screen.queryByTestId("reserva-migracao-pendente")).toBeNull();
  });

  it("só com o ciclo ativo a automação é anunciada", () => {
    estado.value = "ativa";
    render(<ReservationsPanel items={[]} />);
    expect(screen.getByTestId("reserva-ciclo-ativo")).toBeTruthy();
    expect(screen.getByText(PROMESSA)).toBeTruthy();
    expect(screen.queryByTestId("reserva-migracao-pendente")).toBeNull();
  });

  it("guarda de fonte: a promessa está dentro do ramo 'ativa'", () => {
    const s = readFileSync(
      resolve(__dirname, "../../../src/components/inventory/ReservationsPanel.tsx"),
      "utf8",
    );
    const ramoAtiva = s.indexOf('ciclo === "ativa"');
    const promessa = s.indexOf("Consumo e liberação são automáticos");
    expect(ramoAtiva).toBeGreaterThan(-1);
    expect(promessa).toBeGreaterThan(ramoAtiva);
    expect(s).toContain("{MENSAGEM_MIGRACAO_PENDENTE}");
    expect(s).toContain('data-testid="reserva-migracao-pendente"');
    expect(s).toContain("useStockLifecycle()");
  });
});
