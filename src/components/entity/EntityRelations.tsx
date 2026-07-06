// Relacionamentos consolidados de uma entidade — inclui vínculos com o ERP.
import { ExternalLink, Trash2, Unlink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEntityRelations, type EntityRelation } from "@/hooks/use-entity-relations";
import { useEntityDrawer } from "@/components/entity/EntityContext";
import { ErpBadge } from "@/components/erp/ErpBadge";
import type { EntityType } from "@/hooks/use-entity-events";

const RELATION_LABEL: Record<string, string> = {
  derives_from: "Deriva de",
  has_tech_sheet: "Ficha técnica",
  has_piloto: "Piloto",
  produced_in_lote: "Produzida no lote",
  capa_for: "CAPA vinculada",
  uses_material_erp: "Material (ERP)",
  supplied_by_erp: "Fornecedor (ERP)",
  linked_op_erp: "Ordem de produção (ERP)",
};

export function EntityRelations({
  entityType,
  entityId,
}: {
  entityType: EntityType;
  entityId: string;
}) {
  const { outgoing, incoming, loading, unlink } = useEntityRelations(entityType, entityId);

  if (loading) {
    return (
      <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[11px] text-muted-foreground">
        Carregando relações…
      </div>
    );
  }

  if (outgoing.length === 0 && incoming.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[11px] text-muted-foreground">
        Nenhum relacionamento registrado. Use as ações de vinculação em Ficha, Piloto, Lote ou CAPA.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {outgoing.length > 0 && (
        <Section title="Vinculada a" items={outgoing} onUnlink={unlink} />
      )}
      {incoming.length > 0 && (
        <Section title="Recebe vínculo de" items={incoming} onUnlink={unlink} incoming />
      )}
    </div>
  );
}

function Section({
  title,
  items,
  onUnlink,
  incoming,
}: {
  title: string;
  items: EntityRelation[];
  onUnlink: (id: string) => void;
  incoming?: boolean;
}) {
  const { openEntity } = useEntityDrawer();
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
        {title}
      </p>
      <ul className="space-y-1.5">
        {items.map((r) => {
          const type = incoming ? r.from_type : r.to_type;
          const id = incoming ? r.from_id : r.to_id;
          const external = !incoming && r.to_external_id;
          return (
            <li
              key={r.id}
              className="flex items-center justify-between rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="rounded border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-primary">
                  {RELATION_LABEL[r.relation] ?? r.relation}
                </span>
                <span className="text-muted-foreground uppercase tracking-wider text-[9px]">
                  {type}
                </span>
                {external ? (
                  r.relation === "uses_material_erp" ? (
                    <ErpBadge kind="product" id={r.to_external_id!} />
                  ) : r.relation === "supplied_by_erp" ? (
                    <ErpBadge kind="supplier" id={r.to_external_id!} />
                  ) : (
                    <span className="text-white truncate">
                      <ExternalLink className="inline h-3 w-3 mr-1" />
                      {r.to_external_id}
                    </span>
                  )
                ) : id ? (
                  <button
                    onClick={() => openEntity({ type, id })}
                    className="text-white truncate hover:text-primary transition"
                  >
                    {id.slice(0, 8)}…
                  </button>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </div>
              {!incoming && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onUnlink(r.id)}
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-300"
                  title="Desvincular"
                >
                  <Unlink className="h-3.5 w-3.5" />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// Silence unused import warning in some tsconfigs.
void Trash2;
