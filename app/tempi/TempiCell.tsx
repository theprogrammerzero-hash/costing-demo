"use client";

import { useState } from "react";
import { upsertTempoLavorazione } from "@/app/actions/tempi";

interface Props {
  prodottoId: string;
  repartoId: string;
  oreMacchina: number;
  oreMdo: number;
}

export function TempiCell({ prodottoId, repartoId, oreMacchina, oreMdo }: Props) {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const action = upsertTempoLavorazione.bind(null, prodottoId, repartoId);

  async function handleSubmit(fd: FormData) {
    await action(fd);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="w-full text-left px-3 py-2 hover:bg-line/30 transition-colors group"
        title="Clicca per modificare"
      >
        <div className="flex justify-between items-baseline gap-2">
          <span className="text-xxs text-ink-subtle">M</span>
          <span className={`font-mono text-sm ${oreMacchina === 0 ? "text-ink-subtle" : ""}`}>
            {oreMacchina === 0 ? "—" : `${oreMacchina.toFixed(2)}h`}
          </span>
        </div>
        <div className="flex justify-between items-baseline gap-2 mt-0.5">
          <span className="text-xxs text-ink-subtle">MdO</span>
          <span className={`font-mono text-sm ${oreMdo === 0 ? "text-ink-subtle" : ""}`}>
            {oreMdo === 0 ? "—" : `${oreMdo.toFixed(2)}h`}
          </span>
        </div>
        {saved && (
          <div className="text-xxs text-accent-pos mt-0.5">✓ salvato</div>
        )}
      </button>
    );
  }

  return (
    <form
      action={handleSubmit}
      className="p-2 border border-ink bg-paper space-y-1.5"
    >
      <div className="flex items-center gap-2">
        <label className="text-xxs text-ink-muted w-8">M</label>
        <input
          name="oreMacchina"
          type="number"
          step="0.01"
          min="0"
          defaultValue={oreMacchina}
          className="input-bordered w-full text-sm font-mono py-0.5 px-1.5"
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xxs text-ink-muted w-8">MdO</label>
        <input
          name="oreMdo"
          type="number"
          step="0.01"
          min="0"
          defaultValue={oreMdo}
          className="input-bordered w-full text-sm font-mono py-0.5 px-1.5"
        />
      </div>
      <div className="flex gap-1 pt-0.5">
        <button type="submit" className="btn btn-primary btn-sm flex-1 text-xs">✓</button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="btn btn-sm text-xs"
        >✕</button>
      </div>
    </form>
  );
}
