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
  component: Login,
});

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
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) {
        setErrors({ form: error.message || "Acesso negado." });
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
        setErrors({ form: error.message || "Falha no cadastro." });
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
    if (result?.error) toast.error(result.error.message ?? "Falha no login Google.");
  };



  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[1fr_480px] bg-[#020617] p-6 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.05]"
        style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }}
      />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[120px]" />

      <div className="relative z-10 hidden lg:flex flex-col justify-between p-8">
        <img src="/assets/logo.png" alt="USE MODA" className="h-12 w-fit" />
        <div className="max-w-2xl space-y-8">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
              Enterprise Access
            </p>
            <h1 className="mt-4 text-5xl font-bold tracking-tight text-white">
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
                className="rounded-lg border border-white/10 bg-white/[0.035] p-4"
              >
                <item.icon className="h-5 w-5 text-primary" />
                <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.16em] text-white">
                  {item.label}
                </p>
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
          LGPD ready - auditoria ativa - backup automático
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 self-center justify-self-center w-full max-w-md p-8 rounded-lg border border-white/10 bg-white/[0.035] backdrop-blur-3xl space-y-8 glass-card"
      >
        <div className="text-center">
          <div className="mb-8 flex justify-center">
            <img src="/assets/logo.png" alt="USE MODA" className="h-16 w-auto" />
          </div>
          <p className="text-muted-foreground text-[10px] font-bold uppercase tracking-[0.3em] mt-4">
            PLM Intelligence Hub Access
          </p>
        </div>

        <div className="flex gap-1 p-1 rounded-md bg-white/5 border border-white/5">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 py-2 rounded text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${
                mode === m ? "bg-primary text-white" : "text-muted-foreground hover:text-white"
              }`}
            >
              {m === "signin" ? "Entrar" : "Criar conta"}
            </button>
          ))}
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <div className="space-y-3">
              <Label
                htmlFor="fullName"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-4"
              >
                Nome completo
              </Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Seu nome"
                className="h-12 px-4 text-sm"
                required
              />
            </div>
          )}
          <div className="space-y-3">
            <Label
              htmlFor="email"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-4"
            >
              E-mail Corporativo
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="h-12 px-4 text-sm"
              required
            />
          </div>
          <div className="space-y-3">
            <Label
              htmlFor="password"
              className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground ml-4"
            >
              Senha
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              className="h-12 px-4"
              required
            />
          </div>

          <Button
 type="submit"
 disabled={loading}
 className="w-full text-[10px] tracking-[0.2em] bg-primary hover:bg-primary/90 text-white mt-4 border-none shadow-lg hover:shadow-primary/20"
 >
            {loading
              ? "Processando..."
              : mode === "signin"
                ? "Entrar no Sistema"
                : "Criar Conta"}
          </Button>
          <Button
 type="button"
 variant="outline"
 onClick={handleGoogle}
 className="w-full text-[10px] tracking-[0.16em] bg-white/5"
 >
            Continuar com Google
          </Button>
        </form>


        <div className="text-center pt-6 border-t border-white/5">
          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-[0.2em]">
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
