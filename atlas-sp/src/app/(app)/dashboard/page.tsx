import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Activity, ArrowUpRight, Radar as RadarIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PanelSkeleton, EmptyState } from "@/components/ui/empty";
import { DemoBadge, DemoNotice } from "@/components/data/provenance";
import { Metric, ShareBar, TrendMark } from "@/components/data/metric";
import { SignalCard } from "@/components/radar/signal-card";
import { GlobalSearch } from "@/components/shell/global-search";
import { StateMapPanel } from "@/components/map/state-map-panel";
import { getRadarSignals, getRadarSummary, getNowFeed } from "@/server/queries/radar";
import { getStateSnapshot, getSectorMomentum, getLatestNews, getIndexRanking } from "@/server/queries/state";
import { formatCompact, formatCurrencyScaled, formatNumber, formatRelative } from "@/lib/format";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Central de inteligência",
  description:
    "O que está acontecendo agora nos 645 municípios de São Paulo: Radar, economia em movimento, mapa e indicadores.",
};

export const revalidate = 300;

export default function DashboardPage() {
  return (
    <>
      <section className="grid-backdrop -mx-4 mb-8 border-b px-4 pb-8 pt-2 lg:-mx-6 lg:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Central de inteligência · Estado de São Paulo</p>
          <h1 className="headline mt-2 text-[clamp(1.6rem,3.4vw,2.4rem)]">
            O que está acontecendo nas cidades de São Paulo
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-[14px] leading-relaxed text-[var(--fg-muted)]">
            {SITE.municipalityCount} municípios monitorados. A plataforma destaca o que merece
            atenção — e mostra por quê.
          </p>
          <GlobalSearch className="mx-auto mt-6 max-w-2xl" size="lg" />
        </div>
      </section>

      <Suspense fallback={<div className="skeleton mb-8 h-20" />}>
        <RadarPulse />
      </Suspense>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Suspense fallback={<Card><PanelSkeleton rows={5} /></Card>}>
            <RadarSection />
          </Suspense>
          <Suspense fallback={<Card><PanelSkeleton rows={4} /></Card>}>
            <EconomySection />
          </Suspense>
          <Suspense fallback={<Card><PanelSkeleton rows={4} /></Card>}>
            <MapSection />
          </Suspense>
        </div>

        <div className="space-y-6">
          <Suspense fallback={<Card><PanelSkeleton rows={6} /></Card>}>
            <NowSection />
          </Suspense>
          <Suspense fallback={<Card><PanelSkeleton rows={4} /></Card>}>
            <MomentumSection />
          </Suspense>
          <Suspense fallback={<Card><PanelSkeleton rows={4} /></Card>}>
            <NewsSection />
          </Suspense>
        </div>
      </div>
    </>
  );
}

async function RadarPulse() {
  const summary = await getRadarSummary();
  const stats = [
    { label: "Movimentos em 24 h", value: summary.last24h, hint: "detectados pelo Radar" },
    { label: "Em 7 dias", value: summary.last7d, hint: "acumulado da semana" },
    { label: "Alta prioridade", value: summary.highPriority, hint: "score ≥ 70 na semana" },
    { label: "Municípios monitorados", value: summary.monitoredMunicipalities, hint: "cobertura total do Estado" },
  ];

  return (
    <section className="mb-8 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, index) => (
        <div key={stat.label} className="bg-[var(--bg-raised)] px-5 py-4">
          <div className="flex items-center gap-2">
            {index === 0 ? (
              <span className="radar-pulse relative flex size-1.5 rounded-full bg-[var(--signal)]" aria-hidden />
            ) : null}
            <span className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
              {stat.label}
            </span>
          </div>
          <p className="metric-value mt-1.5 text-[26px] font-semibold leading-none tracking-[-0.02em]">
            {formatNumber(stat.value)}
          </p>
          <p className="mt-1.5 text-[11.5px] text-[var(--fg-subtle)]">{stat.hint}</p>
        </div>
      ))}
    </section>
  );
}

async function RadarSection() {
  const [{ signals }, summary] = await Promise.all([
    getRadarSignals({ limit: 6, sinceDays: 30 }),
    getRadarSummary(),
  ]);

  return (
    <Card>
      <CardHeader
        eyebrow={
          <span className="flex items-center gap-1.5">
            <RadarIcon className="size-3" aria-hidden />
            Radar
          </span>
        }
        title="Movimentos que merecem atenção"
        description="Ordenados por relevância, não por hora de publicação. O score é um índice proprietário da plataforma."
        action={
          <Link
            href="/radar"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--accent)] hover:underline"
          >
            Ver Radar completo
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        }
      />
      {signals.length ? (
        <div className="space-y-3 p-4">
          {signals.map((signal, index) => (
            <SignalCard
              key={signal.id}
              signal={signal}
              variant={index === 0 ? "featured" : "default"}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhum movimento no período"
          description="Assim que as ingestões detectarem algo relevante nos 645 municípios, aparecerá aqui."
        />
      )}
      {summary.activeMunicipalities.length ? (
        <div className="flex flex-wrap items-center gap-2 border-t px-4 py-3">
          <span className="eyebrow">Cidades mais ativas na semana</span>
          {summary.activeMunicipalities.map((entry) => (
            <Link
              key={entry.municipality.slug}
              href={`/cidade/${entry.municipality.slug}`}
              className="inline-flex items-center gap-1.5 rounded-[var(--radius-xs)] border px-2 py-0.5 text-[11.5px] transition-colors hover:border-[var(--border-strong)]"
            >
              {entry.municipality.name}
              <span className="tnum text-[10px] text-[var(--fg-subtle)]">{entry.count}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

async function NowSection() {
  const feed = await getNowFeed(10);
  return (
    <Card>
      <CardHeader
        eyebrow={
          <span className="flex items-center gap-1.5">
            <Activity className="size-3" aria-hidden />
            Agora
          </span>
        }
        title="O que está acontecendo"
        description="Recência combinada com relevância — não é um feed cronológico."
        dense
      />
      {feed.length ? (
        <div>
          {feed.map((signal) => (
            <SignalCard key={signal.id} signal={signal} variant="compact" />
          ))}
        </div>
      ) : (
        <EmptyState title="Sem movimentos recentes" />
      )}
    </Card>
  );
}

async function EconomySection() {
  const snapshot = await getStateSnapshot();

  return (
    <Card>
      <CardHeader
        eyebrow="Economia em movimento"
        title="O Estado em números"
        description="Somatório das séries municipais carregadas na plataforma."
        action={
          <Link href="/economia" className="text-[12.5px] font-medium text-[var(--accent)] hover:underline">
            Abrir economia
          </Link>
        }
      />
      <div className="grid gap-5 p-5 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="População"
          value={snapshot.totalPopulation}
          unit="pessoas"
          isDemo={snapshot.isDemo}
          hint={`${snapshot.coveredByData} de ${snapshot.municipalityCount} municípios com série`}
        />
        <Metric label="PIB somado" value={snapshot.totalGdp} unit="BRL" isDemo={snapshot.isDemo} />
        <Metric
          label="PIB per capita"
          value={snapshot.gdpPerCapita}
          unit="BRL_UNIT"
          isDemo={snapshot.isDemo}
        />
        <Metric
          label="Empregos formais"
          value={snapshot.totalEmployment}
          unit="vinculos"
          isDemo={snapshot.isDemo}
        />
      </div>
      {snapshot.isDemo ? <DemoNotice className="mx-5 mb-5" /> : null}

      <div className="grid gap-px border-t bg-[var(--border)] sm:grid-cols-2">
        <RankingList
          title="Maiores PIB do Estado"
          items={snapshot.topByGdp.slice(0, 6).map((municipality) => ({
            name: municipality.name,
            slug: municipality.slug,
            value: formatCurrencyScaled(municipality.gdp),
            sub: municipality.topSector ?? municipality.mesoName ?? "",
            isDemo: municipality.isDemo,
          }))}
        />
        <RankingList
          title="Maiores PIB per capita"
          items={snapshot.topByGdpPerCapita.slice(0, 6).map((municipality) => ({
            name: municipality.name,
            slug: municipality.slug,
            value: formatCompact(municipality.gdpPerCapita ?? 0),
            sub: municipality.topSector ?? municipality.mesoName ?? "",
            isDemo: municipality.isDemo,
          }))}
          note="Entre municípios com mais de 20 mil habitantes"
        />
      </div>
    </Card>
  );
}

function RankingList({
  title,
  items,
  note,
}: {
  title: string;
  items: Array<{ name: string; slug: string; value: string; sub: string; isDemo: boolean }>;
  note?: string;
}) {
  return (
    <div className="bg-[var(--bg-raised)] px-5 py-4">
      <p className="eyebrow mb-3">{title}</p>
      <ol className="space-y-2">
        {items.map((item, index) => (
          <li key={item.slug} className="flex items-baseline gap-3">
            <span className="tnum w-4 shrink-0 font-mono text-[11px] text-[var(--fg-subtle)]">
              {index + 1}
            </span>
            <Link
              href={`/cidade/${item.slug}`}
              className="min-w-0 flex-1 truncate text-[13px] font-medium hover:text-[var(--accent)]"
            >
              {item.name}
              {item.sub ? (
                <span className="ml-1.5 text-[11px] font-normal text-[var(--fg-subtle)]">{item.sub}</span>
              ) : null}
            </Link>
            <span className="tnum shrink-0 text-[12.5px] font-medium">{item.value}</span>
            {item.isDemo ? <DemoBadge compact /> : null}
          </li>
        ))}
      </ol>
      {note ? <p className="mt-3 text-[11px] text-[var(--fg-subtle)]">{note}</p> : null}
    </div>
  );
}

async function MomentumSection() {
  const momentum = await getSectorMomentum();
  return (
    <Card>
      <CardHeader
        eyebrow="Setores"
        title="Em alta e em desaceleração"
        description="Difusão: proporção de municípios em que o setor avança menos aqueles em que recua."
        dense
      />
      <div className="space-y-4 p-4">
        <SectorList
          icon={TrendingUp}
          label="Em alta"
          tone="rise"
          items={momentum.rising.map((sector) => ({
            name: sector!.name,
            slug: sector!.slug,
            color: sector!.color,
            diffusion: sector!.diffusion,
            total: sector!.total,
          }))}
        />
        <SectorList
          icon={TrendingDown}
          label="Em desaceleração"
          tone="fall"
          items={momentum.falling.map((sector) => ({
            name: sector!.name,
            slug: sector!.slug,
            color: sector!.color,
            diffusion: sector!.diffusion,
            total: sector!.total,
          }))}
        />
      </div>
    </Card>
  );
}

function SectorList({
  icon: Icon,
  label,
  tone,
  items,
}: {
  icon: React.ElementType;
  label: string;
  tone: "rise" | "fall";
  items: Array<{ name: string; slug: string; color: string | null; diffusion: number; total: number }>;
}) {
  return (
    <div>
      <p className={`mb-2 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.05em] text-${tone}`}>
        <Icon className="size-3" aria-hidden />
        {label}
      </p>
      <ul className="space-y-1.5">
        {items.map((item) => (
          <li key={item.slug} className="flex items-center gap-2.5">
            <span
              className="size-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: item.color ?? "var(--accent)" }}
              aria-hidden
            />
            <Link
              href={`/setores/${item.slug}`}
              className="min-w-0 flex-1 truncate text-[12.5px] hover:text-[var(--accent)]"
            >
              {item.name}
            </Link>
            <span className={`tnum shrink-0 text-[11.5px] font-medium text-${tone}`}>
              {item.diffusion > 0 ? "+" : ""}
              {formatNumber(item.diffusion, 0)}
            </span>
            <span className="tnum w-10 shrink-0 text-right text-[10.5px] text-[var(--fg-subtle)]">
              {item.total} mun.
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

async function NewsSection() {
  const news = await getLatestNews(8);
  return (
    <Card>
      <CardHeader
        eyebrow="Notícias"
        title="Últimas indexadas"
        description="Indexamos título, resumo próprio e link — nunca o texto integral."
        dense
        action={
          <Link href="/noticias" className="text-[12px] font-medium text-[var(--accent)] hover:underline">
            Todas
          </Link>
        }
      />
      <ul>
        {news.map((article) => (
          <li key={article.id} className="border-b last:border-b-0">
            <Link href={`/noticias/${article.slug}`} className="block px-4 py-2.5 hover:bg-[var(--bg-inset)]">
              <div className="flex items-center gap-1.5">
                <Badge tone="outline">{article.category.toLowerCase()}</Badge>
                {article.municipalities[0] ? (
                  <span className="text-[11px] text-[var(--accent)]">
                    {article.municipalities[0].municipality.name}
                  </span>
                ) : null}
                {article.isDemo ? <DemoBadge compact /> : null}
              </div>
              <p className="mt-1 text-[13px] font-medium leading-snug">{article.title}</p>
              <p className="mt-1 text-[11px] text-[var(--fg-subtle)]">
                {article.source.name} · {formatRelative(article.publishedAt)}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

async function MapSection() {
  return (
    <Card className="overflow-hidden">
      <CardHeader
        eyebrow="Mapa"
        title="Os 645 municípios paulistas"
        description="Passe o cursor para ver o retrato de cada cidade; clique para abrir o perfil completo."
        action={
          <Link href="/mapa" className="text-[12.5px] font-medium text-[var(--accent)] hover:underline">
            Mapa completo
          </Link>
        }
      />
      <StateMapPanel height={460} initialMetric="pib" compact />
    </Card>
  );
}
