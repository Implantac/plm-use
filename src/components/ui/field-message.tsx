import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

import { cn } from "@/lib/utils";
import { useFieldContext } from "@/components/ui/field";

/**
 * Unified inline message for form fields.
 * When rendered inside <Field>, id is auto-linked to the control via
 * aria-describedby (no manual wiring needed).
 */
const fieldMessageVariants = cva(
  "flex items-start gap-1.5 text-[11px] leading-snug font-normal transition-colors duration-150",
  {
    variants: {
      variant: {
        helper: "text-muted-foreground/80",
        error: "text-destructive",
        success: "text-emerald-400",
        warning: "text-amber-400",
        info: "text-primary",
      },
    },
    defaultVariants: {
      variant: "helper",
    },
  },
);

const ICONS = {
  helper: Info,
  error: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
} as const;

export interface FieldMessageProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof fieldMessageVariants> {
  hideIcon?: boolean;
}

const FieldMessage = React.forwardRef<HTMLParagraphElement, FieldMessageProps>(
  ({ className, variant = "helper", hideIcon, id, children, ...props }, ref) => {
    const field = useFieldContext();
    if (!children) return null;
    const v = variant ?? "helper";
    const showIcon = hideIcon ? false : v === "error" || v === "success" || v === "warning";
    const Icon = ICONS[v];
    const resolvedId = id ?? field?.messageId;
    return (
      <p
        ref={ref}
        id={resolvedId}
        role={v === "error" ? "alert" : undefined}
        className={cn(fieldMessageVariants({ variant: v }), className)}
        {...props}
      >
        {showIcon && <Icon className="mt-[1px] h-3 w-3 shrink-0" aria-hidden />}
        <span className="min-w-0">{children}</span>
      </p>
    );
  },
);
FieldMessage.displayName = "FieldMessage";

export { FieldMessage, fieldMessageVariants };
