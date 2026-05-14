import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { calcDemoFullCosting } from "@/lib/costing/demo-calc";
import { BepPanel } from "@/components/risultati/BepPanel";

const fmtEur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

const fmtPerc = (n: number | null) =>
  n != null ? `${n.toFixed(1)}%` : "—";

export default async function RisultatiPage() {
  const [reparti, prodotti, fasi, config] = await Promise.all([
    prisma.reparto.findMany({ orderBy: { codice: "asc" }, include: { voceCostiFissi: true } }),
    prisma.prodotto.findMany({ orderBy: { codice: "asc" } }),
    prisma.faseLavorazione.findMany({ orderBy: [{ prodottoId: "asc" }, { sequenza: "asc" }] }),
    prisma.configurazione.findUnique({ where: { id: "main" } }),
  ]);

  const percAmmComm   = config?.percAmmComm   ?? 15;
  const ammCommTipo   = config?.ammCommTipo   ?? "PERC";
  const ammCommValore = config?.ammCommValore ?? 0;
  const baseRiparto   = config?.baseRiparto   ?? "ORE_MACCHINA";

  if (prodotti.length === 0 || reparti.length === 0) {
    return (
      <div>
        <PageHeader
          title="Risultati & BEP"
          subtitle="Full costing e analisi del punto di pareggio"
        />
        <div className="px-8 py-12 text-ink-muted">
          Inserisci almeno un reparto e un prodotto con le fasi di lavorazione per avviare il calcolo.
        </div>
      </div>
    );
  }

  const { risultati, idleCapacity } = calcDemoFullCosting(
    reparti,
    prodotti,
    fasi,
    percAmmComm,
    baseRiparto,
    ammCommTipo,
    ammCommValore,
  );

  const maxMarginePerc = Math.max(
    ...risultati.map((r) => r.marginePerc ?? -Infinity),
    0,
  );

  const totIdleAnnuo = idleCapacity.reduce((s, r) => s + r.costoIdleAnnuo, 0);

  return (
    <div>
      <PageHeader
        title="Risultati & BEP"
        subtitle={`Full costing — base riparto: ${baseRiparto.replace(/_/g, " ").toLowerCase()} · amm.vi/comm.li: ${
          ammCommTipo === "PERC"
            ? `${percAmmComm}%`
            : `€${ammCommValore.toLocaleString("it-IT")}/anno`
        }`}
      />

      <div className="px-8 py-6">
        {/* ── Layout a due colonne ─────────────────────────────────── */}
        <div className="flex gap-8 items-start">

          {/* ─── Colonna sinistra 55% — Tabella Full Costing ──────── */}
          <div className="flex-[55]">
            <h2 className="mb-4">Full Costing — cascade di costo per commessa</h2>

            <table className="table-zebra w-full">
              <thead>
                <tr>
                  <th>Commessa</th>
                  <th className="text-right">Costo dir.</th>
                  <th className="text-right">Quota fissi</th>
                  <th className="text-right">C. Industriale</th>
                  <th className="text-right">C. Complessivo</th>
                  <th className="text-right">Prezzo</th>
                  <th className="text-right">Margine</th>
                  <th className="text-right">Marg.%</th>
                </tr>
              </thead>
              <tbody>
                {risultati.map((r) => {
                  const marginePerc = r.marginePerc;
                  const barPerc =
                    marginePerc != null && maxMarginePerc > 0
                      ? Math.max(0, (marginePerc / maxMarginePerc) * 100)
                      : 0;
                  const isNeg = marginePerc != null && marginePerc < 0;
                  return (
                    <tr key={r.prodotto.id}>
                      <td>
                        <div className="font-medium">{r.prodotto.nome}</div>
                        <div className="text-xxs text-ink-subtle">{r.prodotto.codice}</div>
                      </td>
                      <td className="num">{fmtEur(r.costoVariabileUnit)}</td>
                      <td className="num">{fmtEur(r.quotaFissaUnit)}</td>
                      <td className="num font-medium">{fmtEur(r.costoIndustrialeUnit)}</td>
                      <td className="num font-medium">{fmtEur(r.costoComplessivoUnit)}</td>
                      <td className="num">
                        {r.prodotto.prezzoVendita != null
                          ? fmtEur(r.prodotto.prezzoVendita)
                          : <span className="text-ink-subtle">—</span>}
                      </td>
                      <td className={`num ${isNeg ? "num-neg" : ""}`}>
                        {r.margineUnit != null ? fmtEur(r.margineUnit) : "—"}
                      </td>
                      <td className="px-3 py-2.5 align-middle min-w-[100px]">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-1.5 bg-line">
                            <div
                              className={`h-full transition-all ${isNeg ? "bg-accent-neg" : "bg-ink"}`}
                              style={{ width: `${barPerc}%` }}
                            />
                          </div>
                          <span
                            className={`num text-xs ${
                              isNeg ? "num-neg" : marginePerc != null && marginePerc > 0 ? "num-pos" : ""
                            }`}
                          >
                            {fmtPerc(marginePerc)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Dettaglio cascade per ogni prodotto */}
            <div className="mt-8 space-y-4">
              <h2 className="text-sm uppercase tracking-wider text-ink-muted">
                Dettaglio cascade di costo
              </h2>
              {risultati.map((r) => (
                <div key={r.prodotto.id} className="border border-line">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-paper">
                    <div>
                      <span className="font-medium">{r.prodotto.nome}</span>
                      <span className="ml-2 text-xxs text-ink-subtle uppercase tracking-wider">{r.prodotto.codice}</span>
                    </div>
                    <div className="text-xs text-ink-muted">
                      {r.prodotto.quantita.toLocaleString("it-IT")} u/ordine
                    </div>
                  </div>
                  <table className="w-full text-xs">
                    <tbody>
                      {/* Dettaglio per fase */}
                      {r.dettaglioFasi.map((f) => {
                        const totFase = f.costoEnergiaUnit + f.costoMdoUnit;
                        const repartoInfo = r.dettaglioReparti.find(
                          (d) => d.reparto.nome === f.repartoNome
                        );
                        const kWh = repartoInfo
                          ? repartoInfo.reparto.kWInstallata * repartoInfo.reparto.prezzoEnergia
                          : 0;
                        return (
                          <tr key={f.faseId} className="border-b border-line/40">
                            <td className="px-4 py-1.5 text-ink-muted pl-6">
                              <span className="font-medium text-ink">{f.nome}</span>
                              <span className="ml-1 text-ink-subtle">· {f.repartoNome}</span>
                            </td>
                            <td className="px-3 py-1.5 text-ink-subtle">
                              {f.tempoOre.toFixed(2)}h
                              {kWh > 0 && ` × (⚡${fmtEur(kWh)} + MdO ${fmtEur(repartoInfo!.reparto.tariffaMdo)})`}
                            </td>
                            <td className="px-3 py-1.5 num">{fmtEur(totFase)}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-b border-line/50">
                        <td className="px-4 py-1.5 text-ink-muted pl-6">Materie prime</td>
                        <td></td>
                        <td className="px-3 py-1.5 num">{fmtEur(r.prodotto.materiePrime)}</td>
                      </tr>
                      <tr className="border-b border-line font-medium">
                        <td className="px-4 py-2">Costo diretto/variabile</td>
                        <td></td>
                        <td className="px-3 py-2 num">{fmtEur(r.costoVariabileUnit)}</td>
                      </tr>
                      <tr className="border-b border-line/50">
                        <td className="px-4 py-1.5 text-ink-muted pl-6">
                          Quota CF struttura (ammort.+stipendi fissi+affitti · totale commessa {fmtEur(r.quotaFissaAnnua)})
                        </td>
                        <td></td>
                        <td className="px-3 py-1.5 num">{fmtEur(r.quotaFissaUnit)}</td>
                      </tr>
                      <tr className="border-b border-line font-medium">
                        <td className="px-4 py-2">Costo industriale</td>
                        <td></td>
                        <td className="px-3 py-2 num">{fmtEur(r.costoIndustrialeUnit)}</td>
                      </tr>
                      <tr className="border-b border-line/50">
                        <td className="px-4 py-1.5 text-ink-muted pl-6">
                          Costi amm.vi/comm.li{" "}
                          {ammCommTipo === "VALORE" && r.tariffaAmmCommOre > 0
                            ? `(€${r.tariffaAmmCommOre.toFixed(2)}/h × ${r.oreFasiUnitTot.toFixed(2)}h = ${r.percAmmCommEffettiva.toFixed(1)}% c.ind.)`
                            : `(${r.percAmmCommEffettiva.toFixed(1)}% × ${fmtEur(r.costoIndustrialeUnit)})`
                          }
                        </td>
                        <td></td>
                        <td className="px-3 py-1.5 num">
                          {fmtEur(r.costoComplessivoUnit - r.costoIndustrialeUnit)}
                        </td>
                      </tr>
                      <tr className="border-b border-line font-medium text-sm">
                        <td className="px-4 py-2">Costo complessivo</td>
                        <td></td>
                        <td className="px-3 py-2 num">{fmtEur(r.costoComplessivoUnit)}</td>
                      </tr>
                      {r.prodotto.prezzoVendita != null && (
                        <tr className={r.marginePerc != null && r.marginePerc < 0 ? "text-accent-neg" : "text-accent-pos"}>
                          <td className="px-4 py-2 font-medium">Margine</td>
                          <td className="px-3 py-2 text-xs text-ink-muted">
                            {fmtPerc(r.marginePerc)} su prezzo vendita
                          </td>
                          <td className="px-3 py-2 num font-medium">
                            {r.margineUnit != null ? fmtEur(r.margineUnit) : "—"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>

          {/* ─── Colonna destra 45% — BEP Panel ──────────────────── */}
          <div className="flex-[45] sticky top-header">
            <h2 className="mb-4">Break Even Point</h2>
            <BepPanel risultati={risultati} ammCommTipo={ammCommTipo} ammCommValore={ammCommValore} />
          </div>
        </div>

        {/* ── Sezione Utilizzo Capacità e Idle Cost ─────────────── */}
        {idleCapacity.some((r) => r.oreDisponibili > r.oreUsate) && (
          <div className="mt-10">
            <h2 className="mb-4">Utilizzo capacità e costo idle</h2>
            <div className="border border-line">
              <table className="table-zebra w-full">
                <thead>
                  <tr>
                    <th>Reparto</th>
                    <th className="text-right">CF annui</th>
                    <th className="text-right">Tariffa CF</th>
                    <th className="text-right">Ore disponibili</th>
                    <th className="text-right">Ore usate</th>
                    <th className="text-right">Utilizzo</th>
                    <th className="text-right">Costo idle</th>
                  </tr>
                </thead>
                <tbody>
                  {idleCapacity.map((r) => {
                    const idle = r.costoIdleAnnuo > 0;
                    return (
                      <tr key={r.repartoId}>
                        <td className="font-medium">{r.nome}</td>
                        <td className="num">{fmtEur(r.cfAnnui)}</td>
                        <td className="num text-ink-muted">
                          {r.tariffaCF > 0 ? `${fmtEur(r.tariffaCF)}/h` : "—"}
                        </td>
                        <td className="num">{r.oreDisponibili.toLocaleString("it-IT")} h</td>
                        <td className="num">{Math.round(r.oreUsate).toLocaleString("it-IT")} h</td>
                        <td className="px-3 py-2.5 align-middle">
                          <div className="flex items-center gap-2 justify-end">
                            <div className="w-16 h-1.5 bg-line">
                              <div
                                className={`h-full ${r.utilizzoPerc < 70 ? "bg-accent-neg" : "bg-ink"}`}
                                style={{ width: `${Math.min(100, r.utilizzoPerc).toFixed(1)}%` }}
                              />
                            </div>
                            <span className="num text-xs">{r.utilizzoPerc.toFixed(0)}%</span>
                          </div>
                        </td>
                        <td className={`num ${idle ? "num-neg" : "text-ink-subtle"}`}>
                          {idle ? fmtEur(r.costoIdleAnnuo) : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5} className="px-3 py-2 text-xs text-ink-muted">
                      Capacità pagata ma non utilizzata — costo di periodo non imputato ai prodotti
                    </td>
                    <td></td>
                    <td className={`num font-medium py-2 px-3 ${totIdleAnnuo > 0 ? "num-neg" : ""}`}>
                      {totIdleAnnuo > 0 ? fmtEur(totIdleAnnuo) : "—"}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* ── Footer ───────────────────────────────────────────── */}
        <div className="mt-10 border-t border-line pt-6 text-xs text-ink-muted flex gap-6">
          <div>
            <span className="uppercase tracking-wider">Base riparto:</span>{" "}
            {baseRiparto.replace(/_/g, " ").toLowerCase()}
          </div>
          <div>
            <span className="uppercase tracking-wider">Amm.vi/commerciali:</span>{" "}
            {ammCommTipo === "PERC"
              ? `${percAmmComm}%`
              : `€${ammCommValore.toLocaleString("it-IT")}/anno`}
          </div>
          <div>
            <span className="uppercase tracking-wider">CF struttura totali:</span>{" "}
            {fmtEur(reparti.reduce((s, r) => s + r.voceCostiFissi.reduce((vs, v) => vs + v.importo, 0), 0))} / anno
          </div>
          <div className="ml-auto">
            Cambia parametri in{" "}
            <a href="/configurazione" className="underline underline-offset-2">
              Configurazione
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
