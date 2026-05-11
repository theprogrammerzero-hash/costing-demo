# Costing Demo — Contesto progetto per Claude

## Cos'è questo software

Demo professionale di **full costing + BEP** per aziende manifatturiere. Pensata per essere presentata a titolari di PMI manifatturiere che vogliono capire i costi di produzione. L'obiettivo finale è diventare un software commerciale.

Il target è un'azienda con reparti produttivi, macchine CNC, operatori con diverse efficienze, e commesse (prodotti) da lavorare in ciclo.

## Stack tecnico

- **Next.js 14** (App Router, Server Components, Server Actions)
- **TypeScript**
- **Tailwind CSS** — design system bianco/nero, zero colori decorativi
- **Prisma 7** con adapter **libsql** (`@prisma/adapter-libsql`)
- **DB locale:** SQLite (`dev.db`, non committato)
- **DB cloud:** Turso (libSQL-as-a-service) — stessa API, zero modifiche al codice
- **Recharts** per i grafici BEP

### Configurazione DB (`lib/db.ts`)
```typescript
const adapter = new PrismaLibSql({
  url: process.env.DATABASE_URL ?? "file:dev.db",
  authToken: process.env.TURSO_AUTH_TOKEN, // solo per Turso cloud
});
```
- Locale: `DATABASE_URL="file:./dev.db"` in `.env`
- Cloud: `DATABASE_URL=libsql://...turso.io` + `TURSO_AUTH_TOKEN=...` in `.env.local`

### Per avviare in locale
```bash
npm install
npx prisma db push          # crea schema su dev.db
npx tsx prisma/seed.ts      # carica dati demo
npm run dev                 # porta 3000
```

---

## Struttura cartelle

```
app/
├── page.tsx                    # Dashboard KPI
├── reparti/page.tsx            # CRUD reparti con costi fissi e tariffe
├── prodotti/page.tsx           # CRUD commesse/prodotti
├── tempi/page.tsx              # Matrice ore lavorazione (prodotto × reparto)
├── macchine/page.tsx           # CRUD macchine per reparto
├── dipendenti/page.tsx         # CRUD operatori + skill matrix
├── ciclo/page.tsx              # Ciclo di lavorazione (sequenza operazioni per commessa)
├── metodi-tempi/page.tsx       # Analisi: assegnazione ottimale operatori, carico macchine
├── risultati/page.tsx          # Full costing cascade + BEP per commessa
├── configurazione/page.tsx     # % amm.vi/comm.li, base di riparto
└── actions/                    # Server Actions (create/update/delete per ogni entità)

lib/
├── db.ts                       # Prisma client singleton con libsql adapter
├── costing/
│   ├── demo-calc.ts            # LOGICA CENTRALE — tutto il calcolo costi
│   ├── bep.ts                  # Calcolo BEP e dati grafico
│   ├── full-costing.ts         # Funzioni pure full costing (riuso)
│   └── types.ts                # Tipi TypeScript condivisi
└── utils.ts                    # cn() per classnames

components/
├── layout/Header.tsx + Sidebar.tsx
├── ui/PageHeader.tsx, Kpi.tsx, Table.tsx
├── charts/BepChart.tsx
├── configurazione/AmmCommForm.tsx
└── risultati/BepPanel.tsx

prisma/
├── schema.prisma               # Schema DB
└── seed.ts                     # Dati demo (3 reparti, 3 prodotti, 6 macchine, 5 dipendenti)
```

---

## Modello dati (Prisma)

### Reparto
- `tariffaVarMacchina` — €/h solo consumabili/utensili (NO energia)
- `tariffaMdo` — €/h manodopera diretta
- `oreCapacitaAnnua` — ore disponibili/anno (usate per tariffa CF e tariffa amm.vi)
- `kWInstallata` — potenza installata (kW)
- `prezzoEnergia` — €/kWh tariffa energia
- `voceCostiFissi` → `VoceCostoFisso[]` — voci dettagliate CF annui (ammortamenti, affitti, ecc.)

### Macchina
- Appartiene a un `Reparto`
- `tipoOperazione` — chiave che collega macchina ↔ skill dipendente ↔ operazione ciclo
- `capacitaMinGiorno` — minuti disponibili/giorno (default 480 = 8h)

### Dipendente + SkillDipendente
- `efficienzaPerc` — velocità rispetto al tempo standard (100% = standard, 85% = 15% più lento)
- `costoOrario` — €/h per calcolo costo MdO
- `skills[]` — tipi operazione che sa eseguire (es. "CNC_FRESATURA", "ASSEMBLAGGIO")

### Prodotto (= Commessa)
- `quantita` — pezzi da produrre
- `dataInizio` / `dataFine` — per calcolo takt time
- `lavorazioni[]` → `LavorazioneReparto[]` — ore macchina/MdO per reparto
- `operazioniCiclo[]` → `OperazioneCiclo[]` — sequenza operazioni con SAM

### OperazioneCiclo
- `sequenza` — ordine nell'ciclo
- `tipoOperazione` — collega a Macchina e SkillDipendente
- `tempoStdMin` — SAM (Standard Allowed Minutes) per unità

### LavorazioneReparto
- `oreMacchina` + `oreMdo` per unità prodotta
- Usata dal motore di calcolo costi (`demo-calc.ts`)

### Configurazione (singleton, id="main")
- `percAmmComm` — % oppure budget €/anno costi amm.vi/comm.li
- `ammCommTipo` — "PERC" | "VALORE"
- `baseRiparto` — "ORE_MACCHINA" | "ORE_MOD" | "COSTO_DIRETTO"

---

## Logica di calcolo (`lib/costing/demo-calc.ts`)

### Struttura costo per unità (cascade)
```
Materie prime
+ Costo macchina variabile    = oreMacchina × tariffaVarMacchina
+ Costo energia               = oreMacchina × kWInstallata × prezzoEnergia
+ Costo MdO diretta           = oreMdo × tariffaMdo
= COSTO DIRETTO

+ Quota CF reparto            = tariffaCF × oreMacchina
  dove tariffaCF = Σ(VoceCostiFisso) / oreCapacitaAnnua  [€/h]
= COSTO INDUSTRIALE

+ Costi amm.vi/comm.li        = tariffaAmmComm × oreMacchinaUnit_tot
  dove tariffaAmmComm = budgetAmmComm / Σ_reparti(oreCapacitaAnnua) [€/h]
= COSTO COMPLESSIVO
```

### Principio chiave: tariffe predeterminate a capacità
Sia i CF che i costi amm.vi usano tariffe `€/h` calcolate sulla **capacità annua** dei reparti, non sulle ore effettivamente usate. Questo rende i costi di un prodotto **stabili** — non cambiano se aggiungo o rimuovo altri prodotti.

### Energia: modello split
`tariffaVarMacchina` = solo consumabili e utensili  
Energia calcolata separatamente: `kWInstallata × prezzoEnergia × oreMacchina`  
In `/risultati` si vede la composizione: `M 0.50h × [⚡€4.20 + cons.€7.80]`

---

## Pagine implementate

| Route | Descrizione |
|-------|-------------|
| `/` | Dashboard: KPI totali, tabella riepilogativa commesse, CF idle |
| `/reparti` | CRUD reparti con voci costi fissi annui, tariffe, kW, energia |
| `/prodotti` | CRUD commesse con materie prime, quantità, prezzo, date |
| `/tempi` | Matrice ore: per ogni prodotto × reparto inserisce oreMacchina e oreMdo |
| `/macchine` | CRUD macchine raggruppate per reparto, con tipo operazione e capacità |
| `/dipendenti` | CRUD operatori + skill matrix (assegna/rimuovi skill) |
| `/ciclo` | Per ogni commessa: sequenza operazioni SAM, bottleneck highlight, takt time, KPI linea |
| `/metodi-tempi` | Analisi: operatore ottimale per operazione, carico macchine vs capacità, copertura skill |
| `/risultati` | Full costing cascade per ogni commessa + BEP (grafico + Q*) |
| `/configurazione` | Impostazioni: base riparto, tipo/valore costi amm.vi |

---

## Dati demo (seed.ts)

**Reparti:**
- CNC (REP-01): tariffaVar €7.80/h, MdO €22/h, CF €80k/anno, 4000h cap., 15kW, €0.28/kWh
- Assemblaggio (REP-02): tariffaVar €4.00/h, MdO €20/h, CF €45k/anno, 3000h cap., 8kW
- Collaudo (REP-03): tariffaVar €2.50/h, MdO €18/h, CF €25k/anno, 1500h cap., 3kW

**Prodotti:**
- ALFA (PRD-A): 2000 pz, €85, MP €18/u — ciclo: taglio CNC → assemblaggio → collaudo
- BETA (PRD-B): 1500 pz, €120, MP €28/u — ciclo più lungo
- GAMMA (PRD-C): 800 pz, €210, MP €45/u — ciclo più lungo e complesso

**Configurazione:** ammComm = VALORE €25.000/anno → tariffa €2.94/h (=25k/8500h cap. totale)

**Risultati attesi `/risultati`:**
- ALFA: costo amm.vi ~€2.65/u (~4%)
- BETA: costo amm.vi ~€4.71/u (~4%)
- GAMMA: costo amm.vi ~€9.12/u (~4%)

---

## Convenzioni di stile

- **Design:** bianco puro `#FFF`, testo nero, zero colori decorativi
- **Accenti:** rosso `num-neg` per valori negativi/sovraccapacità, verde `num-pos` per margini positivi
- **Font numeri:** `font-mono` / classe `num` per allineamento tabulare
- **Classi CSS custom** in `globals.css`: `btn`, `btn-primary`, `btn-danger`, `input`, `nav-link`, `nav-link-active`, `nav-section`, `table-zebra`, `num`, `num-pos`, `num-neg`
- **Server Components** ovunque possibile — Client Components solo dove serve interattività

---

## Note per lo sviluppo futuro

- Il software è pensato per evolversi in un prodotto commerciale completo
- La logica di calcolo è in `lib/costing/demo-calc.ts` — è il cuore del sistema, modificare con attenzione
- Ogni modifica allo schema Prisma richiede `npx prisma db push` + restart del server
- Per aggiungere una nuova pagina: creare `app/nuova-route/page.tsx` + aggiungere alla sidebar in `components/layout/Sidebar.tsx`
- Le Server Actions seguono il pattern: `prisma.X.create/update/delete → revalidatePath("/route") → redirect("/route")`
