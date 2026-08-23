import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PanelSkeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/shell/page-header";
import { DemoBadge } from "@/components/data/provenance";
import { GraphPanel } from "@/components/graph/graph-panel";
import { SignalCard } from "@/components/radar/signal-card";
import { Metric } from "@/components/data/metric";
import { prisma } from "@/server/db/prisma";
import { neighborhood } from "@/server/graph/graph";
import { getIndicatorMap, getSectorProfile } from "@/server/queries/municipality";
import { getRadarSignals } from "@/server/queries/radar";
import { NEWS_CATEGORY_LABEL } from "@/lib/labels";
import { formatDate, formatPercent } from "@/lib/format";

type Params = Promise<{ slug: string }>;

const articleSelect = {
  id: true, slug: true, title: true, summary: true, url: true, category: true,
  publishedAt: true, importance: true, isDemo: true,
  source: { select: { name: true, homepage: true, tier: true } },
  municipalities: {
    select: {
      confidence: true,
      municipality: { select: { id: true, name: true, slug: true, mesoName: true } },
    },
  },
  sectors: { select: { sector: { select: { id: true, name: true, slug: true, color: true } } } },
  companies: { select: { company: { select: { id: true, name: true, slug: true } } } },
  people: { select: { person: { select: { id: true, name: true, slug: true } } } },
  radarSignals: {
    select: {
      signal: {
        select: {
          id: true, slug: true, headline: true, description: true, category: true,
          occurredAt: true, score: true, isDemo: true,
          municipality: { select: { name: true, slug: true, mesoName: true } },
          sector: { select: { name: true, slug: true, color: true } },
          company: { select: { name: true, slug: true } },
        },
      },
    },
  },
} as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const article = await prisma.newsArticle.findUnique({ where: { slug }, select: articleSelect });
  if (!article) return { title: "Matéria não encontrada" };
  return {
    title: article.title,
    description: article.summary,
    alternates: { canonical: `/noticias/${slug}` },
  };
}

/**
 * Uma notícia é um ponto de entrada, não um destino: aqui ela se conecta ao
 * município, ao setor, às empresas, aos indicadores e ao histórico.
 */
export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const article = await prisma.newsArticle.findUnique({ where: { slug }, select: articleSelect });
  if (!article) notFound();

  const primary = article.municipalities[0]?.municipality;

  return (
    <>
      <PageHeader
        eyebrow={`${NEWS_CATEGORY_LABEL[article.category]} · ${article.source.name} · ${formatDate(article.publishedAt)}`}
        title={article.title}
        description={article.summary}
        breadcrumbs={[
          { label: "Atlas SP", href: "/dashboard" },
          { label: "Notícias", href: "/noticias" },
          ...(primary ? [{ label: primary.name, href: `/cidade/${primary.slug}` }] : []),
          { label: "Matéria" },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {article.municipalities.map((entry) => (
          <Link
            key={entry.municipality.slug}
            href={`/cidade/${entry.municipality.slug}`}
            className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12.5px] font-medium transition-colors hover:border-[var(--border-strong)]"
          >
            {entry.municipality.name}
          </Link>
        ))}
        {article.sectors.map((entry) => (
          <Link
            key={entry.sector.slug}
            href={`/setores/${entry.sector.slug}`}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12.5px] transition-colors hover:border-[var(--border-strong)]"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: entry.sector.color ?? "var(--accent)" }}
              aria-hidden
            />
            {entry.sector.name}
          </Link>
        ))}
        {article.companies.map((entry) => (
          <Link
            key={entry.company.slug}
            href={`/empresa/${entry.company.slug}`}
            className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12.5px] transition-colors hover:border-[var(--border-strong)]"
          >
            {entry.company.name}
          </Link>
        ))}
        {article.isDemo ? <DemoBadge /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Resumo" title="O que a matéria traz" />
            <CardBody>
              <p className="text-[14px] leading-relaxed">{article.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t pt-3 text-[12px]">
                <Badge tone={article.source.tier === "OFICIAL" ? "accent" : "neutral"}>
                  {article.source.tier.toLowerCase()}
                </Badge>
                <span className="text-[var(--fg-muted)]">{article.source.name}</span>
                {!article.isDemo ? (
                  <a
                    href={article.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-medium text-[var(--accent)] hover:underline"
                  >
                    Ler na fonte original
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : (
                  <span className="text-[11.5px] text-[var(--fg-subtle)]">
                    Registro de demonstração — não há matéria real correspondente
                  </span>
                )}
              </div>
              <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
                O Atlas SP indexa título, resumo próprio e link. Nunca reproduzimos o texto integral
                de terceiros — a leitura completa acontece na fonte.
              </p>
            </CardBody>
          </Card>

          {article.radarSignals.length ? (
            <Card>
              <CardHeader
                eyebrow="Radar"
                title="Movimentos que esta matéria sustenta"
                description="Sinais do Radar que usaram esta matéria como evidência."
              />
              <div className="space-y-3 p-4">
                {article.radarSignals.map((entry) => (
                  <SignalCard key={entry.signal.id} signal={entry.signal} />
                ))}
              </div>
            </Card>
          ) : null}

          {primary ? (
            <Suspense fallback={<Card><PanelSkeleton rows={4} /></Card>}>
              <CityContext municipalityId={primary.id} name={primary.name} slug={primary.slug} />
            </Suspense>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Suspense fallback={<Card><PanelSkeleton rows={4} /></Card>}>
            <ArticleGraph articleId={article.id} />
          </Suspense>

          {primary ? (
            <Suspense fallback={<Card><PanelSkeleton rows={3} /></Card>}>
              <RelatedHistory municipalityId={primary.id} name={primary.name} />
            </Suspense>
          ) : null}
        </aside>
      </div>
    </>
  );
}

async function CityContext({
  municipalityId,
  name,
  slug,
}: {
  municipalityId: string;
  name: string;
  slug: string;
}) {
  const [indicators, sectors] = await Promise.all([
    getIndicatorMap(municipalityId),
    getSectorProfile(municipalityId),
  ]);
  const gdp = indicators.get("pib");
  const employment = indicators.get("emprego-formal");
  const population = indicators.get("populacao");

  return (
    <Card>
      <CardHeader
        eyebrow="Contexto"
        title={`A economia de ${name}`}
        description="Os indicadores que ajudam a dimensionar o que a matéria descreve."
        action={
          <Link href={`/cidade/${slug}`} className="text-[12.5px] font-medium text-[var(--accent)] hover:underline">
            Perfil completo
          </Link>
        }
      />
      <CardBody className="grid gap-6 sm:grid-cols-3">
        <Metric
          label="População"
          value={population?.value ?? null}
          unit="pessoas"
          referenceLabel={population?.referenceLabel}
          provenance={population?.provenance}
          isDemo={population?.isDemo}
        />
        <Metric
          label="PIB"
          value={gdp?.value ?? null}
          unit="BRL"
          referenceLabel={gdp?.referenceLabel}
          provenance={gdp?.provenance}
          isDemo={gdp?.isDemo}
        />
        <Metric
          label="Empregos formais"
          value={employment?.value ?? null}
          unit="vinculos"
          referenceLabel={employment?.referenceLabel}
          provenance={employment?.provenance}
          isDemo={employment?.isDemo}
        />
      </CardBody>
      {sectors.length ? (
        <div className="border-t px-5 py-3">
          <p className="eyebrow mb-2">Setores dominantes</p>
          <ul className="flex flex-wrap gap-x-4 gap-y-1">
            {sectors.slice(0, 4).map((entry) => (
              <li key={entry.sector.slug} className="text-[12px] text-[var(--fg-muted)]">
                {entry.sector.name}{" "}
                <span className="tnum font-medium text-[var(--fg)]">
                  {formatPercent(entry.sharePct, 1)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Card>
  );
}

async function ArticleGraph({ articleId }: { articleId: string }) {
  const graph = await neighborhood("NOTICIA", articleId, { limitPerKind: 8 });
  if (!graph) return null;
  return <GraphPanel graph={graph} title="Entidades relacionadas" />;
}

async function RelatedHistory({ municipalityId, name }: { municipalityId: string; name: string }) {
  const { signals } = await getRadarSignals({ municipalityId, limit: 5, sinceDays: 365 });
  if (!signals.length) return null;
  return (
    <Card>
      <CardHeader eyebrow="Histórico" title={`Eventos anteriores em ${name}`} dense />
      <div>
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} variant="compact" />
        ))}
      </div>
    </Card>
  );
}
