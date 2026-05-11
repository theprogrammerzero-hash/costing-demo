"use client";

import { useState } from "react";
import { Kpi } from "@/components/ui/Kpi";
import { BepChart } from "@/components/charts/BepChart";
import type { ProdottoResult } from "@/lib/costing/demo-calc";
import { generaDatiGraficoBEP } from "@/lib/costing/bep";

interface Props {
  risultati: ProdottoResult[];
  ammCommTipo: string;
  ammCommValore: number;
}

const fmt = (n: number, decimals = 2) =>
  new Intl.NumberFormat("it-IT", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);

const fmtEur = (n: number) =>
  new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);

const fmtN = (n: number) => new Intl.NumberFormat("it-IT").format(Math.round(n));

export function BepPanel({ risultati, ammCommTipo, ammCommValore }: Props) {
  const [selId, setSelId] = useState(risultati[0]?.prodotto.id ?? "");
  const sel = risultati.find((r) => r.prodotto.id === selId) ?? risultati[0];

  if (!sel) return null;

  const hasPrezzo    = sel.prodotto.prezzoVendita !== null;
  const hasBep       = sel.bepRaggiungibile && sel.bepQuantita !== null && isFinite(sel.bepQuantita);
  // BEP raggiungibile ma sopra la quantità prevista (sotto BEP)
  const sottoBep     = hasBep && sel.bepQuantita! > sel.prodotto.quantita;
  // MGC negativo (prezzo ≤ cv): BEP matematicamente irraggiungibile
  const bepImpossibile = !sel.bepRaggiungibile && hasPrezzo;

  const chartData = hasPrezzo && hasBep
    ? generaDatiGraficoBEP(
        {
          costiFissi: sel.cfAllocati,
          prezzoUnitario: sel.prodotto.prezzoVendita!,
          costoVariabileUnitario: sel.costoVariabileUnit,
        },
        Math.max(sel.prodotto.quantita, sel.bepQuantita! * 1.2) * 1.1,
        16,
      )
    : [];

  const ammCommLabel = ammCommTipo === "PERC"
    ? `${fmt(sel.percAmmCommEffettiva, 1)}%`
    : `€${ammCommValore.toLocaleString("it-IT")}/anno → ${fmt(sel.percAmmCommEffettiva, 1)}%`;

  return (
    <div className="space-y-5">
      {/* Selector prodotto */}
      <div className="flex gap-2 flex-wrap">
        {risultati.map((r) => (
          <button
            key={r.prodotto.id}
            type="button"
            onClick={() => setSelId(r.prodotto.id)}
            className={`px-3 py-1.5 text-sm border transition-colors ${
              selId === r.prodotto.id
                ? "border-ink bg-ink text-paper"
                : "border-line text-ink-muted hover:border-ink hover:text-ink"
            }`}
          >
            {r.prodotto.nome}
          </button>
        ))}
      </div>

      {!hasPrezzo && (
        <p className="text-sm text-ink-muted">
          Nessun prezzo di vendita impostato per questo prodotto.
        </p>
      )}

      {hasPrezzo && (
        <>
          {/* ── Banner: BEP irraggiungibile ──────────────────────────── */}
          {bepImpossibile && (
            <div className="border border-accent-neg/40 bg-accent-neg/5 p-4 space-y-2">
              <div className="font-medium text-accent-neg text-sm">
                ✕ BEP irraggiungibile — il prezzo non copre i costi variabili
              </div>
              <div className="text-xs text-ink-muted">
                Margine di contribuzione unitario:{" "}
                <span className="num text-accent-neg font-medium">
                  {fmtEur(sel.prodotto.prezzoVendita! - sel.costoVariabileUnit)}
                </span>
                {" "}(prezzo {fmtEur(sel.prodotto.prezzoVendita!)} − cv {fmtEur(sel.costoVariabileUnit)})
              </div>
              <div className="text-xs text-ink-muted">
                Ogni unità venduta aggrava la perdita. Aumentare il prezzo o ridurre i costi variabili.
              </div>
            </div>
          )}

          {/* ── Banner: sotto il BEP (MGC positivo ma Q* > Q_prevista) ── */}
          {sottoBep && !bepImpossibile && (
            <div className="border border-accent-neg/40 bg-accent-neg/5 p-3">
              <div className="font-medium text-accent-neg text-sm">
                ⚠ Sotto il BEP — la produzione prevista non copre i costi fissi
              </div>
              <div className="text-xs text-ink-muted mt-1">
                Il BEP è a {fmtN(sel.bepQuantita!)} u ma si producono{" "}
                {fmtN(sel.prodotto.quantita)} u/ordine.
              </div>
            </div>
          )}

          {/* ── KPI ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3">
            <Kpi
              label="BEP — Q*"
              value={
                bepImpossibile
                  ? "∞"
                  : hasBep
                  ? `${fmtN(sel.bepQuantita!)} u`
                  : "—"
              }
              delta={
                bepImpossibile
                  ? "prezzo < costo variabile"
                  : hasBep
                  ? `su ${fmtN(sel.prodotto.quantita)} u/ordine`
                  : undefined
              }
              deltaTone={bepImpossibile || sottoBep ? "neg" : "neutral"}
            />
            <Kpi
              label="Margine sicurezza"
              value={
                bepImpossibile
                  ? "—"
                  : sel.margineSicurezzaPerc != null && isFinite(sel.margineSicurezzaPerc)
                  ? `${fmt(sel.margineSicurezzaPerc, 1)}%`
                  : "—"
              }
              delta={
                bepImpossibile
                  ? "BEP irraggiungibile"
                  : sel.margineSicurezzaPerc != null && hasBep
                  ? sel.margineSicurezzaPerc > 20
                    ? "posizione solida"
                    : sel.margineSicurezzaPerc > 0
                    ? "area di attenzione"
                    : "sotto il BEP!"
                  : undefined
              }
              deltaTone={
                bepImpossibile
                  ? "neg"
                  : sel.margineSicurezzaPerc != null
                  ? sel.margineSicurezzaPerc > 20
                    ? "pos"
                    : sel.margineSicurezzaPerc > 0
                    ? "neutral"
                    : "neg"
                  : "neutral"
              }
            />
            <Kpi
              label="Ricavi al BEP"
              value={hasBep && !bepImpossibile ? fmtEur(sel.bepRicavi!) : "—"}
              delta={
                hasBep && sel.prodotto.prezzoVendita
                  ? `prezzo ${fmtEur(sel.prodotto.prezzoVendita)}/u`
                  : undefined
              }
            />
          </div>

          {/* ── Prezzo suggerito (quando margine negativo o sotto BEP) ── */}
          {(bepImpossibile || sottoBep) && (
            <div className="border border-line p-4 space-y-2">
              <div className="text-xs uppercase tracking-wider text-ink-muted font-medium">
                Prezzo consigliato per coprire tutti i costi
              </div>
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-mono font-medium num">
                  {fmtEur(sel.prezzoSuggerito)}
                </span>
                <span className="text-xs text-ink-muted">
                  = costo complessivo a {fmtN(sel.prodotto.quantita)} u/ordine
                </span>
              </div>
              <div className="text-xs text-ink-muted space-y-0.5">
                <div>cv: {fmtEur(sel.costoVariabileUnit)} + quota CF: {fmtEur(sel.quotaFissaUnit)} = c.industriale {fmtEur(sel.costoIndustrialeUnit)}</div>
                <div>+ amm.vi/comm.li ({ammCommLabel}): {fmtEur(sel.ammCommUnit)}</div>
                <div className="font-medium text-ink">
                  Prezzo minimo (break-even): {fmtEur(sel.prezzoSuggerito)}
                  {sel.prodotto.prezzoVendita != null && (
                    <span className="ml-2 text-accent-neg">
                      (attuale: {fmtEur(sel.prodotto.prezzoVendita)} — deficit{" "}
                      {fmtEur(sel.prodotto.prezzoVendita - sel.prezzoSuggerito)})
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ── Grafico BEP ─────────────────────────────────────────── */}
          {chartData.length > 0 && hasBep && (
            <div className="border border-line p-4">
              <div className="text-xs text-ink-muted mb-3 uppercase tracking-wider">
                Diagramma di redditività — {sel.prodotto.nome}
              </div>
              <BepChart
                data={chartData}
                bepQ={sel.bepQuantita!}
                qPrevista={sel.prodotto.quantita}
              />
            </div>
          )}

          {/* ── Formula esplicita ────────────────────────────────────── */}
          <div className="border border-line p-4 text-xs font-mono space-y-1 text-ink-muted">
            <div className="text-xxs uppercase tracking-wider text-ink-subtle mb-2">Formula BEP</div>
            <div>CV (solo variabili) = {fmtEur(sel.costoVariabileUnit)}</div>
            <div>p (prezzo vendita)  = {sel.prodotto.prezzoVendita != null ? fmtEur(sel.prodotto.prezzoVendita) : "—"}</div>
            <div>
              MGC unitario         ={" "}
              <span className={sel.prodotto.prezzoVendita! - sel.costoVariabileUnit < 0 ? "text-accent-neg" : ""}>
                {sel.prodotto.prezzoVendita != null
                  ? fmtEur(sel.prodotto.prezzoVendita - sel.costoVariabileUnit)
                  : "—"}
              </span>
            </div>
            <div className="border-t border-line pt-1 mt-1">
              CF struttura allocati = {fmtEur(sel.quotaFissaAnnua)}
            </div>
            <div>Amm.vi/comm.li ({ammCommLabel}) = {fmtEur(sel.cfAllocati - sel.quotaFissaAnnua)}</div>
            <div>CF allocati totali   = {fmtEur(sel.cfAllocati)}</div>
            <div className="border-t border-line pt-1 mt-1 text-ink font-medium">
              {bepImpossibile
                ? "Q* = ∞ (MGC ≤ 0 — BEP irraggiungibile)"
                : `Q* = ${fmtEur(sel.cfAllocati)} / ${
                    sel.prodotto.prezzoVendita != null
                      ? fmtEur(sel.prodotto.prezzoVendita - sel.costoVariabileUnit)
                      : "—"
                  } = ${hasBep ? `${fmt(sel.bepQuantita!, 0)} u` : "—"}`}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
