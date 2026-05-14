import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  createDipendente, updateDipendente, deleteDipendente,
  addSkill, removeSkill,
} from "@/app/actions/dipendenti";

export default async function DipendentiPage() {
  const [dipendenti, reparti] = await Promise.all([
    prisma.dipendente.findMany({
      orderBy: { matricola: "asc" },
      include: { skills: true },
    }),
    prisma.reparto.findMany({ orderBy: { codice: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Dipendenti"
        subtitle="Anagrafica operatori — matricola, efficienza e skill per reparto"
      />

      <div className="px-8 py-6 space-y-8">

        {dipendenti.length > 0 && (
          <div className="space-y-4">
            {dipendenti.map((d) => {
              const skillSet = new Set(d.skills.map((s) => s.repartoId));
              return (
                <div key={d.id} className="border border-line">
                  {/* Header */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-paper">
                    <div>
                      <span className="font-medium">{d.nome}</span>
                      <span className="ml-2 font-mono text-xs text-ink-muted">{d.matricola}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-ink-muted">
                        Efficienza:{" "}
                        <span className={`num font-medium ${d.efficienzaPerc >= 100 ? "num-pos" : d.efficienzaPerc < 85 ? "num-neg" : ""}`}>
                          {d.efficienzaPerc}%
                        </span>
                      </span>
                      {d.costoOrario > 0 && (
                        <span className="text-sm text-ink-muted">
                          <span className="num font-medium">€{d.costoOrario}</span>/h
                        </span>
                      )}
                      <details className="inline-block relative">
                        <summary className="btn btn-sm btn-ghost cursor-pointer list-none">Modifica</summary>
                        <div className="absolute right-0 z-10 mt-1 w-72 border border-line bg-paper shadow-lg p-4">
                          <form action={updateDipendente.bind(null, d.id)} className="space-y-3">
                            <div>
                              <label className="text-xxs uppercase tracking-wider text-ink-muted">Nome</label>
                              <input name="nome" defaultValue={d.nome} className="input mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-xxs uppercase tracking-wider text-ink-muted">Matricola</label>
                                <input name="matricola" defaultValue={d.matricola} className="input mt-1 font-mono" />
                              </div>
                              <div>
                                <label className="text-xxs uppercase tracking-wider text-ink-muted">Efficienza %</label>
                                <input name="efficienzaPerc" type="number" step="1" min="50" max="150" defaultValue={d.efficienzaPerc} className="input mt-1" />
                              </div>
                            </div>
                            <div>
                              <label className="text-xxs uppercase tracking-wider text-ink-muted">Costo orario (€/h)</label>
                              <input name="costoOrario" type="number" step="0.50" min="0" defaultValue={d.costoOrario} className="input mt-1" />
                            </div>
                            <div className="flex gap-2 pt-1">
                              <button type="submit" className="btn btn-primary btn-sm flex-1">Salva</button>
                              <form action={deleteDipendente.bind(null, d.id)}>
                                <button type="submit" className="btn btn-danger btn-sm">Elimina</button>
                              </form>
                            </div>
                          </form>
                        </div>
                      </details>
                    </div>
                  </div>

                  {/* Skill matrix — per reparto */}
                  <div className="px-5 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {d.skills.length === 0 && (
                        <span className="text-xs text-ink-subtle">Nessuna skill — aggiungi i reparti dove opera</span>
                      )}
                      {d.skills.map((s) => {
                        const reparto = reparti.find((r) => r.id === s.repartoId);
                        return (
                          <form key={s.id} action={removeSkill.bind(null, s.id)} className="inline">
                            <button
                              type="submit"
                              title="Rimuovi skill"
                              className="inline-flex items-center gap-1 text-xs bg-line px-2 py-0.5 hover:bg-accent-neg/10 hover:text-accent-neg transition-colors"
                            >
                              {reparto?.nome ?? s.repartoId}
                              <span className="text-ink-subtle ml-1">✕</span>
                            </button>
                          </form>
                        );
                      })}

                      {/* Aggiungi skill (reparto) */}
                      {reparti.filter((r) => !skillSet.has(r.id)).length > 0 && (
                        <form action={addSkill.bind(null, d.id)} className="inline-flex items-center gap-1 ml-2">
                          <select name="repartoId" className="input text-xs py-0.5 w-40">
                            <option value="">+ reparto…</option>
                            {reparti
                              .filter((r) => !skillSet.has(r.id))
                              .map((r) => (
                                <option key={r.id} value={r.id}>{r.nome}</option>
                              ))}
                          </select>
                          <button type="submit" className="btn btn-sm">+</button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Nuovo dipendente */}
        <div className="border border-line p-6 max-w-lg">
          <h2 className="mb-1">Nuovo dipendente</h2>
          <p className="text-xs text-ink-muted mb-4">
            L&apos;efficienza esprime la velocità rispetto al tempo standard (100% = standard, 85% = 15% più lento).
          </p>
          <form action={createDipendente} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Nome</label>
                <input name="nome" placeholder="Nome Cognome" className="input mt-1" required />
              </div>
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Matricola</label>
                <input name="matricola" placeholder="DIP-006" className="input mt-1 font-mono" required />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Efficienza % (default 100)</label>
                <input name="efficienzaPerc" type="number" step="1" min="50" max="150" placeholder="100" className="input mt-1" />
              </div>
              <div>
                <label className="text-xxs uppercase tracking-wider text-ink-muted">Costo orario (€/h)</label>
                <input name="costoOrario" type="number" step="0.50" min="0" placeholder="20.00" className="input mt-1" />
              </div>
            </div>
            <button type="submit" className="btn btn-primary">Aggiungi dipendente</button>
          </form>
        </div>

        {/* Skill matrix riepilogativa */}
        {dipendenti.length > 0 && reparti.length > 0 && (
          <div>
            <h2 className="mb-3">Skill matrix — riepilogo per reparto</h2>
            <div className="overflow-x-auto">
              <table className="table-zebra text-sm">
                <thead>
                  <tr>
                    <th>Dipendente</th>
                    <th className="text-right">Eff.%</th>
                    {reparti.map((r) => (
                      <th key={r.id} className="text-center text-xxs normal-case font-normal tracking-normal">
                        {r.nome}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dipendenti.map((d) => {
                    const skillSet = new Set(d.skills.map((s) => s.repartoId));
                    return (
                      <tr key={d.id}>
                        <td className="font-medium">{d.nome}</td>
                        <td className={`num ${d.efficienzaPerc >= 100 ? "num-pos" : d.efficienzaPerc < 85 ? "num-neg" : ""}`}>
                          {d.efficienzaPerc}%
                        </td>
                        {reparti.map((r) => (
                          <td key={r.id} className="text-center">
                            {skillSet.has(r.id)
                              ? <span className="text-accent-pos font-medium">✓</span>
                              : <span className="text-ink-subtle">—</span>
                            }
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
