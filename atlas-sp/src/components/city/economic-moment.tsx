import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { TrendMark } from "@/components/data/metric";
import type { TrendDirection } from "@/components/data/metric";
import type { IndicatorValue } from "@/server/queries/municipality";
import { formatDelta } from "@/lib/format";

/**
 * "Momento econômico": tendência por dimensão, derivada da variação observada
 * nas séries. É uma classificação da plataforma, calculada e explicada — não
 * um indicador publicado por órgão algum.
 */

type SectorProfile = {
  sector: { name: string; slug: string };
  trend: TrendDirection;
  sharePct: number;
};

/** Corte de variação percentual que separa cada faixa de tendência. */
const THRESHOLDS = { strong: 6, mild: 1.5 } as const;

function classify(deltaPct: number | null): TrendDirection {
  if (deltaPct === null || !Number.isFinite(deltaPct)) return "INDISPONIVEL";
  if (deltaPct >= THRESHOLDS.strong) return "FORTE_ALTA";
  if (deltaPct >= THRESHOLDS.mild) return "ALTA";
  if (deltaPct > -THRESHOLDS.mild) return "ESTAVEL";
  if (deltaPct > -THRESHOLDS.strong) return "QUEDA";
  return "FORTE_QUEDA";
}

export function EconomicMoment({
  municipalityId,
  indicators,
  sectors,
}: {
  municipalityId: string;
  indicators: IndicatorValue[];
  sectors: SectorProfile[];
}) {
  const bySlug = new Map(indicators.map((indicator) => [indicator.slug, indicator]));

  const dimensions = [
    { label: "Emprego", indicator: bySlug.get("emprego-formal") },
    { label: "Empresas", indicator: bySlug.get("empresas-ativas") },
    { label: "PIB", indicator: bySlug.get("pib") },
    { label: "Renda do trabalho", indicator: bySlug.get("salario-medio") },
    { label: "Arrecadação", indicator: bySlug.get("receita-municipal") },
  ]
    .filter((entry) => entry.indicator)
    .map((entry) => ({
      label: entry.label,
      delta: entry.indicator!.deltaPct,
      trend: classify(entry.indicator!.deltaPct),
      reference: entry.indicator!.referenceLabel,
      isDemo: entry.indicator!.isDemo,
    }));

  const sectorLines = sectors
    .slice(0, 4)
    .map((entry) => ({ label: entry.sector.name, trend: entry.trend, delta: null, reference: null, isDemo: false }));

  const rows = [...dimensions, ...sectorLines];
  if (!rows.length) return null;

  return (
    <Card>
      <CardHeader
        eyebrow="Momento econômico"
        title="Para onde as séries apontam"
        description="Classificação da plataforma a partir da variação mais recente de cada série."
        dense
      />
      <CardBody dense>
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.label} className="flex items-center gap-3">
              <span className="min-w-0 flex-1 truncate text-[12.5px]">{row.label}</span>
              {row.delta !== null && Number.isFinite(row.delta) ? (
                <span className="tnum shrink-0 text-[11.5px] text-[var(--fg-muted)]">
                  {formatDelta(row.delta)}
                </span>
              ) : null}
              <TrendMark trend={row.trend} withLabel className="w-24 shrink-0 justify-end" />
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t pt-2.5 text-[11px] leading-relaxed text-[var(--fg-subtle)]">
          Faixas: variação acima de {THRESHOLDS.strong}% é forte alta; entre {THRESHOLDS.mild}% e{" "}
          {THRESHOLDS.strong}%, alta; entre −{THRESHOLDS.mild}% e {THRESHOLDS.mild}%, estável; e assim
          por simetria na queda. Não é indicador oficial de conjuntura.
        </p>
      </CardBody>
    </Card>
  );
}
