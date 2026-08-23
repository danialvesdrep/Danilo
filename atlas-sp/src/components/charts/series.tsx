"use client";

import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { formatCompact, formatUnit } from "@/lib/format";

/**
 * Gráficos do produto. Deliberadamente austeros: sem gradiente, sem sombra,
 * sem legenda flutuante. Grade discreta, um traço, e o número onde importa.
 */

const AXIS_STYLE = {
  fontSize: 10.5,
  fill: "var(--fg-subtle)",
  fontFamily: "var(--font-mono)",
};

function ChartTooltip({
  active,
  payload,
  label,
  unit,
  precision,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color?: string }>;
  label?: string;
  unit: string;
  precision: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-[var(--radius-sm)] border bg-[var(--bg-raised)] px-2.5 py-1.5 shadow-[var(--shadow-pop)]">
      <p className="font-mono text-[10px] uppercase tracking-[0.06em] text-[var(--fg-subtle)]">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="tnum mt-0.5 text-[12px] font-medium">
          {entry.name !== "value" ? (
            <span className="mr-1.5 text-[var(--fg-muted)]">{entry.name}</span>
          ) : null}
          {formatUnit(entry.value, unit, precision)}
        </p>
      ))}
    </div>
  );
}

export function SeriesChart({
  data,
  unit = "",
  precision = 0,
  height = 180,
  type = "area",
  color = "var(--accent)",
}: {
  data: Array<{ label: string; value: number }>;
  unit?: string;
  precision?: number;
  height?: number;
  type?: "area" | "line" | "bar";
  color?: string;
}) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-[var(--radius-sm)] border border-dashed text-[12px] text-[var(--fg-subtle)]"
        style={{ height }}
      >
        Sem série disponível
      </div>
    );
  }

  const tooltip = (
    <Tooltip
      content={<ChartTooltip unit={unit} precision={precision} />}
      cursor={{ stroke: "var(--border-strong)", strokeWidth: 1 }}
    />
  );
  const axes = (
    <>
      <CartesianGrid stroke="var(--grid-line)" vertical={false} />
      <XAxis
        dataKey="label"
        tick={AXIS_STYLE}
        tickLine={false}
        axisLine={{ stroke: "var(--border)" }}
        minTickGap={12}
      />
      <YAxis
        tick={AXIS_STYLE}
        tickLine={false}
        axisLine={false}
        width={44}
        tickFormatter={(value: number) => formatCompact(value)}
      />
    </>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      {type === "bar" ? (
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          {axes}
          {tooltip}
          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.value < 0 ? "var(--fall)" : color} />
            ))}
          </Bar>
        </BarChart>
      ) : type === "line" ? (
        <LineChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          {axes}
          {tooltip}
          <Line type="monotone" dataKey="value" stroke={color} strokeWidth={1.8} dot={false} activeDot={{ r: 3 }} />
        </LineChart>
      ) : (
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
          {axes}
          {tooltip}
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.8}
            fill={color}
            fillOpacity={0.1}
          />
        </AreaChart>
      )}
    </ResponsiveContainer>
  );
}

/** Comparação de várias cidades no mesmo indicador. */
export function ComparisonChart({
  data,
  series,
  unit = "",
  precision = 0,
  height = 240,
}: {
  data: Array<Record<string, string | number>>;
  series: Array<{ key: string; label: string; color: string }>;
  unit?: string;
  precision?: number;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--grid-line)" vertical={false} />
        <XAxis dataKey="label" tick={AXIS_STYLE} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
        <YAxis
          tick={AXIS_STYLE}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={(value: number) => formatCompact(value)}
        />
        <Tooltip content={<ChartTooltip unit={unit} precision={precision} />} />
        {series.map((entry) => (
          <Line
            key={entry.key}
            type="monotone"
            dataKey={entry.key}
            name={entry.label}
            stroke={entry.color}
            strokeWidth={1.8}
            dot={false}
            activeDot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Minigráfico embutido em linhas de tabela. */
export function Sparkline({
  data,
  color = "var(--accent)",
  width = 72,
  height = 22,
}: {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return <span className="text-[11px] text-[var(--fg-subtle)]">—</span>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 3) - 1.5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}
