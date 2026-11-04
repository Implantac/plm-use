import { beforeEach, describe, expect, it } from "vitest";
import { useTechSheetStore } from "./store";
import { operationalCodes, resolveSheet, sheetProvenance } from "./provenance";
import { seedFor } from "./store";

// O defeito que estes testes travam: `ensure()` é chamado no render de ~12 telas.
// Ele grava `seedFor(ref)` no store, e o selo de procedência só olhava "existe no
// store?" — então ABRIR uma tela transformava ficha de demonstração em "ficha
// salva". Quem lê o selo para decidir (comitê de gate, liberação de corte,
// cotação) passava a decidir sobre números de exemplo achando que eram da empresa.
const st = () => useTechSheetStore.getState();

beforeEach(() => {
  useTechSheetStore.setState({ data: {}, materializadas: {}, dirty: {} });
});

describe("materialização do seed pelo ensure()", () => {
  it("ensure marca a ref como materializada, não como ficha salva", () => {
    st().ensure("V24-001");
    expect(st().materializadas["V24-001"]).toBe(true);
    expect(sheetProvenance(st().data, "V24-001", st().materializadas)).toBe("template");
  });

  it("sem o mapa (chamada antiga) continua valendo presença = salva", () => {
    st().ensure("V24-001");
    expect(sheetProvenance(st().data, "V24-001")).toBe("salva");
  });

  it("primeira edição humana promove a ficha para 'salva'", () => {
    st().ensure("V24-001");
    st().updateMeta("V24-001", { name: "Camisa Polo da empresa" });
    expect(st().materializadas["V24-001"]).toBeUndefined();
    expect(sheetProvenance(st().data, "V24-001", st().materializadas)).toBe("salva");
  });

  it("edição de BOM também promove", () => {
    st().ensure("U25-014");
    st().addBomItem("U25-014", {
      tipo: "Tecido",
      material: "Moletom",
      fornecedor: "Fornecedor real",
      consumo: "1,2",
      unidade: "m",
      custo: 18,
    });
    expect(sheetProvenance(st().data, "U25-014", st().materializadas)).toBe("salva");
  });

  it("refs que nasceram de edição direta nunca ficam marcadas", () => {
    st().updateMeta("NOVA-001", { name: "Produto novo" });
    expect(st().materializadas["NOVA-001"]).toBeUndefined();
    expect(sheetProvenance(st().data, "NOVA-001", st().materializadas)).toBe("salva");
  });

  it("clonar para uma ref nova conta como trabalho do usuário", () => {
    st().ensure("V24-001");
    st().updateMeta("V24-001", { name: "Original editada" });
    const copia = st().duplicateTechSheet("V24-001", "V24-002", "Cópia real");
    expect(copia.ref).toBe("V24-002");
    expect(sheetProvenance(st().data, "V24-002", st().materializadas)).toBe("salva");
  });

  it("resolveSheet devolve 'template' para a ficha materializada", () => {
    st().ensure("DEV000006");
    const { provenance, doc } = resolveSheet(st().data, "DEV000006", seedFor, st().materializadas);
    expect(provenance).toBe("template");
    expect(doc.meta?.name).toBe(seedFor("DEV000006").meta?.name);
  });
});

describe("operationalCodes ignora o que só foi materializado", () => {
  it("uma visita a /route-engineering não cria produto para decidir", () => {
    st().ensure("V24-001");
    expect(operationalCodes(st().data, [], st().materializadas)).toEqual([]);
  });

  it("ficha editada entra; materializada não", () => {
    st().ensure("V24-001");
    st().ensure("U25-014");
    st().updateMeta("U25-014", { name: "Moletom Real" });
    expect(operationalCodes(st().data, [], st().materializadas)).toEqual(["U25-014"]);
  });
});
