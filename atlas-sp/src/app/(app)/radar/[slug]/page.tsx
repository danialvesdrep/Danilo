import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Building2, ExternalLink, MapPin, Sparkles } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PanelSkeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/shell/page-header";
import { ScoreBreakdown } from "@/components/radar/score-breakdown";
import { SignalCard } from "@/components/radar/signal-card";
import { AnswerBlock } from "@/components/ai/answer";
import { DemoBadge } from "@/components/data/provenance";
import { GraphPanel } from "@/components/graph/graph-panel";
import { getSignal, getNeighborSignals } from "@/server/queries/radar";
import { CATEGORY_LABEL } from "@/lib/labels";
import { explainSignal } from "@/server/ai/atlas-ai";
import { neighborhood } from "@/server/graph/graph";
import { formatCurrencyScaled, formatDate, formatNumber, formatRelative } from "@/lib/format";
import { SITE } from "@/lib/site";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const signal = await getSignal(slug);
  if (!signal) return { title: "Movimento não encontrado" };
  return {
    title: `${signal.headline} — ${signal.municipality.name}`,
    description: signal.description,
    alternates: { canonical: `/radar/${slug}` },
    openGraph: {
      title: signal.headline,
      description: signal.description,
      type: "article",
      publishedTime: signal.occurredAt.toISOString(),
    },
  };
}

export default async function SignalPage({ params }: { params: Params }) {
  const { slug } = await params;
  const signal = await getSignal(slug);
  if (!signal) notFound();

  const rationale = signal.scoreRationale as {
    methodologyVersion: string;
    components: Array<{ key: string; label: string; value: number; weight: number; detail: string }>;
    drivers: string[];
  };

  return (
    <>
      <PageHeader
        eyebrow={`${CATEGORY_LABEL[signal.category]} · ${formatRelative(signal.occurredAt)}`}
        title={signal.headline}
        description={signal.description}
        breadcrumbs={[
          { label: "Atlas SP", href: "/dashboard" },
          { label: "Radar", href: "/radar" },
          { label: signal.municipality.name, href: `/cidade/${signal.municipality.slug}` },
          { label: "Movimento" },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/cidade/${signal.municipality.slug}`}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12.5px] font-medium transition-colors hover:border-[var(--border-strong)]"
        >
          <MapPin className="size-3" aria-hidden />
          {signal.municipality.name}
          <span className="text-[var(--fg-subtle)]">{signal.municipality.mesoName}</span>
        </Link>
        {signal.sector ? (
          <Link
            href={`/setores/${signal.sector.slug}`}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12.5px] transition-colors hover:border-[var(--border-strong)]"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: signal.sector.color ?? "var(--accent)" }}
              aria-hidden
            />
            {signal.sector.name}
          </Link>
        ) : null}
        {signal.company ? (
          <Link
            href={`/empresa/${signal.company.slug}`}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12.5px] transition-colors hover:border-[var(--border-strong)]"
          >
            <Building2 className="size-3" aria-hidden />
            {signal.company.name}
          </Link>
        ) : null}
        <Badge tone="outline">{formatDate(signal.occurredAt)}</Badge>
        {signal.isDemo ? <DemoBadge /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <section id="por-que-importa" className="scroll-mt-20">
            <Suspense
              fallback={
                <Card>
                  <CardHeader
                    eyebrow={<span className="flex items-center gap-1.5"><Sparkles className="size-3" aria-hidden />Atlas AI</span>}
                    title="Por que isso importa?"
                    description="Cruzando cidade, setor, indicadores, emprego, histórico e vizinhança…"
                  />
                  <PanelSkeleton rows={4} />
                </Card>
              }
            >
              <WhyItMatters slug={slug} />
            </Suspense>
          </section>

          {signal.investment ? (
            <Card>
              <CardHeader eyebrow="Investimento" title="O que foi anunciado" />
              <CardBody className="grid gap-5 sm:grid-cols-3">
                <Figure
                  label="Valor anunciado"
                  value={signal.amountBRL ? formatCurrencyScaled(signal.amountBRL) : "Não informado"}
                />
                <Figure
                  label="Postos previstos"
                  value={
                    signal.investment.jobsAnnounced
                      ? formatNumber(signal.investment.jobsAnnounced)
                      : "Não informado"
                  }
                />
                <Figure label="Situação" value={signal.investment.status.replace(/_/g, " ").toLowerCase()} />
                <p className="text-[11.5px] leading-relaxed text-[var(--fg-subtle)] sm:col-span-3">
                  Valores anunciados não são valores realizados. A plataforma acompanha a evolução do
                  projeto quando as fontes publicam atualização.
                </p>
              </CardBody>
            </Card>
          ) : null}

          <Card>
            <CardHeader
              eyebrow="Evidências"
              title="Fontes que sustentam este movimento"
              description="O Radar não publica sinal sem ao menos uma fonte associada."
            />
            {signal.sources.length ? (
              <ul>
                {signal.sources.map((entry) => (
                  <li key={entry.article.id} className="border-b px-5 py-3 last:border-b-0">
                    <div className="flex items-center gap-2">
                      <Badge tone={entry.article.source.tier === "OFICIAL" ? "accent" : "neutral"}>
                        {entry.article.source.tier.toLowerCase()}
                      </Badge>
                      <span className="text-[11.5px] text-[var(--fg-muted)]">
                        {entry.article.source.name}
                      </span>
                      <span className="text-[11px] text-[var(--fg-subtle)]">
                        {formatDate(entry.article.publishedAt)}
                      </span>
                      {entry.article.isDemo ? <DemoBadge compact /> : null}
                    </div>
                    <p className="mt-1 text-[13.5px] font-medium leading-snug">{entry.article.title}</p>
                    <div className="mt-1.5 flex items-center gap-3">
                      <Link
                        href={`/noticias/${entry.article.slug}`}
                        className="text-[12px] font-medium text-[var(--accent)] hover:underline"
                      >
                        Abrir na plataforma
                      </Link>
                      {!entry.article.isDemo ? (
                        <a
                          href={entry.article.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[12px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                        >
                          Ver fonte original
                          <ExternalLink className="size-3" aria-hidden />
                        </a>
                      ) : (
                        <span className="text-[11.5px] text-[var(--fg-subtle)]">
                          Registro de demonstração — sem link externo
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <CardBody>
                <p className="text-[13px] text-[var(--fg-muted)]">Sem fontes associadas.</p>
              </CardBody>
            )}
          </Card>

          <Suspense fallback={<Card><PanelSkeleton rows={3} /></Card>}>
            <NeighborImpact municipalityId={signal.municipality.id} municipalityName={signal.municipality.name} />
          </Suspense>
        </div>

        <aside className="space-y-6">
          <ScoreBreakdown score={signal.score} rationale={rationale} />

          <Card>
            <CardHeader eyebrow="Eixos" title="Impactos avaliados" dense />
            <CardBody dense className="space-y-2.5">
              <ImpactRow label="Importância" value={signal.importance} />
              <ImpactRow label="Urgência" value={signal.urgency} />
              <ImpactRow label="Impacto econômico" value={signal.economicImpact} />
              <ImpactRow label="Impacto político" value={signal.politicalImpact} />
              <ImpactRow label="Impacto regional" value={signal.regionalImpact} />
            </CardBody>
          </Card>

          <Suspense fallback={<Card><PanelSkeleton rows={4} /></Card>}>
            <GraphSection signalId={signal.id} />
          </Suspense>

          <Card>
            <CardHeader eyebrow="Aprofundar" title="Continuar por aqui" dense />
            <CardBody dense className="space-y-1.5">
              <NextLink href={`/cidade/${signal.municipality.slug}`}>
                Perfil completo de {signal.municipality.name}
              </NextLink>
              {signal.sector ? (
                <NextLink href={`/setores/${signal.sector.slug}`}>
                  Setor {signal.sector.name} no Estado
                </NextLink>
              ) : null}
              <NextLink href={`/cidade/${signal.municipality.slug}?aba=timeline`}>
                Linha do tempo de {signal.municipality.name}
              </NextLink>
              <NextLink
                href={`/ia?q=${encodeURIComponent(`Quais cidades vizinhas de ${signal.municipality.name} podem ser afetadas?`)}`}
              >
                Perguntar à Atlas AI sobre o entorno
              </NextLink>
              <NextLink href="/radar">Voltar ao Radar</NextLink>
            </CardBody>
          </Card>
        </aside>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: signal.headline,
            description: signal.description,
            datePublished: signal.occurredAt.toISOString(),
            publisher: { "@type": "Organization", name: SITE.name },
            contentLocation: { "@type": "Place", name: `${signal.municipality.name}, SP` },
          }),
        }}
      />
    </>
  );
}

async function WhyItMatters({ slug }: { slug: string }) {
  const answer = await explainSignal(slug);
  if (!answer) return null;
  return <AnswerBlock answer={answer} question="Por que isso importa?" />;
}

async function NeighborImpact({
  municipalityId,
  municipalityName,
}: {
  municipalityId: string;
  municipalityName: string;
}) {
  const signals = await getNeighborSignals(municipalityId, 4);
  if (!signals.length) return null;
  return (
    <Card>
      <CardHeader
        eyebrow="Transbordamento"
        title="Movimentos em municípios vizinhos"
        description={`O que o Radar registrou no entorno de ${municipalityName} nos últimos 90 dias.`}
      />
      <div>
        {signals.map((signal) => (
          <SignalCard key={signal.id} signal={signal} variant="compact" />
        ))}
      </div>
    </Card>
  );
}

async function GraphSection({ signalId }: { signalId: string }) {
  const graph = await neighborhood("SINAL", signalId, { limitPerKind: 6 });
  if (!graph) return null;
  return <GraphPanel graph={graph} title="Entidades conectadas" />;
}

function ImpactRow({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] text-[var(--fg-muted)]">{label}</span>
        <span className="tnum text-[12px] font-medium">{value}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--bg-inset)]">
        <div className="h-full rounded-full bg-[var(--accent)]" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11.5px] uppercase tracking-[0.05em] text-[var(--fg-subtle)]">{label}</p>
      <p className="metric-value mt-1 text-[19px] font-semibold capitalize">{value}</p>
    </div>
  );
}

function NextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-2 rounded-[var(--radius-xs)] px-2 py-1.5 text-[12.5px] transition-colors hover:bg-[var(--bg-inset)]"
    >
      <span>{children}</span>
      <ArrowUpRight className="size-3 shrink-0 text-[var(--fg-subtle)]" aria-hidden />
    </Link>
  );
}
