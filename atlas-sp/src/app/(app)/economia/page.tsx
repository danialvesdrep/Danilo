import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { PanelSkeleton } from "@/components/ui/empty";
import { Metric, TrendMark } from "@/components/data/metric";
import { DemoNotice, DemoBadge } from "@/components/data/provenance";
import { Badge } from "@/components/ui/badge";
import { getStateSnapshot, getSectorMomentum, getIndexRanking } from "@/server/queries/state";
import { formatCurrencyScaled, formatCompact, formatNumber } from "@/lib/format";
import { INDICES } from "@/lib/indices";

export const metadata: Metadata = {
  title: "Economia de São Paulo",
  description:
    "A economia dos 645 municípios paulistas: PIB, emprego, setores em alta e em queda e os índices proprietários de momento econômico.",
};

export const revalidate = 900;

export default function EconomyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Economia em movimento"
        title="A economia do Estado"
        description="O agregado das séries municipais, os setores que avançam e recuam, e a posição de cada cidade nos índices proprietários da plataforma."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Economia" }]}
      />

      <Suspense fallback={<Card><PanelSkeleton rows={3} /></Card>}>
        <StateNumbers />
      </Suspense>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<Card><PanelSkeleton rows={5} /></Card>}>
          <SectorMomentum />
        </Suspense>
        <Suspense fallback={<Card><PanelSkeleton rows={5} /></Card>}>
          <IndexRanking slug="economic-momentum" />
        </Suspense>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<Card><PanelSkeleton rows={5} /></Card>}>
          <IndexRanking slug="investment-momentum" />
        </Suspense>
        <Suspense fallback={<Card><PanelSkeleton rows={5} /></Card>}>
          <IndexRanking slug="employment-momentum" />
        </Suspense>
      </div>

      <Card className="mt-6">
        <CardHeader
          eyebrow="Metodologia"
          title="Sobre os índices desta página"
          description="São construções do Atlas SP a partir dos dados da plataforma. Não são indicadores oficiais."
          action={
            <Link href="/metodologia" className="text-[12.5px] font-medium text-[var(--accent)] hover:underline">
              Metodologia completa
            </Link>
          }
        />
        <CardBody className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {INDICES.map((index) => (
            <div key={index.slug} id={index.slug} className="scroll-mt-20">
              <p className="text-[13px] font-medium">{index.name}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-[var(--fg-muted)]">{index.description}</p>
              <ul className="mt-2 space-y-0.5">
                {index.components.map((component) => (
                  <li key={component.signalKey} className="flex justify-between gap-2 text-[11.5px] text-[var(--fg-subtle)]">
                    <span className="truncate">{component.label}</span>
                    <span className="tnum shrink-0">{Math.round(component.weight * 100)}%</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardBody>
      </Card>
    </>
  );
}

async function StateNumbers() {
  const snapshot = await getStateSnapshot();
  return (
    <>
      <Card>
        <CardHeader
          eyebrow="Agregado estadual"
          title="Somatório das séries municipais"
          description={`Calculado sobre ${snapshot.coveredByData} dos ${snapshot.municipalityCount} municípios com série carregada.`}
        />
        <CardBody className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="População" value={snapshot.totalPopulation} unit="pessoas" size="lg" isDemo={snapshot.isDemo} />
          <Metric label="PIB somado" value={snapshot.totalGdp} unit="BRL" size="lg" isDemo={snapshot.isDemo} />
          <Metric label="PIB per capita" value={snapshot.gdpPerCapita} unit="BRL_UNIT" size="lg" isDemo={snapshot.isDemo} />
          <Metric label="Empregos formais" value={snapshot.totalEmployment} unit="vinculos" size="lg" isDemo={snapshot.isDemo} />
        </CardBody>
      </Card>
      {snapshot.isDemo ? <DemoNotice className="mt-4" /> : null}
    </>
  );
}

async function SectorMomentum() {
  const momentum = await getSectorMomentum();
  return (
    <Card>
      <CardHeader
        eyebrow="Setores"
        title="Difusão setorial no Estado"
        description="Percentual de municípios em que o setor avança menos aqueles em que recua."
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[26rem] text-left">
          <thead>
            <tr className="border-b">
              <th className="px-5 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Setor</th>
              <th className="px-5 py-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Alta</th>
              <th className="px-5 py-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Queda</th>
              <th className="px-5 py-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Difusão</th>
            </tr>
          </thead>
          <tbody>
            {momentum.all.slice(0, 14).map((sector) => (
              <tr key={sector!.slug} className="border-b last:border-b-0">
                <td className="px-5 py-2">
                  <Link href={`/setores/${sector!.slug}`} className="inline-flex items-center gap-2 text-[12.5px] font-medium hover:text-[var(--accent)]">
                    <span className="size-2 rounded-sm" style={{ backgroundColor: sector!.color ?? "var(--accent)" }} aria-hidden />
                    {sector!.name}
                  </Link>
                </td>
                <td className="tnum px-5 py-2 text-right text-[12px] text-rise">{sector!.rising}</td>
                <td className="tnum px-5 py-2 text-right text-[12px] text-fall">{sector!.falling}</td>
                <td className="tnum px-5 py-2 text-right text-[12.5px] font-medium">
                  {sector!.diffusion > 0 ? "+" : ""}
                  {formatNumber(sector!.diffusion, 0)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

async function IndexRanking({ slug }: { slug: string }) {
  const ranking = await getIndexRanking(slug, 12);
  if (!ranking) return null;
  return (
    <Card>
      <CardHeader
        eyebrow="Índice proprietário"
        title={ranking.index.name}
        description={ranking.index.description}
      />
      <ol>
        {ranking.scores.map((score, position) => (
          <li key={score.municipality.id} className="flex items-center gap-3 border-b px-5 py-2 last:border-b-0">
            <span className="tnum w-5 shrink-0 font-mono text-[11px] text-[var(--fg-subtle)]">{position + 1}</span>
            <Link href={`/cidade/${score.municipality.slug}`} className="min-w-0 flex-1 truncate text-[13px] font-medium hover:text-[var(--accent)]">
              {score.municipality.name}
              <span className="ml-1.5 text-[11px] font-normal text-[var(--fg-subtle)]">{score.municipality.mesoName}</span>
            </Link>
            <div className="h-1 w-20 shrink-0 overflow-hidden rounded-full bg-[var(--bg-inset)]">
              <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${score.value}%` }} />
            </div>
            <span className="tnum w-11 shrink-0 text-right text-[12.5px] font-semibold">{formatNumber(score.value, 1)}</span>
          </li>
        ))}
      </ol>
      <CardBody className="border-t">
        <p className="text-[11px] leading-relaxed text-[var(--fg-subtle)]">{ranking.index.disclaimer}</p>
      </CardBody>
    </Card>
  );
}
