// Onda 124 — lê o molde DXF (AAMA/ASTM) no navegador: peças, área, consumo estimado → BOM.
import { useMemo, useRef, useState } from "react";
import { FileUp, Ruler, Scissors } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useTechSheetStore, blankFor, emptyCadMarkerSpec } from "@/lib/techsheet/store";
import {
  estimarConsumoMetros,
  parseDxfMolde,
  tamanhosDoMolde,
  type MoldeDxf,
} from "@/lib/techsheet/dxf-molde";

const fmt = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

export function MoldeDxfPanel({ refAtual }: { refAtual: string }) {
  const doc = useTechSheetStore((s) => s.data[refAtual]) ?? blankFor(refAtual);
  const setEncaixeCad = useTechSheetStore((s) => s.setEncaixeCad);
  const updateBomItem = useTechSheetStore((s) => s.updateBomItem);
  const cad = doc.encaixeCad ?? emptyCadMarkerSpec();
  const molde = cad.moldeDxf;
  const inputRef = useRef<HTMLInputElement>(null);
  const [tamanho, setTamanho] = useState<string>("");

  const tamanhos = useMemo(() => (molde ? tamanhosDoMolde(molde.pecas) : []), [molde]);
  const tamanhoSel = tamanho || doc.medidas?.tamanhoBase || tamanhos[0] || "";
  const larguraCm = Math.round((cad.larguraEnfestoM || 1.5) * 100);
  const consumo = useMemo(
    () =>
      molde
        ? estimarConsumoMetros(
            molde.pecas,
            larguraCm,
            cad.eficienciaPct || 85,
            tamanhos.length ? tamanhoSel : undefined,
          )
        : null,
    [molde, larguraCm, cad.eficienciaPct, tamanhoSel, tamanhos.length],
  );
  const tecidoPrincipal = doc.bom.find((b) => b.tipo === "Tecido");

  const lerArquivo = async (file: File) => {
    try {
      const texto = await file.text();
      const r = parseDxfMolde(texto, file.name);
      if (r.pecas.length === 0) {
        toast.error(r.avisos[0] ?? "Não encontrei peças no DXF.");
        return;
      }
      setEncaixeCad(refAtual, { ...cad, arquivoMolde: file.name, moldeDxf: r });
      toast.success(`${r.pecas.length} peça(s) lidas de ${file.name} (${r.unidade}).`);
      for (const a of r.avisos) toast.warning(a);
    } catch {
      toast.error("Não consegui ler este arquivo. Exporte como DXF (AAMA/ASTM) e tente de novo.");
    }
  };

  const trocarUnidade = (u: MoldeDxf["unidade"]) => {
    if (!molde) return;
    // Recalcula a partir do fator relativo (áreas escalam ao quadrado).
    const fator: Record<MoldeDxf["unidade"], number> = { mm: 0.1, cm: 1, in: 2.54 };
    const k = fator[u] / fator[molde.unidade];
    setEncaixeCad(refAtual, {
      ...cad,
      moldeDxf: {
        ...molde,
        unidade: u,
        unidadeDeclarada: true,
        avisos: molde.avisos.filter((a) => !a.startsWith("Unidade não declarada")),
        pecas: molde.pecas.map((p) => ({
          ...p,
          areaCm2: Math.round(p.areaCm2 * k * k * 100) / 100,
          perimetroCm: Math.round(p.perimetroCm * k * 100) / 100,
          larguraCm: Math.round(p.larguraCm * k * 100) / 100,
          alturaCm: Math.round(p.alturaCm * k * 100) / 100,
        })),
      },
    });
  };

  const usarNaBom = () => {
    if (!consumo || !tecidoPrincipal) return;
    updateBomItem(refAtual, tecidoPrincipal.id, {
      consumo: consumo.metros.toFixed(3),
      unidade: "m",
    });
    toast.success(
      `Consumo do tecido "${tecidoPrincipal.material}" atualizado para ${fmt(consumo.metros, 3)} m (estimado pelo molde).`,
    );
  };

  return (
    <div className="space-y-2 rounded-md border border-border/80 p-3" data-testid="molde-dxf">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5 text-teal-500" aria-hidden="true" /> Molde DXF
          (AAMA/ASTM) — peças e consumo
        </Label>
        <input
          ref={inputRef}
          type="file"
          accept=".dxf,application/dxf,image/vnd.dxf"
          className="sr-only"
          aria-label="Importar molde DXF"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void lerArquivo(f);
            e.target.value = "";
          }}
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 text-2xs gap-1"
          onClick={() => inputRef.current?.click()}
        >
          <FileUp className="w-3 h-3 text-teal-500" aria-hidden="true" />{" "}
          {molde ? "Substituir DXF" : "Importar DXF"}
        </Button>
      </div>

      {!molde && (
        <p className="text-2xs text-muted-foreground">
          Exporte o molde do Audaces/Lectra/Gerber/CLO como DXF-AAMA e importe aqui: o PLM lista as
          peças com área e perímetro e estima o consumo de tecido pela largura do enfesto e pelo
          aproveitamento acima.
        </p>
      )}

      {molde && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-2xs text-muted-foreground">
            <span>
              Arquivo: <span className="text-foreground font-mono">{molde.arquivo}</span>
            </span>
            <label className="flex items-center gap-1">
              Unidade
              <select
                aria-label="Unidade do DXF"
                value={molde.unidade}
                onChange={(e) => trocarUnidade(e.target.value as MoldeDxf["unidade"])}
                className="h-6 rounded border border-input bg-background px-1 text-2xs text-foreground"
              >
                <option value="mm">mm</option>
                <option value="cm">cm</option>
                <option value="in">polegada</option>
              </select>
              {!molde.unidadeDeclarada && (
                <span className="text-amber-600 dark:text-amber-400">(assumida)</span>
              )}
            </label>
            {tamanhos.length > 0 && (
              <label className="flex items-center gap-1">
                Tamanho
                <select
                  aria-label="Tamanho do molde para o consumo"
                  value={tamanhoSel}
                  onChange={(e) => setTamanho(e.target.value)}
                  className="h-6 rounded border border-input bg-background px-1 text-2xs text-foreground"
                >
                  {tamanhos.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {molde.avisos.map((a) => (
            <p key={a} className="text-2xs text-amber-600 dark:text-amber-400">
              {a}
            </p>
          ))}
          <div className="overflow-x-auto max-h-44 rounded border border-border/60" tabIndex={0}>
            <table className="w-full text-2xs">
              <thead className="sticky top-0 bg-muted/60">
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 px-2 font-medium">Peça</th>
                  <th className="py-1 px-2 font-medium">Tam.</th>
                  <th className="py-1 px-2 font-medium text-right">Qtd</th>
                  <th className="py-1 px-2 font-medium text-right">Área (cm²)</th>
                  <th className="py-1 px-2 font-medium text-right">Perím. (cm)</th>
                  <th className="py-1 px-2 font-medium text-right">L × A (cm)</th>
                </tr>
              </thead>
              <tbody>
                {molde.pecas
                  .filter(
                    (p) =>
                      !tamanhos.length ||
                      !p.tamanho ||
                      p.tamanho.toUpperCase() === tamanhoSel.toUpperCase(),
                  )
                  .map((p, i) => (
                    <tr
                      key={`${p.nome}-${i}`}
                      className="border-t border-border/40 text-foreground"
                    >
                      <td className="py-1 px-2">{p.nome}</td>
                      <td className="py-1 px-2">{p.tamanho ?? "—"}</td>
                      <td className="py-1 px-2 text-right font-mono">{p.quantidade}</td>
                      <td className="py-1 px-2 text-right font-mono">{fmt(p.areaCm2, 0)}</td>
                      <td className="py-1 px-2 text-right font-mono">{fmt(p.perimetroCm, 1)}</td>
                      <td className="py-1 px-2 text-right font-mono">
                        {fmt(p.larguraCm, 1)} × {fmt(p.alturaCm, 1)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {consumo && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-teal-500/10 border border-teal-500/30 px-3 py-2">
              <div className="text-xs text-foreground flex items-center gap-2">
                <Ruler
                  className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300"
                  aria-hidden="true"
                />
                <span>
                  Consumo estimado{tamanhos.length ? ` (${tamanhoSel})` : ""}:{" "}
                  <strong className="font-mono">{fmt(consumo.metros, 3)} m</strong> por peça
                  <span className="text-muted-foreground">
                    {" "}
                    · {fmt(consumo.areaCm2 / 10000, 3)} m² de molde ÷ ({larguraCm} cm ×{" "}
                    {cad.eficienciaPct || 85}%)
                  </span>
                </span>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-7 text-2xs"
                onClick={usarNaBom}
                disabled={!tecidoPrincipal || consumo.metros <= 0}
                title={
                  tecidoPrincipal
                    ? `Grava ${fmt(consumo.metros, 3)} m em "${tecidoPrincipal.material}"`
                    : "Cadastre um tecido na BOM primeiro"
                }
              >
                Usar na BOM{tecidoPrincipal ? ` (${tecidoPrincipal.material})` : ""}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
