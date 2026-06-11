import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  Layers,
  Globe,
  Box,
  ShoppingBag,
  DollarSign,
  Sparkles,
  TrendingUp,
  Factory,
  PackageCheck,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/digital-twin")({
  component: DigitalTwinPage,
});

function DigitalTwinPage() {
  return (
    <div className="space-y-8 h-[calc(100vh-160px)] flex flex-col">
      <div className="flex items-end justify-between mb-8 shrink-0">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
          <div className="flex items-center gap-3 mb-4">
            <span className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[9px] font-bold uppercase tracking-[0.2em]">
              Next-Gen v5.0
            </span>
          </div>
          <h1 className="text-5xl font-bold tracking-tighter uppercase text-white mb-2 leading-none">
            Digital Twin
          </h1>
          <p className="text-muted-foreground text-sm font-light italic lowercase">
            a réplica viva do seu ecossistema. visualize dados em tempo real sobre modelos 3D.
          </p>
        </motion.div>
        <div className="flex gap-4">
          <Button className="rounded-none px-8 h-12 text-[10px] font-bold uppercase tracking-[0.2em] btn-primary-premium gap-2">
            <Globe className="w-4 h-4" /> Live Sync
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 shrink-0">
        {[
          { label: "Produtos", value: "186 refs", icon: Layers },
          { label: "Produção", value: "57%", icon: Factory },
          { label: "Vendas", value: "R$ 780k", icon: ShoppingBag },
          { label: "Estoque", value: "84%", icon: Box },
          { label: "Rentabilidade", value: "3.4x", icon: TrendingUp },
        ].map((item) => (
          <Card key={item.label} className="glass-card rounded-lg p-4">
            <item.icon className="h-4 w-4 text-primary" />
            <p className="mt-3 text-[9px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1 text-lg font-bold text-white">{item.value}</p>
          </Card>
        ))}
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-8">
        <Card className="lg:col-span-3 glass-card rounded-lg p-4 relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent opacity-50 pointer-events-none" />
          <div className="h-full flex flex-col items-center justify-center space-y-8">
            <motion.div
              animate={{
                y: [0, -20, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-72 h-[480px] bg-white/5 border border-white/10 rounded-lg relative shadow-[0_0_100px_rgba(var(--primary),0.1)] overflow-hidden"
            >
              <img
                src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?auto=format&fit=crop&q=80&w=600"
                className="w-full h-full object-cover opacity-60"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <Layers className="w-20 h-20 text-primary opacity-40 animate-pulse" />
                <p className="mt-8 text-[10px] font-bold uppercase tracking-[0.5em] text-white/40">
                  Gêmeo Digital Ativo
                </p>
              </div>
            </motion.div>
            <div className="flex gap-8">
              {[
                { label: "Vendas", val: "R$ 420k", icon: <DollarSign className="w-4 h-4" /> },
                { label: "Estoque", val: "84%", icon: <Box className="w-4 h-4" /> },
                {
                  label: "Status",
                  val: "Aprovado",
                  icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
                },
              ].map((s, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="p-3 rounded-md bg-white/5 border border-white/5 text-muted-foreground">
                    {s.icon}
                  </div>
                  <p className="text-[10px] font-bold text-white tracking-widest">{s.val}</p>
                  <p className="text-[8px] font-bold uppercase text-muted-foreground tracking-widest">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="absolute top-6 right-6 flex flex-col gap-3">
            {[
              { label: "Design", active: true },
              { label: "Fabrics", active: false },
              { label: "Cost", active: false },
            ].map((btn, i) => (
              <Button
                key={i}
                variant="ghost"
                className={`h-10 w-28 rounded-md text-[9px] font-bold uppercase tracking-widest border border-white/5 ${btn.active ? "bg-primary text-white" : "bg-white/5 text-muted-foreground"}`}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </Card>

        <div className="space-y-8">
          <Card className="glass-card rounded-lg p-6 space-y-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-white">
              Live Operations
            </h3>
            <div className="space-y-4">
              {[
                { factory: "Unidade Sul", load: 82, status: "Alta" },
                { factory: "Unidade SP", load: 65, status: "Média" },
                { factory: "Parceiro SC", load: 45, status: "Ideal" },
              ].map((f, i) => (
                <div key={i} className="space-y-2 p-4 rounded-md bg-white/5 border border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                    <span className="text-white">{f.factory}</span>
                    <span className={f.status === "Alta" ? "text-primary" : "text-emerald-400"}>
                      {f.load}%
                    </span>
                  </div>
                  <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${f.load}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="glass-card rounded-lg p-6 bg-primary/[0.02] border-primary/20">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-4">
              Simulação AI
            </h3>
            <p className="text-[10px] text-muted-foreground font-light leading-relaxed italic lowercase mb-6">
              se aumentarmos a produção da blusa amalfi em 20%, o tempo de entrega das calças urban
              será impactado em +5 dias úteis.
            </p>
            <Button className="w-full h-11 rounded-md text-[9px] font-bold uppercase tracking-[0.16em] btn-primary-premium">
              Testar Cenário
            </Button>
          </Card>

          <Card className="glass-card rounded-lg p-6">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-white mb-5">
              Produtos críticos
            </h3>
            <div className="space-y-3">
              {[
                { name: "Blusa Linho Amalfi", status: "repetir", icon: PackageCheck },
                { name: "Pantalona Riviera", status: "estoque 84%", icon: Box },
                { name: "Vestido Gala Resort", status: "margem alerta", icon: DollarSign },
              ].map((product) => (
                <div
                  key={product.name}
                  className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.035] p-3"
                >
                  <product.icon className="h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{product.status}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
