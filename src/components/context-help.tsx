import { forwardRef, type DetailsHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const ContextHelp = forwardRef<HTMLDetailsElement, DetailsHTMLAttributes<HTMLDetailsElement> & { summary: ReactNode }>(
  function ContextHelp({ summary, children, className, ...props }, ref) {
    return <details ref={ref} className={cn("context-help", className)} {...props}>
      <summary>{summary}</summary>
      {children}
    </details>;
  },
);
