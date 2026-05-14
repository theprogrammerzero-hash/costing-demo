"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { section: "Anagrafica", items: [
    { label: "Reparti", href: "/reparti" },
    { label: "Commesse", href: "/prodotti" },
    { label: "Fasi di lavorazione", href: "/fasi" },
  ]},
  { section: "Produzione", items: [
    { label: "Macchine", href: "/macchine" },
    { label: "Dipendenti", href: "/dipendenti" },
    { label: "Metodi & Tempi", href: "/metodi-tempi" },
  ]},
  { section: "Analisi", items: [
    { label: "Risultati & BEP", href: "/risultati" },
  ]},
  { section: "Setup", items: [
    { label: "Configurazione", href: "/configurazione" },
  ]},
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed left-0 top-header bottom-0 w-sidebar overflow-y-auto border-r border-line bg-paper">
      <nav className="py-2">
        {nav.map((s) => (
          <div key={s.section}>
            <div className="nav-section">{s.section}</div>
            <ul>
              {s.items.map((item) => {
                const active = path === item.href || path.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link href={item.href} className={cn("nav-link", active && "nav-link-active")}>
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <div className="px-4 py-6 text-xxs text-ink-subtle">v0.1 · Costing Demo</div>
    </aside>
  );
}
