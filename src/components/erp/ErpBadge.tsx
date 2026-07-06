// Badge padrão para exibir dado consumido do ERP.
// Deixa explícito ao usuário: "isto vem do ERP, PLM só lê".
import { ExternalLink, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useErpProduct, useErpSupplier } from "@/hooks/use-erp";

type Props =
  | { kind: "product"; id: string }
  | { kind: "supplier"; id: string };

export function ErpBadge(props: Props) {
  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground hover:border-primary/40 hover:text-white transition cursor-help">
            <ExternalLink className="h-2.5 w-2.5" />
            {props.kind === "product" ? <ProductLabel id={props.id} /> : <SupplierLabel id={props.id} />}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-[11px]">
          {props.kind === "product" ? <ProductTip id={props.id} /> : <SupplierTip id={props.id} />}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ProductLabel({ id }: { id: string }) {
  const { data, loading } = useErpProduct(id);
  if (loading) return <Loader2 className="h-2.5 w-2.5 animate-spin" />;
  if (!data) return <span>ERP · não encontrado</span>;
  return <span>ERP · {data.sku}</span>;
}

function ProductTip({ id }: { id: string }) {
  const { data, loading, error } = useErpProduct(id);
  if (loading) return <span>Consultando ERP…</span>;
  if (error) return <span>ERP indisponível: {error}</span>;
  if (!data) return <span>Produto {id} não encontrado no ERP</span>;
  return (
    <div className="space-y-0.5">
      <p className="font-bold">{data.name}</p>
      <p className="text-muted-foreground">SKU {data.sku} · {data.category ?? "—"}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fonte: ERP (leitura)</p>
    </div>
  );
}

function SupplierLabel({ id }: { id: string }) {
  const { data, loading } = useErpSupplier(id);
  if (loading) return <Loader2 className="h-2.5 w-2.5 animate-spin" />;
  if (!data) return <span>ERP · fornecedor</span>;
  return <span>ERP · {data.code}</span>;
}

function SupplierTip({ id }: { id: string }) {
  const { data, loading, error } = useErpSupplier(id);
  if (loading) return <span>Consultando ERP…</span>;
  if (error) return <span>ERP indisponível: {error}</span>;
  if (!data) return <span>Fornecedor {id} não encontrado no ERP</span>;
  return (
    <div className="space-y-0.5">
      <p className="font-bold">{data.name}</p>
      <p className="text-muted-foreground">
        {data.category ?? "—"} · lead {data.lead_time_days ?? "?"}d · {data.rating ?? "?"}/5
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Fonte: ERP (leitura)</p>
    </div>
  );
}
