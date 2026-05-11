import { HTMLAttributes, TableHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Table = forwardRef<
  HTMLTableElement,
  TableHTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <table ref={ref} className={cn("table-zebra", className)} {...props} />
));
Table.displayName = "Table";

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} />;
}
export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}
export function TR(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />;
}
export function TH(props: HTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} />;
}
export function TD({
  className,
  colSpan,
  rowSpan,
  ...props
}: HTMLAttributes<HTMLTableCellElement> & { colSpan?: number; rowSpan?: number }) {
  return <td className={className} colSpan={colSpan} rowSpan={rowSpan} {...props} />;
}

/** Cella numerica monospace allineata a destra. */
export function Num({
  value,
  decimals = 2,
  tone = "neutral",
  prefix = "",
  suffix = "",
  className,
}: {
  value: number | null | undefined;
  decimals?: number;
  tone?: "neutral" | "pos" | "neg" | "auto";
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className={cn("num text-ink-subtle", className)}>—</span>;
  }
  const t =
    tone === "auto" ? (value > 0 ? "pos" : value < 0 ? "neg" : "neutral") : tone;
  const formatted = new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
  return (
    <span
      className={cn(
        "num",
        t === "pos" && "num-pos",
        t === "neg" && "num-neg",
        className,
      )}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
