import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between border-b border-line px-8 py-6">
      <div>
        <h1>{title}</h1>
        {subtitle && (
          <div className="mt-1 text-sm text-ink-muted">{subtitle}</div>
        )}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
