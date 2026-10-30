// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ImageLightbox } from "./image-lightbox";

describe("ImageLightbox", () => {
  const sampleItems = [
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
      alt: "Camiseta Dry Pro frente",
      title: "Camiseta Dry Pro · frente",
      subtitle: "1024×1536 · PNG transparente",
    },
    {
      src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=",
      alt: "Camiseta Dry Pro costas",
      title: "Camiseta Dry Pro · costas",
      subtitle: "1024×1536 · PNG transparente",
    },
  ];

  it("abre em tela cheia, aplica zoom e navega entre imagens geradas", () => {
    const onOpenChange = vi.fn();
    render(<ImageLightbox open onOpenChange={onOpenChange} items={sampleItems} initialIndex={0} />);

    expect(screen.getByText("Camiseta Dry Pro · frente")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Aumentar zoom"));
    expect(screen.getByText("150%")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Próxima imagem"));
    expect(screen.getByText("Camiseta Dry Pro · costas")).toBeTruthy();
    expect(screen.getByText("100%")).toBeTruthy();

    fireEvent.click(screen.getByLabelText("Fechar visualização em tela cheia"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
