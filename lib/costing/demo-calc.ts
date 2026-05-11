/**
 * Calcolo Full Costing + BEP per il modello demo.
 *
 * Separazione corretta costi variabili / fissi (Lezione 18/24):
 *   cv  = SOLO variabili: Σ reparti (oreMacchina × tariffaVarMacchina + oreMdo × tariffaMdo) + materiePrime
 *   CF  = ammortamenti + stipendi fissi + affitti — dalla lista VoceCostoFisso per reparto
 *
 * Allocazione CF — tariffa predeterminata a capacità (metodo standard industriale):
 *   Se oreCapacitaAnnua_R > 0:
 *     tariffaCF_R = CF_R / oreCapacitaAnnua_R                    ← €/ora fissa, indipendente dal mix
 *     quotaFissaUnit[p][R] = tariffaCF_R × oreMacchina[p][R]     ← COSTANTE per prodotto
 *   Altrimenti (fallback):
 *     allocazione proporzionale alla produzione effettiva (comportamento precedente)
 *
 * Il costo fisso unitario di un prodotto NON cambia al variare della quantità degli altri prodotti.
 * Le ore di capacità non assorbite dai prodotti generano "costo idle" — KPI gestionale.
 *
 * Formula BEP corretta:
 *   Q* = CF_allocati / (prezzo − cv)
 *   Se prezzo ≤ cv → BEP irraggiungibile; prezzoSuggerito = costoComplessivo @ Q_prevista
 */

export interface VoceCostoFissoData {
  id: string;
  repartoId: string;
  nome: string;
  importo: number;
}

export interface RepartoData {
  id: string;
  codice: string;
  nome: string;
  tariffaVarMacchina: number;       // €/h — consumabili/utensili (NO energia)
  tariffaMdo: number;
  oreCapacitaAnnua: number;         // 0 = usa fallback proporzionale
  kWInstallata: number;             // kW potenza installata (0 = non configurato)
  prezzoEnergia: number;            // €/kWh tariffa energia
  voceCostiFissi: VoceCostoFissoData[];
}

export interface ProdottoData {
  id: string;
  codice: string;
  nome: string;
  cliente?: string | null;
  quantita: number;
  dataInizio?: Date | null;
  dataFine?: Date | null;
  prezzoVendita: number | null;
  materiePrime: number;
}

export interface LavData {
  prodottoId: string;
  repartoId: string;
  oreMacchina: number;
  oreMdo: number;
}

export interface IdleCapacityReparto {
  repartoId: string;
  nome: string;
  cfAnnui: number;
  oreDisponibili: number;           // oreCapacitaAnnua
  oreUsate: number;                 // Σ prodotti oreMacchina×quantità
  utilizzoPerc: number;             // oreUsate/oreDisponibili × 100
  costoIdleAnnuo: number;           // CF non assorbiti (= tariffaCF × oreInutilizzate)
  tariffaCF: number;                // €/ora predeterminata (0 se fallback)
}

export interface ProdottoResult {
  prodotto: ProdottoData;

  // Costo variabile per unità (SOLO variabili)
  costoVarMacchinaUnit: number;
  costoMdoUnit: number;
  costoVariabileUnit: number;

  // Quota costi fissi struttura
  quotaFissaAnnua: number;
  quotaFissaUnit: number;

  // Costi amm.vi/commerciali effettivi
  percAmmCommEffettiva: number;
  ammCommUnit: number;
  tariffaAmmCommOre: number;   // €/h (0 se modalità PERC o fallback proporzionale)
  oreMacchinaUnitTot: number;  // Σ_R oreMacchina[p][R] — ore macchina totali per unità

  // Configurazioni di costo
  costoIndustrialeUnit: number;
  costoComplessivoUnit: number;

  // Margine
  margineUnit: number | null;
  marginePerc: number | null;

  // BEP
  bepRaggiungibile: boolean;
  bepQuantita: number | null;
  bepRicavi: number | null;
  margineSicurezzaPerc: number | null;
  cfAllocati: number;

  // Prezzo suggerito per coprire tutti i costi alla quantità prevista
  prezzoSuggerito: number;

  // Dettaglio per reparto
  dettaglioReparti: {
    reparto: RepartoData;
    oreMacchina: number;
    oreMdo: number;
    costoEnergiaUnit: number;       // kWInstallata × prezzoEnergia × oreMacchina
    costoConsumabiliUnit: number;   // tariffaVarMacchina × oreMacchina
    costoVarMacchinaUnit: number;   // totale: energia + consumabili
    costoMdoUnit: number;
    quotaFissaRep: number;          // quota CF annua assorbita da questo prodotto in questo reparto
    tariffaCFUsata: number;         // €/ora CF (da capacità o proporzionale)
    metodo: "CAPACITA" | "PROPORZIONALE";
  }[];
}

export interface CalcResult {
  risultati: ProdottoResult[];
  idleCapacity: IdleCapacityReparto[];
}

export function calcDemoFullCosting(
  reparti: RepartoData[],
  prodotti: ProdottoData[],
  lavorazioni: LavData[],
  percAmmComm: number,
  baseRiparto: string = "ORE_MACCHINA",
  ammCommTipo: string = "PERC",
  ammCommValore: number = 0,
): CalcResult {
  const lavMap = new Map<string, LavData>(
    lavorazioni.map((l) => [`${l.prodottoId}_${l.repartoId}`, l]),
  );

  // CF annui per reparto = Σ voceCostiFissi.importo
  const cfReparto = new Map<string, number>(
    reparti.map((r) => [r.id, r.voceCostiFissi.reduce((s, v) => s + v.importo, 0)]),
  );

  // ── Tariffe CF per reparto ────────────────────────────────────────────────
  // Se oreCapacitaAnnua > 0: tariffa predeterminata a capacità (stabile)
  // Altrimenti: calcolata in seguito dall'allocazione proporzionale
  const tariffeCF = new Map<string, { tariffa: number; metodo: "CAPACITA" | "PROPORZIONALE" }>();
  for (const r of reparti) {
    const cfR = cfReparto.get(r.id) ?? 0;
    if (r.oreCapacitaAnnua > 0 && cfR > 0) {
      tariffeCF.set(r.id, { tariffa: cfR / r.oreCapacitaAnnua, metodo: "CAPACITA" });
    } else {
      tariffeCF.set(r.id, { tariffa: 0, metodo: "PROPORZIONALE" });
    }
  }

  // ── Helper proporzionale (fallback) ──────────────────────────────────────
  function getBaseTotaleReparto(repartoId: string): number {
    return prodotti.reduce((sum, p) => {
      const lav = lavMap.get(`${p.id}_${repartoId}`);
      if (!lav) return sum;
      switch (baseRiparto) {
        case "ORE_MOD":    return sum + lav.oreMdo * p.quantita;
        case "COSTO_DIRETTO": {
          const cv = calcCVUnit(p, reparti, lavMap);
          return sum + cv * p.quantita;
        }
        default:           return sum + lav.oreMacchina * p.quantita;
      }
    }, 0);
  }

  // ── PASSO 1: calcola costoIndustriale per ogni prodotto (serve per VALORE ammComm) ──
  const costoIndustrialeBase = new Map<string, number>();
  for (const p of prodotti) {
    let cvM = 0, cvMdo = 0, qfUnit = 0;
    for (const r of reparti) {
      const lav = lavMap.get(`${p.id}_${r.id}`);
      if (!lav) continue;
      cvM   += lav.oreMacchina * r.tariffaVarMacchina;
      cvMdo += lav.oreMdo * r.tariffaMdo;
      const info = tariffeCF.get(r.id)!;
      if (info.metodo === "CAPACITA") {
        qfUnit += info.tariffa * lav.oreMacchina;
      } else {
        // proporzionale: calcola pro-quota
        const cfR     = cfReparto.get(r.id) ?? 0;
        const baseTot = getBaseTotaleReparto(r.id);
        if (cfR > 0 && baseTot > 0) {
          const bp = baseProdottoUnit(lav, baseRiparto, cvM + cvMdo + p.materiePrime);
          qfUnit += (cfR * bp * p.quantita / baseTot) / p.quantita;
        }
      }
    }
    costoIndustrialeBase.set(p.id, cvM + cvMdo + p.materiePrime + qfUnit);
  }

  // ── PASSO 2: tariffa amm.vi/comm.li ──────────────────────────────────────
  // In modalità PERC: % fissa su costo industriale (invariato)
  // In modalità VALORE: tariffa predeterminata €/h su capacità totale reparti
  //   tariffaAmmComm = ammCommValore / Σ_reparti(oreCapacitaAnnua)
  //   → coerente con il modello tariffaCF; costo commessa proporzionale alle ore usate
  let percEffettiva = percAmmComm;
  let tariffaAmmCommOre = 0;

  if (ammCommTipo === "VALORE" && ammCommValore > 0) {
    const totalOreCapacita = reparti.reduce((s, r) => s + r.oreCapacitaAnnua, 0);
    if (totalOreCapacita > 0) {
      tariffaAmmCommOre = ammCommValore / totalOreCapacita;
      // percEffettiva non viene usata in questo ramo — ogni commessa calcola la propria % effettiva
    } else {
      // fallback proporzionale: nessun reparto ha oreCapacitaAnnua definite
      const totCostoIndBase = prodotti.reduce(
        (s, p) => s + (costoIndustrialeBase.get(p.id) ?? 0) * p.quantita,
        0,
      );
      percEffettiva = totCostoIndBase > 0 ? (ammCommValore / totCostoIndBase) * 100 : 0;
    }
  }

  // ── PASSO 3: calcolo completo per ogni prodotto ───────────────────────────
  const risultati: ProdottoResult[] = prodotti.map((p) => {
    let costoVarMacchinaUnit = 0;
    let costoMdoUnitVal = 0;
    let quotaFissaUnitVal = 0;
    let quotaFissaAnnua = 0;

    const dettaglioReparti = reparti.map((r) => {
      const lav  = lavMap.get(`${p.id}_${r.id}`);
      const oreMacchina = lav?.oreMacchina ?? 0;
      const oreMdo      = lav?.oreMdo      ?? 0;
      // Costo energia: kW × €/kWh × ore macchina (variabile puro)
      const tariffaEnergiaH = r.kWInstallata * r.prezzoEnergia;
      const cEnergiaUnit    = oreMacchina * tariffaEnergiaH;
      const cConsumabiliUnit = oreMacchina * r.tariffaVarMacchina;
      const cvm  = cEnergiaUnit + cConsumabiliUnit;
      const cmdo = oreMdo * r.tariffaMdo;
      costoVarMacchinaUnit += cvm;
      costoMdoUnitVal      += cmdo;

      const info  = tariffeCF.get(r.id)!;
      const cfR   = cfReparto.get(r.id) ?? 0;
      let quotaRepAnnua = 0;
      let tariffaUsata  = 0;

      if (info.metodo === "CAPACITA") {
        // Tariffa predeterminata: quota = tariffa × oreMacchina × quantità
        tariffaUsata  = info.tariffa;
        quotaRepAnnua = info.tariffa * oreMacchina * p.quantita;
      } else {
        // Proporzionale (fallback)
        if (cfR > 0 && lav) {
          const cvCur = costoVarMacchinaUnit + costoMdoUnitVal + p.materiePrime;
          const baseTot = getBaseTotaleReparto(r.id);
          if (baseTot > 0) {
            const bp = baseProdottoUnit(lav, baseRiparto, cvCur);
            quotaRepAnnua = cfR * (bp * p.quantita / baseTot);
            tariffaUsata  = baseTot > 0 ? cfR / baseTot : 0;
          }
        }
      }

      quotaFissaAnnua   += quotaRepAnnua;
      quotaFissaUnitVal += p.quantita > 0 ? quotaRepAnnua / p.quantita : 0;

      return {
        reparto: r,
        oreMacchina,
        oreMdo,
        costoEnergiaUnit: cEnergiaUnit,
        costoConsumabiliUnit: cConsumabiliUnit,
        costoVarMacchinaUnit: cvm,
        costoMdoUnit: cmdo,
        quotaFissaRep: quotaRepAnnua,
        tariffaCFUsata: tariffaUsata,
        metodo: info.metodo,
      };
    });

    const costoVariabileUnit   = costoVarMacchinaUnit + costoMdoUnitVal + p.materiePrime;
    const costoIndustrialeUnit = costoVariabileUnit + quotaFissaUnitVal;

    // Ore macchina totali per unità (Σ reparti) — usate per tariffa oraria amm.vi
    const oreMacchinaUnitTot = reparti.reduce((s, r) => {
      const lav = lavMap.get(`${p.id}_${r.id}`);
      return s + (lav?.oreMacchina ?? 0);
    }, 0);

    let ammCommUnit: number;
    let percAmmCommEffettivaResult: number;
    if (ammCommTipo === "VALORE" && tariffaAmmCommOre > 0) {
      // Tariffa oraria: costo amm.vi proporzionale alle ore macchina lavorate
      ammCommUnit = tariffaAmmCommOre * oreMacchinaUnitTot;
      percAmmCommEffettivaResult = costoIndustrialeUnit > 0
        ? (ammCommUnit / costoIndustrialeUnit) * 100
        : 0;
    } else {
      // Percentuale fissa su costo industriale (PERC mode o fallback VALORE senza ore capacità)
      ammCommUnit = costoIndustrialeUnit * (percEffettiva / 100);
      percAmmCommEffettivaResult = percEffettiva;
    }

    const costoComplessivoUnit = costoIndustrialeUnit + ammCommUnit;

    const margineUnit =
      p.prezzoVendita != null ? p.prezzoVendita - costoComplessivoUnit : null;
    const marginePerc =
      p.prezzoVendita != null && p.prezzoVendita > 0
        ? (margineUnit! / p.prezzoVendita) * 100
        : null;

    const cfAllocati = quotaFissaAnnua + ammCommUnit * p.quantita;

    const mgcUnit = p.prezzoVendita != null ? p.prezzoVendita - costoVariabileUnit : null;
    const bepRaggiungibile = mgcUnit !== null && mgcUnit > 0;

    let bepQuantita: number | null = null;
    let bepRicavi:   number | null = null;
    let margineSicurezzaPerc: number | null = null;

    if (bepRaggiungibile && mgcUnit! > 0) {
      bepQuantita = cfAllocati / mgcUnit!;
      bepRicavi   = bepQuantita * p.prezzoVendita!;
      if (p.quantita > 0) {
        margineSicurezzaPerc = ((p.quantita - bepQuantita) / p.quantita) * 100;
      }
    }

    return {
      prodotto: p,
      costoVarMacchinaUnit,
      costoMdoUnit: costoMdoUnitVal,
      costoVariabileUnit,
      quotaFissaAnnua,
      quotaFissaUnit: quotaFissaUnitVal,
      percAmmCommEffettiva: percAmmCommEffettivaResult,
      ammCommUnit,
      tariffaAmmCommOre,
      oreMacchinaUnitTot,
      costoIndustrialeUnit,
      costoComplessivoUnit,
      margineUnit,
      marginePerc,
      bepRaggiungibile,
      bepQuantita,
      bepRicavi,
      margineSicurezzaPerc,
      cfAllocati,
      prezzoSuggerito: costoComplessivoUnit,
      dettaglioReparti,
    };
  });

  // ── Idle capacity per reparto ─────────────────────────────────────────────
  const idleCapacity: IdleCapacityReparto[] = reparti.map((r) => {
    const cfR   = cfReparto.get(r.id) ?? 0;
    const info  = tariffeCF.get(r.id)!;
    const oreUsate = prodotti.reduce((sum, p) => {
      const lav = lavMap.get(`${p.id}_${r.id}`);
      return sum + (lav?.oreMacchina ?? 0) * p.quantita;
    }, 0);

    const oreDisponibili = r.oreCapacitaAnnua > 0 ? r.oreCapacitaAnnua : oreUsate;
    const utilizzoPerc   = oreDisponibili > 0 ? (oreUsate / oreDisponibili) * 100 : 100;
    const costoIdleAnnuo = info.metodo === "CAPACITA"
      ? info.tariffa * Math.max(0, oreDisponibili - oreUsate)
      : 0; // no idle cost in proporzionale (tutto assorbito)

    return {
      repartoId: r.id,
      nome: r.nome,
      cfAnnui: cfR,
      oreDisponibili,
      oreUsate,
      utilizzoPerc,
      costoIdleAnnuo,
      tariffaCF: info.tariffa,
    };
  });

  return { risultati, idleCapacity };
}

// ── Helper: base prodotto per unità (senza × quantità) ────────────────────
function baseProdottoUnit(
  lav: LavData,
  baseRiparto: string,
  cvUnit: number,
): number {
  switch (baseRiparto) {
    case "ORE_MOD":       return lav.oreMdo;
    case "COSTO_DIRETTO": return cvUnit;
    default:              return lav.oreMacchina;
  }
}

// Helper per COSTO_DIRETTO base (primo passaggio)
function calcCVUnit(
  p: ProdottoData,
  reparti: RepartoData[],
  lavMap: Map<string, LavData>,
): number {
  return reparti.reduce((sum, r) => {
    const lav = lavMap.get(`${p.id}_${r.id}`);
    if (!lav) return sum;
    return sum + lav.oreMacchina * r.tariffaVarMacchina + lav.oreMdo * r.tariffaMdo;
  }, p.materiePrime);
}
