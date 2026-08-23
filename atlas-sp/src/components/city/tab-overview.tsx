import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Metric, ShareBar, TrendMark } from "@/components/data/metric";
import { DemoNotice } from "@/components/data/provenance";
import { NoMunicipalSeries } from "@/components/data/metric";
import { EmptyState } from "@/components/ui/empty";
import { SignalCard } from "@/components/radar/signal-card";
import { AnswerBlock } from "@/components/ai/answer";
import { SeriesChart } from "@/components/charts/series";
import { EconomicMoment } from "./economic-moment";
import {
  getIndicators, getMacroComposition, getSectorProfile, getIndexScores,
} from "@/server/queries/municipality";
import { getRadarSignals } from "@/server/queries/radar";
import { municipalityOverview } from "@/server/ai/atlas-ai";
import { formatNumber, formatPercent } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

const HEADLINE_INDICATORS = [
  "populacao", "pib", "pib-per-capita", "emprego-formal",
  "salario-medio", "empresas-ativas", "receita-municipal", "densidade-demografica",
];

/** Visão geral: panorama por IA, números de topo e o DNA econômico. */
export async function OverviewTab({ municipality }: { municipality: MunicipalityDetail }) {
  const [indicators, macro, sectors, indices, radar, overview] = await Promise.all([
    getIndicators(municipality.id),
    getMacroComposition(municipality.id),
    getSectorProfile(municipality.id),
    getIndexScores(municipality.id),
    getRadarSignals({ municipalityId: municipality.id, limit: 3, sinceDays: 120 }),
    municipalityOverview(municipality.id, municipality.name),
  ]);

  const byS1ug = new Map(indicators.map((indicator) => [indicator.slug, indicator]));
  const headline = HEADLINE_INDICATORS.map((slug) => byS1ug.get(slug)).filter(Boolean);
  const unavailable = indicators.filter((indicator) => !indicator.municipalLevel);
  const anyDemo = indicators.some((indicator) => indicator.isDemo);
  const gdp = byS1ug.get("pib");

  return (
    <div className="space-y-6">
      <AnswerBlock answer={overview} question={`Panorama de ${municipality.name}`} />

      {anyDemo ? <DemoNotice /> : null}

      <Card>
        <CardHeader
          eyebrow="Retrato"
          title="Números do município"
          description="Cada indicador mostra valor, período de referência, variação e fonte."
        />
        <CardBody className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {headline.map((indicator) => (
            <Metric
              key={indicator!.slug}
              label={indicator!.shortName}
              value={indicator!.value}
              unit={indicator!.unit}
              precision={indicator!.precision}
              delta={indicator!.deltaPct}
              deltaLabel="a/a"
              referenceLabel={indicator!.referenceLabel}
              provenance={indicator!.provenance}
              isDemo={indicator!.isDemo}
            />
          ))}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            eyebrow="Perfil econômico"
            title="DNA econômico"
            description="Composição do valor adicionado bruto por grande atividade."
            action={
              <Link
                href={`/cidade/${municipality.slug}?aba=economia`}
                className="text-[12.5px] font-medium text-[var(--accent)] hover:underline"
              >
                Abrir economia
              </Link>
            }
          />
          {macro.available ? (
            <CardBody>
              <ShareBar
                height={10}
                items={macro.parts.map((part) => ({
                  label: part.label,
                  value: part.sharePct,
                  color: part.color,
                }))}
              />
              <dl className="mt-4 space-y-2.5">
                {macro.parts.map((part) => (
                  <div key={part.key} className="flex items-center gap-3">
                    <span
                      className="size-2 shrink-0 rounded-sm"
                      style={{ backgroundColor: part.color }}
                      aria-hidden
                    />
                    <dt className="min-w-0 flex-1 truncate text-[13px]">{part.label}</dt>
                    <dd className="tnum shrink-0 text-[13px] font-semibold">
                      {formatPercent(part.sharePct, 1)}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-4 border-t pt-3 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
                Percentuais derivados do valor adicionado bruto por atividade
                {macro.referenceLabel ? ` (${macro.referenceLabel})` : ""}. A administração pública
                inclui educação e saúde públicas, conforme a classificação da fonte.
              </p>
            </CardBody>
          ) : (
            <EmptyState
              title="Composição não disponível"
              description="O valor adicionado por atividade ainda não foi ingerido para este município."
            />
          )}
        </Card>

        <div className="space-y-6">
          <EconomicMoment municipalityId={municipality.id} indicators={indicators} sectors={sectors} />

          {indices.length ? (
            <Card>
              <CardHeader
                eyebrow="Índices proprietários"
                title="Posição no Estado"
                description="Construções da plataforma — não são indicadores oficiais."
                dense
              />
              <CardBody dense className="space-y-3">
                {indices.map((index) => (
                  <Link
                    key={index.slug}
                    href={`/metodologia#${index.slug}`}
                    className="block rounded-[var(--radius-sm)] px-2 py-1.5 transition-colors hover:bg-[var(--bg-inset)]"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[12.5px] font-medium">{index.name}</span>
                      <span className="tnum text-[12.5px] font-semibold">
                        {formatNumber(index.value, 1)}
                        <span className="ml-1 text-[10px] font-normal text-[var(--fg-subtle)]">/100</span>
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-[var(--bg-inset)]">
                        <div
                          className="h-full rounded-full bg-[var(--accent)]"
                          style={{ width: `${index.value}%` }}
                        />
                      </div>
                      {index.rank ? (
                        <span className="tnum shrink-0 text-[10.5px] text-[var(--fg-subtle)]">
                          {index.rank}º de 645
                        </span>
                      ) : null}
                    </div>
                  </Link>
                ))}
              </CardBody>
            </Card>
          ) : null}
        </div>
      </div>

      {gdp && gdp.history.length > 1 ? (
        <Card>
          <CardHeader
            eyebrow="Série histórica"
            title="PIB municipal"
            description={`Evolução de ${gdp.history[0].label} a ${gdp.history[gdp.history.length - 1].label}. ${gdp.methodology}`}
          />
          <CardBody>
            <SeriesChart data={gdp.history} unit="BRL" height={210} />
          </CardBody>
        </Card>
      ) : null}

      {radar.signals.length ? (
        <Card>
          <CardHeader
            eyebrow="Radar"
            title={`Movimentos recentes em ${municipality.name}`}
            action={
              <Link
                href={`/cidade/${municipality.slug}?aba=radar`}
                className="text-[12.5px] font-medium text-[var(--accent)] hover:underline"
              >
                Ver todos
              </Link>
            }
          />
          <div className="space-y-3 p-4">
            {radar.signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </Card>
      ) : null}

      {unavailable.length ? (
        <Card>
          <CardHeader
            eyebrow="Cobertura"
            title="Indicadores sem série municipal"
            description="Nem tudo existe no recorte da cidade. Onde não existe, dizemos isso."
          />
          <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {unavailable.map((indicator) => (
              <NoMunicipalSeries key={indicator.slug} indicator={indicator.name} />
            ))}
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
