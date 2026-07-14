import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Field
 * -----
 * Groups a Label + control (Input/Select/Textarea) + FieldMessage and provides
 * shared ids so screen readers announce helper/error text via aria-describedby
 * automatically. Consumers do not need to hand-wire htmlFor / id /
 * aria-describedby / aria-invalid.
 *
 * Usage:
 *   <Field invalid={!!errors.name}>
 *     <Label required>Nome</Label>
 *     <Input value={...} />
 *     {errors.name && <FieldMessage variant="error">{errors.name}</FieldMessage>}
 *   </Field>
 */

export type FieldContextValue = {
  controlId: string;
  messageId: string;
  invalid: boolean;
};

const FieldContext = React.createContext<FieldContextValue | null>(null);

export function useFieldContext(): FieldContextValue | null {
  return React.useContext(FieldContext);
}

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  invalid?: boolean;
  /** Custom id (otherwise auto-generated). */
  id?: string;
  asChild?: boolean;
}

export const Field = React.forwardRef<HTMLDivElement, FieldProps>(
  ({ className, invalid = false, id, children, ...props }, ref) => {
    const auto = React.useId();
    const base = id ?? auto;
    const value = React.useMemo<FieldContextValue>(
      () => ({
        controlId: `${base}-control`,
        messageId: `${base}-message`,
        invalid,
      }),
      [base, invalid],
    );
    return (
      <FieldContext.Provider value={value}>
        <div ref={ref} className={cn("space-y-1.5", className)} {...props}>
          {children}
        </div>
      </FieldContext.Provider>
    );
  },
);
Field.displayName = "Field";
