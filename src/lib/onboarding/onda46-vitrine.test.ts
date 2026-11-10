// Onda 46 — "a vitrine de CAD e Pilotagem não apura número".
//
// MEDIÇÃO ANTES (browser headless, sessão local, 06/11/2026):
//   /cad        → "MOLDES ATIVOS 2", "EFICIÊNCIA MÉDIA 86.4%", "APROVADOS 2"
//                 a partir de DOIS estudos de fábrica; "Sync + BOM" gravava
//                 88,3% / 1,8 m / 135 g/m² numa ficha que ninguém criou;
//                 o formulário já abria com 88.3, 1.8, 5.35, 5, 135, 2, 1.5.
//   /prototypes → "PILOTOS ATIVOS 2", "AJUSTES ABERTOS 1", "EVIDÊNCIAS 23",
//                 "LACRADOS 1"; "Novo piloto" vinha com DEV000006 preenchido
//                 e "Prova POM & Lacre" chamava ensure() no código de fábrica.
//   /ai-center  → <select> sem nenhuma opção, mas com valor plantado e botão
//                 "Carregar Ficha" ativo.
//
// A vitrine NÃO é apagada: continua visível, agora rotulada. O que muda é que
// nenhum número, documento, ficha ou lacre nasce dela. Nenhuma asserção das
// Ondas 22/23/27–45 foi relaxada.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  MOLDE_DEMO_LABEL,
  initialCadMarkers,
  moldesOperacionais,
  promoverMolde,
  useCadStore,
} from "@/lib/cad/store";
import {
  PILOTO_DEMO_LABEL,
  initialPrototypes,
  pilotosOperacionais,
  promoverPiloto,
  usePrototypeStore,
} from "@/lib/prototypes/store";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const CAD = "src/routes/_authenticated.cad.tsx";
const PROTOTIPOS = "src/routes/_authenticated.prototypes.tsx";
const STUDIO = "src/components/ai/ProductStudio.tsx";
const STORE_CAD = "src/lib/cad/store.ts";
const STORE_PROT = "src/lib/prototypes/store.ts";
const ROOT = "src/routes/__root.tsx";

describe("Onda 46 — os exemplos iniciais são vitrine declarada", () => {
  it("os 2 moldes iniciais estão marcados como demonstração", () => {
    expect(initialCadMarkers).toHaveLength(2);
    expect(initialCadMarkers.every((m) => m.demo === true)).toBe(true);
    expect(MOLDE_DEMO_LABEL).toContain("não entram nos números");
  });

  it("os 2 pilotos iniciais estão marcados como demonstração", () => {
    expect(initialPrototypes).toHaveLength(2);
    expect(initialPrototypes.every((p) => p.demo === true)).toBe(true);
    expect(PILOTO_DEMO_LABEL).toContain("não entram nos números");
  });

  it("a vitrine sozinha não apura NADA — nem molde, nem piloto", () => {
    expect(moldesOperacionais(initialCadMarkers)).toEqual([]);
    expect(pilotosOperacionais(initialPrototypes)).toEqual([]);
  });

  it("promoção é explícita e só depois dela o objeto entra no número", () => {
    const molde = promoverMolde(initialCadMarkers[0]!);
    expect(molde.demo).toBe(false);
    expect(moldesOperacionais([molde])).toHaveLength(1);

    const piloto = promoverPiloto(initialPrototypes[0]!);
    expect(piloto.demo).toBe(false);
    expect(pilotosOperacionais([piloto])).toHaveLength(1);
  });

  it("promoção não muta o original (a vitrine continua íntegra)", () => {
    promoverMolde(initialCadMarkers[0]!);
    promoverPiloto(initialPrototypes[0]!);
    expect(initialCadMarkers[0]!.demo).toBe(true);
    expect(initialPrototypes[0]!.demo).toBe(true);
  });

  it("um molde cadastrado pelo usuário já nasce operacional", () => {
    const criado = useCadStore.getState().addMarker({
      refCode: "MINHA-REF",
      fileName: "MINHA-REF_v1.DXF",
      format: "DXF",
      sistemaCad: "Lectra",
      version: "v1.0",
      eficienciaPct: 82,
      larguraEnfestoM: 1.5,
      comprimentoRiscoM: 4,
      encolhimentoUrdumePct: 1,
      encolhimentoTramaPct: 1,
      status: "Revisão",
    });
    expect(criado.demo).toBe(false);
    expect(moldesOperacionais([criado])).toHaveLength(1);
  });

  it("um piloto novo não herda referência nem foto de fábrica", () => {
    const criado = usePrototypeStore.getState().create({
      refCode: "",
      name: "Minha peça",
      version: "1ª prova",
      requester: "Estilo",
      owner: "Pilotagem",
    });
    expect(criado.refCode).toBe("");
    expect(criado.demo).toBe(false);
    expect(criado.image).toBe("");
    expect(ler(STORE_PROT)).not.toContain('|| "DEV000006"');
  });
});

describe("Onda 46 — as telas só apuram o que foi salvo", () => {
  it("/cad deriva os números de moldesOperacionais()", () => {
    const src = ler(CAD);
    expect(src).toContain("moldesOperacionais(markers)");
    expect(src).toContain("String(operacionais.length)");
    expect(src).toContain('"—"');
    expect(src).toContain("avgEfficiency == null");
    expect(src).not.toContain("String(markers.length)");
  });

  it("/prototypes deriva os 4 números de pilotosOperacionais()", () => {
    const src = ler(PROTOTIPOS);
    expect(src).toContain("pilotosOperacionais(prototypes)");
    expect((src.match(/operacionais\.length/g) ?? []).length).toBeGreaterThanOrEqual(5);
    expect((src.match(/operacionais\.reduce/g) ?? []).length).toBe(2);
    expect(src).toContain("operacionais.filter");
    expect(src).toContain('"—"');
    expect(src).not.toContain("String(prototypes.length)");
  });

  it("sincronização e lacre bloqueiam a vitrine antes de ensureSheet()", () => {
    expect(ler(CAD)).toContain("if (m.demo === true)");
    expect(ler(PROTOTIPOS)).toContain("if (proto.demo === true)");
  });

  it("nenhum formulário planta DEV000006 nem os números 88,3/1,8/5,35", () => {
    // Os STORES mantêm o código de fábrica apenas DENTRO da vitrine
    // (`demo: true`); o que não pode existir é plantio em tela/formulário.
    for (const rel of [CAD, PROTOTIPOS, STUDIO]) {
      expect(ler(rel), rel).not.toContain('"DEV000006"');
    }
    expect(ler(STORE_CAD)).toContain("demo: true");
    expect(ler(STORE_PROT)).toContain("demo: true");
    const cad = ler(CAD);
    expect(cad).not.toContain("eficienciaPct: 88.3");
    expect(cad).not.toContain("larguraEnfestoM: 1.8");
    expect(cad).not.toContain("comprimentoRiscoM: 5.35");
    expect(cad).not.toContain("|| 5");
  });

  it("o formulário de CAD exige medidas reais antes de salvar", () => {
    expect(ler(CAD)).toContain("form.eficienciaPct <= 0");
    expect(ler(CAD)).toContain("form.larguraEnfestoM <= 0");
    expect(ler(PROTOTIPOS)).toContain("!formData.refCode.trim()");
  });

  it("todo aviso novo tem saída (Onda 44): 2 CTAs + link do estúdio", () => {
    expect(ler(CAD)).toContain('data-testid="cad-so-vitrine"');
    expect(ler(CAD)).toContain('data-testid="cta-cad-sem-molde"');
    expect(ler(PROTOTIPOS)).toContain('data-testid="prototipo-so-vitrine"');
    expect(ler(PROTOTIPOS)).toContain('data-testid="cta-prototipo-sem-piloto"');
    expect(ler(STUDIO)).toContain('data-testid="studio-sem-ficha"');
    expect(ler(STUDIO)).toContain('<Link to="/references"');
  });

  it("o feedback de validação existe: <Toaster /> montado no root", () => {
    // Medido com clique real: antes da Onda 46 nenhum toast aparecia — o
    // componente existia em components/ui/sonner.tsx mas não era renderizado.
    const src = ler(ROOT);
    expect(src).toContain("import { Toaster }");
    expect(src).toContain("<Toaster />");
  });

  it("o estúdio desabilita o botão quando não há ficha salva", () => {
    const src = ler(STUDIO);
    expect(src).toContain("disabled={!selectedTechRef}");
    expect(src).toContain("Nenhuma ficha técnica salva");
    expect(src).not.toContain('useState("DEV000006")');
  });

  it("a vitrine continua VISÍVEL e rotulada, não foi apagada", () => {
    expect(ler(CAD)).toContain("Demonstração · não apurado");
    expect(ler(PROTOTIPOS)).toContain("Demonstração · não apurado");
    expect(ler(CAD)).toContain("cad-sync-bloqueado");
    expect(ler(PROTOTIPOS)).toContain("cta-promover-");
  });

  it("edição de um exemplo é promoção explícita, não herança silenciosa", () => {
    expect(ler(PROTOTIPOS)).toContain("prototype.demo === true");
    expect(ler(PROTOTIPOS)).toContain("demo: false");
  });
});

describe("Onda 46 — regressão das ondas anteriores", () => {
  it("os 9 avisos/CTAs da Onda 44 seguem presentes", () => {
    const guard = ler("src/lib/onboarding/onda44-avisos.test.ts");
    expect((guard.match(/ctaTestId: "/g) ?? []).length).toBe(9);
  });

  it("o pacote SQL de produção não foi tocado", () => {
    const sql = ler("docs/producao/APLICAR-ONDA-21-24.sql");
    expect(sql).toContain("NOTIFY pgrst, 'reload schema';");
    expect(sql.split("\n")).toHaveLength(474);
  });
});
