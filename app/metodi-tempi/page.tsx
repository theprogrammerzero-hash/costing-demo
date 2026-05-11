import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";

const fmtEur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
const fmtMin = (m: number) =>
  m >= 60 ? `${Math.floor(m / 60)}h ${(m % 60).toFixed(0)}min` : `${m.toFixed(1)}min`;

function giorniLavorativi(inizio: Date | null, fine: Date | null): number | null {
  if (!inizio || !fine) return null;
  const ms = fine.getTime() - inizio.getTime();
  if (ms <= 0) return null;
  return Math.round((ms / 86_400_000) * (5 / 7));
}

export default async function MetodiTempiPage() {
  const [prodotti, dipendenti, macchine] = await Promise.all([
    prisma.prodotto.findMany({
      orderBy: { codice: "asc" },
      include: {
        operazioniCiclo: {
          orderBy: { sequenza: "asc" },
          include: { macchina: { include: { reparto: true } } },
        },
      },
    }),
    prisma.dipendente.findMany({
      orderBy: { matricola: "asc" },
      include: { skills: true },
    }),
    prisma.macchina.findMany({
      include: { reparto: true },
    }),
  ]);

  // ── Helper: migliore operatore per tipo operazione ─────────────────
  function bestOperator(tipoOp: string) {
    const qualified = dipendenti
      .filter((d) => d.skills.some((s) => s.tipoOperazione === tipoOp))
      .sort((a, b) => b.efficienzaPerc - a.efficienzaPerc);
    return qualified.length > 0 ? qualified : null;
  }

  // ── Carico macchine: ore necessarie per commessa ─────────────────────
  // macchinaId → { minNecessari, commesse[] }
  type CaricoEntry = { macchina: typeof macchine[0]; minNecessari: number; commesse: string[] };
  const caricoMap = new Map<string, CaricoEntry>();
  for (const p of prodotti) {
    for (const op of p.operazioniCiclo) {
      if (!op.macchinaId || !op.macchina) continue;
      const entry = caricoMap.get(op.macchinaId) ?? {
        macchina: op.macchina,
        minNecessari: 0,
        commesse: [],
      };
      entry.minNecessari += op.tempoStdMin * p.quantita;
      if (!entry.commesse.includes(p.codice)) entry.commesse.push(p.codice);
      caricoMap.set(op.macchinaId, entry);
    }
  }

  // Minuti disponibili per macchina sull'anno (250 giorni lav.)
  const minDisponibiliAnno = (mac: typeof macchine[0]) => mac.capacitaMinGiorno * 250;

  // ── Copertura skill ──────────────────────────────────────────────────
  const tipiRichiesti = Array.from(
    new Set(prodotti.flatMap((p) => p.operazioniCiclo.map((o) => o.tipoOperazione))),
  ).sort();

  return (
    <div>
      <PageHeader
        title="Metodi & Tempi — Analisi"
        subtitle="Assegnazione ottimale operatori · carico macchine · copertura skill"
      />

      <div className="px-8 py-6 space-y-10">

        {/* ══ PER COMMESSA: assegnazione e costo MdO ═══════════════════ */}
        {prodotti.map((p) => {
          const ops = p.operazioniCiclo;
          if (ops.length === 0) return null;

          const gg = giorniLavorativi(p.dataInizio, p.dataFine);
          const taktTime = gg != null && p.quantita > 0 ? (gg * 480) / p.quantita : null;
          const samTotale = ops.reduce((s, o) => s + o.tempoStdMin, 0);

          // Costo MdO totale per unità (usando operatore consigliato)
          let costoMdoTotUnit = 0;
          const righe = ops.map((op) => {
            const candidati = bestOperator(op.tipoOperazione);
            const best = candidati?.[0] ?? null;
            const tempoEff = best
              ? op.tempoStdMin / (best.efficienzaPerc / 100)
              : op.tempoStdMin;
            const costoUnit = best && best.costoOrario > 0
              ? (tempoEff / 60) * best.costoOrario
              : null;
            if (costoUnit != null) costoMdoTotUnit += costoUnit;
            const noCopertura = !candidati || candidati.length === 0;
            return { op, best, candidati, tempoEff, costoUnit, noCopertura };
          });

          return (
            <div key={p.id} className="border border-line">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-paper">
                <div>
                  <span className="font-medium">{p.nome}</span>
                  <span className="ml-2 font-mono text-xs text-ink-muted">{p.codice}</span>
                  {p.cliente && <span className="ml-2 text-xs text-ink-muted">· {p.cliente}</span>}
                </div>
                <div className="flex items-center gap-5 text-sm">
                  <div className="text-right">
                    <div className="text-xxs uppercase tracking-wider text-ink-muted">SAM totale</div>
                    <div className="num font-medium">{fmtMin(samTotale)}</div>
                  </div>
                  {taktTime != null && (
                    <div className="text-right">
                      <div className="text-xxs uppercase tracking-wider text-ink-muted">Takt</div>
                      <div className={`num font-medium ${samTotale > taktTime ? "num-neg" : "num-pos"}`}>
                        {fmtMin(taktTime)}/u
                      </div>
                    </div>
                  )}
                  {costoMdoTotUnit > 0 && (
                    <div className="text-right">
                      <div className="text-xxs uppercase tracking-wider text-ink-muted">Costo MdO/u</div>
                      <div className="num font-medium">{fmtEur(costoMdoTotUnit)}</div>
                    </div>
                  )}
                  {costoMdoTotUnit > 0 && (
                    <div className="text-right">
                      <div className="text-xxs uppercase tracking-wider text-ink-muted">Costo MdO tot.</div>
                      <div className="num font-medium">{fmtEur(costoMdoTotUnit * p.quantita)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabella operazioni + assegnazione */}
              <table className="w-full text-sm">
                <thead className="border-b border-line">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">Seq.</th>
                    <th className="px-3 py-2 text-left">Operazione</th>
                    <th className="px-3 py-2 text-left">SAM std.</th>
                    <th className="px-3 py-2 text-left">Operatore consigliato</th>
                    <th className="px-3 py-2 text-right">Eff.</th>
                    <th className="px-3 py-2 text-right">Tempo eff.</th>
                    <th className="px-3 py-2 text-right">Costo MdO/u</th>
                    <th className="px-3 py-2 text-left">Alternativa</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map(({ op, best, candidati, tempoEff, costoUnit, noCopertura }) => (
                    <tr key={op.id} className={`border-b border-line/50 ${noCopertura ? "bg-accent-neg/5" : ""}`}>
                      <td className="px-3 py-2 num text-ink-muted">{op.sequenza}</td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{op.nome}</div>
                        <div className="text-xxs font-mono text-ink-subtle">{op.tipoOperazione}</div>
                      </td>
                      <td className="px-3 py-2 num">{fmtMin(op.tempoStdMin)}</td>
                      <td className="px-3 py-2">
                        {noCopertura ? (
                          <span className="text-xs text-accent-neg font-medium">⚠ Nessun operatore qualificato</span>
                        ) : (
                          <span className="font-medium">{best!.nome}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {best ? (
                          <span className={`num text-xs ${best.efficienzaPerc >= 100 ? "num-pos" : best.efficienzaPerc < 85 ? "num-neg" : ""}`}>
                            {best.efficienzaPerc}%
                          </span>
                        ) : "—"}
                      </td>
                      <td className="px-3 py-2 num">
                        <span className={best && best.efficienzaPerc < 100 ? "num-neg" : ""}>
                          {fmtMin(tempoEff)}
                        </span>
                      </td>
                      <td className="px-3 py-2 num">
                        {costoUnit != null ? fmtEur(costoUnit) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs text-ink-muted">
                        {candidati && candidati.length > 1
                          ? candidati.slice(1, 3).map((c) => `${c.nome} (${c.efficienzaPerc}%)`).join(" · ")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line bg-paper font-medium">
                    <td colSpan={2} className="px-3 py-2 text-xs text-ink-muted">Totale commessa</td>
                    <td className="px-3 py-2 num">{fmtMin(samTotale)}</td>
                    <td colSpan={3}></td>
                    <td className="px-3 py-2 num">{costoMdoTotUnit > 0 ? fmtEur(costoMdoTotUnit) : "—"}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}

        {/* ══ CARICO MACCHINE ═══════════════════════════════════════════ */}
        {caricoMap.size > 0 && (
          <div>
            <h2 className="mb-4">Carico macchine — ore necessarie vs capacità annua</h2>
            <div className="border border-line">
              <table className="table-zebra w-full">
                <thead>
                  <tr>
                    <th>Macchina</th>
                    <th>Reparto</th>
                    <th>Tipo operazione</th>
                    <th className="text-right">Ore necessarie</th>
                    <th className="text-right">Capacità annua</th>
                    <th className="text-right">Carico %</th>
                    <th>Commesse</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from(caricoMap.values())
                    .sort((a, b) => (b.minNecessari / minDisponibiliAnno(b.macchina)) - (a.minNecessari / minDisponibiliAnno(a.macchina)))
                    .map(({ macchina, minNecessari, commesse }) => {
                      const minDisp  = minDisponibiliAnno(macchina);
                      const caricoPerc = minDisp > 0 ? (minNecessari / minDisp) * 100 : 0;
                      const overload   = caricoPerc > 100;
                      const oreNec     = minNecessari / 60;
                      const oreDisp    = minDisp / 60;
                      return (
                        <tr key={macchina.id}>
                          <td className="font-medium">{macchina.nome}</td>
                          <td className="text-ink-muted text-sm">{macchina.reparto.nome}</td>
                          <td><span className="font-mono text-xs bg-line px-1.5 py-0.5">{macchina.tipoOperazione}</span></td>
                          <td className={`num ${overload ? "num-neg" : ""}`}>{oreNec.toFixed(0)} h</td>
                          <td className="num text-ink-muted">{oreDisp.toFixed(0)} h</td>
                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-20 h-1.5 bg-line">
                                <div
                                  className={`h-full ${overload ? "bg-accent-neg" : caricoPerc > 80 ? "bg-ink" : "bg-ink/50"}`}
                                  style={{ width: `${Math.min(100, caricoPerc).toFixed(1)}%` }}
                                />
                              </div>
                              <span className={`num text-xs ${overload ? "num-neg font-medium" : ""}`}>
                                {caricoPerc.toFixed(0)}%
                                {overload && " ⚠"}
                              </span>
                            </div>
                          </td>
                          <td className="text-xs text-ink-muted">{commesse.join(" · ")}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ COPERTURA SKILL ════════════════════════════════════════════ */}
        {tipiRichiesti.length > 0 && (
          <div>
            <h2 className="mb-4">Copertura skill — operatori disponibili per tipo operazione</h2>
            <div className="grid grid-cols-2 gap-4 max-w-3xl">
              {tipiRichiesti.map((tipo) => {
                const qualificati = dipendenti.filter((d) =>
                  d.skills.some((s) => s.tipoOperazione === tipo),
                );
                const ok = qualificati.length >= 2; // almeno 2 per ridondanza
                return (
                  <div
                    key={tipo}
                    className={`border px-4 py-3 flex items-center justify-between ${ok ? "border-line" : "border-accent-neg/40 bg-accent-neg/5"}`}
                  >
                    <div>
                      <div className="font-mono text-xs">{tipo}</div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {qualificati.length > 0
                          ? qualificati.map((d) => `${d.nome} (${d.efficienzaPerc}%)`).join(" · ")
                          : "Nessun operatore qualificato"}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ml-4 ${ok ? "num-pos" : qualificati.length === 1 ? "" : "num-neg"}`}>
                      {qualificati.length === 0
                        ? "⚠ 0"
                        : qualificati.length === 1
                        ? `⚡ 1`
                        : `✓ ${qualificati.length}`}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              ✓ = 2+ operatori (copertura adeguata) · ⚡ = 1 operatore (rischio assenza) · ⚠ = nessuno (blocco produzione)
            </p>
          </div>
        )}

        {prodotti.every((p) => p.operazioniCiclo.length === 0) && (
          <div className="text-sm text-ink-muted">
            Configura il ciclo di lavorazione in{" "}
            <a href="/ciclo" className="underline underline-offset-2">Ciclo di lavorazione</a>{" "}
            per avviare l&apos;analisi.
          </div>
        )}
      </div>
    </div>
  );
}
