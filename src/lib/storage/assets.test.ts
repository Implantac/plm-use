import { describe, expect, it } from "vitest";
import { MAX_ASSET_BYTES, sanitizeAssetFolder, validateAssetFile } from "./assets";

const ok = (over: Partial<{ name: string; size: number; type: string }> = {}) =>
  ({ name: "foto.png", size: 1024, type: "image/png", ...over }) as File;

describe("validateAssetFile", () => {
  it("aceita os formatos conhecidos com extensão coerente", () => {
    expect(validateAssetFile(ok())).toBeNull();
    expect(validateAssetFile(ok({ name: "a.jpg", type: "image/jpeg" }))).toBeNull();
    expect(validateAssetFile(ok({ name: "a.jpeg", type: "image/jpeg" }))).toBeNull();
    expect(validateAssetFile(ok({ name: "doc.pdf", type: "application/pdf" }))).toBeNull();
  });

  it("rejeita tamanho: vazio e acima de 15 MB", () => {
    expect(validateAssetFile(ok({ size: 0 }))).toMatch(/vazio/);
    expect(validateAssetFile(ok({ size: MAX_ASSET_BYTES + 1 }))).toMatch(/15 MB/);
    expect(validateAssetFile(ok({ size: MAX_ASSET_BYTES }))).toBeNull();
  });

  it("rejeita MIME fora da allowlist (script disfarçado)", () => {
    expect(validateAssetFile(ok({ type: "image/svg+xml" }))).toMatch(/não suportado/);
    expect(validateAssetFile(ok({ type: "text/html" }))).toMatch(/não suportado/);
  });

  it("dupla extensão não muda o tipo servido: vale a última + MIME", () => {
    // é aceito, e seguro: o storage nomeia pela última extensão e serve image/png
    expect(validateAssetFile(ok({ name: "shell.php.png", type: "image/png" }))).toBeNull();
    expect(validateAssetFile(ok({ name: "shell.png.php", type: "text/plain" }))).toMatch(
      /não suportado/,
    );
    expect(validateAssetFile(ok({ name: "shell.png.php", type: "image/png" }))).toMatch(
      /extensão/i,
    );
  });

  it("rejeita extensão inconsistente com o conteúdo declarado", () => {
    expect(validateAssetFile(ok({ name: "evil.exe", type: "image/png" }))).toMatch(/extensão/i);
    expect(validateAssetFile(ok({ name: "noext", type: "image/png" }))).toMatch(/extensão/i);
  });
});

describe("sanitizeAssetFolder", () => {
  it("passa nomes simples e derruba traversal/chars estranhos", () => {
    expect(sanitizeAssetFolder("uploads")).toBe("uploads");
    expect(sanitizeAssetFolder("tech-sheets-v2")).toBe("tech-sheets-v2");
    expect(sanitizeAssetFolder("../../etc")).toBe("uploads");
    expect(sanitizeAssetFolder("A B")).toBe("uploads");
    expect(sanitizeAssetFolder("".padEnd(50, "x"))).toBe("uploads");
  });
});
