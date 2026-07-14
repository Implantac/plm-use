// @vitest-environment jsdom
// Tests for automatic a11y wiring between Field, Label, FieldMessage,
// and the form controls (Input, Textarea, SelectTrigger).
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import { Field } from "@/components/ui/field";
import { FieldMessage } from "@/components/ui/field-message";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

function messageEl(text: string): HTMLElement {
  const node = screen.getByText(text).closest("p");
  if (!node) throw new Error(`no <p> ancestor for "${text}"`);
  return node as HTMLElement;
}

function expectWired(control: HTMLElement, label: HTMLElement, message: HTMLElement) {
  const id = control.getAttribute("id");
  const msgId = message.getAttribute("id");
  expect(id).toBeTruthy();
  expect(msgId).toBeTruthy();
  expect(label.getAttribute("for")).toBe(id);
  expect(control.getAttribute("aria-describedby")).toBe(msgId);
}

describe("Field a11y auto-wiring", () => {
  it("Input: links Label htmlFor and aria-describedby to FieldMessage", () => {
    render(
      <Field>
        <Label>Nome</Label>
        <Input placeholder="Nome" />
        <FieldMessage>Helper text</FieldMessage>
      </Field>,
    );
    expectWired(
      screen.getByPlaceholderText("Nome"),
      screen.getByText("Nome"),
      messageEl("Helper text"),
    );
  });

  it("Input: aria-invalid + label error variant when Field is invalid", () => {
    render(
      <Field invalid>
        <Label>Email</Label>
        <Input placeholder="Email" />
        <FieldMessage variant="error">Obrigatório</FieldMessage>
      </Field>,
    );
    const input = screen.getByPlaceholderText("Email");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Email").className).toMatch(/text-destructive/);
    expect(screen.getByRole("alert").textContent).toContain("Obrigatório");
  });

  it("Textarea: wired to Label and FieldMessage", () => {
    render(
      <Field>
        <Label>Observações</Label>
        <Textarea placeholder="Obs" />
        <FieldMessage>Opcional</FieldMessage>
      </Field>,
    );
    expectWired(
      screen.getByPlaceholderText("Obs"),
      screen.getByText("Observações"),
      messageEl("Opcional"),
    );
  });

  it("Textarea: honors explicit aria-invalid override", () => {
    render(
      <Field>
        <Textarea placeholder="X" aria-invalid />
      </Field>,
    );
    expect(screen.getByPlaceholderText("X").getAttribute("aria-invalid")).toBe("true");
  });

  it("SelectTrigger: id, htmlFor and aria-describedby are wired", () => {
    render(
      <Field invalid>
        <Label>Tipo</Label>
        <Select>
          <SelectTrigger aria-label="tipo-trigger">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="a">A</SelectItem>
          </SelectContent>
        </Select>
        <FieldMessage variant="error">Escolha um tipo</FieldMessage>
      </Field>,
    );
    const trigger = screen.getByLabelText("tipo-trigger");
    const label = screen.getByText("Tipo");
    const msg = messageEl("Escolha um tipo");
    expectWired(trigger, label, msg);
    expect(trigger.getAttribute("aria-invalid")).toBe("true");
  });

  it("explicit id/htmlFor/aria-describedby take precedence over Field defaults", () => {
    render(
      <Field>
        <Label htmlFor="custom-id">Custom</Label>
        <Input id="custom-id" aria-describedby="custom-msg" placeholder="C" />
        <FieldMessage id="custom-msg">Custom helper</FieldMessage>
      </Field>,
    );
    const input = screen.getByPlaceholderText("C");
    expect(input.id).toBe("custom-id");
    expect(input.getAttribute("aria-describedby")).toBe("custom-msg");
    expect(screen.getByText("Custom").getAttribute("for")).toBe("custom-id");
    expect(messageEl("Custom helper").id).toBe("custom-msg");
  });

  it("without Field, no auto ids are injected (backwards compatible)", () => {
    render(
      <>
        <Label htmlFor="raw">Raw</Label>
        <Input id="raw" placeholder="raw" />
      </>,
    );
    const input = screen.getByPlaceholderText("raw");
    expect(input.id).toBe("raw");
    expect(input.getAttribute("aria-describedby")).toBeNull();
    expect(input.getAttribute("aria-invalid")).toBeNull();
  });

  it("FieldMessage renders nothing when there is no children", () => {
    const { container } = render(
      <Field>
        <Input placeholder="x" />
        <FieldMessage>{null}</FieldMessage>
      </Field>,
    );
    expect(container.querySelectorAll("p").length).toBe(0);
  });
});
