import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Material 3 Button
 * Variants: filled (default), tonal, outlined, text, elevated, destructive, ghost (alias of text), link
 * Sizes follow M3 — height 40 default, 56 large, 32 small. Pill-shaped.
 */
const buttonVariants = cva(
  "relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium overflow-hidden " +
    "transition-[background-color,box-shadow,color] duration-200 ease-m3-standard " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background " +
    "disabled:pointer-events-none disabled:opacity-40 " +
    "[&_svg]:pointer-events-none [&_svg]:size-[18px] [&_svg]:shrink-0 " +
    "before:content-[''] before:absolute before:inset-0 before:bg-current before:opacity-0 before:transition-opacity " +
    "hover:before:opacity-[0.08] active:before:opacity-[0.12]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-e1 hover:shadow-e2 active:shadow-e1",
        filled:
          "bg-primary text-primary-foreground shadow-e1 hover:shadow-e2 active:shadow-e1",
        tonal:
          "bg-secondary-container text-secondary-on-container hover:shadow-e1",
        outlined:
          "bg-transparent text-primary border border-outline hover:border-primary",
        outline:
          "bg-transparent text-foreground border border-outline hover:border-primary",
        elevated:
          "bg-surface-low text-primary shadow-e1 hover:shadow-e2",
        text:
          "bg-transparent text-primary",
        ghost:
          "bg-transparent text-foreground",
        link:
          "bg-transparent text-primary underline-offset-4 hover:underline before:hidden",
        destructive:
          "bg-destructive text-destructive-foreground shadow-e1 hover:shadow-e2",
        secondary:
          "bg-secondary-container text-secondary-on-container hover:shadow-e1",
      },
      size: {
        default: "h-10 px-6 rounded-full text-sm",
        sm: "h-8 px-4 rounded-full text-[13px]",
        lg: "h-14 px-8 rounded-full text-base",
        icon: "h-10 w-10 rounded-full",
        "icon-sm": "h-9 w-9 rounded-full",
        "icon-lg": "h-12 w-12 rounded-full",
        fab: "h-14 w-14 rounded-2xl shadow-e3 hover:shadow-e4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props}>
        <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
      </Comp>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
