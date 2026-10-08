import * as React from "react";

import { cn } from "@/lib/utils";
import { useFieldContext } from "@/components/ui/field";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  (
    { className, type, id, "aria-describedby": describedBy, "aria-invalid": ariaInvalid, ...props },
    ref,
  ) => {
    const field = useFieldContext();
    const resolvedId = id ?? field?.controlId;
    const resolvedDescribedBy = describedBy ?? field?.messageId;
    const resolvedInvalid = ariaInvalid ?? (field?.invalid ? true : undefined);
    return (
      <input
        type={type}
        id={resolvedId}
        aria-describedby={resolvedDescribedBy}
        aria-invalid={resolvedInvalid}
        className={cn(
          // base
          "flex h-9 w-full rounded-md border border-input bg-background/40 px-3 py-1 text-sm shadow-sm",
          // file input
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          // placeholder
          "placeholder:text-muted-foreground/70",
          // transitions
          "transition-[color,background-color,border-color,box-shadow] duration-150",
          // hover
          "hover:border-primary/40",
          // focus
          "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:bg-background/60",
          // disabled
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-input",
          // error
          "aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:ring-destructive/30",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
