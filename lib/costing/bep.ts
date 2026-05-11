/**
 * Break Even Analysis — punto di equilibrio + margine di sicurezza.
 * Riferimento: Lezione 24.
 *
 * Re = p*Q - (cv*Q + CF)
 * BEP: Re = 0  =>  Q* = CF / (p - cv)
 * Margine contribuzione unit = p - cv
 */

import type {
  BepInput,
  BepResult,
  MargineSicurezzaInput,
  MargineSicurezzaResult,
} from "./types";

export function calcBEP(input: BepInput): BepResult {
  const margineContribuzioneUnit =
    input.prezzoUnitario - input.costoVariabileUnitario;
  if (margineContribuzioneUnit <= 0) {
    // Caso patologico: il prezzo non copre il costo variabile, il BEP non esiste.
    return {
      bepQuantita: Number.POSITIVE_INFINITY,
      bepRicavi: Number.POSITIVE_INFINITY,
      margineContribuzioneUnit,
      rapportoMC:
        input.prezzoUnitario === 0
          ? 0
          : margineContribuzioneUnit / input.prezzoUnitario,
    };
  }
  const bepQuantita = input.costiFissi / margineContribuzioneUnit;
  const bepRicavi = bepQuantita * input.prezzoUnitario;
  return {
    bepQuantita,
    bepRicavi,
    margineContribuzioneUnit,
    rapportoMC: margineContribuzioneUnit / input.prezzoUnitario,
  };
}

/**
 * Margine di sicurezza = quanto la quantità (o i ricavi) può ridursi prima del BEP.
 *   MS_q (%) = (qVendute - qBep) / qVendute * 100
 *   MS_r (%) = (ricaviEffettivi - ricaviBep) / ricaviEffettivi * 100
 */
export function calcMargineSicurezza(
  input: MargineSicurezzaInput,
): MargineSicurezzaResult {
  const result: MargineSicurezzaResult = {};
  if (input.quantitaVendute !== undefined && input.bepQuantita !== undefined) {
    if (input.quantitaVendute === 0) result.marginePercQuantita = 0;
    else
      result.marginePercQuantita =
        ((input.quantitaVendute - input.bepQuantita) / input.quantitaVendute) *
        100;
  }
  if (input.ricaviEffettivi !== undefined && input.bepRicavi !== undefined) {
    if (input.ricaviEffettivi === 0) result.marginePercRicavi = 0;
    else
      result.marginePercRicavi =
        ((input.ricaviEffettivi - input.bepRicavi) / input.ricaviEffettivi) *
        100;
  }
  return result;
}

/**
 * Calcola utile/perdita per una quantità data.
 */
export function calcRisultatoEconomico(
  input: BepInput,
  quantita: number,
): { ricavi: number; costiTotali: number; costiVariabili: number; risultato: number } {
  const ricavi = input.prezzoUnitario * quantita;
  const costiVariabili = input.costoVariabileUnitario * quantita;
  const costiTotali = costiVariabili + input.costiFissi;
  return {
    ricavi,
    costiTotali,
    costiVariabili,
    risultato: ricavi - costiTotali,
  };
}

/**
 * Genera dati per il grafico (diagramma di redditività).
 * Restituisce N punti tra 0 e qMax con le 3 curve: ricavi, costi variabili, costi totali.
 */
export function generaDatiGraficoBEP(
  input: BepInput,
  qMax: number,
  steps = 12,
): {
  q: number;
  ricavi: number;
  costiFissi: number;
  costiVariabili: number;
  costiTotali: number;
}[] {
  const points: {
    q: number;
    ricavi: number;
    costiFissi: number;
    costiVariabili: number;
    costiTotali: number;
  }[] = [];
  for (let i = 0; i <= steps; i++) {
    const q = (qMax * i) / steps;
    const ricavi = input.prezzoUnitario * q;
    const costiVariabili = input.costoVariabileUnitario * q;
    const costiTotali = costiVariabili + input.costiFissi;
    points.push({
      q,
      ricavi,
      costiFissi: input.costiFissi,
      costiVariabili,
      costiTotali,
    });
  }
  return points;
}
