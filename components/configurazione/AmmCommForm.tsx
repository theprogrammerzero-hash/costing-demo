"use client";

import { useState } from "react";

interface Props {
  percAmmComm: number;
  ammCommTipo: string;
  ammCommValore: number;
}

export function AmmCommForm({ percAmmComm: initPerc, ammCommTipo, ammCommValore: initValore }: Props) {
  const [tipo, setTipo] = useState<"PERC" | "VALORE">(
    ammCommTipo === "VALORE" ? "VALORE" : "PERC",
  );
  const [perc,   setPerc]   = useState(initPerc);
  const [valore, setValore] = useState(initValore);

  const fmt = (n: number) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-4">
      {/* Selezione modalità */}
      <div className="space-y-2">
        <label
          className={`flex gap-3 cursor-pointer p-3 border transition-colors hover:bg-line/20 ${
            tipo === "PERC" ? "border-ink bg-line/10" : "border-line"
          }`}
        >
          <input
            type="radio"
            name="ammCommTipo"
            value="PERC"
            checked={tipo === "PERC"}
            onChange={() => setTipo("PERC")}
            className="mt-0.5 flex-shrink-0"
          />
          <div>
            <div className="font-medium text-sm">Percentuale sul costo industriale</div>
            <div className="text-xs text-ink-muted mt-0.5">
              Costo complessivo = costo industriale × (1 + %) — proporzionale alla complessità di ogni prodotto
            </div>
          </div>
        </label>

        <label
          className={`flex gap-3 cursor-pointer p-3 border transition-colors hover:bg-line/20 ${
            tipo === "VALORE" ? "border-ink bg-line/10" : "border-line"
          }`}
        >
          <input
            type="radio"
            name="ammCommTipo"
            value="VALORE"
            checked={tipo === "VALORE"}
            onChange={() => setTipo("VALORE")}
            className="mt-0.5 flex-shrink-0"
          />
          <div>
            <div className="font-medium text-sm">Importo annuo fisso (€)</div>
            <div className="text-xs text-ink-muted mt-0.5">
              Budget annuo di struttura amm.va/comm.le — ripartito sui prodotti in proporzione al
              costo industriale (equivale a una % calcolata automaticamente)
            </div>
          </div>
        </label>
      </div>

      {/* Inputs */}
      <div className="grid grid-cols-2 gap-4">

        {/* Campo % */}
        <div className={tipo === "PERC" ? "" : "opacity-35 pointer-events-none select-none"}>
          <label className="text-xxs uppercase tracking-wider text-ink-muted">
            Percentuale (%)
            {tipo === "PERC" && <span className="ml-1 text-ink font-semibold">← attivo</span>}
          </label>
          <div className="flex items-center gap-2 mt-1">
            <input
              name="percAmmComm"
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={perc}
              onChange={(e) => setPerc(parseFloat(e.target.value) || 0)}
              className="input w-24 font-mono"
            />
            <span className="text-ink-muted text-sm">%</span>
          </div>
        </div>

        {/* Campo € nominale */}
        <div className={tipo === "VALORE" ? "" : "opacity-35 pointer-events-none select-none"}>
          <label className="text-xxs uppercase tracking-wider text-ink-muted">
            Importo annuo (€)
            {tipo === "VALORE" && <span className="ml-1 text-ink font-semibold">← attivo</span>}
          </label>
          <div className="flex items-center gap-2 mt-1">
            <input
              name="ammCommValore"
              type="number"
              step="100"
              min="0"
              value={valore}
              onChange={(e) => setValore(parseFloat(e.target.value) || 0)}
              placeholder="es. 30000"
              className="input w-36 font-mono"
            />
            <span className="text-ink-muted text-sm">/anno</span>
          </div>
        </div>
      </div>

      {/* Anteprima formula live */}
      <div className="text-xs bg-line/20 border border-line px-3 py-2 space-y-0.5">
        <span className="text-xxs uppercase tracking-wider text-ink-muted mr-2">Modalità attiva:</span>
        {tipo === "PERC" ? (
          <span>
            costo complessivo = costo industriale ×{" "}
            <span className="num font-semibold text-ink">(1 + {perc}%)</span>
          </span>
        ) : (
          <span>
            <span className="num font-semibold text-ink">{fmt(valore)}/anno</span>
            {" "}ripartiti in proporzione al costo industriale di ogni prodotto
          </span>
        )}
      </div>
    </div>
  );
}
