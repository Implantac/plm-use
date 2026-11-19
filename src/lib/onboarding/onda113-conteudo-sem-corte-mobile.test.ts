import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 113 — em 390px nenhum conteúdo fica cortado: o viewport do ScrollArea não cresce
// até o filho mais largo; abas e tabelas largas rolam em vez de estourar.
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("onda113: conteúdo sem corte em viewport estreito", () => {
  it("filho do viewport do ScrollArea é bloco (não display:table)", () => {
    expect(read("components/ui/scroll-area.tsx")).toContain("[&>div]:!block [&>div]:min-w-0");
  });

  it("TabsList rola horizontalmente quando não cabe", () => {
    expect(read("components/ui/tabs.tsx")).toMatch(/max-w-full .*overflow-x-auto/);
  });

  it("tabelas e grades largas ganharam rolagem/colunas responsivas", () => {
    expect(read("routes/_authenticated.quality.tsx")).toMatch(
      /rounded-lg border border-border\/60 overflow-x-auto">\s*<table/,
    );
    expect(read("routes/_authenticated.production.tsx")).toContain(
      "inline-flex max-w-full overflow-x-auto rounded-full",
    );
    expect(read("routes/_authenticated.prints.tsx")).toContain(
      "grid grid-cols-1 gap-3 content-start sm:grid-cols-2",
    );
    expect(read("routes/_authenticated.suppliers.tsx")).toContain(
      "flex flex-wrap justify-between items-start gap-2 mb-4",
    );
  });
});
