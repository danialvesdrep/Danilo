import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Metric, NoMunicipalSeries } from "@/components/data/metric";
import { SeriesChart } from "@/components/charts/series";
import { getIndicators } from "@/server/queries/municipality";
import { INDICATOR_CATEGORY_LABEL as CATEGORY_LABEL } from "@/lib/labels";
import type { MunicipalityDetail } from "@/server/queries/municipality";

/** Todos os indicadores do município, agrupados por categoria. */
export async function IndicatorsTab({ municipality }: { municipality: MunicipalityDetail }) {
  const indicators = await getIndicators(municipality.id);
  const byCategory = new Map<string, typeof indicators>();
  for (const indicator of indicators) {
    const list = byCategory.get(indicator.category) ?? [];
    list.push(indicator);
    byCategory.set(indicator.category, list);
  }

  return (
    <div className="space-y-6">
      {[...byCategory.entries()].map(([category, list]) => (
        <Card key={category}>
          <CardHeader
            eyebrow="Indicadores"
            title={CATEGORY_LABEL[category] ?? category}
            description={`${list.length} indicador(es) nesta categoria.`}
          />
          <CardBody className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((indicator) =>
              indicator.municipalLevel ? (
                <div key={indicator.slug}>
                  <Metric
                    label={indicator.shortName}
                    value={indicator.value}
                    unit={indicator.unit}
                    precision={indicator.precision}
                    delta={indicator.deltaPct}
                    deltaLabel="a/a"
                    referenceLabel={indicator.referenceLabel}
                    provenance={indicator.provenance}
                    isDemo={indicator.isDemo}
                    hint={indicator.description}
                  />
                  {indicator.history.length > 2 ? (
                    <div className="mt-2">
                      <SeriesChart
                        data={indicator.history}
                        unit={indicator.unit}
                        precision={indicator.precision}
                        height={70}
                      />
                    </div>
                  ) : null}
                </div>
              ) : (
                <NoMunicipalSeries
                  key={indicator.slug}
                  indicator={indicator.name}
                  contextScope="recorte estadual"
                />
              ),
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
