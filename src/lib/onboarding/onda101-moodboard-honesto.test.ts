// Onda 101 — 94ª medição. Mood board (/research): três silêncios/mentiras.
// (1) listar/assinar imagens salvas falhava sem aviso — "minha foto sumiu";
// (2) upload OK mas link de exibição falhou → nada na tela, nenhum toast;
// (3) "Adicionar" por URL dizia "Referência fixada no Mood Board" sem gravar
// nada (some ao recarregar). E `OptimizedImage` dizia "Imagem indisponível"
// sem o porquê. `signedUrl`/`signedUrls` passam a devolver `reason`.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const estado = { error: null as unknown, url: "https://x/signed" as string | null };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
    storage: {
      from: () => ({
        createSignedUrl: async () => ({
          data: estado.url ? { signedUrl: estado.url } : null,
          error: estado.error,
        }),
        createSignedUrls: async () => ({
          data: estado.url ? [{ signedUrl: estado.url }] : null,
          error: estado.error,
        }),
      }),
    },
  },
}));
const raiz = join(__dirname, "..", "..");
const ler = (p: string) => readFileSync(join(raiz, p), "utf8");

describe("Onda 101 — mood board honesto", () => {
  beforeEach(() => {
    estado.error = null;
    estado.url = "https://x/signed";
  });

  it("signedUrl/signedUrls devolvem motivo traduzido em vez de null/[]", async () => {
    const { signedUrl, signedUrls } = await import("@/lib/storage/assets");
    expect(await signedUrl("a/b.png")).toEqual({ url: "https://x/signed", reason: null });
    expect(await signedUrls(["a/b.png"])).toEqual({ urls: ["https://x/signed"], reason: null });
    estado.error = { message: "Object not found", status: 404 };
    estado.url = null;
    expect((await signedUrl("a/b.png")).reason).toMatch(/^Não foi possível carregar a imagem: /);
    expect((await signedUrls(["a/b.png"])).reason).toMatch(
      /^Não foi possível carregar as imagens salvas: /,
    );
    expect(await signedUrls([])).toEqual({ urls: [], reason: null });
  });

  it("MoodBoard: listagem com motivo, upload sem link avisa, URL não mente", () => {
    const mb = ler("components/research/MoodBoard.tsx");
    expect(mb).toContain(
      'descreverErroSupabase(error, "carregar as imagens salvas do mood board")',
    );
    expect(mb).toContain("Imagem salva, mas não foi possível exibi-la agora:");
    expect(mb).not.toContain("Referência fixada no Mood Board");
    expect(mb).toContain("Referência adicionada só nesta sessão");
    expect(mb).not.toMatch(/const \{ data \} = await supabase\.storage/);
  });

  it("OptimizedImage: 'Imagem indisponível' traz o porquê", () => {
    const s = ler("components/OptimizedImage.tsx");
    expect(s).toContain("`Imagem indisponível: ${motivo}`");
    expect(s).toContain("setMotivo(reason)");
  });

  it("assets.ts não devolve null cru em nenhuma função de storage", () => {
    expect(ler("lib/storage/assets.ts")).not.toMatch(
      /if \((?:error|!data)[^)]*\) return (?:null|\[\]);/,
    );
  });
});
