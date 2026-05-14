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
├── fasi/page.tsx               # Fasi di lavorazione per commessa (sostituisce tempi+ciclo)
├── macchine/page.tsx           # CRUD macchine per reparto
├── dipendenti/page.tsx         # CRUD operatori + skill matrix per reparto
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
- `tariffaMdo` — €/h manodopera diretta
- `oreCapacitaAnnua` — ore disponibili/anno (usate per tariffa CF predeterminata)
- `kWInstallata` — potenza installata (kW)
- `prezzoEnergia` — €/kWh tariffa energia
- `voceCostiFissi` → `VoceCostoFisso[]` — voci dettagliate CF annui

### Macchina
- Appartiene a un `Reparto`
- `capacitaMinGiorno` — minuti disponibili/giorno (default 480 = 8h)
- Opzionale nelle FaseLavorazione — usata per analisi carico macchine

### Dipendente + SkillDipendente
- `efficienzaPerc` — velocità rispetto al tempo standard (100% = standard)
- `costoOrario` — €/h per calcolo costo MdO
- `skills[]` → `repartoId` — reparti dove sa operare (nuovo: per reparto, non per tipo operazione)

### Prodotto (= Commessa)
- `quantita` — pezzi da produrre
- `dataInizio` / `dataFine` — per calcolo takt time
- `fasi[]` → `FaseLavorazione[]` — sequenza fasi con reparto, macchina, tempoOre

### FaseLavorazione ⬅ MODELLO CENTRALE (sostituisce LavorazioneReparto + OperazioneCiclo)
- `sequenza` — ordine esecuzione (1, 2, 3…)
- `nome` — es. "Taglio", "Preconfezione", "Confezione", "Ricamo"
- `repartoId` — reparto che esegue la fase
- `macchinaId` (opzionale) — macchina assegnata alla fase
- `tempoOre` — ore per pezzo (inserire sempre PER SINGOLO PEZZO, es. 30min = 0.50h)

### Configurazione (singleton, id="main")
- `percAmmComm` — % oppure budget €/anno costi amm.vi/comm.li
- `ammCommTipo` — "PERC" | "VALORE"
- `baseRiparto` — "ORE_MACCHINA" | "ORE_MOD" | "COSTO_DIRETTO"

---

## Logica di calcolo (`lib/costing/demo-calc.ts`)

### Struttura costo per unità (cascade)
```
Materie prime
+ Σ_fasi (tempoOre × kWInstallata × prezzoEnergia)   ← energia per fase
+ Σ_fasi (tempoOre × tariffaMdo)                     ← MdO per fase
= COSTO DIRETTO

+ Quota CF reparto = tariffaCF_R × Σ_fasi_in_R(tempoOre)
  dove tariffaCF_R = Σ(VoceCostiFisso_R) / oreCapacitaAnnua_R  [€/h]
= COSTO INDUSTRIALE

+ Costi amm.vi/comm.li = tariffaAmmComm × oreFasiUnitTot
  dove tariffaAmmComm = budgetAmmComm / Σ_reparti(oreCapacitaAnnua) [€/h]
= COSTO COMPLESSIVO
```

### Principio chiave: tariffe predeterminate a capacità
Sia i CF che i costi amm.vi usano tariffe `€/h` calcolate sulla **capacità annua** dei reparti. Il costo di un prodotto è **stabile** — non cambia al variare del mix commesse.

### Dati demo (seed.ts)
- CNC: MdO €22/h, energia 15kW×0.28=€4.20/h → cv €26.20/h, CF €80k/4000h = €20/h
- ASM: MdO €20/h, energia 3kW×0.28=€0.84/h → cv €20.84/h, CF €45k/3000h = €15/h
- COLL: MdO €18/h, energia 2kW×0.28=€0.56/h → cv €18.56/h, CF €25k/1500h = €16.67/h

---

## Pagine implementate

| Route | Descrizione |
|-------|-------------|
| `/` | Dashboard: KPI totali, tabella riepilogativa commesse, CF idle |
| `/reparti` | CRUD reparti con voci costi fissi annui, tariffe MdO, kW, energia |
| `/prodotti` | CRUD commesse con materie prime, quantità, prezzo, date |
| `/fasi` | **PRINCIPALE** — Fasi di lavorazione per commessa: sequenza, reparto, macchina, h/pz |
| `/macchine` | CRUD macchine per reparto, con capacità (opzionali nelle fasi) |
| `/dipendenti` | CRUD operatori + skill matrix per reparto |
| `/metodi-tempi` | Analisi: operatore ottimale per fase, carico macchine, copertura skill |
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
