import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/server/db/prisma";
import { PanelSkeleton } from "@/components/ui/empty";
import { CityHeader } from "@/components/city/header";
import { CityTabs } from "@/components/city/tabs";
import { CITY_TABS, type CityTabKey } from "@/lib/city-tabs";
import { OverviewTab } from "@/components/city/tab-overview";
import { EconomyTab } from "@/components/city/tab-economy";
import { SectorsTab } from "@/components/city/tab-sectors";
import { PoliticsTab } from "@/components/city/tab-politics";
import { CouncilTab } from "@/components/city/tab-council";
import { NewsTab } from "@/components/city/tab-news";
import { IndicatorsTab } from "@/components/city/tab-indicators";
import { CompaniesTab } from "@/components/city/tab-companies";
import { InvestmentsTab } from "@/components/city/tab-investments";
import { TimelineTab } from "@/components/city/tab-timeline";
import { NeighborsTab } from "@/components/city/tab-neighbors";
import { MapTab } from "@/components/city/tab-map";
import { DocumentsTab } from "@/components/city/tab-documents";
import { AiTab } from "@/components/city/tab-ai";
import { RadarTab } from "@/components/city/tab-radar";
import { getMunicipality } from "@/server/queries/municipality";
import { SITE } from "@/lib/site";

type Params = Promise<{ slug: string }>;
type Search = Promise<{ aba?: string }>;

/**
 * Perfil do município — a entidade central do produto.
 *
 * Cada aba é um endereço próprio (`?aba=economia`), indexável e compartilhável,
 * e é renderizada em streaming: o cabeçalho aparece imediatamente e o conteúdo
 * pesado chega em seguida, sem bloquear a página.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const municipality = await getMunicipality(slug);
  if (!municipality) return { title: "Município não encontrado" };

  const title = `${municipality.name}, SP — Economia, Política, Notícias e Indicadores`;
  const description = `Perfil completo de ${municipality.name} (${municipality.mesoName}): economia, perfil setorial, governança, Câmara, empresas, investimentos, indicadores e os movimentos detectados pelo Radar.`;

  return {
    title,
    description,
    alternates: { canonical: `/cidade/${slug}` },
    openGraph: {
      title: `${title} | ${SITE.name}`,
      description,
      type: "profile",
      url: `${SITE.url}/cidade/${slug}`,
    },
  };
}

/** Os maiores municípios são pré-renderizados; o restante é gerado sob demanda. */
export async function generateStaticParams() {
  const municipalities = await prisma.municipality.findMany({
    where: { isCapital: true },
    select: { slug: true },
  });
  return municipalities.map((municipality) => ({ slug: municipality.slug }));
}

export const revalidate = 600;
export const dynamicParams = true;

export default async function CityPage({ params, searchParams }: { params: Params; searchParams: Search }) {
  const { slug } = await params;
  const { aba } = await searchParams;
  const municipality = await getMunicipality(slug);
  if (!municipality) notFound();

  const activeTab = (CITY_TABS.some((tab) => tab.key === aba) ? aba : "visao-geral") as CityTabKey;

  return (
    <>
      <CityHeader municipality={municipality} />
      <CityTabs slug={slug} activeKey={activeTab} />

      <div className="mt-6">
        <Suspense key={activeTab} fallback={<PanelSkeleton rows={6} className="rounded-[var(--radius-lg)] border" />}>
          <TabContent tab={activeTab} municipality={municipality} />
        </Suspense>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "City",
            name: municipality.name,
            identifier: municipality.ibgeCode,
            address: { "@type": "PostalAddress", addressRegion: "SP", addressCountry: "BR" },
            geo: {
              "@type": "GeoCoordinates",
              latitude: municipality.latitude,
              longitude: municipality.longitude,
            },
            url: `${SITE.url}/cidade/${slug}`,
          }),
        }}
      />
    </>
  );
}

type Municipality = NonNullable<Awaited<ReturnType<typeof getMunicipality>>>;

function TabContent({ tab, municipality }: { tab: CityTabKey; municipality: Municipality }) {
  switch (tab) {
    case "economia": return <EconomyTab municipality={municipality} />;
    case "setores": return <SectorsTab municipality={municipality} />;
    case "politica": return <PoliticsTab municipality={municipality} />;
    case "camara": return <CouncilTab municipality={municipality} />;
    case "radar": return <RadarTab municipality={municipality} />;
    case "noticias": return <NewsTab municipality={municipality} />;
    case "indicadores": return <IndicatorsTab municipality={municipality} />;
    case "empresas": return <CompaniesTab municipality={municipality} />;
    case "investimentos": return <InvestmentsTab municipality={municipality} />;
    case "timeline": return <TimelineTab municipality={municipality} />;
    case "mapa": return <MapTab municipality={municipality} />;
    case "documentos": return <DocumentsTab municipality={municipality} />;
    case "vizinhos": return <NeighborsTab municipality={municipality} />;
    case "ia": return <AiTab municipality={municipality} />;
    default: return <OverviewTab municipality={municipality} />;
  }
}
