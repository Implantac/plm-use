import * as React from "react";

import { cn } from "@/lib/utils";
import { useFieldContext } from "@/components/ui/field";

const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<"textarea">>(
  (
    { className, id, "aria-describedby": describedBy, "aria-invalid": ariaInvalid, ...props },
    ref,
  ) => {
    const field = useFieldContext();
    const resolvedId = id ?? field?.controlId;
    const resolvedDescribedBy = describedBy ?? field?.messageId;
    const resolvedInvalid = ariaInvalid ?? (field?.invalid ? true : undefined);
    return (
      <textarea
        id={resolvedId}
        aria-describedby={resolvedDescribedBy}
        aria-invalid={resolvedInvalid}
        className={cn(
          "flex min-h-[72px] w-full rounded-md border border-input bg-background/40 px-3 py-2 text-sm shadow-sm",
          "placeholder:text-muted-foreground/70",
          "transition-[color,background-color,border-color,box-shadow] duration-150",
          "hover:border-primary/40",
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-background/60",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input",
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Textarea.displayName = "Textarea";

export { Textarea };
