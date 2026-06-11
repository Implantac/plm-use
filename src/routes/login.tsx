import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Fingerprint, KeyRound, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Acesso negado. Verifique suas credenciais.");
      return;
    }
    toast.success("Bem-vindo ao USE MODA PLM.");
    navigate({ to: "/dashboard" });
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

        <form className="space-y-6" onSubmit={handleLogin}>
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
              className="rounded-md border-white/10 bg-white/5 h-12 px-4 text-sm focus-visible:ring-primary/30"
              required
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between px-4">
              <Label
                htmlFor="password"
                title="Senha de Acesso"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground"
              >
                Senha
              </Label>
              <a
                href="#"
                className="text-[9px] text-primary hover:text-white transition-colors font-bold uppercase tracking-[0.1em]"
              >
                Redefinir Senha
              </a>
            </div>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border-white/10 bg-white/5 h-12 px-4 focus-visible:ring-primary/30"
              required
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-md h-12 text-[10px] font-bold uppercase tracking-[0.2em] bg-primary hover:bg-primary/90 text-white mt-4 border-none transition-all shadow-lg hover:shadow-primary/20"
          >
            {loading ? "Autenticando..." : "Entrar no Sistema"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full rounded-md h-12 text-[10px] font-bold uppercase tracking-[0.16em] border-white/10 bg-white/5"
          >
            Entrar com SSO
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
