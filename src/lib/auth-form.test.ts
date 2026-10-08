import { describe, it, expect } from "vitest";
import {
  validatePasswordForm,
  validateEmailForm,
  isValidEmail,
  MIN_PASSWORD_LENGTH,
} from "./auth-form";

describe("validatePasswordForm", () => {
  it("aceita senha forte com confirmação igual", () => {
    expect(
      validatePasswordForm({ password: "senha-forte-123", confirm: "senha-forte-123" }),
    ).toEqual({});
  });

  it("exige senha não vazia", () => {
    expect(validatePasswordForm({ password: "", confirm: "" }).password).toMatch(/Informe/);
  });

  it("rejeita senha abaixo do mínimo", () => {
    const short = "a".repeat(MIN_PASSWORD_LENGTH - 1);
    expect(validatePasswordForm({ password: short, confirm: short }).password).toMatch(
      /ao menos 8/,
    );
  });

  it("rejeita senha com espaços", () => {
    expect(
      validatePasswordForm({ password: "tem espaco 123", confirm: "tem espaco 123" }).password,
    ).toMatch(/espaços/);
  });

  it("rejeita confirmação divergente", () => {
    expect(
      validatePasswordForm({ password: "senha-forte-123", confirm: "outra-senha-123" }).confirm,
    ).toMatch(/não coincidem/);
  });
});

describe("validateEmailForm", () => {
  it("vazio → erro de e-mail corporativo", () => {
    expect(validateEmailForm("  ")).toEqual({ email: "Informe o e-mail corporativo." });
  });

  it("formato inválido → 'E-mail inválido.'", () => {
    expect(validateEmailForm("nao-e-email")).toEqual({ email: "E-mail inválido." });
  });

  it("válido → sem erros", () => {
    expect(validateEmailForm("ana@confecao.com.br")).toEqual({});
  });
});

describe("isValidEmail", () => {
  it("aceita domínio com subdomínio e TLD longo", () => {
    expect(isValidEmail("a.b@sub.confecacao.com.br")).toBe(true);
  });
  it("rejeita sem TLD", () => {
    expect(isValidEmail("a@b")).toBe(false);
  });
});
