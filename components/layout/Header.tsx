export function Header() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 flex h-header items-center border-b border-line bg-paper px-5">
      <div className="flex items-center gap-2">
        <span className="font-medium tracking-tight">
          COSTING <span className="text-ink-muted">DEMO</span>
        </span>
        <span className="ml-3 border border-line px-2 py-0.5 text-xxs uppercase tracking-wider text-ink-muted">
          Full Costing + BEP
        </span>
      </div>
      <div className="ml-auto text-xs text-ink-subtle">
        Integrazione IoT pronta
      </div>
    </header>
  );
}
