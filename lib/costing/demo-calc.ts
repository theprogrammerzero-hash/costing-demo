/**
 * Calcolo Full Costing + BEP per il modello demo — versione Fasi di Lavorazione.
 *
 * Ogni commessa ha una lista di FaseLavorazione (es. Taglio, Preconfezione, Confezione…).
 * Ogni fase appartiene a un reparto e ha un tempoOre per pezzo.
 *
 * Costi variabili per fase:
 *   energia  = tempoOre × kWInstallata × prezzoEnergia    [€/pz]
 *   MdO      = tempoOre × tariffaMdo                      [€/pz]
 *
 * Costi fissi (tariffa predeterminata a capacità):
 *   tariffaCF_R = Σ(VoceCostiFisso_R) / oreCapacitaAnnua_R   [€/h]
 *   quotaCF     = tariffaCF_R × Σ_fasi_in_R(tempoOre)        [€/pz]
 *
 * Il costo fisso unitario è stabile — non cambia al variare del mix commesse.
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
  tariffaMdo: number;           // €/h — manodopera diretta
  oreCapacitaAnnua: number;     // ore disponibili/anno (per tariffa CF)
  kWInstallata: number;         // kW potenza installata
  prezzoEnergia: number;        // €/kWh tariffa energia
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

export interface FaseData {
  id: string;
  prodottoId: string;
  repartoId: string;
  macchinaId?: string | null;
  sequenza: number;
  nome: string;
  tempoOre: number;   // ore per pezzo
}

export interface IdleCapacityReparto {
  repartoId: string;
  nome: string;
  cfAnnui: number;
  oreDisponibili: number;
  oreUsate: number;
  utilizzoPerc: number;
  costoIdleAnnuo: number;
  tariffaCF: number;
}

export interface ProdottoResult {
  prodotto: ProdottoData;

  // Costi variabili per unità
  costoEnergiaUnit: number;    // Σ fasi: tempoOre × kW × €/kWh
  costoMdoUnit: number;        // Σ fasi: tempoOre × tariffaMdo
  costoVariabileUnit: number;  // energia + MdO + materiePrime

  // Quota costi fissi struttura
  quotaFissaAnnua: number;
  quotaFissaUnit: number;

  // Costi amm.vi/commerciali
  percAmmCommEffettiva: number;
  ammCommUnit: number;
  tariffaAmmCommOre: number;
  oreFasiUnitTot: number;   // Σ tempoOre di tutte le fasi per unità

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

  prezzoSuggerito: number;

  // Dettaglio aggregato per reparto
  dettaglioReparti: {
    reparto: RepartoData;
    tempoOre: number;           // totale ore fasi in questo reparto
    costoEnergiaUnit: number;
    costoMdoUnit: number;
    quotaFissaRep: number;
    tariffaCFUsata: number;
    metodo: "CAPACITA" | "PROPORZIONALE";
  }[];

  // Dettaglio per singola fase
  dettaglioFasi: {
    faseId: string;
    nome: string;
    repartoNome: string;
    tempoOre: number;
    costoEnergiaUnit: number;
    costoMdoUnit: number;
  }[];
}

export interface CalcResult {
  risultati: ProdottoResult[];
  idleCapacity: IdleCapacityReparto[];
}

export function calcDemoFullCosting(
  reparti: RepartoData[],
  prodotti: ProdottoData[],
  fasi: FaseData[],
  percAmmComm: number,
  baseRiparto: string = "ORE_MACCHINA",
  ammCommTipo: string = "PERC",
  ammCommValore: number = 0,
): CalcResult {
  // Mappa lookup reparto per id
  const repartoById = new Map<string, RepartoData>(reparti.map((r) => [r.id, r]));

  // Aggrega tempoOre per prodottoId_repartoId (somma di tutte le fasi nello stesso reparto)
  const oreMap = new Map<string, number>();
  for (const f of fasi) {
    const key = `${f.prodottoId}_${f.repartoId}`;
    oreMap.set(key, (oreMap.get(key) ?? 0) + f.tempoOre);
  }

  // CF annui per reparto
  const cfReparto = new Map<string, number>(
    reparti.map((r) => [r.id, r.voceCostiFissi.reduce((s, v) => s + v.importo, 0)]),
  );

  // Tariffe CF per reparto (predeterminate a capacità)
  const tariffeCF = new Map<string, { tariffa: number; metodo: "CAPACITA" | "PROPORZIONALE" }>();
  for (const r of reparti) {
    const cfR = cfReparto.get(r.id) ?? 0;
    if (r.oreCapacitaAnnua > 0 && cfR > 0) {
      tariffeCF.set(r.id, { tariffa: cfR / r.oreCapacitaAnnua, metodo: "CAPACITA" });
    } else {
      tariffeCF.set(r.id, { tariffa: 0, metodo: "PROPORZIONALE" });
    }
  }

  // Helper: base totale per riparto proporzionale (fallback)
  function getBaseTotaleReparto(repartoId: string): number {
    return prodotti.reduce((sum, p) => {
      const ore = oreMap.get(`${p.id}_${repartoId}`) ?? 0;
      if (ore === 0) return sum;
      switch (baseRiparto) {
        case "COSTO_DIRETTO": {
          const cv = calcCVUnit(p, reparti, oreMap);
          return sum + cv * p.quantita;
        }
        default: // ORE_MACCHINA, ORE_MOD → usa ore fasi (stessa cosa nel nuovo modello)
          return sum + ore * p.quantita;
      }
    }, 0);
  }

  // Passo 1: costo industriale base (per calcolare tariffa ammComm VALORE)
  const costoIndustrialeBase = new Map<string, number>();
  for (const p of prodotti) {
    let cvE = 0, cvMdo = 0, qfUnit = 0;
    for (const r of reparti) {
      const ore = oreMap.get(`${p.id}_${r.id}`) ?? 0;
      if (ore === 0) continue;
      cvE   += ore * r.kWInstallata * r.prezzoEnergia;
      cvMdo += ore * r.tariffaMdo;
      const info = tariffeCF.get(r.id)!;
      if (info.metodo === "CAPACITA") {
        qfUnit += info.tariffa * ore;
      } else {
        const cfR     = cfReparto.get(r.id) ?? 0;
        const baseTot = getBaseTotaleReparto(r.id);
        if (cfR > 0 && baseTot > 0) {
          const bp = ore; // base per unità = tempoOre
          qfUnit += (cfR * bp * p.quantita / baseTot) / p.quantita;
        }
      }
    }
    costoIndustrialeBase.set(p.id, cvE + cvMdo + p.materiePrime + qfUnit);
  }

  // Passo 2: tariffa amm.vi/comm.li
  let percEffettiva = percAmmComm;
  let tariffaAmmCommOre = 0;

  if (ammCommTipo === "VALORE" && ammCommValore > 0) {
    const totalOreCapacita = reparti.reduce((s, r) => s + r.oreCapacitaAnnua, 0);
    if (totalOreCapacita > 0) {
      tariffaAmmCommOre = ammCommValore / totalOreCapacita;
    } else {
      const totCostoIndBase = prodotti.reduce(
        (s, p) => s + (costoIndustrialeBase.get(p.id) ?? 0) * p.quantita,
        0,
      );
      percEffettiva = totCostoIndBase > 0 ? (ammCommValore / totCostoIndBase) * 100 : 0;
    }
  }

  // Passo 3: calcolo completo per ogni prodotto
  const risultati: ProdottoResult[] = prodotti.map((p) => {
    let costoEnergiaUnitTot = 0;
    let costoMdoUnitTot = 0;
    let quotaFissaUnitVal = 0;
    let quotaFissaAnnua = 0;

    const dettaglioReparti = reparti.map((r) => {
      const ore = oreMap.get(`${p.id}_${r.id}`) ?? 0;
      const tariffaEnergiaH = r.kWInstallata * r.prezzoEnergia;
      const cEnergiaUnit    = ore * tariffaEnergiaH;
      const cMdoUnit        = ore * r.tariffaMdo;
      costoEnergiaUnitTot += cEnergiaUnit;
      costoMdoUnitTot     += cMdoUnit;

      const info  = tariffeCF.get(r.id)!;
      const cfR   = cfReparto.get(r.id) ?? 0;
      let quotaRepAnnua = 0;
      let tariffaUsata  = 0;

      if (ore > 0) {
        if (info.metodo === "CAPACITA") {
          tariffaUsata  = info.tariffa;
          quotaRepAnnua = info.tariffa * ore * p.quantita;
        } else {
          if (cfR > 0) {
            const baseTot = getBaseTotaleReparto(r.id);
            if (baseTot > 0) {
              quotaRepAnnua = cfR * (ore * p.quantita / baseTot);
              tariffaUsata  = cfR / baseTot;
            }
          }
        }
      }

      quotaFissaAnnua   += quotaRepAnnua;
      quotaFissaUnitVal += p.quantita > 0 ? quotaRepAnnua / p.quantita : 0;

      return {
        reparto: r,
        tempoOre: ore,
        costoEnergiaUnit: cEnergiaUnit,
        costoMdoUnit: cMdoUnit,
        quotaFissaRep: quotaRepAnnua,
        tariffaCFUsata: tariffaUsata,
        metodo: info.metodo,
      };
    });

    // Dettaglio per singola fase
    const faseProdotto = fasi.filter((f) => f.prodottoId === p.id).sort((a, b) => a.sequenza - b.sequenza);
    const dettaglioFasi = faseProdotto.map((f) => {
      const r = repartoById.get(f.repartoId);
      return {
        faseId: f.id,
        nome: f.nome,
        repartoNome: r?.nome ?? "—",
        tempoOre: f.tempoOre,
        costoEnergiaUnit: f.tempoOre * (r?.kWInstallata ?? 0) * (r?.prezzoEnergia ?? 0),
        costoMdoUnit: f.tempoOre * (r?.tariffaMdo ?? 0),
      };
    });

    const costoVariabileUnit   = costoEnergiaUnitTot + costoMdoUnitTot + p.materiePrime;
    const costoIndustrialeUnit = costoVariabileUnit + quotaFissaUnitVal;

    // Ore totali fasi per unità (usate per tariffa oraria amm.vi)
    const oreFasiUnitTot = faseProdotto.reduce((s, f) => s + f.tempoOre, 0);

    let ammCommUnit: number;
    let percAmmCommEffettivaResult: number;
    if (ammCommTipo === "VALORE" && tariffaAmmCommOre > 0) {
      ammCommUnit = tariffaAmmCommOre * oreFasiUnitTot;
      percAmmCommEffettivaResult = costoIndustrialeUnit > 0
        ? (ammCommUnit / costoIndustrialeUnit) * 100
        : 0;
    } else {
      ammCommUnit = costoIndustrialeUnit * (percEffettiva / 100);
      percAmmCommEffettivaResult = percEffettiva;
    }

    const costoComplessivoUnit = costoIndustrialeUnit + ammCommUnit;
    const margineUnit  = p.prezzoVendita != null ? p.prezzoVendita - costoComplessivoUnit : null;
    const marginePerc  = p.prezzoVendita != null && p.prezzoVendita > 0
      ? (margineUnit! / p.prezzoVendita) * 100 : null;

    const cfAllocati = quotaFissaAnnua + ammCommUnit * p.quantita;
    const mgcUnit    = p.prezzoVendita != null ? p.prezzoVendita - costoVariabileUnit : null;
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
      costoEnergiaUnit: costoEnergiaUnitTot,
      costoMdoUnit: costoMdoUnitTot,
      costoVariabileUnit,
      quotaFissaAnnua,
      quotaFissaUnit: quotaFissaUnitVal,
      percAmmCommEffettiva: percAmmCommEffettivaResult,
      ammCommUnit,
      tariffaAmmCommOre,
      oreFasiUnitTot,
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
      dettaglioFasi,
    };
  });

  // Idle capacity per reparto
  const idleCapacity: IdleCapacityReparto[] = reparti.map((r) => {
    const cfR      = cfReparto.get(r.id) ?? 0;
    const info     = tariffeCF.get(r.id)!;
    const oreUsate = prodotti.reduce((sum, p) => {
      return sum + (oreMap.get(`${p.id}_${r.id}`) ?? 0) * p.quantita;
    }, 0);

    const oreDisponibili = r.oreCapacitaAnnua > 0 ? r.oreCapacitaAnnua : oreUsate;
    const utilizzoPerc   = oreDisponibili > 0 ? (oreUsate / oreDisponibili) * 100 : 100;
    const costoIdleAnnuo = info.metodo === "CAPACITA"
      ? info.tariffa * Math.max(0, oreDisponibili - oreUsate)
      : 0;

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

// Helper CV per COSTO_DIRETTO base
function calcCVUnit(
  p: ProdottoData,
  reparti: RepartoData[],
  oreMap: Map<string, number>,
): number {
  return reparti.reduce((sum, r) => {
    const ore = oreMap.get(`${p.id}_${r.id}`) ?? 0;
    return sum + ore * r.kWInstallata * r.prezzoEnergia + ore * r.tariffaMdo;
  }, p.materiePrime);
}
