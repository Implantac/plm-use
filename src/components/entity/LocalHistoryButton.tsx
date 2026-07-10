// Botão reutilizável de histórico para entidades locais (não persistidas).
// Abre um Sheet padrão com a timeline daquela entidade — Digital Thread sem
// depender de tabela server.

import { useState, type ReactNode } from "react";
import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LocalEntityTimeline } from "@/components/entity/LocalEntityTimeline";
import { LOCAL_ENTITY_LABEL, type LocalEntityType } from "@/lib/local-events/store";

export function LocalHistoryButton({
  entityType,
  entityId,
  entityLabel,
  variant = "ghost",
  size = "sm",
  className,
  children,
}: {
  entityType: LocalEntityType;
  entityId: string;
  entityLabel?: string;
  variant?: React.ComponentProps<typeof Button>["variant"];
  size?: React.ComponentProps<typeof Button>["size"];
  className?: string;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <History className="h-3.5 w-3.5" />
        {children ?? <span className="ml-1.5">Histórico</span>}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
          <SheetHeader className="p-5 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
              {LOCAL_ENTITY_LABEL[entityType]}
            </p>
            <SheetTitle className="text-base mt-1 truncate">
              {entityLabel ?? entityId}
            </SheetTitle>
          </SheetHeader>
          <div className="p-5">
            <LocalEntityTimeline entityType={entityType} entityId={entityId} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
