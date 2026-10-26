// Aplicações da ficha — a mesa do responsável de custo para uniforme: cada
// posição de bordado/silk/sublimação com medidas, cores/pontos, quantidade por
// peça e o SETUP único (telas/chapas) amortizado pela tiragem do lote.
// Edita o MESMO doc do store da ficha (envelope v2 no tech_sheets) — nada aqui
// é planilha paralela.
import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldMessage } from "@/components/ui/field-message";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTechSheetStore } from "@/lib/techsheet/store";
import { listPrints } from "@/lib/prints/store";
import {
  APLICACAO_POSICOES_SUGERIDAS,
  APLICACAO_TIPOS,
  areaCm2,
  custoAplicacoesPecasTotal,
  custoPeca,
  custoPorPecaComSetup,
  resumoAplicacao,
  setupTotal,
  validateAplicacaoDraft,
  type Aplicacao,
  type AplicacaoDraft,
} from "@/lib/techsheet/aplicacoes";

const brl = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

type DraftState = Partial<AplicacaoDraft> & { id?: string };

const EMPTY: DraftState = {
  tipo: "Bordado",
  posicao: "",
  arte: "",
  larguraCm: 10,
  alturaCm: 10,
  pontos: undefined,
  cores: 1,
  qtdPorPeca: 1,
  custoUnitario: 0,
  custoSetup: undefined,
  obs: "",
};

export function AplicacoesPanel({ refAtual }: { refAtual: string }) {
  const doc = useTechSheetStore((s) => s.data[refAtual]);
  const add = useTechSheetStore((s) => s.addAplicacao);
  const update = useTechSheetStore((s) => s.updateAplicacao);
  const remove = useTechSheetStore((s) => s.removeAplicacao);
  const apps = doc?.aplicacoes ?? [];

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tiragem, setTiragem] = useState<number>(250);

  const artes = useMemo(() => listPrints(), []);
  const pecasTotal = custoAplicacoesPecasTotal(apps);
  const setup = setupTotal(apps);
  const comSetup = custoPorPecaComSetup(apps, tiragem);

  const abrir = (a?: Aplicacao) => {
    setErrors({});
    setDraft(a ? { ...a } : { ...EMPTY });
    setOpen(true);
  };

  const salvar = () => {
    const errs = validateAplicacaoDraft(draft as AplicacaoDraft);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const { id, ...rest } = draft as Aplicacao;
    if (id) {
      update(refAtual, id, rest);
      toast.success("Aplicação atualizada.");
    } else {
      add(refAtual, rest as Omit<Aplicacao, "id">);
      toast.success("Aplicação registrada na ficha.");
    }
    setOpen(false);
  };

  const num = (v: string) => (v === "" ? undefined : Number(v));

  return (
    <div className="glass-card rounded-lg p-6 space-y-5">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-white flex items-center gap-3">
          <Layers className="w-4 h-4 text-primary" /> Aplicações · {apps.length} posições
        </h3>
        <Button
          size="sm"
          variant="outline"
          className="text-[11px] tracking-[0.04em] gap-2"
          onClick={() => abrir()}
        >
          <Plus className="w-3.5 h-3.5" /> Nova aplicação
        </Button>
      </div>

      {apps.length === 0 ? (
        <p className="rounded-md border border-dashed border-white/10 p-4 text-xs leading-relaxed text-muted-foreground">
          Nenhuma aplicação nesta ficha. Em uniforme, cada escudo/número/patrocinador entra AQUI —
          não como linha genérica de BOM — para o custo por posição e o setup (telas/chapas) serem
          amortizados pela tiragem real do pedido.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-md border border-white/10">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/5">
                <tr className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-3 py-2">Técnica · Posição</th>
                  <th className="px-3 py-2">Arte</th>
                  <th className="px-3 py-2 text-right">L×A (área)</th>
                  <th className="px-3 py-2 text-right">Cores/Pontos</th>
                  <th className="px-3 py-2 text-right">×/peça</th>
                  <th className="px-3 py-2 text-right">Unit.</th>
                  <th className="px-3 py-2 text-right">Setup</th>
                  <th className="px-3 py-2 text-right">Custo/peça</th>
                  <th className="px-3 py-2" aria-label="ações" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {apps.map((a) => (
                  <tr key={a.id} className="hover:bg-white/[0.03]">
                    <td className="px-3 py-2">
                      <p className="text-white font-bold text-[11px] uppercase tracking-wider">
                        {a.tipo}
                      </p>
                      <p className="text-muted-foreground">{a.posicao}</p>
                      {a.obs && <p className="text-[11px] text-muted-foreground/70">{a.obs}</p>}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{a.arte || "—"}</td>
                    <td className="px-3 py-2 text-right text-white whitespace-nowrap">
                      {a.larguraCm}×{a.alturaCm}{" "}
                      <span className="text-muted-foreground">({areaCm2(a)} cm²)</span>
                    </td>
                    <td className="px-3 py-2 text-right text-white">
                      {a.tipo === "Bordado" && a.pontos ? `${a.pontos}k pts` : `${a.cores}`}
                    </td>
                    <td className="px-3 py-2 text-right text-white">{a.qtdPorPeca}</td>
                    <td className="px-3 py-2 text-right text-white">{brl(a.custoUnitario)}</td>
                    <td className="px-3 py-2 text-right text-muted-foreground">
                      {a.custoSetup ? brl(a.custoSetup) : "—"}
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-white">
                      {brl(custoPeca(a))}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => abrir(a)}
                          className="p-1.5 rounded text-muted-foreground hover:bg-white/5 hover:text-white"
                          title="Editar"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            remove(refAtual, a.id);
                            toast.info("Aplicação removida.");
                          }}
                          className="p-1.5 rounded text-muted-foreground hover:bg-status-rejected/10 hover:text-status-rejected"
                          title="Remover"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-white/5 text-[11px]">
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-2 uppercase tracking-wider text-muted-foreground"
                  >
                    Aplicações por peça
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-white">{brl(pecasTotal)}</td>
                  <td />
                </tr>
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-2 uppercase tracking-wider text-muted-foreground"
                  >
                    Setup total (
                    {setup > 0
                      ? `amortizado em ${tiragem} pçs → +${brl(setup / tiragem)}/peça`
                      : "sem telas/chapas"}
                    )
                    {setup > 0 && (
                      <Input
                        type="number"
                        min={1}
                        value={tiragem}
                        onChange={(e) => setTiragem(num(e.target.value) ?? 0)}
                        className="ml-2 inline-block h-6 w-20 bg-black/30 text-[11px]"
                        title="Tiragem do lote para amortização"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-white">{brl(setup)}</td>
                  <td />
                </tr>
                {setup > 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-2 uppercase tracking-wider text-primary">
                      Custo de aplicações / peça com setup diluído
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-primary">{brl(comSetup)}</td>
                    <td />
                  </tr>
                )}
              </tfoot>
            </table>
          </div>
          <p className="sr-only">{apps.map(resumoAplicacao).join("; ")}</p>
        </>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xs uppercase tracking-[0.05em]">
              {draft.id ? "Editar aplicação" : "Nova aplicação"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-widest">Técnica</Label>
              <select
                value={draft.tipo ?? "Bordado"}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, tipo: e.target.value as Aplicacao["tipo"] }))
                }
                className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-white"
              >
                {APLICACAO_TIPOS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
              {errors.tipo && <FieldMessage variant="error">{errors.tipo}</FieldMessage>}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-widest">Posição</Label>
              <Input
                list="aposicoes"
                value={draft.posicao ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, posicao: e.target.value }))}
                placeholder="Peito esquerdo"
              />
              <datalist id="aposicoes">
                {APLICACAO_POSICOES_SUGERIDAS.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
              {errors.posicao && <FieldMessage variant="error">{errors.posicao}</FieldMessage>}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-widest">
                Arte (cartela de estampas)
              </Label>
              <Input
                list="aartes"
                value={draft.arte ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, arte: e.target.value }))}
                placeholder="EST-0142"
              />
              <datalist id="aartes">
                {artes.map((pr) => (
                  <option key={pr.id} value={pr.code}>
                    {pr.name} · {pr.tecnica} · {pr.colorCount} cores
                  </option>
                ))}
              </datalist>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-widest">Qtde por peça</Label>
              <Input
                type="number"
                min={1}
                value={draft.qtdPorPeca ?? 1}
                onChange={(e) => setDraft((d) => ({ ...d, qtdPorPeca: num(e.target.value) }))}
              />
              {errors.qtdPorPeca && (
                <FieldMessage variant="error">{errors.qtdPorPeca}</FieldMessage>
              )}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-widest">Largura (cm)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={draft.larguraCm ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, larguraCm: num(e.target.value) }))}
              />
              {errors.larguraCm && <FieldMessage variant="error">{errors.larguraCm}</FieldMessage>}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-widest">Altura (cm)</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={draft.alturaCm ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, alturaCm: num(e.target.value) }))}
              />
              {errors.alturaCm && <FieldMessage variant="error">{errors.alturaCm}</FieldMessage>}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-widest">
                {draft.tipo === "Bordado" ? "Pontos (milhares)" : "Cores"}
              </Label>
              {draft.tipo === "Bordado" ? (
                <Input
                  type="number"
                  min={0}
                  value={draft.pontos ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, pontos: num(e.target.value) }))}
                  placeholder="opcional"
                />
              ) : (
                <Input
                  type="number"
                  min={1}
                  value={draft.cores ?? 1}
                  onChange={(e) => setDraft((d) => ({ ...d, cores: num(e.target.value) }))}
                />
              )}
              {(() => {
                const m = draft.tipo === "Bordado" ? errors.pontos : errors.cores;
                return m ? <FieldMessage variant="error">{m}</FieldMessage> : null;
              })()}
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] uppercase tracking-widest">Custo unitário (R$)</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={draft.custoUnitario ?? 0}
                onChange={(e) => setDraft((d) => ({ ...d, custoUnitario: num(e.target.value) }))}
              />
              {errors.custoUnitario && (
                <FieldMessage variant="error">{errors.custoUnitario}</FieldMessage>
              )}
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[11px] uppercase tracking-widest">
                Setup único — telas/chapas (R$, opcional)
              </Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={draft.custoSetup ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, custoSetup: num(e.target.value) }))}
                placeholder="ex.: 240 (4 telas × R$ 60)"
              />
              {errors.custoSetup && (
                <FieldMessage variant="error">{errors.custoSetup}</FieldMessage>
              )}
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[11px] uppercase tracking-widest">Observações do custo</Label>
              <Input
                value={draft.obs ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, obs: e.target.value }))}
                placeholder="base topper para malha; fio dourado; sentido do pelo…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvar}>{draft.id ? "Salvar alterações" : "Adicionar à ficha"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
