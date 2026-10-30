// Ponte oficial (aprovada pelo dono em 30/10/2026): Ficha Técnica PLM → Catálogo Técnico.
//
// A Ficha Técnica (/tech-sheet) continua sendo o berço reutilizável de engenharia
// (envelope v3 em tech_sheets.bom) e, ao acionar "Publicar no Catálogo Técnico",
// projeta e faz upsert idempotente em:
//   - catalog_products (code, name, family, reference_code, base_price, grade)
//   - catalog_option_groups + catalog_options:
//       1) estrutura-plm (required=true): explode o BOM (material_consumption jsonb
//          respeitando o CHECK kind IN ('tecido','aviamento','linha','embalagem','servico'))
//          e o custo/tempo de costura base (BOP);
//       2) aplicacoes-plm (multi): projeta cada Aplicação (Bordado/Silk/Sublimação/Transfer)
//          com o driver exato ('mil_pontos','cor','m2','peca') e setup_cost;
//       3) variantes-cor (single): projeta as Colorways ativas da peça.
import { supabase } from "@/integrations/supabase/client";
import type { CostDriver } from "@/lib/sales/types";
import { isMissingTable, MIGRATION_HINT, type Err } from "@/lib/sales/api";
import { areaCm2, type Aplicacao } from "./aplicacoes";
import { driverDaAplicacao } from "./aplicacao-order-bridge";
import { computeFullTechSheetPricing } from "./pricing";
import { custoTotalBOP, tempoTotalBOP, type BomItem, type TechSheetData } from "./store";
import { bomItemCustoEfetivo, parseDecimalPtBr, round2, round4 } from "./textile";

export type CatalogMaterialConsumptionJson = {
  kind: "tecido" | "aviamento" | "linha" | "embalagem" | "servico";
  material: string;
  unit: string;
  consumption: number;
  waste_pct: number;
  unit_cost: number;
};

export type CatalogOptionSeed = {
  code: string;
  name: string;
  sector: string | null;
  operation_name: string | null;
  driver: CostDriver;
  unit_cost: number;
  setup_cost: number;
  minutes: number | null;
  outsourced: boolean;
  material_consumption: CatalogMaterialConsumptionJson[];
  requires_spec: string[];
  price_delta: number;
};

export type CatalogGroupSeed = {
  code: string;
  name: string;
  selection: "single" | "multi";
  required: boolean;
  sort: number;
  options: CatalogOptionSeed[];
};

export type CatalogPublicationPlan = {
  product: {
    code: string;
    name: string;
    family: string | null;
    description: string | null;
    reference_code: string;
    base_price: number;
    min_qty: number;
    grade: string[];
  };
  groups: CatalogGroupSeed[];
};

function mapBomTipoToSqlKind(tipo: BomItem["tipo"]): CatalogMaterialConsumptionJson["kind"] {
  switch (tipo) {
    case "Tecido":
      return "tecido";
    case "Linha":
      return "linha";
    case "Embalagem":
      return "embalagem";
    case "Bordado":
    case "Silk":
      return "servico";
    default:
      return "aviamento";
  }
}

function slugCode(raw: string, fallback: string): string {
  const s = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || fallback;
}

function aplicacaoToOptionSeed(a: Aplicacao, idx: number): CatalogOptionSeed {
  const driver = driverDaAplicacao(a);
  const qtd = Math.max(1, a.qtdPorPeca || 1);
  let perDriverUnitCost = round4(a.custoUnitario * qtd);
  if (driver === "mil_pontos" && (a.pontos ?? 0) > 0) {
    perDriverUnitCost = round4((a.custoUnitario * qtd) / Math.max(0.001, a.pontos!));
  } else if (driver === "cor" && a.cores > 0) {
    perDriverUnitCost = round4((a.custoUnitario * qtd) / Math.max(1, a.cores));
  } else if (driver === "m2") {
    const m2 = Math.max(0.0001, areaCm2(a) / 10000);
    perDriverUnitCost = round4((a.custoUnitario * qtd) / m2);
  }
  const sector = a.tipo === "Bordado" ? "Bordado computadorizado" : "Estamparia";
  return {
    code: slugCode(`${a.tipo}-${a.posicao}-${idx + 1}`, `app-${idx + 1}`),
    name: `${a.tipo} · ${a.posicao}${a.arte ? ` (${a.arte})` : ""}`,
    sector,
    operation_name: `${a.tipo} · ${a.posicao}`,
    driver,
    unit_cost: perDriverUnitCost,
    setup_cost: round2(Math.max(0, a.custoSetup ?? 0)),
    minutes: null,
    outsourced: false,
    material_consumption: [],
    requires_spec: driver === "peca" ? [] : ["driver_qty"],
    price_delta: 0,
  };
}

/**
 * Função pura (testável sem banco): converte uma Ficha Técnica PLM completa
 * no plano exato de publicação para `catalog_products` + grupos/opções.
 */
export function buildCatalogPublicationPlan(
  doc: TechSheetData,
  overrides?: {
    code?: string;
    name?: string;
    family?: string;
    minQty?: number;
  },
): CatalogPublicationPlan {
  const pricing = computeFullTechSheetPricing(doc);
  const code = (overrides?.code ?? doc.ref).trim().toUpperCase();
  const name = (overrides?.name ?? doc.meta?.name ?? `Produto ${doc.ref}`).trim();
  const family = (overrides?.family ?? doc.meta?.category ?? "").trim() || null;
  const grade =
    doc.medidas?.tamanhos && doc.medidas.tamanhos.length > 0
      ? [...doc.medidas.tamanhos]
      : ["P", "M", "G", "GG"];

  const bomConsumption: CatalogMaterialConsumptionJson[] = doc.bom.map((b) => {
    const cons = Math.max(0.0001, parseDecimalPtBr(b.consumo) || 1);
    const waste = Math.max(0, Number(b.perdaPct) || 0);
    const unitCost =
      b.custoUnitario != null && Number.isFinite(b.custoUnitario)
        ? round4(b.custoUnitario)
        : round4(bomItemCustoEfetivo(b) / (cons * (1 + waste / 100)));
    return {
      kind: mapBomTipoToSqlKind(b.tipo),
      material: b.material,
      unit: b.unidade || "un",
      consumption: round4(cons),
      waste_pct: round2(waste),
      unit_cost: unitCost,
    };
  });

  const bopMinutes = tempoTotalBOP(doc.bop);
  const bopCost = custoTotalBOP(doc.bop);

  const groups: CatalogGroupSeed[] = [
    {
      code: "estrutura-plm",
      name: "Estrutura Base PLM (BOM + Costura)",
      selection: "single",
      required: true,
      sort: 1,
      options: [
        {
          code: "padrao-plm",
          name: "Construção Padrão da Ficha Técnica",
          sector: "Costura",
          operation_name: doc.bop.length > 0 ? "Roteiro Base Costura/Corte PLM" : null,
          driver: "peca",
          unit_cost: round4(bopCost),
          setup_cost: 0,
          minutes: bopMinutes > 0 ? round2(bopMinutes) : null,
          outsourced: false,
          material_consumption: bomConsumption,
          requires_spec: [],
          price_delta: 0,
        },
      ],
    },
  ];

  if (doc.aplicacoes?.length) {
    groups.push({
      code: "aplicacoes-plm",
      name: "Aplicações & Personalizações (PLM)",
      selection: "multi",
      required: false,
      sort: 2,
      options: doc.aplicacoes.map((a, i) => aplicacaoToOptionSeed(a, i)),
    });
  }

  const activeColorways = (doc.colorways ?? []).filter((c) => c.status !== "Cancelada");
  if (activeColorways.length > 0) {
    groups.push({
      code: "variante-cor",
      name: "Cartela de Variantes (Colorways)",
      selection: "single",
      required: false,
      sort: 3,
      options: activeColorways.map((cw) => ({
        code: slugCode(cw.code || cw.name, cw.id),
        name: `${cw.code} · ${cw.name}`,
        sector: null,
        operation_name: null,
        driver: "peca",
        unit_cost: 0,
        setup_cost: 0,
        minutes: null,
        outsourced: false,
        material_consumption: [],
        requires_spec: [],
        price_delta: 0,
      })),
    });
  }

  const basePrice =
    doc.preCost.targetPreco && doc.preCost.targetPreco > 0
      ? round2(doc.preCost.targetPreco)
      : round2(Math.max(0, pricing.precoSugerido));

  return {
    product: {
      code,
      name,
      family,
      description: `Sincronizado da Ficha Técnica PLM (${doc.ref}) · Versão ${doc.versoes[0]?.versao ?? "v1.0"}`,
      reference_code: doc.ref,
      base_price: basePrice,
      min_qty: Math.max(1, overrides?.minQty ?? (doc.preCost.tiragemPlanejada || 10)),
      grade,
    },
    groups,
  };
}

type LooseDb = {
  from(table: string): {
    select(cols?: string): {
      eq(
        col: string,
        val: unknown,
      ): {
        maybeSingle(): Promise<{ data: Record<string, unknown> | null; error: Err | null }>;
      };
    };
    upsert(
      rows: unknown,
      opts?: { onConflict?: string },
    ): {
      select(cols?: string): {
        single(): Promise<{ data: Record<string, unknown> | null; error: Err | null }>;
      };
    };
  };
};

export async function publishTechSheetToCatalog(
  doc: TechSheetData,
  overrides?: {
    code?: string;
    name?: string;
    family?: string;
    minQty?: number;
    autoValidate?: boolean;
  },
): Promise<{
  productId?: string;
  code?: string;
  optionsSynced?: number;
  error?: string;
}> {
  const plan = buildCatalogPublicationPlan(doc, overrides);
  const db = supabase as unknown as LooseDb;

  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id ?? null;

  const statusFields =
    overrides?.autoValidate === true
      ? {
          status: "validado",
          validated_by: uid,
          validated_at: new Date().toISOString(),
        }
      : {};

  const prodRes = await db
    .from("catalog_products")
    .upsert(
      {
        ...plan.product,
        ...statusFields,
      },
      { onConflict: "code" },
    )
    .select("*")
    .single();

  if (prodRes.error || !prodRes.data) {
    const msg = isMissingTable(prodRes.error)
      ? MIGRATION_HINT
      : (prodRes.error?.message ?? "Falha ao publicar produto no catálogo.");
    return { error: msg };
  }

  const productId = String(prodRes.data.id);
  let optionsSynced = 0;

  for (const grp of plan.groups) {
    const grpRes = await db
      .from("catalog_option_groups")
      .upsert(
        {
          product_id: productId,
          code: grp.code,
          name: grp.name,
          selection: grp.selection,
          required: grp.required,
          sort: grp.sort,
        },
        { onConflict: "product_id,code" },
      )
      .select("*")
      .single();

    if (grpRes.error || !grpRes.data) {
      return {
        productId,
        code: plan.product.code,
        optionsSynced,
        error: grpRes.error?.message ?? `Falha ao sincronizar grupo ${grp.name}.`,
      };
    }

    const groupId = String(grpRes.data.id);
    for (const opt of grp.options) {
      const optRes = await db
        .from("catalog_options")
        .upsert(
          {
            group_id: groupId,
            code: opt.code,
            name: opt.name,
            sector: opt.sector,
            operation_name: opt.operation_name,
            driver: opt.driver,
            unit_cost: opt.unit_cost,
            setup_cost: opt.setup_cost,
            minutes: opt.minutes,
            outsourced: opt.outsourced,
            material_consumption: opt.material_consumption,
            requires_spec: opt.requires_spec,
            price_delta: opt.price_delta,
            active: true,
          },
          { onConflict: "group_id,code" },
        )
        .select("*")
        .single();

      if (optRes.error) {
        return {
          productId,
          code: plan.product.code,
          optionsSynced,
          error: optRes.error.message,
        };
      }
      optionsSynced += 1;
    }
  }

  return {
    productId,
    code: plan.product.code,
    optionsSynced,
  };
}
