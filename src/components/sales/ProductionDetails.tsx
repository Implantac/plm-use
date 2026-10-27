import { Layers, ListChecks } from "lucide-react";
import type {
  ProductionDetail,
  TechnicalBase,
  TechnicalBaseSnapshot,
} from "@/lib/sales/technical-details-api";

const safe = (value: unknown): string =>
  typeof value === "string" || typeof value === "number" ? String(value).trim() : "";
const join = (values: unknown[], separator = " · ") =>
  values.map(safe).filter(Boolean).join(separator);

/** Campos explicitamente técnicos; nunca renderiza custo, preço, markup ou margem. */
export function TechnicalBaseView({ base }: { base?: TechnicalBase | null }) {
  const materiais = Array.isArray(base?.materiais) ? base.materiais : [];
  const operacoes = Array.isArray(base?.operacoes) ? base.operacoes : [];
  const aplicacoes = Array.isArray(base?.aplicacoes) ? base.aplicacoes : [];
  const foto = safe(base?.foto);
  const fotoSegura = foto.startsWith("https://") ? foto : "";
  if (!materiais.length && !operacoes.length && !aplicacoes.length && !fotoSegura) {
    return (
      <p className="text-xs text-muted-foreground">
        A ficha padrão não contém dados técnicos para copiar.
      </p>
    );
  }
  return (
    <div className="space-y-3 text-xs">
      {fotoSegura && (
        <img
          src={fotoSegura}
          alt="Foto de referência da ficha padrão"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="max-h-40 max-w-full rounded-md border border-border object-contain"
        />
      )}
      {materiais.length > 0 && (
        <div>
          <p className="font-semibold text-foreground">Materiais da ficha padrão</p>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {materiais.map((m, i) => (
              <li key={i}>
                {join([
                  m.tipo,
                  m.material,
                  join([m.consumo, m.unidade], " "),
                  safe(m.fornecedor) ? `Fornecedor: ${safe(m.fornecedor)}` : "",
                  safe(m.lote) ? `Lote: ${safe(m.lote)}` : "",
                ]) || "Material sem descrição"}
              </li>
            ))}
          </ul>
        </div>
      )}
      {operacoes.length > 0 && (
        <div>
          <p className="font-semibold text-foreground">Operações da ficha padrão</p>
          <ul className="mt-1 space-y-1 text-muted-foreground">
            {operacoes.map((op, i) => (
              <li key={i}>
                {join([
                  op.setor,
                  op.etapa,
                  safe(op.tempo_min) ? `${safe(op.tempo_min)} min` : "",
                  safe(op.responsavel) ? `Responsável: ${safe(op.responsavel)}` : "",
                ]) || "Operação sem descrição"}
              </li>
            ))}
          </ul>
        </div>
      )}
      {aplicacoes.length > 0 && (
        <div>
          <p className="font-semibold text-foreground">Aplicações da ficha padrão</p>
          <ul className="mt-1 space-y-2 text-muted-foreground">
            {aplicacoes.map((app, i) => (
              <li key={i}>
                <span>{join([app.tipo, app.posicao, app.arte]) || "Aplicação sem descrição"}</span>
                {(safe(app.largura_cm) || safe(app.altura_cm)) && (
                  <span>{` · ${safe(app.largura_cm) || "—"} × ${safe(app.altura_cm) || "—"} cm`}</span>
                )}
                {safe(app.pontos) && <span>{` · ${safe(app.pontos)} mil pontos`}</span>}
                {safe(app.cores) && <span>{` · ${safe(app.cores)} cor(es)`}</span>}
                {safe(app.qtd_por_peca) && <span>{` · ${safe(app.qtd_por_peca)} por peça`}</span>}
                {safe(app.observacao) && (
                  <p className="whitespace-pre-wrap break-words">{safe(app.observacao)}</p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function BaseSnapshotPanel({ snapshot }: { snapshot?: TechnicalBaseSnapshot | null }) {
  if (!snapshot) return null;
  if (!snapshot.found) {
    return (
      <p className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
        Não foi encontrada ficha padrão vinculada
        {snapshot.ref ? ` à referência ${snapshot.ref}` : " a este produto"} na última busca.
      </p>
    );
  }
  return (
    <details className="rounded-md border border-border bg-muted/20 p-3">
      <summary className="cursor-pointer text-xs font-semibold text-foreground">
        Base da ficha padrão{snapshot.ref ? ` · ${snapshot.ref}` : ""} (cópia deste item)
      </summary>
      <div className="mt-3 space-y-2">
        <p className="text-xs text-muted-foreground">
          Esta é a referência da ficha padrão; o consumo válido para o pedido é o registrado nos
          materiais do item.
        </p>
        <TechnicalBaseView base={snapshot.data} />
      </div>
    </details>
  );
}

/** A mesma visualização é usada na ficha e na OP. React trata o texto como texto. */
export function ProductionDetails({
  details,
  snapshot,
}: {
  details?: ProductionDetail[] | null;
  snapshot?: TechnicalBaseSnapshot | null;
}) {
  const rows = (Array.isArray(details) ? details : []).filter(
    (d) => safe(d.commercial_detail) || safe(d.detail),
  );
  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-[0.04em] text-primary">
        <ListChecks className="h-3.5 w-3.5" /> Instruções de produção por grupo
      </p>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Nenhuma instrução de produção registrada para este item.
        </p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2">
          {rows.map((row, i) => (
            <section
              key={`${row.name}-${i}`}
              className="rounded-md border border-border bg-muted/20 p-3"
            >
              <h4 className="text-xs font-semibold text-foreground">
                {safe(row.name) || "Detalhes"}
              </h4>
              {safe(row.commercial_detail) && (
                <div className="mt-2">
                  <p className="text-2xs font-semibold uppercase text-muted-foreground">
                    Comercial
                  </p>
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/90">
                    {safe(row.commercial_detail)}
                  </p>
                </div>
              )}
              {safe(row.detail) && (
                <div className="mt-2">
                  <p className="text-2xs font-semibold uppercase text-muted-foreground">
                    Complemento técnico
                  </p>
                  <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-foreground/90">
                    {safe(row.detail)}
                  </p>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      {snapshot && (
        <div>
          <span className="sr-only">
            <Layers /> Dados da ficha padrão
          </span>
          <BaseSnapshotPanel snapshot={snapshot} />
        </div>
      )}
    </div>
  );
}
