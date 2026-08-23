import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Radar as RadarIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState, PanelSkeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/shell/page-header";
import { SignalCard } from "@/components/radar/signal-card";
import { RadarFilters } from "@/components/radar/filters";
import { getRadarSignals, getRadarCategoryCounts, getRadarSummary } from "@/server/queries/radar";
import { CATEGORY_LABEL } from "@/lib/labels";
import { SCORE_METHODOLOGY } from "@/server/radar/scoring";
import { formatNumber } from "@/lib/format";
import type { SignalCategory } from "@prisma/client";

export const metadata: Metadata = {
  title: "Radar",
  description:
    "Movimentos relevantes detectados nos 645 municípios de São Paulo, ordenados por um índice proprietário de relevância.",
};

export const revalidate = 180;

type SearchParams = Promise<{
  categoria?: string | string[];
  score?: string;
  periodo?: string;
  q?: string;
}>;

export default async function RadarPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const categories = (Array.isArray(params.categoria) ? params.categoria : params.categoria ? [params.categoria] : [])
    .filter((value): value is SignalCategory => value in CATEGORY_LABEL);
  const minScore = params.score ? Number(params.score) : undefined;
  const sinceDays = params.periodo ? Number(params.periodo) : 30;

  return (
    <>
      <PageHeader
        eyebrow="Camada de inteligência"
        title="Radar"
        description="A plataforma monitora continuamente os 645 municípios paulistas. Aqui não está tudo o que aconteceu — está o que merece atenção, com o porquê ao lado."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Radar" }]}
      />

      <Suspense fallback={<div className="skeleton mb-6 h-16" />}>
        <RadarStats />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div>
          <Suspense fallback={<Card><PanelSkeleton rows={6} /></Card>}>
            <SignalFeed
              categories={categories}
              minScore={minScore}
              sinceDays={sinceDays}
              search={params.q}
            />
          </Suspense>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Suspense fallback={<Card><PanelSkeleton rows={5} /></Card>}>
            <FiltersPanel selected={categories} minScore={minScore} sinceDays={sinceDays} />
          </Suspense>

          <Card>
            <CardHeader
              eyebrow="Metodologia"
              title="Como o score é calculado"
              dense
            />
            <div className="px-4 py-3">
              <p className="whitespace-pre-line text-[11.5px] leading-relaxed text-[var(--fg-muted)]">
                {SCORE_METHODOLOGY}
              </p>
            </div>
          </Card>
        </aside>
      </div>
    </>
  );
}

async function RadarStats() {
  const summary = await getRadarSummary();
  const items = [
    { label: "24 horas", value: summary.last24h },
    { label: "7 dias", value: summary.last7d },
    { label: "Alta prioridade", value: summary.highPriority },
    { label: "Municípios cobertos", value: summary.monitoredMunicipalities },
  ];
  return (
    <div className="mb-6 flex flex-wrap items-center gap-x-8 gap-y-3 rounded-[var(--radius-lg)] border bg-[var(--bg-raised)] px-5 py-3.5">
      <span className="flex items-center gap-2 text-[12px] font-medium text-[var(--signal)]">
        <span className="radar-pulse relative flex size-1.5 rounded-full bg-[var(--signal)]" aria-hidden />
        Monitoramento ativo
      </span>
      {items.map((item) => (
        <span key={item.label} className="flex items-baseline gap-1.5">
          <span className="metric-value text-[17px] font-semibold">{formatNumber(item.value)}</span>
          <span className="text-[11.5px] text-[var(--fg-muted)]">{item.label}</span>
        </span>
      ))}
    </div>
  );
}

async function SignalFeed({
  categories,
  minScore,
  sinceDays,
  search,
}: {
  categories: SignalCategory[];
  minScore?: number;
  sinceDays: number;
  search?: string;
}) {
  const { signals } = await getRadarSignals({
    categories,
    minScore,
    sinceDays,
    search,
    limit: 40,
  });

  if (!signals.length) {
    return (
      <Card>
        <EmptyState
          icon={RadarIcon}
          title="Nenhum movimento com esses filtros"
          description="Amplie o período, reduza o score mínimo ou remova categorias para ver mais."
          action={
            <Link href="/radar" className="text-[12.5px] font-medium text-[var(--accent)] hover:underline">
              Limpar filtros
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[var(--fg-muted)]">
        <span className="tnum font-medium text-[var(--fg)]">{signals.length}</span> movimento(s) nos
        últimos {sinceDays} dias, ordenados por relevância.
      </p>
      {signals.map((signal) => (
        <SignalCard key={signal.id} signal={signal} />
      ))}
    </div>
  );
}

async function FiltersPanel({
  selected,
  minScore,
  sinceDays,
}: {
  selected: SignalCategory[];
  minScore?: number;
  sinceDays: number;
}) {
  const counts = await getRadarCategoryCounts(sinceDays);
  return <RadarFilters counts={counts} selected={selected} minScore={minScore} sinceDays={sinceDays} />;
}
