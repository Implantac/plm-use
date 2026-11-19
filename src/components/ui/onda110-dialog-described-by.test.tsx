// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

// Onda 110 — diálogo sem Description não avisa no console; com Description mantém a associação.
describe("onda110: aria-describedby de Dialog/Sheet", () => {
  afterEach(() => vi.restoreAllMocks());

  it("sem Description: nenhum aviso do Radix e sem aria-describedby pendurado", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Novo material</DialogTitle>
        </DialogContent>
      </Dialog>,
    );
    const dlg = screen.getByRole("dialog", { name: "Novo material" });
    expect(dlg.getAttribute("aria-describedby")).toBeNull();
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/aria-describedby/);
  });

  it("com Description: dialog fica descrito pelo texto", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Excluir</DialogTitle>
          <DialogDescription>Esta ação não pode ser desfeita.</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const dlg = screen.getByRole("dialog", { name: "Excluir" });
    const id = dlg.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id!)?.textContent).toBe("Esta ação não pode ser desfeita.");
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/aria-describedby/);
  });

  it("Sheet sem Description também não avisa", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    render(
      <Sheet open>
        <SheetContent>
          <SheetTitle>Histórico</SheetTitle>
        </SheetContent>
      </Sheet>,
    );
    expect(screen.getByRole("dialog", { name: "Histórico" })).toBeTruthy();
    expect(warn.mock.calls.flat().join(" ")).not.toMatch(/aria-describedby/);
  });
});
