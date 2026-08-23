import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { Metric, TrendMark } from "@/components/data/metric";
import { EmptyState } from "@/components/ui/empty";
import { DemoBadge } from "@/components/data/provenance";
import { SignalCard } from "@/components/radar/signal-card";
import { prisma, toNumber } from "@/server/db/prisma";
import { getRadarSignals } from "@/server/queries/radar";
import { formatCurrencyScaled, formatNumber, formatPercent } from "@/lib/format";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const sector = await prisma.economicSector.findUnique({ where: { slug } });
  if (!sector) return { title: "Setor não encontrado" };
  return {
    title: `${sector.name} em São Paulo`,
    description: `${sector.description ?? sector.name}: presença nos municípios paulistas, empresas registradas, investimentos e movimentos detectados pelo Radar.`,
    alternates: { canonical: `/setores/${slug}` },
  };
}

export const revalidate = 900;

export default async function SectorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const sector = await prisma.economicSector.findUnique({ where: { slug } });
  if (!sector) notFound();

  const [profiles, companies, investments, radar] = await Promise.all([
    prisma.municipalitySector.findMany({
      where: { sectorId: sector.id },
      orderBy: { sharePct: "desc" },
      take: 20,
      select: {
        sharePct: true, trend: true, relevance: true, isDemo: true,
        municipality: { select: { name: true, slug: true, mesoName: true } },
      },
    }),
    prisma.company.findMany({
      where: { sectorId: sector.id },
      orderBy: { name: "asc" },
      take: 18,
      select: {
        id: true, name: true, slug: true, isDemo: true,
        municipality: { select: { name: true, slug: true } },
      },
    }),
    prisma.investment.aggregate({
      where: { sectorId: sector.id, announcedAt: { gte: new Date(Date.now() - 365 * 86_400_000) } },
      _count: { _all: true },
      _sum: { amountBRL: true, jobsAnnounced: true },
    }),
    getRadarSignals({ sectorSlug: slug, limit: 8, sinceDays: 180 }),
  ]);

  const presence = await prisma.municipalitySector.count({ where: { sectorId: sector.id } });

  return (
    <>
      <PageHeader
        eyebrow={sector.macroSector.toLowerCase()}
        title={
          <span className="flex items-center gap-3">
            <span
              className="size-4 rounded-sm"
              style={{ backgroundColor: sector.color ?? "var(--accent)" }}
              aria-hidden
            />
            {sector.name}
          </span>
        }
        description={sector.description}
        breadcrumbs={[
          { label: "Atlas SP", href: "/dashboard" },
          { label: "Setores", href: "/setores" },
          { label: sector.name },
        ]}
      />

      <Card>
        <CardHeader eyebrow="Presença no Estado" title="O setor em números" />
        <CardBody className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Municípios com presença" value={presence} unit="unidades" size="lg" />
          <Metric label="Empresas registradas" value={companies.length} unit="empresas" size="lg" />
          <Metric
            label="Investimentos (12 meses)"
            value={toNumber(investments._sum.amountBRL)}
            unit="BRL"
            size="lg"
            hint={`${investments._count._all} anúncio(s)`}
          />
          <Metric
            label="Postos previstos"
            value={investments._sum.jobsAnnounced}
            unit="vinculos"
            size="lg"
          />
        </CardBody>
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            eyebrow="Concentração"
            title="Onde o setor pesa mais"
            description="Municípios ordenados pela participação do setor no valor adicionado local."
          />
          {profiles.length ? (
            <ol>
              {profiles.map((profile, position) => (
                <li key={profile.municipality.slug} className="flex items-center gap-3 border-b px-5 py-2 last:border-b-0">
                  <span className="tnum w-5 shrink-0 font-mono text-[11px] text-[var(--fg-subtle)]">
                    {position + 1}
                  </span>
                  <Link
                    href={`/cidade/${profile.municipality.slug}`}
                    className="min-w-0 flex-1 truncate text-[13px] font-medium hover:text-[var(--accent)]"
                  >
                    {profile.municipality.name}
                    <span className="ml-1.5 text-[11px] font-normal text-[var(--fg-subtle)]">
                      {profile.municipality.mesoName}
                    </span>
                  </Link>
                  {profile.isDemo ? <DemoBadge compact /> : null}
                  <span className="tnum w-14 shrink-0 text-right text-[12.5px] font-semibold">
                    {formatPercent(toNumber(profile.sharePct) ?? 0, 1)}
                  </span>
                  <TrendMark trend={profile.trend} className="w-6 shrink-0 justify-end" />
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState title="Nenhum município com perfil deste setor" />
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader eyebrow="Empresas" title="Registradas neste setor" dense />
            {companies.length ? (
              <ul>
                {companies.map((company) => (
                  <li key={company.id} className="border-b px-4 py-2 last:border-b-0">
                    <Link href={`/empresa/${company.slug}`} className="text-[12.5px] font-medium hover:text-[var(--accent)]">
                      {company.name}
                    </Link>
                    {company.municipality ? (
                      <span className="ml-1.5 text-[11px] text-[var(--fg-subtle)]">
                        {company.municipality.name}
                      </span>
                    ) : null}
                    {company.isDemo ? <DemoBadge compact className="ml-1.5" /> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nenhuma empresa registrada" />
            )}
          </Card>
        </div>
      </div>

      {radar.signals.length ? (
        <Card className="mt-6">
          <CardHeader
            eyebrow="Radar"
            title={`Movimentos no setor de ${sector.name.toLowerCase()}`}
            description="Detectados nos últimos 180 dias, ordenados por relevância."
          />
          <div className="space-y-3 p-4">
            {radar.signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} />
            ))}
          </div>
        </Card>
      ) : null}
    </>
  );
}
