// Influencer Center — gestão de envios, ROI e mapa de calor do Brasil.
// PLM/Marketing-only: store compartilhado com Marketing AI.
import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Heart, Instagram, MapPin, Package, Plus, Send, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { ModuleLayout } from "@/components/modules/ModuleLayout";
import { REGIOES_BR, useInfluencersStore, type Envio, type Influencer } from "@/lib/influencers/store";

export const Route = createFileRoute("/_authenticated/influencers")({
  component: InfluencersPage,
});

function InfluencersPage() {
  const influencers = useInfluencersStore((s) => s.influencers);
  const registrarEnvioStore = useInfluencersStore((s) => s.registrarEnvio);
  const [sel, setSel] = useState<Influencer | null>(null);
  const [envioOpen, setEnvioOpen] = useState(false);
  const [novoRef, setNovoRef] = useState("");
  const [novoNome, setNovoNome] = useState("");

  const totais = useMemo(() => {
    const enviosTot = influencers.reduce((a, i) => a + i.envios.length, 0);
    const vendasTot = influencers.reduce((a, i) => a + i.vendasGeradas, 0);
    const investido = influencers.reduce((a, i) => a + i.custoMedio * i.envios.length, 0);
    const engMedio =
      influencers
        .flatMap((i) => i.envios.map((e) => e.engajamento ?? 0))
        .filter((x) => x > 0)
        .reduce((a, b, _, arr) => a + b / arr.length, 0) || 0;
    return { enviosTot, vendasTot, investido, engMedio };
  }, [influencers]);

  const heatmap = useMemo(() => {
    const map = Object.fromEntries(REGIOES.map((r) => [r, 0])) as Record<string, number>;
    for (const i of influencers) map[i.regiao] += i.vendasGeradas;
    const max = Math.max(...Object.values(map), 1);
    return { map, max };
  }, [influencers]);

  function registrarEnvio() {
    if (!sel || !novoRef || !novoNome) {
      toast.error("Preencha referência e nome da peça.");
      return;
    }
    const envio: Envio = {
      id: Math.random().toString(36).slice(2, 8),
      ref: novoRef.toUpperCase(),
      nome: novoNome,
      data: new Date().toISOString().slice(0, 10),
      status: "Enviado",
    };
    setInfluencers((prev) =>
      prev.map((i) => (i.id === sel.id ? { ...i, envios: [envio, ...i.envios] } : i)),
    );
    setSel((s) => (s ? { ...s, envios: [envio, ...s.envios] } : s));
    setNovoRef("");
    setNovoNome("");
    setEnvioOpen(false);
    toast.success(`Envio registrado para ${sel.nome}`);
  }

  return (
    <ModuleLayout
      title="Influencer Center"
      subtitle="Curadoria de creators, envios de peças, engajamento e mapa de demanda por região."
      version="Influencer v1.0"
      metrics={[
        { label: "Influencers", value: String(influencers.length), detail: "ativos" },
        { label: "Envios", value: String(totais.enviosTot), detail: "no período" },
        { label: "Vendas atribuídas", value: String(totais.vendasTot), detail: "geradas" },
        { label: "Eng. médio", value: `${totais.engMedio.toFixed(1)}%`, detail: "posts ativos" },
      ]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-3">
          {influencers.map((i) => {
            const eng =
              i.envios.filter((e) => e.engajamento).reduce((a, e) => a + (e.engajamento ?? 0), 0) /
                Math.max(1, i.envios.filter((e) => e.engajamento).length) || 0;
            return (
              <Card key={i.id} className="glass-card rounded-lg hover:border-primary/30 transition cursor-pointer" onClick={() => setSel(i)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-white">{i.nome}</p>
                        <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">
                          {i.perfil}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground flex items-center gap-2 mt-0.5">
                        <Instagram className="h-3 w-3" /> {i.handle} •
                        <MapPin className="h-3 w-3" /> {i.uf} • {i.segmento}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {(i.seguidores / 1000).toFixed(0)}k seguidores • R$ {i.custoMedio.toLocaleString("pt-BR")} médio/envio
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Vendas geradas</p>
                      <p className="text-2xl font-bold text-emerald-300">{i.vendasGeradas}</p>
                      <p className="text-[10px] text-muted-foreground">{i.envios.length} envios • {eng.toFixed(1)}% eng</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="space-y-3">
          <Card className="glass-card rounded-lg">
            <CardContent className="p-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Heat Map Brasil
              </h3>
              <div className="space-y-2">
                {REGIOES.map((r) => {
                  const v = heatmap.map[r];
                  const pct = Math.round((v / heatmap.max) * 100);
                  return (
                    <div key={r} className="flex items-center gap-3 text-[11px]">
                      <span className="w-24 truncate text-muted-foreground">{r}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary/40 to-primary"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-bold text-white">{v}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Concentração de vendas atribuídas a creators por macro-região.
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card rounded-lg border-primary/20">
            <CardContent className="p-4">
              <p className="text-[10px] uppercase tracking-wider text-primary mb-1 flex items-center gap-1">
                <Heart className="h-3 w-3" /> Investimento total
              </p>
              <p className="text-2xl font-bold text-white">
                R$ {totais.investido.toLocaleString("pt-BR")}
              </p>
              <p className="text-[11px] text-muted-foreground">
                ROI estimado:{" "}
                <span className="text-emerald-300 font-bold">
                  {totais.investido > 0
                    ? `${Math.round((totais.vendasTot * 350) / totais.investido * 100)}%`
                    : "—"}
                </span>{" "}
                (ticket médio R$ 350)
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Drawer influencer */}
      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white max-w-2xl">
          {sel && (
            <>
              <DialogHeader>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  {sel.handle}
                </p>
                <DialogTitle className="text-xl">{sel.nome}</DialogTitle>
                <p className="text-[11px] text-muted-foreground">
                  {sel.regiao} • {sel.uf} • {sel.segmento} • {(sel.seguidores / 1000).toFixed(0)}k
                </p>
              </DialogHeader>

              <div className="flex justify-between items-center mt-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Histórico de envios ({sel.envios.length})
                </p>
                <Button
                  size="sm"
                  onClick={() => setEnvioOpen(true)}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Novo envio
                </Button>
              </div>

              <div className="space-y-2 mt-2 max-h-[360px] overflow-y-auto pr-1">
                {sel.envios.map((e) => (
                  <div
                    key={e.id}
                    className="rounded-md border border-white/10 bg-white/[0.03] p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">
                        {e.ref}
                      </p>
                      <p className="text-sm font-bold text-white flex items-center gap-2">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        {e.nome}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(e.data).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          e.status === "Engajou"
                            ? "border-emerald-400/40 text-emerald-300"
                            : e.status === "Postou"
                              ? "border-primary/40 text-primary"
                              : e.status === "Pendente"
                                ? "border-amber-400/40 text-amber-300"
                                : "border-white/20"
                        }`}
                      >
                        {e.status}
                      </Badge>
                      {e.engajamento && (
                        <p className="text-[10px] text-emerald-300 mt-1">
                          {e.engajamento}% eng
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-md bg-white/[0.03] p-2">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Vendas</p>
                  <p className="text-lg font-bold text-emerald-300">{sel.vendasGeradas}</p>
                </div>
                <div className="rounded-md bg-white/[0.03] p-2">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Custo médio</p>
                  <p className="text-lg font-bold text-white">R$ {sel.custoMedio.toLocaleString("pt-BR")}</p>
                </div>
                <div className="rounded-md bg-white/[0.03] p-2">
                  <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Conversão</p>
                  <p className="text-lg font-bold text-primary">
                    {((sel.vendasGeradas / Math.max(1, sel.envios.length)) | 0)}/envio
                  </p>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal envio */}
      <Dialog open={envioOpen} onOpenChange={setEnvioOpen}>
        <DialogContent className="glass-card border-white/10 bg-black/95 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Registrar envio para {sel?.nome}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Referência</Label>
              <Input
                value={novoRef}
                onChange={(e) => setNovoRef(e.target.value)}
                placeholder="ex: VT302"
                className="bg-white/[0.04] border-white/10 text-white"
              />
            </div>
            <div>
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nome da peça</Label>
              <Input
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="ex: Vestido Midi Toscana"
                className="bg-white/[0.04] border-white/10 text-white"
              />
            </div>
            <Button onClick={registrarEnvio} className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Send className="h-3.5 w-3.5 mr-1" />
              Registrar envio
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </ModuleLayout>
  );
}
