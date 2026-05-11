import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { createMacchina, updateMacchina, deleteMacchina } from "@/app/actions/macchine";

const fmt  = (n: number) => new Intl.NumberFormat("it-IT").format(n);
const fmtH = (min: number) => `${Math.floor(min / 60)}h${min % 60 > 0 ? ` ${min % 60}min` : ""}`;

export default async function MacchineePage() {
  const reparti = await prisma.reparto.findMany({
    orderBy: { codice: "asc" },
    include: { macchine: { orderBy: { codice: "asc" } } },
  });

  const totMacchine = reparti.reduce((s, r) => s + r.macchine.length, 0);

  return (
    <div>
      <PageHeader
        title="Macchine"
        subtitle="Centri di lavoro per reparto — tipo operazione, capacità e tempo di setup"
      />

      <div className="px-8 py-6 space-y-8">

        {/* ── Macchine per reparto ──────────────────────────────────────── */}
        {reparti.map((r) => (
          <div key={r.id} className="border border-line">
            <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-paper">
              <div>
                <span className="font-medium">{r.nome}</span>
                <span className="ml-2 font-mono text-xs text-ink-muted">{r.codice}</span>
              </div>
              <span className="text-xs text-ink-muted">{r.macchine.length} macchine</span>
            </div>

            {r.macchine.length > 0 ? (
              <table className="table-zebra w-full">
                <thead>
                  <tr>
                    <th>Codice</th>
                    <th>Nome</th>
                    <th>Tipo operazione</th>
                    <th className="text-right">Capacità</th>
                    <th className="text-right">Setup</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {r.macchine.map((m) => (
                    <tr key={m.id}>
                      <td className="font-mono text-xs text-ink-muted">{m.codice}</td>
                      <td className="font-medium">{m.nome}</td>
                      <td>
                        <span className="font-mono text-xs bg-line px-1.5 py-0.5">
                          {m.tipoOperazione}
                        </span>
                      </td>
                      <td className="num text-ink-muted">{fmtH(m.capacitaMinGiorno)}/turno</td>
                      <td className="num text-ink-muted">{m.tempoSetupMin} min</td>
                      <td className="text-right">
                        <details className="inline-block relative">
                          <summary className="btn btn-sm btn-ghost cursor-pointer list-none">Modifica</summary>
                          <div className="absolute right-0 z-10 mt-1 w-80 border border-line bg-paper shadow-lg p-4">
                            <form action={updateMacchina.bind(null, m.id)} className="space-y-3">
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xxs uppercase tracking-wider text-ink-muted">Codice</label>
                                  <input name="codice" defaultValue={m.codice} className="input mt-1" />
                                </div>
                                <div>
                                  <label className="text-xxs uppercase tracking-wider text-ink-muted">Nome</label>
                                  <input name="nome" defaultValue={m.nome} className="input mt-1" />
                                </div>
                              </div>
                              <div>
                                <label className="text-xxs uppercase tracking-wider text-ink-muted">Tipo operazione</label>
                                <input name="tipoOperazione" defaultValue={m.tipoOperazione} className="input mt-1 font-mono text-sm" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-xxs uppercase tracking-wider text-ink-muted">Capacità (min/turno)</label>
                                  <input name="capacitaMinGiorno" type="number" step="30" min="0" defaultValue={m.capacitaMinGiorno} className="input mt-1" />
                                </div>
                                <div>
                                  <label className="text-xxs uppercase tracking-wider text-ink-muted">Setup (min)</label>
                                  <input name="tempoSetupMin" type="number" step="1" min="0" defaultValue={m.tempoSetupMin} className="input mt-1" />
                                </div>
                              </div>
                              <div className="flex gap-2 pt-1">
                                <button type="submit" className="btn btn-primary btn-sm flex-1">Salva</button>
                                <form action={deleteMacchina.bind(null, m.id)}>
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
            ) : (
              <p className="px-5 py-3 text-sm text-ink-subtle">Nessuna macchina per questo reparto.</p>
            )}
          </div>
        ))}

        {/* ── Totale ────────────────────────────────────────────────────── */}
        {totMacchine > 0 && (
          <div className="flex items-center justify-between border-t border-line pt-4 max-w-2xl">
            <span className="text-sm text-ink-muted">{totMacchine} macchine totali · {reparti.length} reparti</span>
          </div>
        )}

        {/* ── Nuova macchina ────────────────────────────────────────────── */}
        <div className="border border-line p-6 max-w-lg">
          <h2 className="mb-1">Nuova macchina</h2>
          <p className="text-xs text-ink-muted mb-4">
            Il <strong>tipo operazione</strong> collega la macchina alle skill dei dipendenti e alle fasi del ciclo di lavorazione.
          </p>
          <form action={createMacchina} className="space-y-4">
            <div>
              <label className="text-xxs uppercase tracking-wider text-ink-muted">Reparto</label>
              <select name="repartoId" className="input mt-1" required>
                <option value="">— seleziona —</option>
                {reparti.map((r) => (
                  <option key={r.id} value={r.id}>{r.nome}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Codice</label>
                <input name="codice" placeholder="MAC-07" className="input mt-1" required />
              </div>
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Nome</label>
                <input name="nome" placeholder="Nome macchina" className="input mt-1" required />
              </div>
            </div>
            <div>
              <label className="text-xxs uppercase tracking-wider text-ink-muted">
                Tipo operazione
                <span className="block normal-case text-ink-subtle">usare MAIUSCOLO_CON_UNDERSCORE — es. LAVORAZIONE_CNC</span>
              </label>
              <input name="tipoOperazione" placeholder="LAVORAZIONE_CNC" className="input mt-1 font-mono" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Capacità (min/turno)</label>
                <input name="capacitaMinGiorno" type="number" step="30" min="0" placeholder="480" className="input mt-1" />
              </div>
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Setup (min)</label>
                <input name="tempoSetupMin" type="number" step="1" min="0" placeholder="0" className="input mt-1" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Aggiungi macchina</button>
          </form>
        </div>
      </div>
    </div>
  );
}
