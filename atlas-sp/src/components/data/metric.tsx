import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDelta, formatUnit } from "@/lib/format";
import { SourceTag, DemoBadge, type Provenance } from "./provenance";

export type TrendDirection =
  | "FORTE_ALTA" | "ALTA" | "ESTAVEL" | "QUEDA" | "FORTE_QUEDA" | "INDISPONIVEL";

const TREND_META: Record<TrendDirection, { icon: React.ElementType; label: string; tone: string; glyph: string }> = {
  FORTE_ALTA: { icon: ArrowUpRight, label: "Forte alta", tone: "text-rise", glyph: "↑↑" },
  ALTA: { icon: ArrowUpRight, label: "Alta", tone: "text-rise", glyph: "↑" },
  ESTAVEL: { icon: ArrowRight, label: "Estável", tone: "text-flat", glyph: "→" },
  QUEDA: { icon: ArrowDownRight, label: "Queda", tone: "text-fall", glyph: "↓" },
  FORTE_QUEDA: { icon: ArrowDownRight, label: "Forte queda", tone: "text-fall", glyph: "↓↓" },
  INDISPONIVEL: { icon: Minus, label: "Sem série suficiente", tone: "text-[var(--fg-subtle)]", glyph: "—" },
};

export function TrendMark({
  trend,
  withLabel = false,
  className,
}: {
  trend: TrendDirection;
  withLabel?: boolean;
  className?: string;
}) {
  const meta = TREND_META[trend];
  return (
    <span
      className={cn("inline-flex items-center gap-1 text-[12px] font-medium", meta.tone, className)}
      title={meta.label}
    >
      <span className="font-mono leading-none" aria-hidden>{meta.glyph}</span>
      {withLabel ? <span>{meta.label}</span> : <span className="sr-only">{meta.label}</span>}
    </span>
  );
}

/**
 * Bloco de indicador. Sempre expõe valor, período, variação e fonte:
 * a regra do produto é informação + contexto + origem, nunca o número solto.
 */
export function Metric({
  label,
  value,
  unit = "",
  precision = 0,
  delta,
  deltaLabel,
  referenceLabel,
  provenance,
  isDemo,
  trend,
  hint,
  size = "md",
  className,
  emptyMessage = "Dados não disponíveis",
}: {
  label: string;
  value: number | null | undefined;
  unit?: string;
  precision?: number;
  delta?: number | null;
  deltaLabel?: string;
  referenceLabel?: string | null;
  provenance?: Provenance | null;
  isDemo?: boolean;
  trend?: TrendDirection;
  hint?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  emptyMessage?: string;
}) {
  const hasValue = value !== null && value !== undefined && Number.isFinite(value);
  const valueClass =
    size === "lg" ? "text-[26px] leading-[1.1]" : size === "sm" ? "text-[15px]" : "text-[19px]";

  return (
    <div className={cn("min-w-0", className)}>
      <div className="flex items-center gap-1.5">
        <span className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
          {label}
        </span>
        {isDemo ? <DemoBadge compact /> : null}
      </div>

      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span
          className={cn(
            "metric-value font-semibold tracking-[-0.02em]",
            valueClass,
            !hasValue && "text-[var(--fg-subtle)] font-normal text-[14px]",
          )}
        >
          {hasValue ? formatUnit(value, unit, precision) : emptyMessage}
        </span>
        {hasValue && typeof delta === "number" && Number.isFinite(delta) ? (
          <span
            className={cn(
              "tnum text-[12.5px] font-medium",
              delta > 0.05 ? "text-rise" : delta < -0.05 ? "text-fall" : "text-flat",
            )}
          >
            {formatDelta(delta)}
            {deltaLabel ? <span className="ml-1 font-normal text-[var(--fg-subtle)]">{deltaLabel}</span> : null}
          </span>
        ) : null}
        {trend ? <TrendMark trend={trend} /> : null}
      </div>

      {hint ? <p className="mt-1 text-[12px] leading-snug text-[var(--fg-muted)]">{hint}</p> : null}

      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[var(--fg-subtle)]">
        {referenceLabel ? <span className="tnum">{referenceLabel}</span> : null}
        {provenance ? <SourceTag provenance={provenance} /> : null}
      </div>
    </div>
  );
}

/** Estado explícito para séries que não existem no recorte municipal. */
export function NoMunicipalSeries({
  indicator,
  contextValue,
  contextScope,
  className,
}: {
  indicator: string;
  contextValue?: React.ReactNode;
  contextScope?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-[var(--radius-md)] border border-dashed px-3.5 py-3", className)}>
      <p className="text-[12.5px] font-medium">{indicator}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--fg-muted)]">
        Não há série municipal disponível para este indicador.
        {contextValue ? " Exibindo o contexto disponível." : ""}
      </p>
      {contextValue ? (
        <div className="mt-2 flex items-baseline gap-2">
          <span className="metric-value text-[17px] font-semibold">{contextValue}</span>
          {contextScope ? (
            <span className="text-[11px] uppercase tracking-[0.06em] text-[var(--fg-subtle)]">
              {contextScope}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Barra de composição usada no DNA econômico. */
export function ShareBar({
  items,
  className,
  height = 8,
}: {
  items: Array<{ label: string; value: number; color?: string | null }>;
  className?: string;
  height?: number;
}) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  return (
    <div
      className={cn("flex w-full overflow-hidden rounded-full bg-[var(--bg-inset)]", className)}
      style={{ height }}
      role="img"
      aria-label={items.map((item) => `${item.label} ${item.value.toFixed(1)}%`).join(", ")}
    >
      {items.map((item) => (
        <span
          key={item.label}
          title={`${item.label}: ${item.value.toFixed(1)}%`}
          style={{
            width: `${(item.value / total) * 100}%`,
            backgroundColor: item.color ?? "var(--accent)",
          }}
        />
      ))}
    </div>
  );
}
