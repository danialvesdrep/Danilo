import type { Metadata } from "next";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { CityTable } from "@/components/city/city-table";
import { getMunicipalityIndex } from "@/server/queries/state";
import { getRegions } from "@/server/queries/state";

export const metadata: Metadata = {
  title: "Os 645 municípios de São Paulo",
  description:
    "Cadastro completo dos 645 municípios paulistas com população, PIB, PIB per capita, emprego, setor predominante e atividade no Radar.",
};

export const revalidate = 900;

export default async function CitiesPage() {
  const [municipalities, regions] = await Promise.all([getMunicipalityIndex(), getRegions()]);

  return (
    <>
      <PageHeader
        eyebrow="Cadastro"
        title="Os 645 municípios de São Paulo"
        description="Todo o Estado em uma tabela. Ordene por qualquer coluna, filtre por região e abra a cidade que interessa."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Cidades" }]}
      />
      <Card>
        <CityTable
          municipalities={municipalities}
          regions={regions.map((region) => ({ name: region.name, kind: region.kind }))}
        />
      </Card>
    </>
  );
}
