import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PanelSkeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/shell/page-header";
import { Metric } from "@/components/data/metric";
import { DemoBadge, DemoNotice } from "@/components/data/provenance";
import { GraphPanel } from "@/components/graph/graph-panel";
import { SignalCard } from "@/components/radar/signal-card";
import { prisma, toNumber } from "@/server/db/prisma";
import { neighborhood } from "@/server/graph/graph";
import { formatCurrencyScaled, formatDate } from "@/lib/format";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const company = await prisma.company.findUnique({
    where: { slug },
    select: { name: true, description: true, isDemo: true },
  });
  if (!company) return { title: "Empresa não encontrada" };
  return {
    title: company.name,
    description: company.description ?? `Perfil de ${company.name}: setor, município, investimentos e movimentos relacionados.`,
    robots: company.isDemo ? { index: false, follow: false } : undefined,
  };
}

export default async function CompanyPage({ params }: { params: Params }) {
  const { slug } = await params;
  const company = await prisma.company.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, name: true, legalName: true, description: true, websiteUrl: true,
      employeeBand: true, foundedYear: true, cnpjRoot: true, isDemo: true,
      sector: { select: { name: true, slug: true, color: true } },
      municipality: { select: { id: true, name: true, slug: true, mesoName: true } },
      social: { select: { platform: true, url: true } },
      investments: {
        orderBy: { announcedAt: "desc" },
        select: {
          id: true, slug: true, title: true, amountBRL: true, jobsAnnounced: true,
          status: true, announcedAt: true, isDemo: true,
          municipality: { select: { name: true, slug: true } },
        },
      },
      radarSignals: {
        orderBy: { score: "desc" },
        take: 8,
        select: {
          id: true, slug: true, headline: true, description: true, category: true,
          occurredAt: true, score: true, isDemo: true,
          municipality: { select: { name: true, slug: true, mesoName: true } },
          sector: { select: { name: true, slug: true, color: true } },
          company: { select: { name: true, slug: true } },
        },
      },
      articles: {
        take: 10,
        orderBy: { article: { publishedAt: "desc" } },
        select: {
          article: {
            select: {
              id: true, slug: true, title: true, publishedAt: true,
              source: { select: { name: true } },
            },
          },
        },
      },
    },
  });
  if (!company) notFound();

  const totalInvested = company.investments.reduce(
    (sum, investment) => sum + (toNumber(investment.amountBRL) ?? 0),
    0,
  );
  const totalJobs = company.investments.reduce(
    (sum, investment) => sum + (investment.jobsAnnounced ?? 0),
    0,
  );

  return (
    <>
      <PageHeader
        eyebrow={[company.sector?.name, company.municipality?.name].filter(Boolean).join(" · ")}
        title={company.name}
        description={company.description}
        breadcrumbs={[
          { label: "Atlas SP", href: "/dashboard" },
          ...(company.municipality
            ? [{ label: company.municipality.name, href: `/cidade/${company.municipality.slug}` }]
            : []),
          { label: "Empresa" },
        ]}
      />

      {company.isDemo ? (
        <DemoNotice className="mb-6">
          Empresa do conjunto de{" "}
          <strong className="font-semibold text-[var(--fg)]">demonstração</strong>. Não corresponde a
          uma empresa existente e serve apenas para exercitar o grafo de entidades.
        </DemoNotice>
      ) : null}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {company.sector ? (
          <Link
            href={`/setores/${company.sector.slug}`}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12.5px] transition-colors hover:border-[var(--border-strong)]"
          >
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: company.sector.color ?? "var(--accent)" }}
              aria-hidden
            />
            {company.sector.name}
          </Link>
        ) : null}
        {company.municipality ? (
          <Link
            href={`/cidade/${company.municipality.slug}`}
            className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12.5px] font-medium transition-colors hover:border-[var(--border-strong)]"
          >
            {company.municipality.name}
          </Link>
        ) : null}
        {company.employeeBand ? <Badge tone="outline">{company.employeeBand} funcionários</Badge> : null}
        {company.foundedYear ? <Badge tone="outline">desde {company.foundedYear}</Badge> : null}
        {company.websiteUrl ? (
          <a
            href={company.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--accent)] hover:underline"
          >
            Site
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : null}
        {company.isDemo ? <DemoBadge /> : null}
      </div>

      <Card>
        <CardHeader eyebrow="Registros" title="A empresa em números" />
        <CardBody className="grid gap-6 sm:grid-cols-3">
          <Metric label="Investimentos anunciados" value={totalInvested} unit="BRL" size="lg" isDemo={company.isDemo} />
          <Metric label="Postos previstos" value={totalJobs} unit="vinculos" size="lg" isDemo={company.isDemo} />
          <Metric label="Movimentos no Radar" value={company.radarSignals.length} unit="unidades" size="lg" />
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Investimentos" title="Projetos registrados" />
            {company.investments.length ? (
              <ul>
                {company.investments.map((investment) => (
                  <li key={investment.id} className="border-b px-5 py-3 last:border-b-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="outline">{investment.status.replace(/_/g, " ").toLowerCase()}</Badge>
                      <Link
                        href={`/cidade/${investment.municipality.slug}`}
                        className="text-[11.5px] font-medium text-[var(--accent)] hover:underline"
                      >
                        {investment.municipality.name}
                      </Link>
                      {investment.isDemo ? <DemoBadge compact /> : null}
                    </div>
                    <p className="mt-1 text-[13.5px] font-medium">{investment.title}</p>
                    <p className="mt-0.5 text-[11.5px] text-[var(--fg-subtle)]">
                      {investment.amountBRL ? formatCurrencyScaled(toNumber(investment.amountBRL)) : "Valor não informado"}
                      {investment.jobsAnnounced ? ` · ${investment.jobsAnnounced} postos` : ""}
                      {` · ${formatDate(investment.announcedAt)}`}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nenhum investimento registrado" />
            )}
          </Card>

          {company.radarSignals.length ? (
            <Card>
              <CardHeader eyebrow="Radar" title="Movimentos envolvendo a empresa" />
              <div className="space-y-3 p-4">
                {company.radarSignals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            </Card>
          ) : null}
        </div>

        <aside className="space-y-6">
          <Suspense fallback={<Card><PanelSkeleton rows={3} /></Card>}>
            <CompanyGraph companyId={company.id} />
          </Suspense>

          <Card>
            <CardHeader eyebrow="Imprensa" title="Menções indexadas" dense />
            {company.articles.length ? (
              <ul>
                {company.articles.map((entry) => (
                  <li key={entry.article.id} className="border-b px-4 py-2 last:border-b-0">
                    <Link
                      href={`/noticias/${entry.article.slug}`}
                      className="text-[12.5px] font-medium leading-snug hover:text-[var(--accent)]"
                    >
                      {entry.article.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-[var(--fg-subtle)]">
                      {entry.article.source.name} · {formatDate(entry.article.publishedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nenhuma menção indexada" />
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}

async function CompanyGraph({ companyId }: { companyId: string }) {
  const graph = await neighborhood("EMPRESA", companyId, { limitPerKind: 8 });
  if (!graph) return null;
  return <GraphPanel graph={graph} title="Conexões" />;
}
