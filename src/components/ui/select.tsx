import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SelectProps } from "./select-types";

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, containerClassName, children, disabled, ...props }, ref) => {
    const isBorderless =
      className?.includes("border-0") ||
      className?.includes("bg-transparent") ||
      containerClassName?.includes("border-0");

    return (
      <div
        className={cn(
          "group relative flex min-w-0 items-center",
          !containerClassName?.includes("w-") && !containerClassName?.includes("flex-") && "w-full",
          containerClassName,
        )}
      >
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            "flex h-10 w-full appearance-none truncate text-sm font-medium text-neutral-800 transition-all duration-150 cursor-pointer",
            isBorderless
              ? "bg-transparent pl-3 pr-8 focus:outline-none"
              : "rounded-xl border border-neutral-200 bg-white pl-3.5 pr-9 shadow-sm shadow-neutral-200/40 hover:border-neutral-300 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/15",
            "disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400 disabled:opacity-60",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400 transition-colors duration-150 group-hover:text-neutral-600",
            disabled && "text-neutral-300 group-hover:text-neutral-300",
          )}
        />
      </div>
    );
  },
);
Select.displayName = "Select";
