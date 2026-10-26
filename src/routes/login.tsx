import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldMessage } from "@/components/ui/field-message";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Fingerprint, KeyRound, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/login")({
  ssr: false, // tela client-only (framer-motion + supabase.auth), evita hydration mismatch
  component: Login,
});

// Self-cadastro é desligado por padrão ("Acesso exclusivo para empresas
// parceiras" — cadastro aberto só polui a base com usuários sem papel).
// Para habilitar (ex.: ambiente local), defina VITE_ALLOW_SELF_SIGNUP="true".
// A porta real de produção continua sendo o toggle "Allow new sign ups" do
// painel de Auth do Supabase — a flag aqui só esconde a UI (README, Deploy).
const SELF_SIGNUP_ENABLED = import.meta.env.VITE_ALLOW_SELF_SIGNUP === "true";

// Erro de servidor nao e erro de senha. Um 502 do gateway local chega pelo
// supabase-js como AuthRetryableFetchError/"Failed to fetch" (corpo HTML nao
// parseia) e o usuario lia "Acesso negado" — escondendo que o backend estava
// fora. Classificamos para dizer a verdade com proximo passo acionavel.
type AuthErrorish = { message?: string; status?: number } | null | undefined;
function friendlyAuthError(err: AuthErrorish): string {
  if (!err) return "Erro inesperado ao contatar o servidor de autenticacao.";
  const msg = err.message ?? "";
  const status = typeof err.status === "number" ? err.status : undefined;
  if (status !== undefined && status >= 500) {
    return (
      "O servidor de autenticacao esta fora do ar (HTTP " +
      status +
      "). No ambiente local, rode deploy-local\\plm-corrigir-login.bat e tente de novo."
    );
  }
  if (
    status === undefined &&
    /failed to fetch|networkerror|load failed|timed out|timeout|could not be parsed|unexpected token|unexpected end of input|auth_retryable/i.test(
      msg,
    )
  ) {
    return "O servidor de autenticacao nao respondeu. No ambiente local, suba a stack com deploy-local\\plm-corrigir-login.bat (ou plm-local.bat) e tente de novo.";
  }
  if (status === 401 || /invalid login credentials/i.test(msg)) {
    return "E-mail ou senha incorretos.";
  }
  if (status === 429 || /rate limit|too many/i.test(msg)) {
    return "Muitas tentativas em sequencia. Aguarde um minuto e tente de novo.";
  }
  if (/email not confirmed/i.test(msg)) {
    return "Este e-mail ainda nao foi confirmado. No ambiente local o admin e autoconfirmado; para outros usuarios, pecione a confirmacao ou use o login com Google.";
  }
  return msg || "Acesso negado.";
}

function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    form?: string;
  }>({});

  useEffect(() => {
    if (!authLoading && isAuthenticated) navigate({ to: "/dashboard" });
  }, [authLoading, isAuthenticated, navigate]);

  const validate = () => {
    const next: typeof errors = {};
    if (mode === "signup" && !fullName.trim()) next.fullName = "Informe seu nome completo.";
    if (!email.trim()) next.email = "Informe o e-mail corporativo.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "E-mail inválido.";
    if (!password) next.password = "Informe a senha.";
    else if (password.length < 6) next.password = "A senha precisa ter ao menos 6 caracteres.";
    setErrors(next);
    const firstInvalid = ["fullName", "email", "password"].find(
      (k) => (next as Record<string, string | undefined>)[k],
    );
    if (firstInvalid) {
      requestAnimationFrame(() => {
        const el = document.getElementById(firstInvalid) as HTMLElement | null;
        el?.focus();
      });
    } else {
      // Todos os campos válidos: mover o foco para o primeiro elemento
      // acionável seguinte (submit) antes que o handler troque o
      // estado para "loading" e desabilite o botão. Foco síncrono
      // garante que o leitor de tela anuncie o próximo passo.
      const el = document.querySelector<HTMLElement>('form button[type="submit"]');
      el?.focus();
    }
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    if (!validate()) return;

    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setErrors({ form: friendlyAuthError(error as AuthErrorish) });
        return;
      }
      setErrors({});
      toast.success("Bem-vindo ao USE MODA PLM.");
      navigate({ to: "/dashboard" });
    } else {
      const redirectUrl = `${window.location.origin}/dashboard`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectUrl, data: { full_name: fullName } },
      });
      setLoading(false);
      if (error) {
        setErrors({ form: friendlyAuthError(error as AuthErrorish) });
        return;
      }
      setErrors({});
      toast.success("Conta criada! Verifique seu e-mail se a confirmação estiver ativa.");
    }
  };

  const handleGoogle = async () => {
    const { lovable } = await import("@/integrations/lovable");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (result?.error) toast.error(friendlyAuthError(result.error as AuthErrorish));
  };

  return (
    <div className="min-h-dvh grid grid-cols-1 lg:grid-cols-[1fr_480px] bg-background p-6 relative overflow-hidden">
      <div className="relative z-10 hidden lg:flex flex-col justify-between p-8">
        <img src="/assets/logo.png" alt="USE MODA" className="h-12 w-fit" />
        <div className="max-w-2xl space-y-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.03em] text-primary">
              Enterprise Access
            </p>
            <h1 className="mt-4 text-5xl font-semibold text-white">
              Acesse o cockpit PLM da sua operação.
            </h1>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
              Ambiente multiempresa com RBAC, MFA, SSO, OAuth, logs de auditoria e trilha completa
              de decisões.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: "RBAC avançado", icon: ShieldCheck },
              { label: "MFA obrigatório", icon: Fingerprint },
              { label: "SSO / OAuth", icon: KeyRound },
              { label: "Multiempresa", icon: Building2 },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-md border border-white/10 bg-white/[0.025] p-4"
              >
                <item.icon className="h-5 w-5 text-primary" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.06em] text-white">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          LGPD ready - auditoria ativa - backup automático
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 self-center justify-self-center w-full max-w-md p-8 rounded-lg border border-border bg-surface-elevated space-y-8 glass-card"
      >
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <img src="/assets/logo.png" alt="USE MODA" className="h-16 w-auto" />
          </div>
          <p className="text-muted-foreground text-xs font-medium mt-4">Acesso ao USE MODA PLM</p>
        </div>

        {SELF_SIGNUP_ENABLED ? (
          <div className="flex gap-1 p-1 rounded-md bg-white/5 border border-white/5">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded text-sm font-semibold transition-colors ${
                  mode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-white"
                }`}
              >
                {m === "signin" ? "Entrar" : "Criar conta"}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Precisa de acesso? Solicite ao administrador da sua empresa.
          </p>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="space-y-3">
              <Label htmlFor="fullName" className="text-xs font-medium text-muted-foreground">
                Nome completo
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                className="h-12 px-4 text-sm"
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? "fullName-error" : undefined}
                required
              />
              {errors.fullName && (
                <FieldMessage id="fullName-error" variant="error" className="ml-4">
                  {errors.fullName}
                </FieldMessage>
              )}
            </div>
          )}
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
              required
            />
            {errors.email && (
              <FieldMessage id="email-error" variant="error" className="ml-4">
                {errors.email}
              </FieldMessage>
            )}
          </div>
          <div className="space-y-3">
            <Label htmlFor="password" className="text-xs font-medium text-muted-foreground">
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="h-12 px-4"
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? "password-error" : undefined}
              required
            />
            {errors.password && (
              <FieldMessage id="password-error" variant="error" className="ml-4">
                {errors.password}
              </FieldMessage>
            )}
            {mode === "signin" && (
              <div className="flex justify-end">
                <Link
                  to="/reset-password"
                  className="text-xs text-primary hover:text-white transition-colors"
                >
                  Esqueci minha senha?
                </Link>
              </div>
            )}
          </div>

          {errors.form && (
            <FieldMessage variant="error" className="ml-4">
              {errors.form}
            </FieldMessage>
          )}

          <Button
            type="submit"
            aria-busy={loading}
            className="w-full h-11 text-sm font-semibold tracking-normal bg-primary hover:bg-primary/90 text-primary-foreground mt-4 border-none shadow-sm hover:shadow-md"
          >
            {loading ? "Processando..." : mode === "signin" ? "Entrar no Sistema" : "Criar Conta"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            className="w-full text-sm tracking-normal bg-white/5"
          >
            Continuar com Google
          </Button>
        </form>

        <div className="text-center pt-6 border-t border-white/5">
          <p className="text-xs text-muted-foreground">
            Acesso exclusivo para empresas parceiras.{" "}
            <Link to="/" className="text-primary hover:text-white transition-colors">
              Voltar
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
