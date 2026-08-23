import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { Metric } from "@/components/data/metric";
import { DemoBadge, DemoNotice } from "@/components/data/provenance";
import { SignalCard } from "@/components/radar/signal-card";
import { prisma, toNumber } from "@/server/db/prisma";
import { getIndicatorMap } from "@/server/queries/municipality";
import { formatCurrencyScaled, formatDate, formatNumber, formatPercent } from "@/lib/format";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const investment = await prisma.investment.findUnique({
    where: { slug },
    select: { title: true, description: true, isDemo: true },
  });
  if (!investment) return { title: "Investimento não encontrado" };
  return {
    title: investment.title,
    description: investment.description,
    robots: investment.isDemo ? { index: false, follow: false } : undefined,
  };
}

export default async function InvestmentPage({ params }: { params: Params }) {
  const { slug } = await params;
  const investment = await prisma.investment.findUnique({
    where: { slug },
    select: {
      id: true, slug: true, title: true, description: true, amountBRL: true, jobsAnnounced: true,
      status: true, announcedAt: true, expectedAt: true, sourceUrl: true, isDemo: true,
      municipality: { select: { id: true, name: true, slug: true, mesoName: true } },
      company: { select: { name: true, slug: true } },
      sector: { select: { name: true, slug: true, color: true } },
      radarSignals: {
        select: {
          id: true, slug: true, headline: true, description: true, category: true,
          occurredAt: true, score: true, isDemo: true,
          municipality: { select: { name: true, slug: true, mesoName: true } },
          sector: { select: { name: true, slug: true, color: true } },
          company: { select: { name: true, slug: true } },
        },
      },
    },
  });
  if (!investment) notFound();

  const indicators = await getIndicatorMap(investment.municipality.id);
  const gdp = indicators.get("pib");
  const employment = indicators.get("emprego-formal");
  const amount = toNumber(investment.amountBRL);
  const shareOfGdp = amount && gdp?.value ? (amount / gdp.value) * 100 : null;
  const shareOfJobs =
    investment.jobsAnnounced && employment?.value
      ? (investment.jobsAnnounced / employment.value) * 100
      : null;

  return (
    <>
      <PageHeader
        eyebrow={`Investimento · ${investment.municipality.name} · ${formatDate(investment.announcedAt)}`}
        title={investment.title}
        description={investment.description}
        breadcrumbs={[
          { label: "Atlas SP", href: "/dashboard" },
          { label: investment.municipality.name, href: `/cidade/${investment.municipality.slug}` },
          { label: "Investimento" },
        ]}
      />

      {investment.isDemo ? <DemoNotice className="mb-6" /> : null}

      <Card>
        <CardHeader eyebrow="Anúncio" title="O que foi declarado" />
        <CardBody className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Valor anunciado" value={amount} unit="BRL" size="lg" isDemo={investment.isDemo} />
          <Metric label="Postos previstos" value={investment.jobsAnnounced} unit="vinculos" size="lg" isDemo={investment.isDemo} />
          <Metric
            label="Frente ao PIB municipal"
            value={shareOfGdp}
            unit="%"
            precision={2}
            size="lg"
            hint={gdp?.referenceLabel ? `Base: PIB de ${gdp.referenceLabel}` : undefined}
            isDemo={gdp?.isDemo}
          />
          <Metric
            label="Frente ao emprego formal"
            value={shareOfJobs}
            unit="%"
            precision={2}
            size="lg"
            hint={employment?.referenceLabel ? `Base: estoque de ${employment.referenceLabel}` : undefined}
            isDemo={employment?.isDemo}
          />
        </CardBody>
        <CardBody className="border-t">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="signal">{investment.status.replace(/_/g, " ").toLowerCase()}</Badge>
            {investment.company ? (
              <Link
                href={`/empresa/${investment.company.slug}`}
                className="rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12.5px] font-medium transition-colors hover:border-[var(--border-strong)]"
              >
                {investment.company.name}
              </Link>
            ) : null}
            {investment.sector ? (
              <Link
                href={`/setores/${investment.sector.slug}`}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2.5 py-1 text-[12.5px] transition-colors hover:border-[var(--border-strong)]"
              >
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: investment.sector.color ?? "var(--accent)" }}
                  aria-hidden
                />
                {investment.sector.name}
              </Link>
            ) : null}
            {investment.expectedAt ? (
              <span className="text-[12px] text-[var(--fg-subtle)]">
                Previsão de conclusão: {formatDate(investment.expectedAt)}
              </span>
            ) : null}
            {investment.sourceUrl ? (
              <a
                href={investment.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--accent)] hover:underline"
              >
                Fonte
                <ExternalLink className="size-3" aria-hidden />
              </a>
            ) : null}
          </div>
          <p className="mt-3 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
            Valores anunciados não são valores realizados, e a relação com o PIB e com o emprego
            local é um cálculo de proporção — indica ordem de grandeza, não efeito comprovado.
          </p>
        </CardBody>
      </Card>

      {investment.radarSignals.length ? (
        <Card className="mt-6">
          <CardHeader eyebrow="Radar" title="Movimentos ligados a este projeto" />
          <div className="space-y-3 p-4">
            {investment.radarSignals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}
