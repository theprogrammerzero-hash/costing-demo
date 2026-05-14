import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";

const fmtEur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

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
        fasi: {
          orderBy: { sequenza: "asc" },
          include: { reparto: true, macchina: true },
        },
      },
    }),
    prisma.dipendente.findMany({
      orderBy: { matricola: "asc" },
      include: { skills: true },
    }),
    prisma.macchina.findMany({ include: { reparto: true } }),
  ]);

  // Helper: operatori qualificati per un reparto
  function operatoriPerReparto(repartoId: string) {
    return dipendenti
      .filter((d) => d.skills.some((s) => s.repartoId === repartoId))
      .sort((a, b) => b.efficienzaPerc - a.efficienzaPerc);
  }

  // Mappa macchine per lookup veloce (include reparto)
  const macchinaById = new Map(macchine.map((m) => [m.id, m]));

  // Carico macchine: macchinaId → { minNecessari (= ore × 60), commesse[] }
  type CaricoEntry = { macchina: typeof macchine[0]; minNecessari: number; commesse: string[] };
  const caricoMap = new Map<string, CaricoEntry>();
  for (const p of prodotti) {
    for (const f of p.fasi) {
      if (!f.macchinaId) continue;
      const mac = macchinaById.get(f.macchinaId);
      if (!mac) continue;
      const entry = caricoMap.get(f.macchinaId) ?? {
        macchina: mac,
        minNecessari: 0,
        commesse: [],
      };
      entry.minNecessari += f.tempoOre * 60 * p.quantita;
      if (!entry.commesse.includes(p.codice)) entry.commesse.push(p.codice);
      caricoMap.set(f.macchinaId, entry);
    }
  }

  const minDisponibiliAnno = (mac: typeof macchine[0]) => mac.capacitaMinGiorno * 250;

  // Reparti richiesti dalle fasi
  const repartiRichiesti = await prisma.reparto.findMany({
    where: { id: { in: Array.from(new Set(prodotti.flatMap((p) => p.fasi.map((f) => f.repartoId)))) } },
    orderBy: { codice: "asc" },
  });

  return (
    <div>
      <PageHeader
        title="Metodi & Tempi — Analisi"
        subtitle="Assegnazione ottimale operatori · carico macchine · copertura skill per reparto"
      />

      <div className="px-8 py-6 space-y-10">

        {/* ══ PER COMMESSA ═══════════════════════════════════════════════ */}
        {prodotti.map((p) => {
          const fasi = p.fasi;
          if (fasi.length === 0) return null;

          const gg = giorniLavorativi(p.dataInizio, p.dataFine);
          const taktTime = gg != null && p.quantita > 0 ? (gg * 480) / p.quantita : null;
          const totOre = fasi.reduce((s, f) => s + f.tempoOre, 0);

          // Costo MdO per unità (usando operatore consigliato per reparto)
          let costoMdoTotUnit = 0;
          const righe = fasi.map((f) => {
            const candidati = operatoriPerReparto(f.repartoId);
            const best = candidati[0] ?? null;
            const tempoEff = best
              ? f.tempoOre / (best.efficienzaPerc / 100)
              : f.tempoOre;
            const costoUnit = best && best.costoOrario > 0
              ? tempoEff * best.costoOrario
              : null;
            if (costoUnit != null) costoMdoTotUnit += costoUnit;
            const noCopertura = candidati.length === 0;
            return { f, best, candidati, tempoEff, costoUnit, noCopertura };
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
                    <div className="text-xxs uppercase tracking-wider text-ink-muted">Min tot./pz</div>
                    <div className="num font-medium">{Math.round(totOre * 60)} min</div>
                  </div>
                  {taktTime != null && (
                    <div className="text-right">
                      <div className="text-xxs uppercase tracking-wider text-ink-muted">Takt time</div>
                      <div className={`num font-medium ${totOre * 60 > taktTime ? "num-neg" : "num-pos"}`}>
                        {taktTime.toFixed(0)}min/u
                      </div>
                    </div>
                  )}
                  {costoMdoTotUnit > 0 && (
                    <div className="text-right">
                      <div className="text-xxs uppercase tracking-wider text-ink-muted">Costo MdO/u</div>
                      <div className="num font-medium">{fmtEur(costoMdoTotUnit)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabella fasi + assegnazione */}
              <table className="w-full text-sm">
                <thead className="border-b border-line">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">#</th>
                    <th className="px-3 py-2 text-left">Fase</th>
                    <th className="px-3 py-2 text-left">Reparto</th>
                    <th className="px-3 py-2 text-right">min/pz std.</th>
                    <th className="px-3 py-2 text-left">Operatore consigliato</th>
                    <th className="px-3 py-2 text-right">Eff.</th>
                    <th className="px-3 py-2 text-right">min/pz eff.</th>
                    <th className="px-3 py-2 text-right">Costo MdO/u</th>
                  </tr>
                </thead>
                <tbody>
                  {righe.map(({ f, best, candidati, tempoEff, costoUnit, noCopertura }) => (
                    <tr key={f.id} className={`border-b border-line/50 ${noCopertura ? "bg-accent-neg/5" : ""}`}>
                      <td className="px-3 py-2 num text-ink-muted">{f.sequenza}</td>
                      <td className="px-3 py-2 font-medium">{f.nome}</td>
                      <td className="px-3 py-2 text-ink-muted text-xs">{f.reparto.nome}</td>
                      <td className="px-3 py-2 num">{Math.round(f.tempoOre * 60)} min</td>
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
                          {Math.round(tempoEff * 60)} min
                        </span>
                      </td>
                      <td className="px-3 py-2 num">
                        {costoUnit != null ? fmtEur(costoUnit) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-line bg-paper font-medium text-xs">
                    <td colSpan={3} className="px-3 py-2 text-ink-muted">Totale commessa</td>
                    <td className="px-3 py-2 num">{Math.round(totOre * 60)} min</td>
                    <td colSpan={3}></td>
                    <td className="px-3 py-2 num">{costoMdoTotUnit > 0 ? fmtEur(costoMdoTotUnit) : "—"}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          );
        })}

        {/* ══ CARICO MACCHINE ════════════════════════════════════════════ */}
        {caricoMap.size > 0 && (
          <div>
            <h2 className="mb-4">Carico macchine — ore necessarie vs capacità annua (250 gg)</h2>
            <div className="border border-line">
              <table className="table-zebra w-full">
                <thead>
                  <tr>
                    <th>Macchina</th>
                    <th>Reparto</th>
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
                      const minDisp    = minDisponibiliAnno(macchina);
                      const caricoPerc = minDisp > 0 ? (minNecessari / minDisp) * 100 : 0;
                      const overload   = caricoPerc > 100;
                      return (
                        <tr key={macchina.id}>
                          <td className="font-medium">{macchina.nome}</td>
                          <td className="text-ink-muted text-sm">{macchina.reparto.nome}</td>
                          <td className={`num ${overload ? "num-neg" : ""}`}>{(minNecessari / 60).toFixed(0)} h</td>
                          <td className="num text-ink-muted">{(minDisp / 60).toFixed(0)} h</td>
                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex items-center gap-2 justify-end">
                              <div className="w-20 h-1.5 bg-line">
                                <div
                                  className={`h-full ${overload ? "bg-accent-neg" : caricoPerc > 80 ? "bg-ink" : "bg-ink/50"}`}
                                  style={{ width: `${Math.min(100, caricoPerc).toFixed(1)}%` }}
                                />
                              </div>
                              <span className={`num text-xs ${overload ? "num-neg font-medium" : ""}`}>
                                {caricoPerc.toFixed(0)}%{overload && " ⚠"}
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

        {/* ══ COPERTURA SKILL PER REPARTO ════════════════════════════════ */}
        {repartiRichiesti.length > 0 && (
          <div>
            <h2 className="mb-4">Copertura operatori per reparto</h2>
            <div className="grid grid-cols-2 gap-4 max-w-3xl">
              {repartiRichiesti.map((r) => {
                const qualificati = operatoriPerReparto(r.id);
                const ok = qualificati.length >= 2;
                return (
                  <div
                    key={r.id}
                    className={`border px-4 py-3 flex items-center justify-between ${ok ? "border-line" : "border-accent-neg/40 bg-accent-neg/5"}`}
                  >
                    <div>
                      <div className="font-medium text-sm">{r.nome}</div>
                      <div className="text-xs text-ink-muted mt-0.5">
                        {qualificati.length > 0
                          ? qualificati.map((d) => `${d.nome} (${d.efficienzaPerc}%)`).join(" · ")
                          : "Nessun operatore qualificato"}
                      </div>
                    </div>
                    <div className={`text-sm font-medium ml-4 ${ok ? "num-pos" : qualificati.length === 1 ? "" : "num-neg"}`}>
                      {qualificati.length === 0 ? "⚠ 0" : qualificati.length === 1 ? `⚡ 1` : `✓ ${qualificati.length}`}
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

        {prodotti.every((p) => p.fasi.length === 0) && (
          <div className="text-sm text-ink-muted">
            Configura le fasi di lavorazione in{" "}
            <a href="/fasi" className="underline underline-offset-2">Fasi di lavorazione</a>{" "}
            per avviare l&apos;analisi.
          </div>
        )}
      </div>
    </div>
  );
}
