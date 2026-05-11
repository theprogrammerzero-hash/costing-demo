import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { createProdotto, updateProdotto, deleteProdotto } from "@/app/actions/prodotti";

const fmt = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
const fmtN = (n: number) =>
  new Intl.NumberFormat("it-IT").format(n);
const fmtDate = (d: Date | null) =>
  d ? new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(d)) : "—";
const toInputDate = (d: Date | null) =>
  d ? new Date(d).toISOString().split("T")[0] : "";

export default async function CommessePage() {
  const commesse = await prisma.prodotto.findMany({ orderBy: { codice: "asc" } });

  return (
    <div>
      <PageHeader
        title="Commesse"
        subtitle="Anagrafica commesse — quantità, cliente, date, prezzo e costo materie prime"
      />

      <div className="px-8 py-6 space-y-10">

        {/* ── Tabella commesse ─────────────────────────────────────────── */}
        {commesse.length > 0 && (
          <table className="table-zebra w-full">
            <thead>
              <tr>
                <th>Codice</th>
                <th>Nome / Cliente</th>
                <th className="text-right">Qtà ordine</th>
                <th>Periodo</th>
                <th className="text-right">Prezzo /u</th>
                <th className="text-right">Mat. prime /u</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {commesse.map((p) => (
                <tr key={p.id}>
                  <td className="font-mono text-xs text-ink-muted">{p.codice}</td>
                  <td>
                    <div className="font-medium">{p.nome}</div>
                    {p.cliente && <div className="text-xs text-ink-muted">{p.cliente}</div>}
                  </td>
                  <td className="num">{fmtN(p.quantita)} u</td>
                  <td className="text-sm text-ink-muted">
                    {p.dataInizio || p.dataFine
                      ? <>{fmtDate(p.dataInizio)} → {fmtDate(p.dataFine)}</>
                      : <span className="text-ink-subtle">—</span>}
                  </td>
                  <td className="num">
                    {p.prezzoVendita != null ? fmt(p.prezzoVendita) : <span className="text-ink-subtle">—</span>}
                  </td>
                  <td className="num">{fmt(p.materiePrime)}</td>
                  <td className="text-right">
                    <details className="inline-block relative">
                      <summary className="btn btn-sm btn-ghost cursor-pointer list-none">Modifica</summary>
                      <div className="absolute right-0 z-10 mt-1 w-96 border border-line bg-paper shadow-lg p-4">
                        <form action={updateProdotto.bind(null, p.id)} className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xxs uppercase tracking-wider text-ink-muted">Codice</label>
                              <input name="codice" defaultValue={p.codice} className="input mt-1" />
                            </div>
                            <div>
                              <label className="text-xxs uppercase tracking-wider text-ink-muted">Nome</label>
                              <input name="nome" defaultValue={p.nome} className="input mt-1" />
                            </div>
                          </div>
                          <div>
                            <label className="text-xxs uppercase tracking-wider text-ink-muted">Cliente</label>
                            <input name="cliente" defaultValue={p.cliente ?? ""} placeholder="Ragione sociale" className="input mt-1" />
                          </div>
                          <div>
                            <label className="text-xxs uppercase tracking-wider text-ink-muted">Quantità commessa (unità)</label>
                            <input name="quantita" type="number" min="1" defaultValue={p.quantita} className="input mt-1" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xxs uppercase tracking-wider text-ink-muted">Data inizio</label>
                              <input name="dataInizio" type="date" defaultValue={toInputDate(p.dataInizio)} className="input mt-1" />
                            </div>
                            <div>
                              <label className="text-xxs uppercase tracking-wider text-ink-muted">Data consegna</label>
                              <input name="dataFine" type="date" defaultValue={toInputDate(p.dataFine)} className="input mt-1" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-xxs uppercase tracking-wider text-ink-muted">Prezzo vendita (€/u)</label>
                              <input name="prezzoVendita" type="number" step="0.01" defaultValue={p.prezzoVendita ?? ""} className="input mt-1" />
                            </div>
                            <div>
                              <label className="text-xxs uppercase tracking-wider text-ink-muted">Mat. prime €/u</label>
                              <input name="materiePrime" type="number" step="0.01" defaultValue={p.materiePrime} className="input mt-1" />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button type="submit" className="btn btn-primary btn-sm flex-1">Salva</button>
                            <form action={deleteProdotto.bind(null, p.id)}>
                              <button type="submit" className="btn btn-danger btn-sm">Elimina</button>
                            </form>
                          </div>
                        </form>
                      </div>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* ── Nuova commessa ────────────────────────────────────────────── */}
        <div className="border border-line p-6 max-w-xl">
          <h2 className="mb-1">Nuova commessa</h2>
          <p className="text-xs text-ink-muted mb-4">
            Inserisci i dati dell'ordine. I tempi di lavorazione si configurano nella sezione
            "Tempi di lavorazione" dopo aver creato la commessa.
          </p>
          <form action={createProdotto} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Codice commessa</label>
                <input name="codice" placeholder="CMM-004" className="input mt-1" required />
              </div>
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Nome / descrizione</label>
                <input name="nome" placeholder="Descrizione articolo" className="input mt-1" required />
              </div>
            </div>
            <div>
              <label className="text-xxs uppercase tracking-wider text-ink-muted">Cliente</label>
              <input name="cliente" placeholder="Ragione sociale cliente" className="input mt-1" />
            </div>
            <div>
              <label className="text-xxs uppercase tracking-wider text-ink-muted">
                Quantità commessa (unità totali dell'ordine)
              </label>
              <input name="quantita" type="number" min="1" placeholder="500" className="input mt-1" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Data inizio lavorazione</label>
                <input name="dataInizio" type="date" className="input mt-1" />
              </div>
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Data consegna prevista</label>
                <input name="dataFine" type="date" className="input mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Prezzo vendita (€/u)</label>
                <input name="prezzoVendita" type="number" step="0.01" min="0" placeholder="—" className="input mt-1" />
              </div>
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Mat. prime (€/u)</label>
                <input name="materiePrime" type="number" step="0.01" min="0" placeholder="0.00" className="input mt-1" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Aggiungi commessa</button>
          </form>
        </div>
      </div>
    </div>
  );
}
