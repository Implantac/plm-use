import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { motivoDe } from "@/lib/supabase/erro-humano";

// Onda 92 — zero `toast.error/warning(<erro>.message)` cru em src: toda falha
// passa por `descreverErroSupabase(erro, acao)` (sessão, RLS, rede e códigos
// do banco traduzidos; o resto sai com a ação na frente, nunca escondido).
function listar(dir: string, acc: string[] = []): string[] {
  for (const nome of readdirSync(dir)) {
    const p = join(dir, nome);
    if (statSync(p).isDirectory()) listar(p, acc);
    else if (/\.(ts|tsx)$/.test(nome) && !/\.test\.tsx?$/.test(nome)) acc.push(p);
  }
  return acc;
}
const raiz = join(__dirname, "..", "..");

describe("Onda 92 — toasts crus zerados", () => {
  it("nenhum toast.error/warning com .message fora de descreverErroSupabase", () => {
    const ofensores: string[] = [];
    for (const p of listar(raiz)) {
      const src = readFileSync(p, "utf8");
      const re = /toast\.(error|warning)\(([^;]*?)\)\s*;?/gs;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src))) {
        const arg = m[2]!;
        if (/\.message\b/.test(arg) && !/descreverErroSupabase\(/.test(arg)) {
          ofensores.push(`${p.slice(raiz.length + 1)}: ${arg.slice(0, 80)}`);
        }
      }
    }
    expect(ofensores).toEqual([]);
  });

  it("os 21 pontos da Onda 92 citam a ação", () => {
    const esperados: Array<[string, string]> = [
      ["routes/_authenticated.prints.tsx", "gerar a variante IA"],
      ["routes/_authenticated.supplier-portal.tsx", "cadastrar o fornecedor"],
      ["routes/_authenticated.supplier-portal.tsx", "registrar a decisão da amostra"],
      ["routes/_authenticated.official-models.tsx", "salvar o modelo oficial"],
      ["routes/_authenticated.digital-twin.tsx", "renderizar o Gêmeo IA"],
      ["routes/_authenticated.looks.tsx", "renderizar o look"],
      ["components/research/AiCroquiPanel.tsx", "gerar o croqui"],
      ["components/pcp/op/OpMaterialsTab.tsx", "ler as reservas da OP"],
      ["components/pcp/op/NovaOpDialog.tsx", "criar a OP"],
      ["components/pcp/op/OpWorkspace.tsx", "registrar a passagem"],
      ["components/ai/ProductStudio.tsx", "aplicar a arte"],
      ["components/comments/CommentsPanel.tsx", "enviar o comentário"],
      ["components/techsheet/GarmentSketchStudio.tsx", "renderizar a foto realista"],
      ["components/export/ImageExportMenu.tsx", "exportar a imagem"],
    ];
    for (const [p, acao] of esperados) {
      const src = readFileSync(join(raiz, p), "utf8");
      expect({ p, acao, ok: src.includes(`"${acao}"`) }).toEqual({ p, acao, ok: true });
    }
  });

  it("motivoDe nunca vira [object Object] (prova da 92ª: mutation lança objeto PostgREST)", () => {
    expect(
      motivoDe({ code: "42501", message: "permission denied" }, "cadastrar o fornecedor"),
    ).toMatch(/sua sessão não tem permissão/);
    expect(motivoDe({ message: "Unauthorized: Invalid token" }, "x")).toMatch(/sessão expirou/);
    expect(motivoDe(new Error("Failed to fetch"), "x")).toMatch(/sem conexão/);
    expect(motivoDe({ foo: 1 }, "exportar a imagem")).toBe("Não foi possível exportar a imagem.");
    expect(motivoDe("boom", "x")).toBe("Não foi possível x: boom");
    expect(motivoDe(undefined, "x")).toBe("Não foi possível x.");
    for (const v of [{ foo: 1 }, {}, null, 3]) expect(motivoDe(v, "x")).not.toContain("[object");
  });
});
