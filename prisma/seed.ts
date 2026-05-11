import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Pulizia (ordine: prima le tabelle dipendenti)
  await prisma.operazioneCiclo.deleteMany();
  await prisma.skillDipendente.deleteMany();
  await prisma.dipendente.deleteMany();
  await prisma.macchina.deleteMany();
  await prisma.voceCostoFisso.deleteMany();
  await prisma.lavorazioneReparto.deleteMany();
  await prisma.configurazione.deleteMany();
  await prisma.prodotto.deleteMany();
  await prisma.reparto.deleteMany();

  // ── Reparti — tariffe SOLO variabili ─────────────────────────────────
  // tariffaVarMacchina = consumabili/utensili per ora (NO energia — calcolata da kW×€/kWh)
  // costoEnergiaH = kWInstallata × prezzoEnergia    [automatico nel calcolo]
  // totale variabile/h = tariffaVarMacchina + costoEnergiaH
  //
  // CNC:  7.80 consumabili + 15kW×0.28=4.20 energia = 12.00 €/h  (invariato)
  // ASM:  5.16 consumabili +  3kW×0.28=0.84 energia =  6.00 €/h  (invariato)
  // COLL: 3.44 consumabili +  2kW×0.28=0.56 energia =  4.00 €/h  (invariato)
  const cnc = await prisma.reparto.create({
    data: {
      codice: "REP-01",
      nome: "Lavorazione CNC",
      tariffaVarMacchina: 7.80,  // €/ora — consumabili/utensili (NO energia)
      tariffaMdo: 22,             // €/ora — MdO diretta
      oreCapacitaAnnua: 4_000,   // 2 macchine × 2.000h → utilizzo attuale 3.400h = 85%
      kWInstallata: 15,           // kW potenza installata (2 centri di lavoro CNC)
      prezzoEnergia: 0.28,        // €/kWh tariffa energia attiva
    },
  });

  const asm = await prisma.reparto.create({
    data: {
      codice: "REP-02",
      nome: "Assemblaggio",
      tariffaVarMacchina: 5.16,  // €/ora — consumabili
      tariffaMdo: 20,
      oreCapacitaAnnua: 3_000,   // utilizzo attuale 2.460h = 82%
      kWInstallata: 3,            // kW — attrezzature assemblaggio
      prezzoEnergia: 0.28,
    },
  });

  const coll = await prisma.reparto.create({
    data: {
      codice: "REP-03",
      nome: "Collaudo & Finitura",
      tariffaVarMacchina: 3.44,  // €/ora — consumabili
      tariffaMdo: 18,
      oreCapacitaAnnua: 1_500,   // utilizzo attuale 820h = 55%
      kWInstallata: 2,            // kW — strumenti di misura
      prezzoEnergia: 0.28,
    },
  });

  // ── Voci Costi Fissi per reparto ─────────────────────────────────────
  // CNC — tot €80.000/anno
  await prisma.voceCostoFisso.createMany({
    data: [
      { repartoId: cnc.id, nome: "Ammortamento macchine CNC",  importo: 35_000 },
      { repartoId: cnc.id, nome: "Manutenzione programmata",   importo: 15_000 },
      { repartoId: cnc.id, nome: "Stipendi tecnici fissi",      importo: 20_000 },
      { repartoId: cnc.id, nome: "Energia (quota fissa)",       importo: 10_000 },
    ],
  });

  // Assemblaggio — tot €45.000/anno
  await prisma.voceCostoFisso.createMany({
    data: [
      { repartoId: asm.id, nome: "Ammortamento attrezzature",  importo: 15_000 },
      { repartoId: asm.id, nome: "Stipendi supervisori",        importo: 20_000 },
      { repartoId: asm.id, nome: "Affitto area assemblaggio",   importo: 10_000 },
    ],
  });

  // Collaudo & Finitura — tot €25.000/anno
  await prisma.voceCostoFisso.createMany({
    data: [
      { repartoId: coll.id, nome: "Strumenti misura (amm.)",   importo: 10_000 },
      { repartoId: coll.id, nome: "Personale fisso collaudo",   importo: 12_000 },
      { repartoId: coll.id, nome: "Energia (quota fissa)",       importo:  3_000 },
    ],
  });

  // ── Commesse demo ────────────────────────────────────────────────────
  const alfa = await prisma.prodotto.create({
    data: {
      codice: "CMM-001",
      nome: "Componente ALFA",
      cliente: "Rossi Meccanica Srl",
      quantita: 2_000,
      dataInizio: new Date("2026-03-01"),
      dataFine:   new Date("2026-06-30"),
      prezzoVendita: 95,
      materiePrime: 18,
    },
  });

  const beta = await prisma.prodotto.create({
    data: {
      codice: "CMM-002",
      nome: "Componente BETA",
      cliente: "Bianchi Impianti SpA",
      quantita: 1_500,
      dataInizio: new Date("2026-04-01"),
      dataFine:   new Date("2026-07-31"),
      prezzoVendita: 170,
      materiePrime: 28,
    },
  });

  const gamma = await prisma.prodotto.create({
    data: {
      codice: "CMM-003",
      nome: "Componente GAMMA",
      cliente: "Verdi Automazione Srl",
      quantita: 800,
      dataInizio: new Date("2026-05-01"),
      dataFine:   new Date("2026-08-31"),
      prezzoVendita: 320,
      materiePrime: 45,
    },
  });

  // ── Tempi lavorazione (ore per unità) ────────────────────────────────
  //          CNC     ASM     COLL
  // ALFA     0.50h   0.30h   0.10h  (macchina)
  //          0.25h   0.15h   0.08h  (mdo)
  // BETA     0.80h   0.60h   0.20h  (macchina)
  //          0.40h   0.30h   0.12h  (mdo)
  // GAMMA    1.50h   1.20h   0.40h  (macchina)
  //          0.75h   0.60h   0.20h  (mdo)

  await prisma.lavorazioneReparto.createMany({
    data: [
      // ALFA
      { prodottoId: alfa.id, repartoId: cnc.id,  oreMacchina: 0.50, oreMdo: 0.25 },
      { prodottoId: alfa.id, repartoId: asm.id,  oreMacchina: 0.30, oreMdo: 0.15 },
      { prodottoId: alfa.id, repartoId: coll.id, oreMacchina: 0.10, oreMdo: 0.08 },
      // BETA
      { prodottoId: beta.id, repartoId: cnc.id,  oreMacchina: 0.80, oreMdo: 0.40 },
      { prodottoId: beta.id, repartoId: asm.id,  oreMacchina: 0.60, oreMdo: 0.30 },
      { prodottoId: beta.id, repartoId: coll.id, oreMacchina: 0.20, oreMdo: 0.12 },
      // GAMMA
      { prodottoId: gamma.id, repartoId: cnc.id,  oreMacchina: 1.50, oreMdo: 0.75 },
      { prodottoId: gamma.id, repartoId: asm.id,  oreMacchina: 1.20, oreMdo: 0.60 },
      { prodottoId: gamma.id, repartoId: coll.id, oreMacchina: 0.40, oreMdo: 0.20 },
    ],
  });

  // ── Macchine (2 per reparto) ─────────────────────────────────────────
  const mac01 = await prisma.macchina.create({ data: { repartoId: cnc.id,  codice: "MAC-01", nome: "Centro Lavoro CNC #1", tipoOperazione: "LAVORAZIONE_CNC",  capacitaMinGiorno: 480, tempoSetupMin: 20 } });
  const mac02 = await prisma.macchina.create({ data: { repartoId: cnc.id,  codice: "MAC-02", nome: "Centro Lavoro CNC #2", tipoOperazione: "LAVORAZIONE_CNC",  capacitaMinGiorno: 480, tempoSetupMin: 20 } });
  const mac03 = await prisma.macchina.create({ data: { repartoId: asm.id,  codice: "MAC-03", nome: "Banco Assemblaggio A",  tipoOperazione: "ASSEMBLAGGIO",      capacitaMinGiorno: 480, tempoSetupMin: 10 } });
  const mac04 = await prisma.macchina.create({ data: { repartoId: asm.id,  codice: "MAC-04", nome: "Banco Assemblaggio B",  tipoOperazione: "ASSEMBLAGGIO",      capacitaMinGiorno: 480, tempoSetupMin: 10 } });
  const mac05 = await prisma.macchina.create({ data: { repartoId: coll.id, codice: "MAC-05", nome: "Tester Automatico",     tipoOperazione: "COLLAUDO",          capacitaMinGiorno: 480, tempoSetupMin:  5 } });
  const mac06 = await prisma.macchina.create({ data: { repartoId: coll.id, codice: "MAC-06", nome: "Banco Finitura",        tipoOperazione: "FINITURA",          capacitaMinGiorno: 480, tempoSetupMin:  5 } });

  // ── Dipendenti + skill matrix ─────────────────────────────────────────
  const dip1 = await prisma.dipendente.create({ data: { nome: "Mario Bianchi",    matricola: "DIP-001", efficienzaPerc: 95,  costoOrario: 22 } });
  const dip2 = await prisma.dipendente.create({ data: { nome: "Laura Verdi",      matricola: "DIP-002", efficienzaPerc: 100, costoOrario: 24 } });
  const dip3 = await prisma.dipendente.create({ data: { nome: "Giuseppe Esposito",matricola: "DIP-003", efficienzaPerc: 88,  costoOrario: 18 } });
  const dip4 = await prisma.dipendente.create({ data: { nome: "Stefania Romano",  matricola: "DIP-004", efficienzaPerc: 92,  costoOrario: 20 } });
  const dip5 = await prisma.dipendente.create({ data: { nome: "Andrea Conti",     matricola: "DIP-005", efficienzaPerc: 105, costoOrario: 25 } });

  await prisma.skillDipendente.createMany({ data: [
    // Mario: CNC + assemblaggio
    { dipendenteId: dip1.id, tipoOperazione: "LAVORAZIONE_CNC" },
    { dipendenteId: dip1.id, tipoOperazione: "ASSEMBLAGGIO" },
    // Laura: CNC specialist
    { dipendenteId: dip2.id, tipoOperazione: "LAVORAZIONE_CNC" },
    // Giuseppe: assemblaggio + collaudo
    { dipendenteId: dip3.id, tipoOperazione: "ASSEMBLAGGIO" },
    { dipendenteId: dip3.id, tipoOperazione: "COLLAUDO" },
    // Stefania: collaudo + finitura
    { dipendenteId: dip4.id, tipoOperazione: "COLLAUDO" },
    { dipendenteId: dip4.id, tipoOperazione: "FINITURA" },
    // Andrea: CNC + collaudo (polivalente)
    { dipendenteId: dip5.id, tipoOperazione: "LAVORAZIONE_CNC" },
    { dipendenteId: dip5.id, tipoOperazione: "COLLAUDO" },
    { dipendenteId: dip5.id, tipoOperazione: "FINITURA" },
  ]});

  // ── Cicli di lavorazione (scheda tempi) ───────────────────────────────
  // SAM coerenti con lavorazioneReparto: ALFA 0.50h CNC = 30min, 0.30h ASM = 18min, 0.10h COLL = 6min
  await prisma.operazioneCiclo.createMany({ data: [
    // ALFA
    { prodottoId: alfa.id, sequenza: 1, nome: "Fresatura profili",     tipoOperazione: "LAVORAZIONE_CNC", tempoStdMin: 30, tempoSetupMin: 20, macchinaId: mac01.id },
    { prodottoId: alfa.id, sequenza: 2, nome: "Montaggio componenti",  tipoOperazione: "ASSEMBLAGGIO",    tempoStdMin: 18, tempoSetupMin: 10, macchinaId: mac03.id },
    { prodottoId: alfa.id, sequenza: 3, nome: "Collaudo dimensionale", tipoOperazione: "COLLAUDO",        tempoStdMin:  4, tempoSetupMin:  5, macchinaId: mac05.id },
    { prodottoId: alfa.id, sequenza: 4, nome: "Finitura superficiale", tipoOperazione: "FINITURA",        tempoStdMin:  2, tempoSetupMin:  5, macchinaId: mac06.id },
    // BETA
    { prodottoId: beta.id, sequenza: 1, nome: "Tornitura e fresatura", tipoOperazione: "LAVORAZIONE_CNC", tempoStdMin: 48, tempoSetupMin: 20, macchinaId: mac01.id },
    { prodottoId: beta.id, sequenza: 2, nome: "Assemblaggio avanzato", tipoOperazione: "ASSEMBLAGGIO",    tempoStdMin: 36, tempoSetupMin: 10, macchinaId: mac04.id },
    { prodottoId: beta.id, sequenza: 3, nome: "Collaudo funzionale",   tipoOperazione: "COLLAUDO",        tempoStdMin:  8, tempoSetupMin:  5, macchinaId: mac05.id },
    { prodottoId: beta.id, sequenza: 4, nome: "Finitura e verniciatura",tipoOperazione: "FINITURA",       tempoStdMin:  4, tempoSetupMin:  5, macchinaId: mac06.id },
    // GAMMA
    { prodottoId: gamma.id, sequenza: 1, nome: "Lavorazione CNC complessa", tipoOperazione: "LAVORAZIONE_CNC", tempoStdMin: 90, tempoSetupMin: 30, macchinaId: mac02.id },
    { prodottoId: gamma.id, sequenza: 2, nome: "Assemblaggio struttura",    tipoOperazione: "ASSEMBLAGGIO",    tempoStdMin: 72, tempoSetupMin: 15, macchinaId: mac03.id },
    { prodottoId: gamma.id, sequenza: 3, nome: "Collaudo elettrico",        tipoOperazione: "COLLAUDO",        tempoStdMin: 18, tempoSetupMin:  5, macchinaId: mac05.id },
    { prodottoId: gamma.id, sequenza: 4, nome: "Finitura premium",          tipoOperazione: "FINITURA",        tempoStdMin:  6, tempoSetupMin:  5, macchinaId: mac06.id },
  ]});

  // ── Configurazione default ────────────────────────────────────────────
  await prisma.configurazione.create({
    data: {
      id: "main",
      percAmmComm: 15,
      ammCommTipo: "PERC",
      ammCommValore: 0,
      baseRiparto: "ORE_MACCHINA",
    },
  });

  console.log("✓ Seed completato:");
  console.log(`  3 reparti  (CNC, Assemblaggio, Collaudo & Finitura)`);
  console.log(`  10 voci CF (CNC €80k · ASM €45k · COLL €25k = €150k totali)`);
  console.log(`  tariffe variabili: CNC €12/h (7.80+4.20⚡) · ASM €6/h (5.16+0.84⚡) · COLL €4/h (3.44+0.56⚡)`)
  console.log(`  energia: CNC 15kW · ASM 3kW · COLL 2kW · prezzo €0.28/kWh`);
  console.log(`  capacità: CNC 4.000h · ASM 3.000h · COLL 1.500h`);
  console.log(`  tariffe CF: CNC €20/h · ASM €15/h · COLL €16.67/h`);
  console.log(`  6 macchine (2×CNC, 2×ASM, 1×COLL, 1×FINITURA)`);
  console.log(`  5 dipendenti con skill matrix (CNC/ASM/COLL/FINITURA)`);
  console.log(`  3 commesse (ALFA, BETA, GAMMA) con cliente e date`);
  console.log(`  9 lavorazioni · 12 operazioni ciclo (4 per commessa)`);
  console.log(`  SAM: ALFA 54min · BETA 96min · GAMMA 186min per unità`);
  console.log(`  configurazione: percAmmComm=15%, base=ORE_MACCHINA`);
  console.log(``);
  console.log(`  BEP corretto: cv usa SOLO variabili, CF = ammort.+stipendi+affitti`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
