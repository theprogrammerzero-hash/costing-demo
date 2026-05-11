import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/PageHeader";
import { updateConfigurazione } from "@/app/actions/config";
import { AmmCommForm } from "@/components/configurazione/AmmCommForm";

export default async function ConfigurazionePage() {
  const config       = await prisma.configurazione.findUnique({ where: { id: "main" } });
  const percAmmComm  = config?.percAmmComm  ?? 15;
  const ammCommTipo  = config?.ammCommTipo  ?? "PERC";
  const ammCommValore = config?.ammCommValore ?? 0;
  const baseRiparto  = config?.baseRiparto  ?? "ORE_MACCHINA";

  return (
    <div>
      <PageHeader
        title="Configurazione"
        subtitle="Parametri globali per il calcolo del full costing"
      />

      <div className="px-8 py-6 max-w-lg space-y-8">
        <form action={updateConfigurazione} className="space-y-6">

          {/* ── Costi amministrativi/commerciali ──────────────────────── */}
          <div className="border border-line p-5 space-y-4">
            <div className="text-xxs uppercase tracking-wider text-ink-muted">
              Costi amministrativi e commerciali
              <span className="block normal-case font-normal mt-0.5 text-ink-subtle">
                Copertura di management, contabilità, forza vendita, marketing.
                Distinti dagli ammortamenti macchine (già nei Costi Fissi dei reparti).
              </span>
            </div>
            <AmmCommForm
              percAmmComm={percAmmComm}
              ammCommTipo={ammCommTipo}
              ammCommValore={ammCommValore}
            />
          </div>

          {/* ── Base di riparto ───────────────────────────────────────── */}
          <div>
            <label className="text-xxs uppercase tracking-wider text-ink-muted block mb-2">
              Base di riparto costi fissi di struttura
            </label>
            <div className="space-y-2">
              {[
                {
                  value: "ORE_MACCHINA",
                  label: "Ore macchina",
                  desc: "Ripartisce i CF di ogni reparto proporzionalmente alle ore-macchina assorbite da ciascun prodotto (×quantità annua). Consigliato per produzioni ad alta automazione.",
                },
                {
                  value: "ORE_MOD",
                  label: "Ore manodopera diretta",
                  desc: "Base per produzioni labour-intensive dove il costo del personale è il driver principale.",
                },
                {
                  value: "COSTO_DIRETTO",
                  label: "Costo diretto",
                  desc: "Ripartisce i fissi proporzionalmente al costo diretto unitario × quantità. Alternativa quando i tempi non sono omogenei.",
                },
              ].map((opt) => (
                <label key={opt.value} className="flex gap-3 cursor-pointer p-3 border border-line hover:bg-line/20">
                  <input
                    type="radio"
                    name="baseRiparto"
                    value={opt.value}
                    defaultChecked={baseRiparto === opt.value}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-medium text-sm">{opt.label}</div>
                    <div className="text-xs text-ink-muted mt-0.5">{opt.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <button type="submit" className="btn btn-primary">
            Salva configurazione
          </button>
        </form>

        {/* ── Formula riepilogativa ──────────────────────────────────── */}
        <div className="border-t border-line pt-6 space-y-2 text-sm text-ink-muted">
          <p className="font-medium text-ink text-xs uppercase tracking-wider">Formula di calcolo attiva</p>
          <div className="font-mono text-xs bg-line/30 p-3 space-y-1">
            <div>cv_unit        = Σ rep (oreMacchina × tariffaVarM + oreMdo × tariffaMdo) + mp</div>
            <div>CF_rep         = Σ voceCostiFissi[rep].importo</div>
            <div>quota_fissi_u  = Σ rep (CF_rep × base[p][R]×qtà / Σ p base[p][R]×qtà) / qtà</div>
            <div>c_industriale  = cv_unit + quota_fissi_u</div>
            {ammCommTipo === "PERC"
              ? <div>c_complessivo  = c_industriale × (1 + {percAmmComm}%)</div>
              : <div>c_complessivo  = c_industriale × (1 + %_eff)   dove %_eff = {ammCommValore.toLocaleString("it-IT")}€ / Σ(c_ind×qtà) × 100</div>
            }
          </div>
          <div className="font-mono text-xs bg-line/30 p-3 mt-1">
            <div>BEP_Q          = CF_allocati / (prezzo − cv_unit)</div>
            <div>prezzo_consigliato = c_complessivo @ Q_prevista</div>
          </div>
        </div>
      </div>
    </div>
  );
}
