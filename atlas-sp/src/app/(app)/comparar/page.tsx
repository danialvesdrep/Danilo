import type { Metadata } from "next";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { CompareBoard } from "@/components/compare/board";
import { getMunicipalityIndex } from "@/server/queries/state";

export const metadata: Metadata = {
  title: "Comparar municípios",
  description:
    "Compare até quatro municípios paulistas lado a lado: população, PIB, emprego, setores, finanças públicas e atividade no Radar.",
};

export const revalidate = 900;

type Search = Promise<{ cidades?: string }>;

export default async function ComparePage({ searchParams }: { searchParams: Search }) {
  const { cidades } = await searchParams;
  const municipalities = await getMunicipalityIndex();
  const initial = (cidades ?? "").split(",").map((slug) => slug.trim()).filter(Boolean).slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Análise comparada"
        title="Comparar cidades"
        description="Até quatro municípios lado a lado, nos mesmos indicadores e no mesmo período de referência."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Comparar" }]}
      />
      <CompareBoard
        options={municipalities.map((municipality) => ({
          slug: municipality.slug,
          name: municipality.name,
          meso: municipality.mesoName,
        }))}
        initialSlugs={initial}
      />
    </>
  );
}
