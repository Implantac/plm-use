import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Onda 114 — no celular, diálogo alto rola (botão principal alcançável) e campos não disparam zoom.
const read = (p: string) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");

describe("onda114: diálogos em viewport móvel", () => {
  it("DialogContent limita a altura à tela e rola", () => {
    expect(read("components/ui/dialog.tsx")).toContain("max-h-[calc(100dvh-1rem)] overflow-y-auto");
  });

  it("campos têm 16px em telas de toque (sem zoom do iOS)", () => {
    const css = read("styles.css");
    expect(css).toMatch(/@media \(max-width: 767px\) and \(pointer: coarse\)/);
    expect(css).toMatch(/font-size: max\(16px, 1em\)/);
  });
});
