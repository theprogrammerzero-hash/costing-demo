import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { createFase, deleteFase } from "@/app/actions/fasi";

export default async function FasiPage() {
  const [prodotti, reparti, fasi] = await Promise.all([
    prisma.prodotto.findMany({ orderBy: { codice: "asc" } }),
    prisma.reparto.findMany({ orderBy: { codice: "asc" } }),
    prisma.faseLavorazione.findMany({
      orderBy: [{ prodottoId: "asc" }, { sequenza: "asc" }],
      include: { reparto: true, macchina: true },
    }),
  ]);

  // Macchine raggruppate per reparto (per il select nel form)
  const macchinePerReparto = new Map<string, { id: string; codice: string; nome: string }[]>();
  const macchine = await prisma.macchina.findMany({ orderBy: { codice: "asc" } });
  for (const m of macchine) {
    const list = macchinePerReparto.get(m.repartoId) ?? [];
    list.push(m);
    macchinePerReparto.set(m.repartoId, list);
  }

  // Raggruppa fasi per prodotto
  const fasiPerProdotto = new Map<string, typeof fasi>();
  for (const f of fasi) {
    const list = fasiPerProdotto.get(f.prodottoId) ?? [];
    list.push(f);
    fasiPerProdotto.set(f.prodottoId, list);
  }

  return (
    <div>
      <PageHeader
        title="Fasi di lavorazione"
        subtitle="Sequenza delle operazioni per ogni commessa — reparto · macchina · ore per pezzo"
      />

      <div className="px-8 py-6 space-y-8">
        {prodotti.length === 0 ? (
          <p className="text-ink-muted">Aggiungi prima almeno una commessa e un reparto.</p>
        ) : (
          prodotti.map((p) => {
            const faseProdotto = fasiPerProdotto.get(p.id) ?? [];
            const totOre = faseProdotto.reduce((s, f) => s + f.tempoOre, 0);
            const nextSeq = (Math.max(0, ...faseProdotto.map((f) => f.sequenza)) + 1);

            return (
              <div key={p.id} className="border border-line">
                {/* Header commessa */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-line bg-paper">
                  <div>
                    <span className="font-medium">{p.nome}</span>
                    <span className="ml-2 font-mono text-xs text-ink-muted">{p.codice}</span>
                    {p.cliente && (
                      <span className="ml-2 text-xs text-ink-subtle">— {p.cliente}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-6 text-xs text-ink-muted">
                    <span>{p.quantita.toLocaleString("it-IT")} pz</span>
                    {totOre > 0 && (
                      <span className="num font-medium text-ink">
                        {totOre.toFixed(2)}h/pz tot.
                      </span>
                    )}
                    <span>{faseProdotto.length} fasi</span>
                  </div>
                </div>

                {/* Tabella fasi */}
                {faseProdotto.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="text-xxs uppercase tracking-wider text-ink-muted border-b border-line">
                      <tr>
                        <th className="px-4 py-2 text-left w-8">#</th>
                        <th className="px-4 py-2 text-left">Fase</th>
                        <th className="px-4 py-2 text-left">Reparto</th>
                        <th className="px-4 py-2 text-left">Macchina</th>
                        <th className="px-4 py-2 text-right">h/pz</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {faseProdotto.map((f) => (
                        <tr key={f.id} className="border-b border-line/40 hover:bg-line/20">
                          <td className="px-4 py-2 font-mono text-xs text-ink-muted">{f.sequenza}</td>
                          <td className="px-4 py-2 font-medium">{f.nome}</td>
                          <td className="px-4 py-2 text-ink-muted">{f.reparto.nome}</td>
                          <td className="px-4 py-2 text-ink-subtle text-xs font-mono">
                            {f.macchina ? `${f.macchina.codice} — ${f.macchina.nome}` : "—"}
                          </td>
                          <td className="px-4 py-2 num font-medium text-right">
                            {f.tempoOre.toFixed(2)}h
                          </td>
                          <td className="px-2 py-1 text-right">
                            <form action={deleteFase.bind(null, f.id)} className="inline">
                              <button
                                type="submit"
                                className="text-ink-subtle hover:text-accent-neg text-xs px-1"
                                title="Elimina fase"
                              >
                                ✕
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    {faseProdotto.length > 1 && (
                      <tfoot>
                        <tr className="text-xs text-ink-muted">
                          <td colSpan={4} className="px-4 py-1.5">Totale</td>
                          <td className="px-4 py-1.5 num font-medium text-right">
                            {totOre.toFixed(2)}h/pz
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                ) : (
                  <p className="px-5 py-3 text-sm text-ink-subtle">Nessuna fase inserita.</p>
                )}

                {/* Form aggiungi fase */}
                <div className="px-5 py-4 bg-paper border-t border-line/60">
                  <form
                    action={createFase.bind(null, p.id)}
                    className="flex flex-wrap gap-2 items-end"
                  >
                    <div>
                      <label className="text-xxs uppercase tracking-wider text-ink-muted">#</label>
                      <input
                        name="sequenza"
                        type="number"
                        min="1"
                        defaultValue={nextSeq}
                        className="input mt-1 w-14 text-sm font-mono"
                      />
                    </div>
                    <div className="flex-1 min-w-[140px]">
                      <label className="text-xxs uppercase tracking-wider text-ink-muted">Nome fase</label>
                      <input
                        name="nome"
                        placeholder="es. Taglio, Ricamo, Collaudo…"
                        className="input mt-1 text-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-xxs uppercase tracking-wider text-ink-muted">Reparto</label>
                      <select name="repartoId" className="input mt-1 text-sm" required>
                        <option value="">— seleziona —</option>
                        {reparti.map((r) => (
                          <option key={r.id} value={r.id}>{r.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xxs uppercase tracking-wider text-ink-muted">
                        Macchina <span className="normal-case text-ink-subtle">(opz.)</span>
                      </label>
                      <select name="macchinaId" className="input mt-1 text-sm">
                        <option value="">— nessuna —</option>
                        {reparti.map((r) => {
                          const mc = macchinePerReparto.get(r.id) ?? [];
                          if (mc.length === 0) return null;
                          return (
                            <optgroup key={r.id} label={r.nome}>
                              {mc.map((m) => (
                                <option key={m.id} value={m.id}>{m.codice} — {m.nome}</option>
                              ))}
                            </optgroup>
                          );
                        })}
                      </select>
                    </div>
                    <div>
                      <label className="text-xxs uppercase tracking-wider text-ink-muted">
                        Tempo (h/pz)
                      </label>
                      <input
                        name="tempoOre"
                        type="number"
                        step="0.01"
                        min="0.01"
                        placeholder="0.00"
                        className="input mt-1 w-24 text-sm font-mono"
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-primary btn-sm whitespace-nowrap">
                      + Aggiungi fase
                    </button>
                  </form>
                </div>
              </div>
            );
          })
        )}

        {/* Nota esplicativa */}
        <div className="border-l-2 border-ink pl-4 text-sm text-ink-muted max-w-xl">
          <p className="font-medium text-ink">Come inserire i tempi</p>
          <ul className="mt-1 space-y-1">
            <li>Inserisci le ore per <strong>singolo pezzo</strong> (non per l&apos;intera commessa)</li>
            <li>Esempio: 30 minuti per pezzo → <strong>0.50h</strong></li>
            <li>Più fasi nello stesso reparto vengono sommate automaticamente nel calcolo costi</li>
            <li>La macchina è opzionale — serve solo per l&apos;analisi del carico macchine</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
