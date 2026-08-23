import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { prisma } from "@/server/db/prisma";
import { INDICATOR_CATEGORY_LABEL } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Indicadores",
  description:
    "Catálogo de indicadores do Atlas SP: definição, unidade, periodicidade, metodologia e fonte de cada série.",
};

export const revalidate = 3600;

export default async function IndicatorsPage() {
  const indicators = await prisma.indicator.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { displayOrder: "asc" }],
  });

  const byCategory = new Map<string, typeof indicators>();
  for (const indicator of indicators) {
    const list = byCategory.get(indicator.category) ?? [];
    list.push(indicator);
    byCategory.set(indicator.category, list);
  }

  return (
    <>
      <PageHeader
        eyebrow="Catálogo"
        title="Indicadores"
        description="Cada indicador da plataforma com sua definição, unidade, periodicidade e a metodologia da fonte. Onde não existe série municipal, isso está declarado."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Indicadores" }]}
      />

      <div className="space-y-6">
        {[...byCategory.entries()].map(([category, list]) => (
          <Card key={category}>
            <CardHeader
              eyebrow="Categoria"
              title={INDICATOR_CATEGORY_LABEL[category] ?? category}
              description={`${list.length} indicador(es)`}
            />
            <ul>
              {list.map((indicator) => (
                <li key={indicator.id} className="border-b px-5 py-3.5 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/indicadores/${indicator.slug}`}
                      className="text-[13.5px] font-medium hover:text-[var(--accent)]"
                    >
                      {indicator.name}
                    </Link>
                    <Badge tone="outline" mono>{indicator.unit}</Badge>
                    <Badge tone="outline">{indicator.periodicity.toLowerCase()}</Badge>
                    {!indicator.municipalLevel ? (
                      <Badge tone="signal">sem série municipal</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                    {indicator.description}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
                    {indicator.methodology}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
