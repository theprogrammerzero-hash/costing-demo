import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  // Pulizia (ordine dipendenze)
  await prisma.faseLavorazione.deleteMany();
  await prisma.skillDipendente.deleteMany();
  await prisma.dipendente.deleteMany();
  await prisma.macchina.deleteMany();
  await prisma.voceCostoFisso.deleteMany();
  await prisma.configurazione.deleteMany();
  await prisma.prodotto.deleteMany();
  await prisma.reparto.deleteMany();

  // ── Reparti ──────────────────────────────────────────────────────────
  // tariffaMdo = €/h manodopera diretta
  // kWInstallata × prezzoEnergia = costo energia per ora (automatico nel calcolo)
  const cnc = await prisma.reparto.create({
    data: {
      codice: "REP-01",
      nome: "Lavorazione CNC",
      tariffaMdo: 22,             // €/h MdO diretta
      oreCapacitaAnnua: 4_000,
      kWInstallata: 15,           // kW — 2 centri di lavoro CNC
      prezzoEnergia: 0.28,        // €/kWh
    },
  });

  const asm = await prisma.reparto.create({
    data: {
      codice: "REP-02",
      nome: "Assemblaggio",
      tariffaMdo: 20,
      oreCapacitaAnnua: 3_000,
      kWInstallata: 3,
      prezzoEnergia: 0.28,
    },
  });

  const coll = await prisma.reparto.create({
    data: {
      codice: "REP-03",
      nome: "Collaudo & Finitura",
      tariffaMdo: 18,
      oreCapacitaAnnua: 1_500,
      kWInstallata: 2,
      prezzoEnergia: 0.28,
    },
  });

  // ── Voci Costi Fissi ──────────────────────────────────────────────────
  await prisma.voceCostoFisso.createMany({
    data: [
      // CNC — tot €80.000/anno · tariffaCF = €20/h
      { repartoId: cnc.id, nome: "Ammortamento macchine CNC",  importo: 35_000 },
      { repartoId: cnc.id, nome: "Manutenzione programmata",   importo: 15_000 },
      { repartoId: cnc.id, nome: "Stipendi tecnici fissi",      importo: 20_000 },
      { repartoId: cnc.id, nome: "Energia (quota fissa)",       importo: 10_000 },
      // Assemblaggio — tot €45.000/anno · tariffaCF = €15/h
      { repartoId: asm.id, nome: "Ammortamento attrezzature",  importo: 15_000 },
      { repartoId: asm.id, nome: "Stipendi supervisori",        importo: 20_000 },
      { repartoId: asm.id, nome: "Affitto area assemblaggio",   importo: 10_000 },
      // Collaudo & Finitura — tot €25.000/anno · tariffaCF = €16.67/h
      { repartoId: coll.id, nome: "Strumenti misura (amm.)",   importo: 10_000 },
      { repartoId: coll.id, nome: "Personale fisso collaudo",   importo: 12_000 },
      { repartoId: coll.id, nome: "Energia (quota fissa)",       importo:  3_000 },
    ],
  });

  // ── Commesse ─────────────────────────────────────────────────────────
  const alfa = await prisma.prodotto.create({
    data: {
      codice: "CMM-001", nome: "Componente ALFA",
      cliente: "Rossi Meccanica Srl",
      quantita: 2_000, prezzoVendita: 95, materiePrime: 18,
      dataInizio: new Date("2026-03-01"), dataFine: new Date("2026-06-30"),
    },
  });

  const beta = await prisma.prodotto.create({
    data: {
      codice: "CMM-002", nome: "Componente BETA",
      cliente: "Bianchi Impianti SpA",
      quantita: 1_500, prezzoVendita: 170, materiePrime: 28,
      dataInizio: new Date("2026-04-01"), dataFine: new Date("2026-07-31"),
    },
  });

  const gamma = await prisma.prodotto.create({
    data: {
      codice: "CMM-003", nome: "Componente GAMMA",
      cliente: "Verdi Automazione Srl",
      quantita: 800, prezzoVendita: 320, materiePrime: 45,
      dataInizio: new Date("2026-05-01"), dataFine: new Date("2026-08-31"),
    },
  });

  // ── Macchine ─────────────────────────────────────────────────────────
  const mac01 = await prisma.macchina.create({ data: { repartoId: cnc.id,  codice: "MAC-01", nome: "Centro Lavoro CNC #1", capacitaMinGiorno: 480 } });
  const mac02 = await prisma.macchina.create({ data: { repartoId: cnc.id,  codice: "MAC-02", nome: "Centro Lavoro CNC #2", capacitaMinGiorno: 480 } });
  const mac03 = await prisma.macchina.create({ data: { repartoId: asm.id,  codice: "MAC-03", nome: "Banco Assemblaggio A",  capacitaMinGiorno: 480 } });
  const mac04 = await prisma.macchina.create({ data: { repartoId: asm.id,  codice: "MAC-04", nome: "Banco Assemblaggio B",  capacitaMinGiorno: 480 } });
  const mac05 = await prisma.macchina.create({ data: { repartoId: coll.id, codice: "MAC-05", nome: "Tester Automatico",     capacitaMinGiorno: 480 } });
  const mac06 = await prisma.macchina.create({ data: { repartoId: coll.id, codice: "MAC-06", nome: "Banco Finitura",        capacitaMinGiorno: 480 } });

  // ── Dipendenti + skill per reparto ───────────────────────────────────
  const dip1 = await prisma.dipendente.create({ data: { nome: "Mario Bianchi",     matricola: "DIP-001", efficienzaPerc: 95,  costoOrario: 22 } });
  const dip2 = await prisma.dipendente.create({ data: { nome: "Laura Verdi",       matricola: "DIP-002", efficienzaPerc: 100, costoOrario: 24 } });
  const dip3 = await prisma.dipendente.create({ data: { nome: "Giuseppe Esposito", matricola: "DIP-003", efficienzaPerc: 88,  costoOrario: 18 } });
  const dip4 = await prisma.dipendente.create({ data: { nome: "Stefania Romano",   matricola: "DIP-004", efficienzaPerc: 92,  costoOrario: 20 } });
  const dip5 = await prisma.dipendente.create({ data: { nome: "Andrea Conti",      matricola: "DIP-005", efficienzaPerc: 105, costoOrario: 25 } });

  await prisma.skillDipendente.createMany({ data: [
    // Mario: CNC + Assemblaggio
    { dipendenteId: dip1.id, repartoId: cnc.id },
    { dipendenteId: dip1.id, repartoId: asm.id },
    // Laura: CNC specialist
    { dipendenteId: dip2.id, repartoId: cnc.id },
    // Giuseppe: Assemblaggio + Collaudo
    { dipendenteId: dip3.id, repartoId: asm.id },
    { dipendenteId: dip3.id, repartoId: coll.id },
    // Stefania: Collaudo
    { dipendenteId: dip4.id, repartoId: coll.id },
    // Andrea: CNC + Collaudo (polivalente)
    { dipendenteId: dip5.id, repartoId: cnc.id },
    { dipendenteId: dip5.id, repartoId: coll.id },
  ]});

  // ── Fasi di lavorazione ──────────────────────────────────────────────
  // tempoOre = ore per singolo pezzo
  //
  //          CNC    ASM    COLL
  // ALFA     0.50h  0.30h  0.10h
  // BETA     0.80h  0.60h  0.20h
  // GAMMA    1.50h  1.20h  0.40h
  //
  // Costi variabili/ora per reparto:
  //   CNC:  energia 15kW×0.28=€4.20/h + MdO €22/h = €26.20/h
  //   ASM:  energia  3kW×0.28=€0.84/h + MdO €20/h = €20.84/h
  //   COLL: energia  2kW×0.28=€0.56/h + MdO €18/h = €18.56/h

  await prisma.faseLavorazione.createMany({ data: [
    // ── ALFA ──
    { prodottoId: alfa.id, sequenza: 1, nome: "Fresatura CNC",       repartoId: cnc.id,  macchinaId: mac01.id, tempoOre: 0.50 },
    { prodottoId: alfa.id, sequenza: 2, nome: "Montaggio componenti",repartoId: asm.id,  macchinaId: mac03.id, tempoOre: 0.30 },
    { prodottoId: alfa.id, sequenza: 3, nome: "Collaudo",            repartoId: coll.id, macchinaId: mac05.id, tempoOre: 0.10 },
    // ── BETA ──
    { prodottoId: beta.id, sequenza: 1, nome: "Tornitura e fresatura",  repartoId: cnc.id,  macchinaId: mac01.id, tempoOre: 0.80 },
    { prodottoId: beta.id, sequenza: 2, nome: "Assemblaggio avanzato",  repartoId: asm.id,  macchinaId: mac04.id, tempoOre: 0.60 },
    { prodottoId: beta.id, sequenza: 3, nome: "Collaudo funzionale",    repartoId: coll.id, macchinaId: mac05.id, tempoOre: 0.20 },
    // ── GAMMA ──
    { prodottoId: gamma.id, sequenza: 1, nome: "Lavorazione CNC complessa", repartoId: cnc.id,  macchinaId: mac02.id, tempoOre: 1.50 },
    { prodottoId: gamma.id, sequenza: 2, nome: "Assemblaggio struttura",     repartoId: asm.id,  macchinaId: mac03.id, tempoOre: 1.20 },
    { prodottoId: gamma.id, sequenza: 3, nome: "Collaudo elettrico",         repartoId: coll.id, macchinaId: mac05.id, tempoOre: 0.40 },
  ]});

  // ── Configurazione ───────────────────────────────────────────────────
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
  console.log("  3 reparti  (CNC, Assemblaggio, Collaudo & Finitura)");
  console.log("  10 voci CF (CNC €80k · ASM €45k · COLL €25k = €150k totali)");
  console.log("  tariffe CF: CNC €20/h · ASM €15/h · COLL €16.67/h");
  console.log("  energia: CNC 15kW · ASM 3kW · COLL 2kW · prezzo €0.28/kWh");
  console.log("  cv/h: CNC €26.20 · ASM €20.84 · COLL €18.56");
  console.log("  6 macchine (2×CNC, 2×ASM, 1×tester, 1×finitura)");
  console.log("  5 dipendenti con skill per reparto");
  console.log("  3 commesse (ALFA, BETA, GAMMA)");
  console.log("  9 fasi totali (3 per commessa: CNC → ASM → COLL)");
  console.log("  configurazione: percAmmComm=15%, base=ORE_MACCHINA");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
