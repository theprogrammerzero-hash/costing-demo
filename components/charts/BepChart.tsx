"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  q: number;
  ricavi: number;
  costiFissi: number;
  costiTotali: number;
}

interface BepChartProps {
  data: DataPoint[];
  bepQ: number;
  qPrevista?: number | null;
  qMax?: number | null;
}

const fmt = (v: number) =>
  new Intl.NumberFormat("it-IT", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(v);

const fmtFull = (v: number) =>
  "€ " +
  new Intl.NumberFormat("it-IT", { maximumFractionDigits: 0 }).format(v);

function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="border border-line bg-paper px-3 py-2 text-xs shadow-none">
      <div className="font-medium text-ink mb-1">
        Q = {new Intl.NumberFormat("it-IT").format(label ?? 0)}
      </div>
      {payload.map((p) => (
        <div key={p.name} className="flex justify-between gap-4">
          <span style={{ color: p.color }}>{p.name}</span>
          <span className="font-mono">{fmtFull(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function BepChart({ data, bepQ, qPrevista, qMax }: BepChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <LineChart data={data} margin={{ top: 8, right: 20, left: 10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
        <XAxis
          dataKey="q"
          tickFormatter={fmt}
          tick={{ fontSize: 11, fill: "#666" }}
          label={{ value: "Quantità (u.)", position: "insideBottom", offset: -4, fontSize: 11, fill: "#999" }}
        />
        <YAxis
          tickFormatter={fmt}
          tick={{ fontSize: 11, fill: "#666" }}
          label={{ value: "€", angle: -90, position: "insideLeft", offset: 10, fontSize: 11, fill: "#999" }}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
          formatter={(v) => <span style={{ color: "#000" }}>{v}</span>}
        />
        <Line
          type="linear"
          dataKey="ricavi"
          name="Ricavi"
          stroke="#000000"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          type="linear"
          dataKey="costiTotali"
          name="Costi totali"
          stroke="#666666"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3 }}
        />
        <Line
          type="linear"
          dataKey="costiFissi"
          name="Costi fissi"
          stroke="#CCCCCC"
          strokeWidth={1.5}
          strokeDasharray="5 3"
          dot={false}
        />
        {/* BEP reference line */}
        <ReferenceLine
          x={bepQ}
          stroke="#000"
          strokeWidth={1}
          label={{
            value: `BEP ${new Intl.NumberFormat("it-IT").format(Math.round(bepQ))}`,
            fontSize: 10,
            fill: "#000",
            position: "top",
          }}
        />
        {/* Quantità prevista */}
        {qPrevista && qPrevista > 0 && qPrevista !== bepQ && (
          <ReferenceLine
            x={qPrevista}
            stroke="#999"
            strokeWidth={1}
            strokeDasharray="3 2"
            label={{
              value: `Q prev. ${new Intl.NumberFormat("it-IT").format(Math.round(qPrevista))}`,
              fontSize: 10,
              fill: "#999",
              position: "top",
            }}
          />
        )}
        {/* Capacità max */}
        {qMax && qMax > 0 && qMax !== qPrevista && (
          <ReferenceLine
            x={qMax}
            stroke="#CCC"
            strokeWidth={1}
            strokeDasharray="2 2"
            label={{
              value: `Cap. max`,
              fontSize: 10,
              fill: "#CCC",
              position: "top",
            }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
