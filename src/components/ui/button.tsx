import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium cursor-pointer select-none",
    "transition-[background,color,box-shadow,filter,transform] duration-150 ease-out",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    "disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:filter-none",
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    "active:translate-y-px",
  ].join(" "),
  {
    variants: {
      variant: {
        // Primary — clear, solid action color for a work-focused interface
        default: [
          "text-primary-foreground border border-transparent",
          "bg-primary shadow-sm hover:bg-primary/90 hover:shadow-md active:bg-primary/95",
        ].join(" "),
        // Secondary — quiet surface with a restrained jade hover
        secondary: [
          "bg-secondary text-secondary-foreground border border-border",
          "hover:bg-accent hover:border-border-strong hover:text-foreground",
          "active:bg-muted",
        ].join(" "),
        // Destructive
        destructive: [
          "bg-destructive text-destructive-foreground border border-transparent",
          "shadow-[0_6px_20px_-8px_hsl(var(--destructive)/0.6)]",
          "hover:brightness-110 hover:shadow-[0_8px_22px_-8px_hsl(var(--destructive)/0.75)]",
          "active:brightness-95",
        ].join(" "),
        // Outline — restrained jade tint on hover
        outline: [
          "border border-border-strong bg-transparent text-foreground",
          "hover:bg-primary/10 hover:border-primary/50 hover:text-foreground",
          "active:bg-primary/15",
        ].join(" "),
        // Ghost — minimal, subtle jade tint on hover
        ghost: "text-foreground hover:bg-primary/10 hover:text-foreground active:bg-primary/15",
        // Link — jade underline
        link: "text-primary underline-offset-4 hover:underline hover:text-[hsl(var(--glow-500))]",
      },
      size: {
        xs: "h-7 px-2.5 text-[11px] rounded-md [&_svg]:size-3.5",
        sm: "h-8 px-3 text-xs rounded-md",
        default: "h-9 px-4 text-sm rounded-md",
        lg: "h-11 px-6 text-sm rounded-md tracking-wide",
        icon: "h-9 w-9 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md [&_svg]:size-3.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
