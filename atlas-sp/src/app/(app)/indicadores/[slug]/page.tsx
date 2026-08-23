import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty";
import { DemoBadge } from "@/components/data/provenance";
import { prisma, toNumber } from "@/server/db/prisma";
import { INDICATOR_CATEGORY_LABEL } from "@/lib/labels";
import { formatUnit } from "@/lib/format";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const indicator = await prisma.indicator.findUnique({ where: { slug } });
  if (!indicator) return { title: "Indicador não encontrado" };
  return {
    title: indicator.name,
    description: `${indicator.description} ${indicator.methodology}`,
    alternates: { canonical: `/indicadores/${slug}` },
  };
}

export const revalidate = 900;

/** Ficha do indicador: definição, metodologia e o ranking municipal da série. */
export default async function IndicatorPage({ params }: { params: Params }) {
  const { slug } = await params;
  const indicator = await prisma.indicator.findUnique({ where: { slug } });
  if (!indicator) notFound();

  // Último valor de cada município para este indicador, ordenado.
  const rows = await prisma.$queryRaw<
    Array<{ name: string; slug: string; meso: string | null; value: string; label: string; is_demo: boolean }>
  >`
    WITH ranked AS (
      SELECT dp."municipalityId", dp."normalizedValue", dp."referenceLabel", dp."isDemo",
             ROW_NUMBER() OVER (PARTITION BY dp."municipalityId" ORDER BY dp."referenceStart" DESC) AS rn
      FROM "DataPoint" dp
      WHERE dp."indicatorId" = ${indicator.id} AND dp."municipalityId" IS NOT NULL
    )
    SELECT m.name, m.slug, m."mesoName" AS meso, r."normalizedValue"::text AS value,
           r."referenceLabel" AS label, r."isDemo" AS is_demo
    FROM ranked r JOIN "Municipality" m ON m.id = r."municipalityId"
    WHERE r.rn = 1
    ORDER BY r."normalizedValue" DESC NULLS LAST
    LIMIT 60`;

  const covered = await prisma.dataPoint.groupBy({
    by: ["municipalityId"],
    where: { indicatorId: indicator.id },
    _count: { _all: true },
  });

  return (
    <>
      <PageHeader
        eyebrow={INDICATOR_CATEGORY_LABEL[indicator.category] ?? indicator.category}
        title={indicator.name}
        description={indicator.description}
        breadcrumbs={[
          { label: "Atlas SP", href: "/dashboard" },
          { label: "Indicadores", href: "/indicadores" },
          { label: indicator.shortName },
        ]}
      />

      <Card>
        <CardHeader eyebrow="Ficha técnica" title="Definição e metodologia" />
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge tone="outline" mono>{indicator.unit}</Badge>
            <Badge tone="outline">{indicator.periodicity.toLowerCase()}</Badge>
            <Badge tone={indicator.municipalLevel ? "accent" : "signal"}>
              {indicator.municipalLevel ? "recorte municipal" : "sem série municipal"}
            </Badge>
            <Badge tone="outline">
              {covered.length} de 645 municípios com série
            </Badge>
          </div>
          <p className="text-[13px] leading-relaxed">{indicator.methodology}</p>
          {!indicator.municipalLevel ? (
            <p className="rounded-[var(--radius-md)] border border-dashed px-3.5 py-3 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
              Este indicador não é apurado no recorte municipal. Onde ele aparece na plataforma, o
              valor exibido é o do recorte disponível — estadual ou de região metropolitana — e vem
              sempre identificado como contexto, nunca como número do município.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {rows.length ? (
        <Card className="mt-6">
          <CardHeader
            eyebrow="Ranking"
            title="Municípios por valor mais recente"
            description="Ordenado do maior para o menor, com o período de referência de cada município."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[30rem] text-left">
              <thead>
                <tr className="border-b">
                  <th className="px-5 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">#</th>
                  <th className="px-5 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Município</th>
                  <th className="px-5 py-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Valor</th>
                  <th className="px-5 py-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Referência</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, position) => (
                  <tr key={row.slug} className="border-b last:border-b-0">
                    <td className="tnum px-5 py-2 font-mono text-[11px] text-[var(--fg-subtle)]">{position + 1}</td>
                    <td className="px-5 py-2">
                      <Link href={`/cidade/${row.slug}`} className="text-[13px] font-medium hover:text-[var(--accent)]">
                        {row.name}
                      </Link>
                      <span className="ml-2 text-[11px] text-[var(--fg-subtle)]">{row.meso}</span>
                      {row.is_demo ? <DemoBadge compact className="ml-1.5" /> : null}
                    </td>
                    <td className="tnum px-5 py-2 text-right text-[13px] font-medium">
                      {formatUnit(Number(row.value), indicator.unit, indicator.precision)}
                    </td>
                    <td className="tnum px-5 py-2 text-right text-[11.5px] text-[var(--fg-subtle)]">{row.label}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card className="mt-6">
          <EmptyState
            title="Nenhuma série carregada"
            description="Este indicador está catalogado mas ainda não tem observações ingeridas."
          />
        </Card>
      )}
    </>
  );
}
