import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  createReparto,
  updateReparto,
  deleteReparto,
  addVoceCostoFisso,
  deleteVoceCostoFisso,
} from "@/app/actions/reparti";

const fmt = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

const fmtN = (n: number) => new Intl.NumberFormat("it-IT").format(n);

export default async function RepartiPage() {
  const reparti = await prisma.reparto.findMany({
    orderBy: { codice: "asc" },
    include: { voceCostiFissi: { orderBy: { importo: "desc" } } },
  });

  const cfTotale = reparti.reduce(
    (s, r) => s + r.voceCostiFissi.reduce((vs, v) => vs + v.importo, 0),
    0,
  );

  return (
    <div>
      <PageHeader
        title="Reparti"
        subtitle="Centri di costo produttivi — tariffe orarie e costi fissi annui"
      />

      <div className="px-8 py-6 space-y-10">

        {reparti.map((r) => {
          const cfReparto = r.voceCostiFissi.reduce((s, v) => s + v.importo, 0);
          return (
            <div key={r.id} className="border border-line">
              {/* Header reparto */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-paper">
                <div>
                  <span className="font-medium">{r.nome}</span>
                  <span className="ml-2 font-mono text-xs text-ink-muted">{r.codice}</span>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  {r.kWInstallata > 0 && r.prezzoEnergia > 0 && (
                    <span className="text-ink-muted">
                      ⚡ Energia:{" "}
                      <span className="num text-ink font-medium">
                        {fmt(r.kWInstallata * r.prezzoEnergia)}/h
                      </span>
                      <span className="text-ink-subtle text-xs ml-1">
                        ({r.kWInstallata}kW×€{r.prezzoEnergia}/kWh)
                      </span>
                    </span>
                  )}
                  <span className="text-ink-muted">
                    Tariffa MdO:{" "}
                    <span className="num text-ink font-medium">{fmt(r.tariffaMdo)}/h</span>
                  </span>
                  <span className="text-ink-muted">
                    CF annui:{" "}
                    <span className="num text-ink font-medium">{fmt(cfReparto)}</span>
                  </span>
                  {r.oreCapacitaAnnua > 0 && cfReparto > 0 && (
                    <span className="text-ink-muted">
                      Tariffa CF:{" "}
                      <span className="num text-ink font-medium">
                        {fmt(cfReparto / r.oreCapacitaAnnua)}/h
                      </span>
                      <span className="text-ink-subtle text-xs ml-1">
                        ({fmtN(r.oreCapacitaAnnua)}h cap.)
                      </span>
                    </span>
                  )}
                  <details className="inline-block relative">
                    <summary className="btn btn-sm btn-ghost cursor-pointer list-none">Modifica tariffe</summary>
                    <div className="absolute right-0 z-10 mt-1 w-72 border border-line bg-paper shadow-lg p-4">
                      <form action={updateReparto.bind(null, r.id)} className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xxs uppercase tracking-wider text-ink-muted">Codice</label>
                            <input name="codice" defaultValue={r.codice} className="input mt-1" />
                          </div>
                          <div>
                            <label className="text-xxs uppercase tracking-wider text-ink-muted">Nome</label>
                            <input name="nome" defaultValue={r.nome} className="input mt-1" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xxs uppercase tracking-wider text-ink-muted">€/h MdO diretta</label>
                          <input name="tariffaMdo" type="number" step="0.01" defaultValue={r.tariffaMdo} className="input mt-1" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xxs uppercase tracking-wider text-ink-muted">⚡ Potenza (kW)</label>
                            <input name="kWInstallata" type="number" step="0.1" min="0" defaultValue={r.kWInstallata} className="input mt-1" />
                          </div>
                          <div>
                            <label className="text-xxs uppercase tracking-wider text-ink-muted">Prezzo energia (€/kWh)</label>
                            <input name="prezzoEnergia" type="number" step="0.001" min="0" defaultValue={r.prezzoEnergia} className="input mt-1" />
                          </div>
                        </div>
                        <div>
                          <label className="text-xxs uppercase tracking-wider text-ink-muted">
                            Capacità (ore/anno)
                          </label>
                          <input name="oreCapacitaAnnua" type="number" step="100" min="0" defaultValue={r.oreCapacitaAnnua} className="input mt-1" />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button type="submit" className="btn btn-primary btn-sm flex-1">Salva</button>
                          <form action={deleteReparto.bind(null, r.id)}>
                            <button type="submit" className="btn btn-danger btn-sm">Elimina</button>
                          </form>
                        </div>
                      </form>
                    </div>
                  </details>
                </div>
              </div>

              {/* Costi Fissi Annui */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs uppercase tracking-wider text-ink-muted">
                    Costi Fissi Annui
                    <span className="ml-2 text-xxs text-ink-subtle">(ammortamenti · stipendi fissi · affitti · canoni)</span>
                  </h3>
                  <span className="num text-sm font-medium">{fmt(cfReparto)}</span>
                </div>

                {r.voceCostiFissi.length > 0 ? (
                  <table className="w-full text-sm mb-3">
                    <tbody>
                      {r.voceCostiFissi.map((v) => (
                        <tr key={v.id} className="border-b border-line/40 group">
                          <td className="py-1.5 text-ink">{v.nome}</td>
                          <td className="py-1.5 num text-ink-muted">{fmt(v.importo)}/anno</td>
                          <td className="py-1.5 text-right w-8">
                            <form action={deleteVoceCostoFisso.bind(null, v.id)} className="inline">
                              <button
                                type="submit"
                                className="text-ink-subtle hover:text-accent-neg text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Elimina voce"
                              >
                                ✕
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-xs text-ink-subtle mb-3">Nessuna voce inserita.</p>
                )}

                <form action={addVoceCostoFisso.bind(null, r.id)} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xxs uppercase tracking-wider text-ink-muted">Descrizione voce</label>
                    <input
                      name="nome"
                      placeholder="es. Ammortamento macchina"
                      className="input mt-1 text-sm"
                      required
                    />
                  </div>
                  <div className="w-36">
                    <label className="text-xxs uppercase tracking-wider text-ink-muted">Importo €/anno</label>
                    <input
                      name="importo"
                      type="number"
                      step="100"
                      min="0"
                      placeholder="0"
                      className="input mt-1 text-sm"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-sm btn-primary whitespace-nowrap">
                    + Aggiungi
                  </button>
                </form>
              </div>

              {/* Nota didattica */}
              <div className="px-5 pb-3 text-xs text-ink-subtle border-t border-line/40 pt-2">
                {r.kWInstallata > 0 && r.prezzoEnergia > 0 ? (
                  <>
                    <span className="font-medium text-ink-muted">⚡ energia:</span>{" "}
                    {r.kWInstallata}kW × {fmt(r.prezzoEnergia)}/kWh = {fmt(r.kWInstallata * r.prezzoEnergia)}/h ·{" "}
                  </>
                ) : null}
                <span className="font-medium text-ink-muted">cv MdO:</span>{" "}
                {fmt(r.tariffaMdo)}/h ·{" "}
                <span className="font-medium text-ink-muted">CF totali:</span>{" "}
                {fmt(cfReparto)}/anno
                {r.oreCapacitaAnnua > 0 && cfReparto > 0 && (
                  <> → tariffa CF: {fmt(cfReparto / r.oreCapacitaAnnua)}/h (predeterminata a capacità)</>
                )}
              </div>
            </div>
          );
        })}

        {reparti.length > 0 && (
          <div className="flex items-center justify-between border-t border-line pt-4 max-w-2xl">
            <span className="text-sm text-ink-muted">{reparti.length} reparti — CF struttura totali annui</span>
            <span className="num font-medium">{fmt(cfTotale)}</span>
          </div>
        )}

        {/* Nuovo reparto */}
        <div className="border border-line p-6 max-w-lg">
          <h2 className="mb-1">Nuovo reparto</h2>
          <p className="text-xs text-ink-muted mb-4">
            Inserisci tariffa MdO ed energia. I costi fissi si aggiungono dopo aver creato il reparto.
          </p>
          <form action={createReparto} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Codice</label>
                <input name="codice" placeholder="REP-04" className="input mt-1" required />
              </div>
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Nome</label>
                <input name="nome" placeholder="Nome reparto" className="input mt-1" required />
              </div>
            </div>
            <div>
              <label className="text-xxs uppercase tracking-wider text-ink-muted">Tariffa MdO (€/h)</label>
              <input name="tariffaMdo" type="number" step="0.01" min="0" placeholder="0.00" className="input mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">
                  ⚡ Potenza installata (kW)
                  <span className="block normal-case text-ink-subtle">0 = non configurato</span>
                </label>
                <input name="kWInstallata" type="number" step="0.1" min="0" placeholder="0" className="input mt-1" />
              </div>
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">
                  Prezzo energia (€/kWh)
                </label>
                <input name="prezzoEnergia" type="number" step="0.001" min="0" placeholder="0.28" className="input mt-1" />
              </div>
            </div>
            <div>
              <label className="text-xxs uppercase tracking-wider text-ink-muted">
                Capacità disponibile (ore/anno)
                <span className="block normal-case text-ink-subtle">
                  usata per la tariffa CF predeterminata
                </span>
              </label>
              <input name="oreCapacitaAnnua" type="number" step="100" min="0" placeholder="es. 2000" className="input mt-1" />
            </div>
            <button type="submit" className="btn btn-primary">Aggiungi reparto</button>
          </form>
        </div>
      </div>
    </div>
  );
}
