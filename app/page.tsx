import Link from "next/link";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { Kpi } from "@/components/ui/Kpi";
import { calcDemoFullCosting } from "@/lib/costing/demo-calc";

const fmtEur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const fmtPerc = (n: number | null) => (n != null ? `${n.toFixed(1)}%` : "—");

export default async function DashboardPage() {
  const [reparti, prodotti, fasi, config] = await Promise.all([
    prisma.reparto.findMany({ orderBy: { codice: "asc" }, include: { voceCostiFissi: true } }),
    prisma.prodotto.findMany({ orderBy: { codice: "asc" } }),
    prisma.faseLavorazione.findMany(),
    prisma.configurazione.findUnique({ where: { id: "main" } }),
  ]);

  const percAmmComm = config?.percAmmComm ?? 15;
  const baseRiparto = config?.baseRiparto ?? "ORE_MACCHINA";

  const hasData = prodotti.length > 0 && reparti.length > 0 && fasi.length > 0;

  const { risultati, idleCapacity } = hasData
    ? calcDemoFullCosting(reparti, prodotti, fasi, percAmmComm, baseRiparto)
    : { risultati: [], idleCapacity: [] };
  const totIdleAnnuo = idleCapacity.reduce((s, r) => s + r.costoIdleAnnuo, 0);

  const ricaviTotali = risultati.reduce(
    (s, r) => s + (r.prodotto.prezzoVendita ?? 0) * r.prodotto.quantita,
    0,
  );
  const costiTotali = risultati.reduce(
    (s, r) => s + r.costoComplessivoUnit * r.prodotto.quantita,
    0,
  );
  const margineMedioPerc =
    risultati.length > 0 && ricaviTotali > 0
      ? ((ricaviTotali - costiTotali) / ricaviTotali) * 100
      : null;

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Riepilogo full costing commesse attive"
        actions={
          hasData ? (
            <Link href="/risultati" className="btn btn-primary">
              Analisi completa →
            </Link>
          ) : undefined
        }
      />

      <div className="px-8 py-6 space-y-8">
        {/* ── KPI cards ─────────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-4">
          <Kpi
            label="Ricavi totali commesse"
            value={hasData ? fmtEur(ricaviTotali) : "—"}
            delta={`${prodotti.length} commesse · ${reparti.length} reparti`}
          />
          <Kpi
            label="Costi totali commesse"
            value={hasData ? fmtEur(costiTotali) : "—"}
            delta={`amm.vi/comm.li: ${percAmmComm}%`}
          />
          <Kpi
            label="Margine medio"
            value={fmtPerc(margineMedioPerc)}
            deltaTone={
              margineMedioPerc == null ? "neutral" : margineMedioPerc > 15 ? "pos" : margineMedioPerc > 0 ? "neutral" : "neg"
            }
            delta={margineMedioPerc != null ? (margineMedioPerc > 15 ? "posizione sana" : margineMedioPerc > 0 ? "margine ridotto" : "in perdita!") : undefined}
          />
          <Kpi
            label="CF struttura annui"
            value={fmtEur(reparti.reduce((s, r) => s + r.voceCostiFissi.reduce((vs, v) => vs + v.importo, 0), 0))}
            delta="ammort. · stipendi fissi · affitti"
          />
          <Kpi
            label="Capacità non utilizzata"
            value={totIdleAnnuo > 0 ? fmtEur(totIdleAnnuo) : "—"}
            delta={
              totIdleAnnuo > 0
                ? `${idleCapacity.filter(r => r.costoIdleAnnuo > 0).length} reparti sotto capacità`
                : hasData ? "piena utilizzo" : undefined
            }
            deltaTone={totIdleAnnuo > 0 ? "neg" : "pos"}
          />
        </div>

        {/* ── Tabella riepilogativa commesse ───────────────────── */}
        {hasData ? (
          <div>
            <h2 className="mb-3">Riepilogo per commessa</h2>
            <table className="table-zebra max-w-4xl">
              <thead>
                <tr>
                  <th>Commessa</th>
                  <th className="text-right">Qtà ordine</th>
                  <th className="text-right">Costo dir.</th>
                  <th className="text-right">C. Complessivo</th>
                  <th className="text-right">Prezzo</th>
                  <th className="text-right">Margine %</th>
                  <th className="text-right">BEP (u)</th>
                </tr>
              </thead>
              <tbody>
                {risultati.map((r) => {
                  const isNeg = r.marginePerc != null && r.marginePerc < 0;
                  return (
                    <tr key={r.prodotto.id}>
                      <td>
                        <div className="font-medium">{r.prodotto.nome}</div>
                        <div className="text-xxs text-ink-subtle">{r.prodotto.codice}</div>
                      </td>
                      <td className="num">
                        {new Intl.NumberFormat("it-IT").format(r.prodotto.quantita)}
                      </td>
                      <td className="num">{fmtEur(r.costoVariabileUnit)}</td>
                      <td className="num font-medium">{fmtEur(r.costoComplessivoUnit)}</td>
                      <td className="num">
                        {r.prodotto.prezzoVendita != null
                          ? fmtEur(r.prodotto.prezzoVendita)
                          : <span className="text-ink-subtle">—</span>}
                      </td>
                      <td className={`num font-medium ${isNeg ? "num-neg" : r.marginePerc! > 0 ? "num-pos" : ""}`}>
                        {fmtPerc(r.marginePerc)}
                      </td>
                      <td className="num text-ink-muted">
                        {r.bepQuantita != null && isFinite(r.bepQuantita)
                          ? new Intl.NumberFormat("it-IT").format(Math.round(r.bepQuantita))
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="mt-4">
              <Link href="/risultati" className="btn">
                Analisi dettagliata + Grafico BEP →
              </Link>
            </div>
          </div>
        ) : (
          <div className="border border-line p-6 max-w-lg space-y-4">
            <h2>Inizia qui</h2>
            <p className="text-sm text-ink-muted">
              Per avviare il calcolo, completa i seguenti passaggi:
            </p>
            <ol className="space-y-3 text-sm">
              {[
                { n: 1, label: "Aggiungi i reparti produttivi", href: "/reparti", done: reparti.length > 0 },
                { n: 2, label: "Inserisci le commesse", href: "/prodotti", done: prodotti.length > 0 },
                {
                  n: 3,
                  label: "Configura le fasi di lavorazione",
                  href: "/fasi",
                  done: fasi.length > 0,
                },
                { n: 4, label: "Visualizza i risultati", href: "/risultati", done: false },
              ].map((step) => (
                <li key={step.n} className="flex items-center gap-3">
                  <span
                    className={`w-6 h-6 flex items-center justify-center border text-xs font-mono ${
                      step.done
                        ? "border-accent-pos text-accent-pos"
                        : "border-line text-ink-muted"
                    }`}
                  >
                    {step.done ? "✓" : step.n}
                  </span>
                  <Link href={step.href} className={`hover:underline ${step.done ? "text-ink-muted line-through" : ""}`}>
                    {step.label}
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}
