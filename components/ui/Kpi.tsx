import { cn } from "@/lib/utils";

interface KpiProps {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: "pos" | "neg" | "neutral";
  className?: string;
}

export function Kpi({ label, value, delta, deltaTone = "neutral", className }: KpiProps) {
  return (
    <div className={cn("kpi", className)}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta && (
        <div
          className={cn(
            "kpi-delta",
            deltaTone === "pos" && "text-accent-pos",
            deltaTone === "neg" && "text-accent-neg",
          )}
        >
          {delta}
        </div>
      )}
    </div>
  );
}
