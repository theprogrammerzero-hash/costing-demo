/**
 * Full Costing — calcolo configurazioni di costo + riparto costi indiretti.
 * Riferimenti: Lezioni 18, 19, 20.
 */

import type {
  CostoPrimoInput,
  CostoPrimoResult,
  CostoIndustrialeInput,
  CostoIndustrialeResult,
  CostoComplessivoInput,
  CostoComplessivoResult,
  CostoEconomicoTecnicoInput,
  CostoEconomicoTecnicoResult,
  RipartoBaseUnicaInput,
  RipartoBaseUnicaResult,
  RipartoBaseMultiplaInput,
  RipartoBaseMultiplaResult,
} from "./types";

/**
 * Lezione 18 / 19 — Costo Primo
 *   Materie prime + Mano d'opera diretta + Altri costi speciali.
 */
export function calcCostoPrimo(input: CostoPrimoInput): CostoPrimoResult {
  const altri = input.altriCostiSpeciali ?? 0;
  const costoPrimo = input.materiePrime + input.manoOperaDiretta + altri;
  return {
    costoPrimo,
    composizione: {
      materiePrime: input.materiePrime,
      manoOperaDiretta: input.manoOperaDiretta,
      altriCostiSpeciali: altri,
    },
  };
}

/**
 * Lezione 18 / 19 — Costo Industriale
 *   Costo primo + quota costi indiretti industriali.
 */
export function calcCostoIndustriale(
  input: CostoIndustrialeInput,
): CostoIndustrialeResult {
  return {
    costoPrimo: input.costoPrimo,
    quotaCostiIndiretti: input.quotaCostiIndiretti,
    costoIndustriale: input.costoPrimo + input.quotaCostiIndiretti,
  };
}

/**
 * Lezione 18 / 20 — Costo Complessivo
 *   Costo industriale + quota costi amministrativi/commerciali/generali (espressa come %).
 */
export function calcCostoComplessivo(
  input: CostoComplessivoInput,
): CostoComplessivoResult {
  const quotaAmmComm = (input.costoIndustriale * input.percentualeAmmComm) / 100;
  return {
    costoIndustriale: input.costoIndustriale,
    quotaAmmComm,
    costoComplessivo: input.costoIndustriale + quotaAmmComm,
  };
}

/**
 * Lezione 18 — Costo Economico-Tecnico
 *   Costo complessivo + oneri figurativi (interessi capitale, stipendio direzionale, rischio).
 */
export function calcCostoEconomicoTecnico(
  input: CostoEconomicoTecnicoInput,
): CostoEconomicoTecnicoResult {
  const dettaglio = {
    interessiCapitaleProprio: input.interessiCapitaleProprio ?? 0,
    stipendioDirezionale: input.stipendioDirezionale ?? 0,
    rischioImpresa: input.rischioImpresa ?? 0,
    altri: input.altriOneriFigurativi ?? 0,
  };
  const totale =
    dettaglio.interessiCapitaleProprio +
    dettaglio.stipendioDirezionale +
    dettaglio.rischioImpresa +
    dettaglio.altri;
  return {
    costoComplessivo: input.costoComplessivo,
    totaleOneriFigurativi: totale,
    dettaglioOneriFigurativi: dettaglio,
    costoEconomicoTecnico: input.costoComplessivo + totale,
  };
}

// =====================================================
// RIPARTO COSTI INDIRETTI
// =====================================================

/**
 * Lezione 19 — Riparto su base unica aziendale
 *   coefficiente = costiDaRipartire / SUM(baseValue)
 *   quotaImputata[i] = coefficiente * baseValue[i]
 */
export function ripartisciSuBaseUnica(
  input: RipartoBaseUnicaInput,
): RipartoBaseUnicaResult {
  const baseTotale = input.oggetti.reduce((s, o) => s + o.baseValue, 0);
  if (baseTotale === 0) {
    return {
      coefficiente: 0,
      baseTotale: 0,
      ripartizioni: input.oggetti.map((o) => ({
        id: o.id,
        baseValue: o.baseValue,
        quotaImputata: 0,
      })),
      totaleImputato: 0,
    };
  }
  const coefficiente = input.costiDaRipartire / baseTotale;
  const ripartizioni = input.oggetti.map((o) => ({
    id: o.id,
    baseValue: o.baseValue,
    quotaImputata: coefficiente * o.baseValue,
  }));
  const totaleImputato = ripartizioni.reduce((s, r) => s + r.quotaImputata, 0);
  return { coefficiente, baseTotale, ripartizioni, totaleImputato };
}

/**
 * Lezione 19 — Riparto su base multipla aziendale
 *   Più gruppi di costi indiretti, ognuno con la sua base di riparto.
 *   Restituisce le quote per gruppo + il totale per oggetto.
 */
export function ripartisciSuBaseMultipla(
  input: RipartoBaseMultiplaInput,
): RipartoBaseMultiplaResult {
  const totaliPerOggetto: Record<string, number> = {};
  for (const id of input.oggettiIds) totaliPerOggetto[id] = 0;

  const gruppiResult = input.gruppi.map((g) => {
    const baseTotale = input.oggettiIds.reduce(
      (s, id) => s + (g.baseValuePerOggetto[id] ?? 0),
      0,
    );
    const coefficiente = baseTotale === 0 ? 0 : g.costoTotale / baseTotale;
    const ripartizioni = input.oggettiIds.map((id) => {
      const quota = coefficiente * (g.baseValuePerOggetto[id] ?? 0);
      totaliPerOggetto[id] += quota;
      return { id, quota };
    });
    return { nome: g.nome, coefficiente, baseTotale, ripartizioni };
  });

  const totaleGenerale = Object.values(totaliPerOggetto).reduce(
    (s, v) => s + v,
    0,
  );
  return { gruppi: gruppiResult, totaliPerOggetto, totaleGenerale };
}
