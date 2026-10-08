// Validação compartilhada dos formulários de acesso (login / cadastro /
// recuperação de senha). Vive fora dos componentes para ser testável no
// Vitest — a suíte E2E de a11y cobre o wiring de aria/foco; aqui cobrimos a
// regra em si, que é o que muda quando o requisito de senha evolui.

export const MIN_PASSWORD_LENGTH = 8;

export type PasswordFormValues = {
  password: string;
  confirm: string;
};

export type PasswordFormErrors = Partial<Record<keyof PasswordFormValues, string>>;

export function validatePasswordForm(values: PasswordFormValues): PasswordFormErrors {
  const errors: PasswordFormErrors = {};
  if (!values.password) {
    errors.password = "Informe a nova senha.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres.`;
  } else if (/\s/.test(values.password)) {
    errors.password = "A senha não pode conter espaços.";
  }
  if (!values.confirm) {
    errors.confirm = "Repita a nova senha.";
  } else if (values.confirm !== values.password) {
    errors.confirm = "As senhas não coincidem.";
  }
  return errors;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type EmailFormErrors = { email?: string; form?: string };

export function validateEmailForm(email: string): EmailFormErrors {
  if (!email.trim()) return { email: "Informe o e-mail corporativo." };
  if (!isValidEmail(email)) return { email: "E-mail inválido." };
  return {};
}
