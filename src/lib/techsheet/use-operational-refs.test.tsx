// @vitest-environment jsdom
//
// As telas de SAÍDA (impressão, cores, CAD, medições, qualidade) selecionavam
// ficha para emitir documento. Elas nasciam em `DEV000006` — produto de
// demonstração — e ofereciam as quatro referências de exemplo no seletor: o
// usuário abria a tela, gerava o PDF e o documento saía com nome de produto que
// não existe. Aqui o comportamento do seletor é exercitado de verdade
// (renderHook), não só a função pura.
import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useOperationalRefs, useSelectedRef } from "./use-operational-refs";
import { useTechSheetStore } from "./store";

const st = () => useTechSheetStore.getState();

beforeEach(() => {
  useTechSheetStore.setState({ data: {}, materializadas: {}, dirty: {} });
});

function useTela() {
  const { sheetsMap, codes, hasSaved } = useOperationalRefs();
  const [ref] = useSelectedRef(codes);
  return { sheetsMap, codes, hasSaved, ref };
}

describe("seleção de ficha nas telas que emitem documento", () => {
  it("sem ficha salva, não seleciona nada (nada de DEV000006 por padrão)", async () => {
    const { result } = renderHook(() => useTela());
    expect(result.current.codes).toEqual([]);
    expect(result.current.hasSaved).toBe(false);
    expect(result.current.ref).toBe("");
  });

  it("depois de uma visita que materializa o modelo, ainda não há ficha para emitir", async () => {
    st().ensure("DEV000006");
    const { result } = renderHook(() => useTela());
    expect(result.current.codes).toEqual([]);
    expect(result.current.ref).toBe("");
  });

  it("assume a primeira ficha salva quando ela existe", async () => {
    st().updateMeta("V24-001", { name: "Camisa Polo Real" });
    const { result } = renderHook(() => useTela());
    await waitFor(() => expect(result.current.ref).toBe("V24-001"));
    expect(result.current.codes).toEqual(["V24-001"]);
  });

  it("não mantém ref que saiu da lista", async () => {
    st().updateMeta("V24-001", { name: "A" });
    st().updateMeta("U25-014", { name: "B" });
    const { result, rerender } = renderHook(() => useTela());
    await waitFor(() => expect(result.current.ref).toBe("U25-014"));

    // a ficha selecionada é substituída por um estado só com a outra
    st().updateMeta("V24-001", { name: "A2" });
    useTechSheetStore.setState({ data: { "V24-001": st().data["V24-001"]! } });
    rerender();
    await waitFor(() => expect(result.current.ref).toBe("V24-001"));
  });

  it("ordena os códigos para o seletor não dançar entre renders", async () => {
    st().updateMeta("U25-014", { name: "B" });
    st().updateMeta("A25-001", { name: "A" });
    const { result } = renderHook(() => useTela());
    await waitFor(() => expect(result.current.codes).toEqual(["A25-001", "U25-014"]));
  });
});
