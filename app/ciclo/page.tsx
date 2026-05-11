import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { upsertOperazione, deleteOperazione } from "@/app/actions/ciclo";

const fmtMin = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h ${(m % 60).toFixed(0)}min` : `${m.toFixed(1)} min`;

const fmtEur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

/** Giorni lavorativi approssimativi tra due date (5/7 × giorni calendario) */
function giorniLavorativi(inizio: Date | null, fine: Date | null): number | null {
  if (!inizio || !fine) return null;
  const ms = fine.getTime() - inizio.getTime();
  if (ms <= 0) return null;
  return Math.round((ms / 86_400_000) * (5 / 7));
}

export default async function CicloPage() {
  const [prodotti, macchine] = await Promise.all([
    prisma.prodotto.findMany({
      orderBy: { codice: "asc" },
      include: {
        operazioniCiclo: {
          orderBy: { sequenza: "asc" },
          include: { macchina: { include: { reparto: true } } },
        },
      },
    }),
    prisma.macchina.findMany({ orderBy: { tipoOperazione: "asc" } }),
  ]);

  const tipiOperazione = Array.from(new Set(macchine.map((m) => m.tipoOperazione)));

  return (
    <div>
      <PageHeader
        title="Ciclo di lavorazione"
        subtitle="Scheda tempi per commessa — sequenza operazioni, SAM, takt time e bottleneck"
      />

      <div className="px-8 py-6 space-y-10">
        {prodotti.map((p) => {
          const ops       = p.operazioniCiclo;
          const samTotale = ops.reduce((s, o) => s + o.tempoStdMin, 0);
          const setupTotale = ops.reduce((s, o) => s + o.tempoSetupMin, 0);
          const bottleneck = ops.length > 0
            ? ops.reduce((max, o) => o.tempoStdMin > max.tempoStdMin ? o : max, ops[0])
            : null;

          // Takt time
          const gg = giorniLavorativi(p.dataInizio, p.dataFine);
          const minutiDisponibili = gg != null ? gg * 480 : null;
          const taktTime = minutiDisponibili != null && p.quantita > 0
            ? minutiDisponibili / p.quantita
            : null;
          const nOperatoriOttimale = taktTime != null && samTotale > 0
            ? samTotale / taktTime
            : null;
          const efficienzaLinea = taktTime != null && nOperatoriOttimale != null
            ? (samTotale / (Math.ceil(nOperatoriOttimale) * taktTime)) * 100
            : null;

          // Prossima sequenza disponibile
          const nextSeq = ops.length > 0 ? Math.max(...ops.map((o) => o.sequenza)) + 1 : 1;

          return (
            <div key={p.id} className="border border-line">
              {/* Header commessa */}
              <div className="flex items-start justify-between px-5 py-4 border-b border-line bg-paper">
                <div>
                  <span className="font-medium">{p.nome}</span>
                  <span className="ml-2 font-mono text-xs text-ink-muted">{p.codice}</span>
                  {p.cliente && <span className="ml-2 text-xs text-ink-muted">· {p.cliente}</span>}
                </div>

                {/* KPI takt/bottleneck */}
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <div className="text-xxs uppercase tracking-wider text-ink-muted">SAM totale</div>
                    <div className="num font-medium">{samTotale > 0 ? fmtMin(samTotale) : "—"}</div>
                  </div>
                  {taktTime != null && (
                    <div className="text-right">
                      <div className="text-xxs uppercase tracking-wider text-ink-muted">Takt time</div>
                      <div className={`num font-medium ${samTotale > taktTime ? "num-neg" : "num-pos"}`}>
                        {fmtMin(taktTime)}/u
                      </div>
                    </div>
                  )}
                  {nOperatoriOttimale != null && (
                    <div className="text-right">
                      <div className="text-xxs uppercase tracking-wider text-ink-muted">Operatori ottimali</div>
                      <div className="num font-medium">
                        {Math.ceil(nOperatoriOttimale)}
                        <span className="text-xs text-ink-muted ml-1">({nOperatoriOttimale.toFixed(1)})</span>
                      </div>
                    </div>
                  )}
                  {efficienzaLinea != null && (
                    <div className="text-right">
                      <div className="text-xxs uppercase tracking-wider text-ink-muted">Eff. linea</div>
                      <div className={`num font-medium ${efficienzaLinea >= 85 ? "num-pos" : "num-neg"}`}>
                        {efficienzaLinea.toFixed(0)}%
                      </div>
                    </div>
                  )}
                  {bottleneck && samTotale > 0 && (
                    <div className="text-right">
                      <div className="text-xxs uppercase tracking-wider text-ink-muted">Bottleneck</div>
                      <div className="text-xs font-medium text-ink truncate max-w-[120px]" title={bottleneck.nome}>
                        {bottleneck.nome}
                      </div>
                      <div className="num text-xs text-ink-muted">{fmtMin(bottleneck.tempoStdMin)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabella operazioni */}
              {ops.length > 0 ? (
                <table className="w-full text-sm">
                  <thead className="border-b border-line">
                    <tr>
                      <th className="px-3 py-2 text-left w-10">Seq.</th>
                      <th className="px-3 py-2 text-left">Operazione</th>
                      <th className="px-3 py-2 text-left">Tipo</th>
                      <th className="px-3 py-2 text-left">Macchina</th>
                      <th className="px-3 py-2 text-right">SAM</th>
                      <th className="px-3 py-2 text-right">Setup</th>
                      <th className="px-3 py-2 text-right w-10">
                        {/* barra proporzionale */}
                      </th>
                      <th className="px-3 py-2 w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ops.map((o) => {
                      const barPerc = samTotale > 0 ? (o.tempoStdMin / samTotale) * 100 : 0;
                      const isBottleneck = o.id === bottleneck?.id && ops.length > 1;
                      return (
                        <tr key={o.id} className={`border-b border-line/50 ${isBottleneck ? "bg-accent-neg/5" : ""}`}>
                          <td className="px-3 py-2 num text-ink-muted">{o.sequenza}</td>
                          <td className="px-3 py-2 font-medium">
                            {o.nome}
                            {isBottleneck && (
                              <span className="ml-1.5 text-xxs text-accent-neg uppercase tracking-wider">bottleneck</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className="font-mono text-xs bg-line px-1.5 py-0.5">{o.tipoOperazione}</span>
                          </td>
                          <td className="px-3 py-2 text-xs text-ink-muted">
                            {o.macchina ? (
                              <>{o.macchina.nome} <span className="text-ink-subtle">({o.macchina.reparto.nome})</span></>
                            ) : "—"}
                          </td>
                          <td className="px-3 py-2 num font-medium">{fmtMin(o.tempoStdMin)}</td>
                          <td className="px-3 py-2 num text-ink-muted">{o.tempoSetupMin > 0 ? `${o.tempoSetupMin} min` : "—"}</td>
                          <td className="px-3 py-2 align-middle w-20">
                            <div className="w-full h-1.5 bg-line">
                              <div
                                className={`h-full ${isBottleneck ? "bg-accent-neg" : "bg-ink"}`}
                                style={{ width: `${barPerc.toFixed(1)}%` }}
                              />
                            </div>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <form action={deleteOperazione.bind(null, o.id)}>
                              <button type="submit" className="text-ink-subtle hover:text-accent-neg text-xs" title="Elimina">✕</button>
                            </form>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-line font-medium">
                      <td colSpan={4} className="px-3 py-2 text-xs text-ink-muted">
                        Totale · {ops.length} operazioni · setup: {fmtMin(setupTotale)}
                      </td>
                      <td className="px-3 py-2 num">{fmtMin(samTotale)}</td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              ) : (
                <p className="px-5 py-3 text-sm text-ink-subtle">
                  Nessuna operazione — aggiungi le fasi del ciclo di lavorazione.
                </p>
              )}

              {/* Form aggiunta operazione */}
              <div className="px-5 py-4 border-t border-line/40 bg-paper/50">
                <form action={upsertOperazione.bind(null, p.id)} className="flex flex-wrap gap-3 items-end">
                  <div className="w-14">
                    <label className="text-xxs uppercase tracking-wider text-ink-muted">Seq.</label>
                    <input name="sequenza" type="number" min="1" defaultValue={nextSeq} className="input mt-1 text-sm text-center" required />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <label className="text-xxs uppercase tracking-wider text-ink-muted">Operazione</label>
                    <input name="nome" placeholder="es. Fresatura profili" className="input mt-1 text-sm" required />
                  </div>
                  <div className="w-44">
                    <label className="text-xxs uppercase tracking-wider text-ink-muted">Tipo operazione</label>
                    <input name="tipoOperazione" list="tipi-op-list" placeholder="LAVORAZIONE_CNC" className="input mt-1 text-sm font-mono" required />
                    <datalist id="tipi-op-list">
                      {tipiOperazione.map((t) => <option key={t} value={t} />)}
                    </datalist>
                  </div>
                  <div className="w-28">
                    <label className="text-xxs uppercase tracking-wider text-ink-muted">SAM (min/u)</label>
                    <input name="tempoStdMin" type="number" step="0.1" min="0" placeholder="30" className="input mt-1 text-sm" required />
                  </div>
                  <div className="w-24">
                    <label className="text-xxs uppercase tracking-wider text-ink-muted">Setup (min)</label>
                    <input name="tempoSetupMin" type="number" step="1" min="0" placeholder="0" className="input mt-1 text-sm" />
                  </div>
                  <div className="w-44">
                    <label className="text-xxs uppercase tracking-wider text-ink-muted">Macchina (opz.)</label>
                    <select name="macchinaId" className="input mt-1 text-sm">
                      <option value="">— qualsiasi —</option>
                      {macchine.map((m) => (
                        <option key={m.id} value={m.id}>{m.nome} ({m.tipoOperazione})</option>
                      ))}
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary btn-sm whitespace-nowrap">
                    + Aggiungi fase
                  </button>
                </form>
              </div>
            </div>
          );
        })}

        {prodotti.length === 0 && (
          <div className="text-sm text-ink-muted">
            Inserisci almeno una commessa nella sezione{" "}
            <a href="/prodotti" className="underline underline-offset-2">Commesse</a> per configurare il ciclo di lavorazione.
          </div>
        )}
      </div>
    </div>
  );
}
