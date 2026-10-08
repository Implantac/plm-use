import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldMessage } from "@/components/ui/field-message";
import { toast } from "sonner";
import { KeyRound, Mail } from "lucide-react";
import { validateEmailForm, validatePasswordForm } from "@/lib/auth-form";

// Recuperação de senha.
//
// Fluxo (PKCE do Supabase): o e-mail traz um link `…/reset-password?code=…`;
// o supabase-js troca o code por sessão automaticamente (detectSessionInUrl)
// e emite PASSWORD_RECOVERY. A partir daí pedimos a senha nova e chamamos
// updateUser. Quem chegar aqui sem link (navegação direta) recebe o formulário
// para (re)enviar o e-mail.
//
// Deploy: adicionar `${SITE_URL}/reset-password` ao Redirect URLs permitido e
// conferir o template "Recovery" no painel de Auth do Supabase.
export const Route = createFileRoute("/reset-password")({
  ssr: false, // consome ?code= no location — client-only por natureza
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [recovery, setRecovery] = useState(false);
  const [booting, setBooting] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // SÓ um link de recuperação autoriza trocar senha. O sinal é o evento
    // PASSWORD_RECOVERY (emitido quando o supabase-js troca o ?code= da rota).
    // Ter sessão válida NÃO basta — um usuário logado visitando a página por
    // conta própria não pode ganhar um formulário de troca de senha.
    const hasCodeParam = new URLSearchParams(window.location.search).has("code");
    let alive = true;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" && alive) {
        setRecovery(true);
        setBooting(false);
      }
    });
    // Se a troca do code terminou antes de montarmos (evento perdido),
    // `?code=` ainda está na URL: aguarda 1,5s pelo exchange e reconsulta.
    if (!hasCodeParam) {
      setBooting(false);
      return () => {
        alive = false;
        sub.subscription.unsubscribe();
      };
    }
    const t = setTimeout(async () => {
      if (!alive) return;
      setBooting(false);
    }, 1500);
    return () => {
      alive = false;
      clearTimeout(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  const focusField = (id: string) => {
    requestAnimationFrame(() => {
      (document.getElementById(id) as HTMLElement | null)?.focus();
    });
  };

  async function handleRequestLink(e: React.FormEvent) {
    e.preventDefault();
    const next = validateEmailForm(email);
    if (Object.keys(next).length) {
      setErrors(next);
      focusField("email");
      return;
    }
    setLoading(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    setLoading(false);
    if (error) {
      setErrors({ form: "Não foi possível enviar o link. Tente novamente." });
      focusField("email");
      return;
    }
    setErrors({});
    toast.success("Se o e-mail existir, o link de recuperação foi enviado.");
  }

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    const next = validatePasswordForm({ password, confirm });
    if (Object.keys(next).length) {
      setErrors(next);
      focusField(next.password ? "password" : "confirm");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      setErrors({ form: "A senha não foi aceita. Tente outra mais forte." });
      return;
    }
    toast.success("Senha atualizada. Bem-vindo de volta.");
    navigate({ to: "/dashboard" });
  }

  if (booting) {
    return (
      <div className="min-h-dvh grid place-items-center text-sm text-muted-foreground">
        Verificando o link de recuperação…
      </div>
    );
  }

  return (
    <div className="min-h-dvh grid place-items-center p-6">
      <div className="w-full max-w-md p-8 rounded-lg border border-border bg-surface-elevated space-y-6 glass-card">
        <div className="text-center space-y-2">
          <div className="mx-auto h-11 w-11 grid place-items-center rounded-md bg-primary/10">
            {recovery ? (
              <KeyRound className="h-5 w-5 text-primary" aria-hidden />
            ) : (
              <Mail className="h-5 w-5 text-primary" aria-hidden />
            )}
          </div>
          <h1 className="text-xl font-semibold">
            {recovery ? "Definir nova senha" : "Recuperar acesso"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {recovery
              ? "Escolha uma senha nova para a sua conta."
              : "Informe seu e-mail corporativo e enviaremos um link de recuperação."}
          </p>
        </div>

        {recovery ? (
          <form className="space-y-5" onSubmit={handleUpdatePassword} noValidate>
            <div className="space-y-3">
              <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
                Nova senha
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="mínimo de 8 caracteres"
                className="h-12 px-4 text-sm"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
              />
              {errors.password && (
                <FieldMessage id="password-error" variant="error">
                  {errors.password}
                </FieldMessage>
              )}
            </div>
            <div className="space-y-3">
              <Label htmlFor="confirm" className="text-xs font-medium text-muted-foreground">
                Repita a nova senha
              </Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                aria-invalid={!!errors.confirm}
                aria-describedby={errors.confirm ? "confirm-error" : undefined}
              />
              {errors.confirm && (
                <FieldMessage id="confirm-error" variant="error">
                  {errors.confirm}
                </FieldMessage>
              )}
            </div>

            {errors.form && <FieldMessage variant="error">{errors.form}</FieldMessage>}

            <Button
              type="submit"
              aria-busy={loading}
              className="w-full h-11 text-sm font-semibold tracking-normal bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-sm hover:shadow-md"
            >
              {loading ? "Salvando..." : "Salvar nova senha"}
            </Button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={handleRequestLink} noValidate>
            <div className="space-y-3">
              <Label htmlFor="email" className="text-xs font-medium text-muted-foreground">
                E-mail Corporativo
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="h-12 px-4 text-sm"
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "email-error" : undefined}
                autoComplete="email"
              />
              {errors.email && (
                <FieldMessage id="email-error" variant="error">
                  {errors.email}
                </FieldMessage>
              )}
            </div>

            {errors.form && <FieldMessage variant="error">{errors.form}</FieldMessage>}

            <Button
              type="submit"
              aria-busy={loading}
              className="w-full h-11 text-sm font-semibold tracking-normal bg-primary hover:bg-primary/90 text-primary-foreground border-none shadow-sm hover:shadow-md"
            >
              {loading ? "Enviando..." : "Enviar link de recuperação"}
            </Button>
            <p className="text-xs text-center">
              <button
                type="button"
                className="text-primary hover:underline cursor-pointer"
                onClick={() => navigate({ to: "/login" })}
              >
                Voltar para o login
              </button>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
