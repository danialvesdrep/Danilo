import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty";
import { SignalCard } from "@/components/radar/signal-card";
import { Metric } from "@/components/data/metric";
import { StateMapPanel } from "@/components/map/state-map-panel";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { getRadarSignals } from "@/server/queries/radar";
import { getIndicatorMap } from "@/server/queries/municipality";

export const metadata: Metadata = {
  title: "Minha visão",
  robots: { index: false, follow: false },
};

/** Painel personalizado a partir das cidades que o usuário escolheu acompanhar. */
export default async function MyViewPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?proximo=/minha-visao");

  const saved = await prisma.savedMunicipality.findMany({
    where: { userId: user.id },
    orderBy: { position: "asc" },
    select: {
      municipality: {
        select: { id: true, name: true, slug: true, mesoName: true },
      },
    },
  });

  if (!saved.length) {
    return (
      <>
        <PageHeader
          eyebrow="Personalização"
          title="Minha visão"
          description="Salve as cidades que você acompanha e esta página passa a mostrar o que acontece nelas."
          breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Minha visão" }]}
        />
        <Card>
          <EmptyState
            title="Nenhuma cidade salva ainda"
            description="Abra o perfil de um município e clique em Salvar. As cidades escolhidas aparecem aqui com o Radar e os indicadores de cada uma."
            action={
              <Link
                href="/cidades"
                className="inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-[var(--accent)] px-3.5 text-[13px] font-medium text-[var(--accent-fg)]"
              >
                Explorar municípios
              </Link>
            }
          />
        </Card>
      </>
    );
  }

  const ids = saved.map((entry) => entry.municipality.id);
  const [{ signals }, indicatorMaps] = await Promise.all([
    prisma.radarSignal
      .findMany({
        where: { municipalityId: { in: ids }, status: "PUBLICADO" },
        orderBy: [{ score: "desc" }, { occurredAt: "desc" }],
        take: 12,
        select: {
          id: true, slug: true, headline: true, description: true, category: true,
          occurredAt: true, score: true, isDemo: true,
          municipality: { select: { name: true, slug: true, mesoName: true } },
          sector: { select: { name: true, slug: true, color: true } },
          company: { select: { name: true, slug: true } },
          investment: { select: { jobsAnnounced: true } },
          sources: { select: { article: { select: { source: { select: { name: true } } } } } },
        },
      })
      .then((rows) => ({ signals: rows })),
    Promise.all(saved.map((entry) => getIndicatorMap(entry.municipality.id))),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Personalização"
        title="Minha visão"
        description={`${saved.length} cidade(s) acompanhada(s). O que aparece aqui é o recorte do Estado que interessa a você.`}
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Minha visão" }]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader
              eyebrow="Radar"
              title="Movimentos nas suas cidades"
              description="Ordenados por relevância entre os municípios que você acompanha."
            />
            {signals.length ? (
              <div className="space-y-3 p-4">
                {signals.map((signal) => (
                  <SignalCard key={signal.id} signal={signal} />
                ))}
              </div>
            ) : (
              <EmptyState title="Nenhum movimento nas cidades salvas" />
            )}
          </Card>

          <Card className="overflow-hidden">
            <CardHeader eyebrow="Território" title="Suas cidades no mapa" />
            <StateMapPanel
              height={420}
              initialMetric="pib"
              compact
              highlightSlugs={saved.map((entry) => entry.municipality.slug)}
            />
          </Card>
        </div>

        <div className="space-y-4">
          {saved.map((entry, index) => {
            const indicators = indicatorMaps[index];
            const population = indicators.get("populacao");
            const gdp = indicators.get("pib");
            const employment = indicators.get("emprego-formal");
            return (
              <Card key={entry.municipality.id}>
                <CardHeader
                  title={
                    <Link href={`/cidade/${entry.municipality.slug}`} className="hover:text-[var(--accent)]">
                      {entry.municipality.name}
                    </Link>
                  }
                  eyebrow={entry.municipality.mesoName ?? undefined}
                  dense
                />
                <CardBody dense className="grid grid-cols-3 gap-4">
                  <Metric
                    label="População"
                    value={population?.value ?? null}
                    unit="pessoas"
                    size="sm"
                    isDemo={population?.isDemo}
                  />
                  <Metric label="PIB" value={gdp?.value ?? null} unit="BRL" size="sm" isDemo={gdp?.isDemo} />
                  <Metric
                    label="Empregos"
                    value={employment?.value ?? null}
                    unit="vinculos"
                    size="sm"
                    isDemo={employment?.isDemo}
                  />
                </CardBody>
              </Card>
            );
          })}
        </div>
      </div>
    </>
  );
}
