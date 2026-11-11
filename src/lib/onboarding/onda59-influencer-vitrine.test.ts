// Onda 59 — 53ª medição. A varredura por cliques de `/influencers` achou o
// risco mais alto que restava depois da Onda 58: 5 creators de fábrica geravam
// 434 "vendas atribuídas", ROI estimado 563%, 5 linhas de ROAS/CAC/CFOP e 5
// botões "Guia 6910" HABILITADOS que imprimiam A4 com "NATUREZA FISCAL:
// REMESSA EM BONIFICAÇÃO". O mesmo drawer escondido (2 cliques) tinha 2 campos
// sem nome acessível — a varredura da Onda 52 não abria essa sequência.
//
// Correção: vitrine rotulada (`demo: true`), guardas puras de emissão, KPIs em
// `—` com aviso/CTA, promoção só por ação explícita ("Registrar creator"),
// filtro também em ROI de coleção, contexto do copiloto e hidratação cloud.
// `evaluateCreatorAttribution()` e `buildSeedingBonusDispatchHtml()` seguem
// puros; **nenhuma asserção das Ondas 27–58 é relaxada**.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CRIADOR_DEMO_LABEL,
  influencerEhVitrine,
  influencersOperacionais,
  resumoInfluencers,
  useInfluencersStore,
  type Influencer,
  type NovoCriador,
} from "@/lib/influencers/store";
import {
  buildSeedingBonusDispatchHtml,
  evaluateCreatorAttribution,
  linhasSeedingOperacionais,
  podeEmitirGuiaBonificacao,
  SEEDING_DEMO_BLOQUEIO,
} from "@/lib/influencers/seeding-attribution";
import { influencerFromRow, influencerToRow } from "@/lib/creative-sync";

const raiz = resolve(__dirname, "../../..");
const ler = (rel: string) => readFileSync(resolve(raiz, rel), "utf8");

const SALVO: NovoCriador = {
  nome: "Ana Real",
  handle: "@anareal",
  regiao: "Sudeste",
  uf: "SP",
  seguidores: 12000,
  segmento: "Moda Urbana",
  perfil: "Micro",
  custoMedio: 900,
  vendasGeradas: 17,
  primeiraRef: "VT900",
  primeiraPeca: "Vestido Real",
};

function criadorSalvo(envios: Influencer["envios"] = []): Influencer {
  return {
    id: "inf-teste-onda59",
    demo: false,
    nome: SALVO.nome,
    handle: SALVO.handle,
    regiao: SALVO.regiao,
    uf: SALVO.uf,
    seguidores: SALVO.seguidores,
    segmento: SALVO.segmento,
    perfil: SALVO.perfil,
    custoMedio: SALVO.custoMedio,
    vendasGeradas: SALVO.vendasGeradas,
    envios,
  };
}

describe("Onda 59 — vitrine de influencers não apura nem emite guia fiscal", () => {
  it("os 5 creators de fábrica estão rotulados e nenhum é operacional", () => {
    const seeds = useInfluencersStore.getState().influencers;
    expect(seeds).toHaveLength(5);
    expect(seeds.filter((i) => i.demo === true)).toHaveLength(5);
    expect(influencersOperacionais(seeds)).toHaveLength(0);
    expect(CRIADOR_DEMO_LABEL).toContain("não entra em número operacional");
  });

  it("reconhece a vitrine antiga sem `demo` (localStorage e linha do banco)", () => {
    const legado = { ...criadorSalvo(), id: "i1", demo: undefined, handle: "@marinacosta" };
    const doBanco = {
      ...criadorSalvo(),
      id: "11111111-1111-4111-8111-111111111111",
      demo: undefined,
      handle: "@camireis",
    };
    expect(influencerEhVitrine(legado)).toBe(true);
    expect(influencerEhVitrine(doBanco)).toBe(true);
    // Um creator real com id `i1` NÃO é vitrine: o teste de round-trip da
    // suíte `creative-sync.test.ts` usa exatamente esse id (asserção antiga).
    expect(influencerEhVitrine({ ...criadorSalvo(), id: "i1", demo: undefined })).toBe(false);
    expect(influencerEhVitrine(criadorSalvo())).toBe(false);
  });

  it("a guia exige creator salvo E pelo menos uma remessa real", () => {
    const vitrine = useInfluencersStore.getState().influencers[0]!;
    expect(podeEmitirGuiaBonificacao(vitrine)).toBe(false);
    expect(podeEmitirGuiaBonificacao(criadorSalvo())).toBe(false);
    expect(
      podeEmitirGuiaBonificacao(
        criadorSalvo([
          { id: "e", ref: "VT900", nome: "Vestido Real", data: "2026-10-21", status: "Enviado" },
        ]),
      ),
    ).toBe(true);
    expect(SEEDING_DEMO_BLOQUEIO).toContain("remessa reais");
  });

  it("a vitrine não produz linha de ROAS/CAC/CFOP, mas o cálculo puro continua intacto", () => {
    const seeds = useInfluencersStore.getState().influencers;
    expect(linhasSeedingOperacionais(seeds)).toHaveLength(0);
    expect(linhasSeedingOperacionais([...seeds, criadorSalvo()])).toHaveLength(1);
    // Nenhuma asserção antiga relaxada: o teste de seeding-attribution segue válido.
    const puro = evaluateCreatorAttribution(seeds, 199.9, 42.5, "SC");
    expect(puro).toHaveLength(5);
    expect(puro[0]!.couponCode).toBe("USEMARINACO10");
    expect(puro[0]!.cfopRemessa).toBe("6910");
    expect(buildSeedingBonusDispatchHtml(puro[0]!)).toContain("CFOP 6910");
  });

  it("o contexto do copiloto declara ausência em vez de descrever a vitrine", () => {
    const seeds = useInfluencersStore.getState().influencers;
    expect(resumoInfluencers(seeds)).toContain("não apurados");
    expect(resumoInfluencers(seeds)).not.toContain("142 vendas");
    expect(resumoInfluencers([...seeds, criadorSalvo()])).toContain("Ana Real");
  });

  it("registrar creator é ação explícita: nasce salvo, com 1 remessa, sem tocar a vitrine", () => {
    const antes = useInfluencersStore.getState().influencers;
    try {
      useInfluencersStore.getState().registrarCreator(SALVO);
      const depois = useInfluencersStore.getState().influencers;
      expect(depois).toHaveLength(antes.length + 1);
      expect(depois.filter((i) => i.demo === true)).toHaveLength(5);
      const novo = influencersOperacionais(depois)[0]!;
      expect(novo.demo).toBe(false);
      expect(novo.envios).toHaveLength(1);
      expect(novo.envios[0]!.ref).toBe("VT900");
      expect(podeEmitirGuiaBonificacao(novo)).toBe(true);
    } finally {
      useInfluencersStore.setState({ influencers: antes });
    }
  });

  it("round-trip de creator salvo continua idêntico e o seed hidratado volta como vitrine", () => {
    const salvo = criadorSalvo();
    // `demo` é flag local: a linha do banco não a carrega, então o round-trip
    // devolve creator salvo sem a propriedade (ausência = operacional).
    expect(influencerFromRow(influencerToRow(salvo, "u"))).toEqual({ ...salvo, demo: undefined });
    const linhaVitrine = influencerToRow({ ...salvo, id: "i1", handle: "@marinacosta" }, "u");
    expect(influencerFromRow(linhaVitrine).demo).toBe(true);
  });

  it("os marcadores da correção existem no código medido", () => {
    const rota = ler("src/routes/_authenticated.influencers.tsx");
    const painel = ler("src/components/influencers/SeedingAttributionPanel.tsx");
    const roi = ler("src/components/collections/CollectionROI.tsx");
    for (const marcador of [
      "influencer-so-vitrine",
      "cta-influencer-registrar",
      "dialogo-registrar-creator",
      "btn-salvar-creator",
      "drawer-vitrine-sem-envio",
      'aria-label="Referência da peça enviada"',
      'aria-label="Nome da peça enviada"',
      'aria-label="Nome do creator"',
      "influencersOperacionais(influencers)",
    ]) {
      expect(rota, marcador).toContain(marcador);
    }
    for (const marcador of [
      "seeding-so-vitrine",
      "seeding-sem-numero",
      "cta-seeding-registrar-creator",
      "podeEmitirGuiaBonificacao",
      "linhasSeedingOperacionais",
      'source={soVitrine ? "demonstracao" : "local"}',
    ]) {
      expect(painel, marcador).toContain(marcador);
    }
    expect(roi).toContain("influencersOperacionais(influencersTodos)");
    expect(ler("src/lib/cloud-sync.ts")).toContain("influencerEhVitrine(inf)");
    expect(ler("src/lib/creative-sync.ts")).toContain("influencerEhVitrine(inf)");
    expect(ler("src/lib/influencers/store.ts")).toContain("registrarCreator(dados: NovoCriador)");
  });

  it("o SQL aplicado em produção continua intocado", () => {
    const sql = readFileSync(resolve(raiz, "docs/producao/APLICAR-ONDA-21-24.sql"));
    expect(createHash("sha256").update(sql).digest("hex")).toBe(
      "382f0f192e23eac143dfda995f69cdc740c258b2017c4f9b07c9dff8f20c254f",
    );
  });
});
