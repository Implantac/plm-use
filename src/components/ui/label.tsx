"use client";

import * as React from "react";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";
import { useFieldContext } from "@/components/ui/field";

const labelVariants = cva(
  "text-xs font-medium tracking-normal leading-none text-muted-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
  {
    variants: {
      variant: {
        default: "",
        error: "text-destructive",
      },
      size: {
        default: "text-xs tracking-normal normal-case font-medium",
        sm: "text-[11px] tracking-normal normal-case font-medium",
        md: "text-xs tracking-normal normal-case font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface LabelProps
  extends
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  required?: boolean;
}

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, variant, size, required, htmlFor, children, ...props }, ref) => {
    const field = useFieldContext();
    const resolvedHtmlFor = htmlFor ?? field?.controlId;
    const resolvedVariant = variant ?? (field?.invalid ? "error" : undefined);
    return (
      <LabelPrimitive.Root
        ref={ref}
        htmlFor={resolvedHtmlFor}
        className={cn(labelVariants({ variant: resolvedVariant, size }), className)}
        {...props}
      >
        {children}
        {required && <span className="ml-1 text-destructive">*</span>}
      </LabelPrimitive.Root>
    );
  },
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label, labelVariants };
