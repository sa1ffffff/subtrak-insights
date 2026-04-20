import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Material 3 Text Field — outlined variant
 * Floating label, focus ring, error & helper text support.
 */
const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-xl border border-outline-variant bg-surface px-4 py-2 " +
            "body-large text-foreground placeholder:text-muted-foreground/70 " +
            "transition-[border-color,box-shadow] duration-200 ease-m3-standard " +
            "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground " +
            "hover:border-foreground/60 " +
            "focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 " +
            "disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-muted",
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
