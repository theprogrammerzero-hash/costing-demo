import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { TempiCell } from "./TempiCell";

export default async function TempiPage() {
  const [reparti, prodotti, lavorazioni] = await Promise.all([
    prisma.reparto.findMany({ orderBy: { codice: "asc" }, include: { voceCostiFissi: true } }),
    prisma.prodotto.findMany({ orderBy: { codice: "asc" } }),
    prisma.lavorazioneReparto.findMany(),
  ]);

  // Mappa lookup: prodottoId_repartoId → LavorazioneReparto
  const map = new Map(
    lavorazioni.map((l) => [`${l.prodottoId}_${l.repartoId}`, l]),
  );

  return (
    <div>
      <PageHeader
        title="Tempi di lavorazione"
        subtitle="Ore macchina e ore manodopera per prodotto × reparto — dato acquisito dal sistema IoT"
      />

      <div className="px-8 py-6">
        {prodotti.length === 0 || reparti.length === 0 ? (
          <p className="text-ink-muted">
            Aggiungi prima almeno un prodotto e un reparto.
          </p>
        ) : (
          <>
            <div className="mb-4 text-sm text-ink-muted">
              Per ogni cella: ore macchina (M) e ore manodopera (MdO) per unità prodotta.
              I valori vengono normalmente aggiornati automaticamente tramite{" "}
              <code className="text-xs bg-line px-1">POST /api/v1/lavorazioni</code>.
            </div>

            <div className="overflow-x-auto">
              <table className="table-zebra">
                <thead>
                  <tr>
                    <th className="min-w-[160px]">Prodotto</th>
                    {reparti.map((r) => (
                      <th key={r.id} className="min-w-[180px] text-center">
                        <div>{r.nome}</div>
                        <div className="font-normal text-ink-subtle normal-case tracking-normal">
                          cv M: {r.tariffaVarMacchina}€/h · MdO: {r.tariffaMdo}€/h
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {prodotti.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="font-medium">{p.nome}</div>
                        <div className="text-xxs text-ink-subtle">{p.codice}</div>
                      </td>
                      {reparti.map((r) => {
                        const lav = map.get(`${p.id}_${r.id}`);
                        return (
                          <td key={r.id} className="p-1">
                            <TempiCell
                              prodottoId={p.id}
                              repartoId={r.id}
                              oreMacchina={lav?.oreMacchina ?? 0}
                              oreMdo={lav?.oreMdo ?? 0}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legenda totali ore macchina per reparto */}
            <div className="mt-8 grid gap-4 grid-cols-3 max-w-2xl">
              {reparti.map((r) => {
                const totOreM = lavorazioni
                  .filter((l) => l.repartoId === r.id)
                  .reduce((s, l) => {
                    const p = prodotti.find((p) => p.id === l.prodottoId);
                    return s + l.oreMacchina * (p?.quantita ?? 0);
                  }, 0);
                return (
                  <div key={r.id} className="border border-line p-4">
                    <div className="text-xxs uppercase tracking-wider text-ink-muted">{r.codice}</div>
                    <div className="font-medium mt-1">{r.nome}</div>
                    <div className="mt-2 font-mono text-sm">
                      {new Intl.NumberFormat("it-IT").format(totOreM)} ore-macchina/anno
                    </div>
                    <div className="text-xs text-ink-muted mt-0.5">
                      CF fissi: {new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(r.voceCostiFissi.reduce((s, v) => s + v.importo, 0))}/anno
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
