// O contrato anti-deriva da navegação (Sprint 1): a sidebar passou a SER a
// ROUTE_REGISTRY — e estes testes garantem que as duas não voltem a divergir
// (o bug histórico era navSections hardcoded com 28 de 34+ caminhos).
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { NAV_GROUPS, ROUTE_REGISTRY, findRouteMeta } from "./routes";
import { NAV_ICON_COMPONENTS } from "./icons";

const tree = readFileSync(new URL("../../routeTree.gen.ts", import.meta.url), "utf8");
// Só a interface FileRoutesByFullPath: o arquivo repete os caminhos em outras
// estruturas (FileRoutesByPath usa ids prefixados) e um slice solto contaria 3x.
const byFullStart = tree.indexOf("interface FileRoutesByFullPath {");
const byFullBlock = tree.slice(byFullStart, tree.indexOf("\n}", byFullStart));
const fullPaths = new Set([...byFullBlock.matchAll(/^\s*'([^']+)':\s*typeof/gm)].map((m) => m[1]));

// Rotas que existem por decisão, sem entrada própria na sidebar:
//  - /collections/compare é view do catálogo de coleções (botão na própria tela);
//  - /production/today é a aba "Hoje" do PCP (deep link, não item de menu).
const DELIBERATE_SUBVIEWS = new Set(["/collections/compare", "/production/today"]);

// Rotas sem group de sidebar (públicas/infra).
const NON_NAV_ROUTES = new Set(["/", "/login", "/reset-password", "/sitemap.xml", "/index"]);

describe("registry ↔ filesystem ↔ routeTree", () => {
  it("toda rota autenticada do disco está na registry (ou é subview declarada)", () => {
    const unaccounted = [...fullPaths].filter(
      (p) =>
        !ROUTE_REGISTRY.some((r) => r.path === p) &&
        !DELIBERATE_SUBVIEWS.has(p) &&
        !NON_NAV_ROUTES.has(p) &&
        !p.startsWith("/api/"), // server fns (cron/health/generate-image) não são navegação
    );
    expect(unaccounted).toEqual([]);
  });

  it("toda entrada da registry resolve numa rota real do tree", () => {
    for (const r of ROUTE_REGISTRY) expect(fullPaths.has(r.path)).toBe(true);
  });

  it("cada entrada tem arquivo de rota correspondente", () => {
    for (const r of ROUTE_REGISTRY) {
      const file = `routes/_authenticated${r.path.replaceAll("/", ".")}.tsx`;
      // /admin/users vive em _authenticated.admin.users.tsx — mesmo padrão.
      // Se faltar arquivo, é drift entre registry e fs.
      expect(existsSync(new URL(`../../${file}`, import.meta.url)), `faltando ${file}`).toBe(true);
    }
  });

  it("/audit não voltou para a superfície pública", () => {
    expect(existsSync(new URL("../../routes/audit.tsx", import.meta.url))).toBe(false);
    expect(existsSync(new URL("../../routes/_authenticated.audit.tsx", import.meta.url))).toBe(
      true,
    );
  });
});

describe("integridade da registry", () => {
  it("sem paths duplicados e todos absolutos", () => {
    const paths = ROUTE_REGISTRY.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const p of paths) expect(p.startsWith("/")).toBe(true);
  });

  it("toda entrada tem label, group válido e ícone mapeado", () => {
    for (const r of ROUTE_REGISTRY) {
      expect(r.label.length, r.path).toBeGreaterThan(0);
      expect(NAV_GROUPS[r.group], `group inválido em ${r.path}`).toBeDefined();
      expect(NAV_ICON_COMPONENTS[r.icon], `ícone faltando em ${r.path}`).toBeDefined();
    }
  });

  it("nenhum grupo dos títulos fica vazio na sidebar", () => {
    for (const g of Object.keys(NAV_GROUPS)) {
      expect(
        ROUTE_REGISTRY.some((r) => r.group === g),
        `grupo vazio: ${g}`,
      ).toBe(true);
    }
  });

  it("o mapa de ícones cobre a union NavIcon inteira", () => {
    expect(Object.keys(NAV_ICON_COMPONENTS).length).toBeGreaterThanOrEqual(30);
  });
});

describe("findRouteMeta (usado por breadcrumb/palette)", () => {
  it("match exato vence prefixo", () => {
    expect(findRouteMeta("/collections")?.path).toBe("/collections");
  });
  it("prefixo mais longo: subview herda o grupo do pai", () => {
    expect(findRouteMeta("/collections/compare")?.path).toBe("/collections");
    expect(findRouteMeta("/production/today")?.path).toBe("/production");
  });
  it("rota fora do mundo conhecido → undefined", () => {
    expect(findRouteMeta("/nao-existe")).toBeUndefined();
  });
});
