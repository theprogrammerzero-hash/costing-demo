/**
 * Tipi condivisi per la libreria di costing.
 * Riferimenti: Lezioni 18-24 (cartella materiale/).
 */

// =====================================================
// CLASSIFICAZIONI (Lezione 18)
// =====================================================

export type Destinazione =
  | "INDUSTRIALE"
  | "COMMERCIALE"
  | "AMMINISTRATIVO"
  | "ONERI_FIGURATIVI"
  | "FINANZIARIO";

export type Comportamento = "FISSO" | "VARIABILE" | "SEMIVARIABILE";

export type Modalita = "DIRETTO" | "INDIRETTO";

export type TipoCentro = "PRODUTTIVO" | "AUSILIARIO" | "FUNZIONALE";

export type BaseRiparto =
  | "COSTO_PRIMO"
  | "MATERIE_PRIME"
  | "MANO_OPERA"
  | "ORE_MACCHINA"
  | "ORE_LAVORO"
  | "QUANTITA"
  | "FORZA_MOTRICE";

// =====================================================
// CONFIGURAZIONI DI COSTO (Lezione 18, 19, 20)
// =====================================================

/**
 * Costo Primo: materie prime + mano d'opera diretta + altri costi speciali diretti.
 */
export interface CostoPrimoInput {
  materiePrime: number;
  manoOperaDiretta: number;
  altriCostiSpeciali?: number;
}

export interface CostoPrimoResult {
  costoPrimo: number;
  composizione: {
    materiePrime: number;
    manoOperaDiretta: number;
    altriCostiSpeciali: number;
  };
}

/**
 * Costo Industriale: costo primo + quota costi indiretti industriali.
 */
export interface CostoIndustrialeInput {
  costoPrimo: number;
  quotaCostiIndiretti: number;
}

export interface CostoIndustrialeResult {
  costoIndustriale: number;
  costoPrimo: number;
  quotaCostiIndiretti: number;
}

/**
 * Costo Complessivo: costo industriale + quota costi amm/comm/generali.
 */
export interface CostoComplessivoInput {
  costoIndustriale: number;
  percentualeAmmComm: number; // es. 15 per 15%
}

export interface CostoComplessivoResult {
  costoComplessivo: number;
  costoIndustriale: number;
  quotaAmmComm: number;
}

/**
 * Costo Economico-Tecnico: costo complessivo + oneri figurativi.
 */
export interface CostoEconomicoTecnicoInput {
  costoComplessivo: number;
  interessiCapitaleProprio?: number;
  stipendioDirezionale?: number;
  rischioImpresa?: number;
  altriOneriFigurativi?: number;
}

export interface CostoEconomicoTecnicoResult {
  costoEconomicoTecnico: number;
  costoComplessivo: number;
  totaleOneriFigurativi: number;
  dettaglioOneriFigurativi: {
    interessiCapitaleProprio: number;
    stipendioDirezionale: number;
    rischioImpresa: number;
    altri: number;
  };
}

// =====================================================
// RIPARTO COSTI INDIRETTI
// =====================================================

export interface OggettoRiparto {
  id: string; // identificatore (es. codice commessa)
  baseValue: number; // valore della base di riparto per questo oggetto
}

export interface RipartoBaseUnicaInput {
  costiDaRipartire: number;
  oggetti: OggettoRiparto[];
}

export interface RipartoBaseUnicaResult {
  coefficiente: number;
  baseTotale: number;
  ripartizioni: {
    id: string;
    baseValue: number;
    quotaImputata: number;
  }[];
  totaleImputato: number;
}

export interface GruppoBaseMultipla {
  nome: string;
  costoTotale: number;
  baseRiparto: BaseRiparto | string;
  // baseValuePerOggetto[oggettoId] = valore della base per quell'oggetto
  baseValuePerOggetto: Record<string, number>;
}

export interface RipartoBaseMultiplaInput {
  oggettiIds: string[];
  gruppi: GruppoBaseMultipla[];
}

export interface RipartoBaseMultiplaResult {
  gruppi: {
    nome: string;
    coefficiente: number;
    baseTotale: number;
    ripartizioni: { id: string; quota: number }[];
  }[];
  totaliPerOggetto: Record<string, number>;
  totaleGenerale: number;
}

// =====================================================
// DIRECT COSTING (Lezione 21)
// =====================================================

export interface DirectCostingProdottoInput {
  id: string;
  nome: string;
  ricaviVendita: number;
  costiVariabiliPeriodo: number;
  esistenzeIniziali: number;
  rimanenzeFinali: number;
  costiFissiSpecifici: number;
}

export interface DirectCostingInput {
  prodotti: DirectCostingProdottoInput[];
  costiFissiComuni: number;
}

export interface DirectCostingProdottoResult {
  id: string;
  nome: string;
  ricaviVendita: number;
  costoVariabileVenduto: number;
  margineLordoContribuzione: number;
  indiceRedditivita: number; // %
  costiFissiSpecifici: number;
  margineSemilordo: number;
}

export interface DirectCostingResult {
  prodotti: DirectCostingProdottoResult[];
  totali: {
    ricaviVendita: number;
    costoVariabileVenduto: number;
    margineLordoContribuzione: number;
    costiFissiSpecifici: number;
    margineSemilordo: number;
    costiFissiComuni: number;
    utileLordo: number;
  };
}

// =====================================================
// ABC (Lezione 22)
// =====================================================

export interface AttivitaABC {
  id: string;
  nome: string;
  costDriver: string;
  costoTotale: number;
  driverTotali: number;
  costoUnitarioDriver?: number; // calcolato
}

export interface ProdottoABCInput {
  id: string;
  nome: string;
  quantitaProdotta: number;
  costiDiretti: number;
  // driverAssorbiti[attivitaId] = numero di cost driver assorbiti
  driverAssorbiti: Record<string, number>;
}

export interface ABCInput {
  attivita: AttivitaABC[];
  prodotti: ProdottoABCInput[];
}

export interface ProdottoABCResult {
  id: string;
  nome: string;
  costiDiretti: number;
  costiIndirettiPerAttivita: Record<string, number>;
  costoIndirettoTotale: number;
  costoTotale: number;
  quantitaProdotta: number;
  costoUnitario: number;
}

export interface ABCResult {
  attivita: (AttivitaABC & { costoUnitarioDriver: number })[];
  prodotti: ProdottoABCResult[];
  totali: {
    costiDiretti: number;
    costiIndirettiTotali: number;
    costoComplessivo: number;
  };
}

// =====================================================
// DECISIONI (Lezione 23)
// =====================================================

export interface MakeOrBuyInput {
  costoVariabileUnitInterno: number;
  prezzoAcquistoEsterno: number;
  costiFissiCessanti?: number; // 0 se non eliminabili
  quantita?: number;
}

export interface MakeOrBuyResult {
  vantaggiUnit: number;
  svantaggiUnit: number;
  risultatoUnit: number; // positivo = conviene comprare, negativo = conviene produrre
  raccomandazione: "PRODURRE_INTERNAMENTE" | "ACQUISTARE_ESTERNO" | "INDIFFERENTE";
  risultatoTotale?: number;
}

export interface SoppressioneInput {
  ricavi: number;
  costiVariabili: number;
  costiFissiSpecifici: number;
  costiFissiStrutturaNonCessanti?: number;
}

export interface SoppressioneResult {
  vantaggi: number; // costi cessanti
  svantaggi: number; // ricavi cessanti
  risultato: number;
  raccomandazione: "MANTIENI" | "SOPPRIMI" | "INDIFFERENTE";
}

export interface OrdineAggiuntivoInput {
  prezzoOrdinarioUnit: number;
  costoVariabileUnit: number;
  costiFissiAttuali: number;
  capacitaResidua: number;
  quantitaRichiesta: number;
  prezzoOffertoUnit: number;
  incrementoCostiFissi?: number; // se la nuova produzione richiede ampliamento
}

export interface OrdineAggiuntivoResult {
  costoSuppletivoTotale: number;
  costoSuppletivoUnit: number;
  ricaviAggiuntivi: number;
  margineAggiuntivo: number;
  raccomandazione: "ACCETTA" | "RIFIUTA" | "INDIFFERENTE";
  capacitaSufficiente: boolean;
}

export interface CostoSuppletivoInput {
  produzioneBase: number;
  costoVariabileUnit: number;
  costiFissiBase: number;
  produzioneAggiuntiva: number;
  incrementoCostiFissi?: number;
}

export interface CostoSuppletivoResult {
  costoBaseTotale: number;
  costoConAggiunta: number;
  costoSuppletivoTotale: number;
  costoSuppletivoUnit: number;
  costoMedioUnitarioComplessivo: number;
}

// =====================================================
// BREAK EVEN (Lezione 24)
// =====================================================

export interface BepInput {
  costiFissi: number;
  prezzoUnitario: number;
  costoVariabileUnitario: number;
}

export interface BepResult {
  bepQuantita: number;
  bepRicavi: number;
  margineContribuzioneUnit: number;
  rapportoMC: number; // margine contribuzione / prezzo
}

export interface MargineSicurezzaInput {
  quantitaVendute?: number;
  ricaviEffettivi?: number;
  bepQuantita?: number;
  bepRicavi?: number;
}

export interface MargineSicurezzaResult {
  marginePercQuantita?: number;
  marginePercRicavi?: number;
}
