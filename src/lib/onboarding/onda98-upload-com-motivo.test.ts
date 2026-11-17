import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Onda 98 — upload de imagem/arquivo nunca falha em silêncio: `uploadAsset` e
// `uploadGeneratedImage` devolvem `{ path }` ou `{ path: null, reason }`; a
// validação local (15 MB, formato) chega ao usuário em vez de ficar no console.
const estado = { user: { id: "u1" } as { id: string } | null, uploadError: null as unknown };
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: estado.user } }) },
    storage: {
      from: () => ({
        upload: async () => ({ error: estado.uploadError }),
      }),
    },
  },
}));

const raiz = join(__dirname, "..", "..");

describe("Onda 98 — upload com motivo", () => {
  beforeEach(() => {
    estado.user = { id: "u1" };
    estado.uploadError = null;
  });

  it("uploadAsset: arquivo inválido devolve o motivo com o nome do arquivo", async () => {
    const { uploadAsset } = await import("@/lib/storage/assets");
    const grande = new File([new Uint8Array(16 * 1024 * 1024)], "foto.png", { type: "image/png" });
    const r = await uploadAsset(grande, "moodboard");
    expect(r.path).toBeNull();
    expect(r.reason).toBe("Não foi possível enviar foto.png: Arquivo excede 15 MB.");
    const exe = new File([new Uint8Array(10)], "virus.exe", { type: "application/octet-stream" });
    expect((await uploadAsset(exe)).reason).toMatch(/Formato não suportado/);
  });

  it("uploadAsset: erro do storage traduzido; sucesso devolve path", async () => {
    const { uploadAsset } = await import("@/lib/storage/assets");
    const ok = new File([new Uint8Array(10)], "ref.jpg", { type: "image/jpeg" });
    estado.uploadError = { message: "new row violates row-level security policy", status: 403 };
    const r = await uploadAsset(ok, "moodboard");
    expect(r.reason).toMatch(/^Não foi possível enviar ref\.jpg: sua sessão não tem permissão/);
    estado.uploadError = null;
    expect((await uploadAsset(ok, "moodboard")).path).toMatch(/^moodboard\/u1\/.*\.jpg$/);
  });

  it("uploadGeneratedImage: sem sessão, formato inesperado e erro do storage têm motivo", async () => {
    const { uploadGeneratedImage } = await import("@/lib/storage/assets");
    const png = "data:image/png;base64," + btoa("x");
    estado.user = null;
    expect((await uploadGeneratedImage(png)).reason).toMatch(/sessão expirou ou é inválida/);
    estado.user = { id: "u1" };
    expect((await uploadGeneratedImage("data:image/jpeg;base64,AA==")).reason).toMatch(/não PNG/);
    estado.uploadError = { message: "Payload too large", status: 413 };
    expect((await uploadGeneratedImage(png)).reason).toMatch(
      /^Não foi possível salvar a imagem no armazenamento: Payload too large$/,
    );
    estado.uploadError = null;
    expect((await uploadGeneratedImage(png)).path).toMatch(/^u1\/ai-product-studio\//);
  });

  it("telas mostram o motivo (ProductStudio, GarmentSketchStudio, MoodBoard)", () => {
    const ler = (p: string) => readFileSync(join(raiz, p), "utf8");
    expect(ler("components/ai/ProductStudio.tsx")).toMatch(
      /Visual gerado, mas não salvo\. \$\{upload\.reason\}/,
    );
    expect(ler("components/techsheet/GarmentSketchStudio.tsx")).toMatch(
      /não salva na ficha\. \$\{upload\.reason\}/,
    );
    const mb = ler("components/research/MoodBoard.tsx");
    expect(mb).toMatch(/toast\.error\(upload\.reason\)/);
    expect(mb).not.toMatch(/"Falha no upload"/);
    expect(ler("lib/storage/assets.ts")).not.toMatch(/console\.error/);
  });
});
