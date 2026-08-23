import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StateMapPanel } from "@/components/map/state-map-panel";
import { Metric } from "@/components/data/metric";
import { getNeighbors } from "@/server/queries/municipality";
import { formatNumber } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

export async function MapTab({ municipality }: { municipality: MunicipalityDetail }) {
  const neighbors = await getNeighbors(municipality.id);
  const highlight = [municipality.slug];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <CardHeader
          eyebrow="Mapa"
          title={`${municipality.name} no Estado`}
          description="Troque a métrica para comparar o município com os demais 644."
        />
        <StateMapPanel height={560} initialMetric="pib" highlightSlugs={highlight} />
      </Card>

      <Card>
        <CardHeader eyebrow="Geografia" title="Dados territoriais" />
        <CardBody className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <Metric
            label="Área territorial"
            value={municipality.areaKm2}
            unit="km2"
            precision={1}
            provenance={{
              sourceName: "Malha Municipal Digital",
              organization: "IBGE",
              tier: "OFICIAL",
              url: "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais",
              methodology:
                "Área calculada por geometria esférica sobre a malha do IBGE. Divergência típica inferior a 1% frente à área oficial publicada.",
              isDemo: false,
            }}
          />
          <Metric label="Latitude da sede" value={municipality.latitude} precision={4} />
          <Metric label="Longitude da sede" value={municipality.longitude} precision={4} />
          <Metric label="Municípios limítrofes" value={neighbors.length} unit="unidades" />
        </CardBody>
      </Card>
    </div>
  );
}
