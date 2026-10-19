import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const MetricGroup = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function MetricGroup({ children, className, ...props }, ref) {
    return <Card ref={ref} role="group" className={cn("metric-group", className)} {...props}>
      <dl className="metric-rows">{children}</dl>
    </Card>;
  },
);

export const MetricItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { label: ReactNode }>(
  function MetricItem({ label, children, className, ...props }, ref) {
    return <div ref={ref} className={cn("metric-row", className)} {...props}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>;
  },
);
