// Onda 81 — 75ª medição. Falha de gravação no Supabase precisa dizer o
// porquê (permissão, sessão expirada, duplicidade…), derivado do erro real.
// Na Onda 79, em produção, a criação de referência falhou com
// "Falha ao criar referência" sem motivo. Regra: controle que falha explica
// o porquê; o motivo nunca é inventado.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { descreverErroSupabase } from "@/lib/supabase/erro-humano";

const ler = (p: string) => readFileSync(resolve(__dirname, "../../..", p), "utf-8");

describe("Onda 81 — falha de gravação explica o porquê", () => {
  it("42501 / 401 / RLS → permissão; PGRST301 → sessão; 23505 → duplicidade", () => {
    expect(descreverErroSupabase({ code: "42501" }, "criar a referência")).toMatch(/permissão/);
    expect(descreverErroSupabase({ status: 401 }, "x")).toMatch(/permissão/);
    expect(
      descreverErroSupabase({ message: "new row violates row-level security policy" }, "x"),
    ).toMatch(/permissão/);
    expect(descreverErroSupabase({ code: "PGRST301", message: "JWT expired" }, "x")).toMatch(
      /expirou/,
    );
    expect(descreverErroSupabase({ code: "23505" }, "x")).toMatch(/já existe/);
    expect(descreverErroSupabase({ message: "TypeError: Failed to fetch" }, "x")).toMatch(
      /conexão/,
    );
  });

  it("código desconhecido repassa a mensagem original, nunca esconde", () => {
    expect(
      descreverErroSupabase({ code: "XX000", message: "coluna foo não existe" }, "salvar"),
    ).toBe("Não foi possível salvar: coluna foo não existe");
  });

  it("useReferences.create usa o motivo real e os chamadores não repetem toast genérico", () => {
    const hook = ler("src/hooks/use-references.ts");
    expect(hook).toContain('descreverErroSupabase(error, "criar a referência")');
    const dialog = ler("src/components/references/NovaReferenciaDialog.tsx");
    expect(dialog).not.toContain('toast.error("Falha ao criar referência")');
    const studio = ler("src/components/ai/ProductStudio.tsx");
    expect(studio).not.toContain(
      'toast.error("Não foi possível salvar o rascunho da referência.")',
    );
  });
});
