// V8 · Menu genérico de próximos status para qualquer entidade com workflow.
// Lê transições permitidas via useWorkflow(entityType) e aciona
// useWorkflowTransition() ao clicar. Reutilizável em Lote, CAPA, Tech Sheet, etc.
import { ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkflow, type WorkflowEntityType } from "@/hooks/use-workflow";
import { useWorkflowTransition } from "@/hooks/use-transition";

type Props = {
  entityType: WorkflowEntityType;
  entityId: string;
  currentStatus: string;
  onTransitioned?: (toStatus: string) => void;
  size?: "sm" | "default";
  variant?: "default" | "outline" | "secondary" | "ghost";
  label?: string;
};

export function WorkflowStatusMenu({
  entityType,
  entityId,
  currentStatus,
  onTransitioned,
  size = "sm",
  variant = "outline",
  label,
}: Props) {
  const { nextStatuses, loading: defsLoading } = useWorkflow(entityType);
  const { transition, pending } = useWorkflowTransition(entityType);

  const options = nextStatuses(currentStatus);
  const disabled = defsLoading || pending || options.length === 0;

  const handleClick = async (to: string) => {
    const res = await transition({
      entity_id: entityId,
      from_status: currentStatus,
      to_status: to,
    });
    if (res?.ok) onTransitioned?.(to);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size={size} variant={variant} disabled={disabled}>
          {pending ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : null}
          {label ?? currentStatus}
          <ChevronDown className="ml-1 h-3.5 w-3.5 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Próximo status
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.length === 0 ? (
          <DropdownMenuItem disabled>
            Nenhuma transição disponível
          </DropdownMenuItem>
        ) : (
          options.map((to) => (
            <DropdownMenuItem
              key={to}
              onSelect={(e) => {
                e.preventDefault();
                void handleClick(to);
              }}
            >
              {currentStatus} → <span className="ml-1 font-medium">{to}</span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
