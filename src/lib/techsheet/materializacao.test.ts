import { beforeEach, describe, expect, it } from "vitest";
import { migrateTechSheetStorage, useTechSheetStore } from "./store";
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

describe("migração do storage antigo (v0/v1 → v2)", () => {
  it("cópia intacta do modelo vira template ao migrar", () => {
    const antigo = { data: { "V24-001": seedFor("V24-001"), DEV000006: seedFor("DEV000006") } };
    const migrado = migrateTechSheetStorage(antigo, 0);
    expect(migrado.materializadas["V24-001"]).toBe(true);
    expect(migrado.materializadas["DEV000006"]).toBe(true);
    expect(sheetProvenance(migrado.data, "V24-001", migrado.materializadas)).toBe("template");
  });

  it("ficha editada sobrevive como 'salva'", () => {
    const editada = seedFor("V24-001");
    editada.meta = { ...editada.meta!, name: "Camisa Polo da empresa" };
    const migrado = migrateTechSheetStorage({ data: { "V24-001": editada } }, 0);
    expect(migrado.materializadas["V24-001"]).toBeUndefined();
    expect(sheetProvenance(migrado.data, "V24-001", migrado.materializadas)).toBe("salva");
  });

  it("edição de uma linha de BOM já basta para não ser template", () => {
    const doc = seedFor("U25-014");
    doc.bom = doc.bom.map((b, i) => (i === 0 ? { ...b, custo: b.custo + 0.01 } : b));
    const migrado = migrateTechSheetStorage({ data: { "U25-014": doc } }, 1);
    expect(migrado.materializadas["U25-014"]).toBeUndefined();
  });

  it("roda mais de uma vez sem mudar o resultado (idempotente)", () => {
    const antigo = { data: { "V24-001": seedFor("V24-001") } };
    const uma = migrateTechSheetStorage(antigo, 0);
    const duas = migrateTechSheetStorage(uma, 0);
    expect(duas.materializadas).toEqual(uma.materializadas);
  });

  it("não marca nada quando a versão já é 2", () => {
    const atual = { data: { "V24-001": seedFor("V24-001") }, materializadas: {} };
    const migrado = migrateTechSheetStorage(atual, 2);
    expect(migrado.materializadas).toEqual({});
  });

  it("preserva o mapa existente em vez de recriar", () => {
    const atual = { data: {}, materializadas: { "X-1": true as const } };
    const migrado = migrateTechSheetStorage(atual, 1);
    expect(migrado.materializadas["X-1"]).toBe(true);
  });

  it("storage vazio não explode", () => {
    expect(migrateTechSheetStorage(undefined, 0)).toEqual({ data: {}, materializadas: {} });
    expect(migrateTechSheetStorage({}, 0)).toEqual({ data: {}, materializadas: {} });
  });
});
