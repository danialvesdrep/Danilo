import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { SignalCard } from "@/components/radar/signal-card";
import { StateMapPanel } from "@/components/map/state-map-panel";
import { getNeighbors } from "@/server/queries/municipality";
import { getNeighborSignals } from "@/server/queries/radar";
import { formatNumber } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

/**
 * Vizinhança: cada cidade conhece seus limítrofes, com extensão de fronteira
 * calculada sobre a malha do IBGE. É a base do raciocínio de transbordamento.
 */
export async function NeighborsTab({ municipality }: { municipality: MunicipalityDetail }) {
  const [neighbors, signals] = await Promise.all([
    getNeighbors(municipality.id),
    getNeighborSignals(municipality.id, 8),
  ]);

  if (!neighbors.length) {
    return (
      <Card>
        <EmptyState
          title={`${municipality.name} não tem vizinhos terrestres`}
          description="O município não compartilha fronteira com nenhum outro na malha municipal do IBGE."
        />
      </Card>
    );
  }

  const highlight = [municipality.slug, ...neighbors.map((entry) => entry.municipality.slug)];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          eyebrow="Território"
          title={`${neighbors.length} municípios limítrofes`}
          description="Extensão de fronteira e distância entre sedes calculadas sobre a Malha Municipal Digital do IBGE."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[34rem] text-left">
            <thead>
              <tr className="border-b">
                <th className="px-5 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                  Município
                </th>
                <th className="px-5 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                  Região
                </th>
                <th className="px-5 py-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                  Fronteira
                </th>
                <th className="px-5 py-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                  Distância
                </th>
                <th className="px-5 py-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                  Radar
                </th>
              </tr>
            </thead>
            <tbody>
              {neighbors.map((entry) => (
                <tr key={entry.municipality.slug} className="border-b last:border-b-0">
                  <td className="px-5 py-2.5">
                    <Link
                      href={`/cidade/${entry.municipality.slug}`}
                      className="text-[13px] font-medium hover:text-[var(--accent)]"
                    >
                      {entry.municipality.name}
                    </Link>
                  </td>
                  <td className="px-5 py-2.5 text-[12px] text-[var(--fg-muted)]">
                    {entry.municipality.mesoName}
                  </td>
                  <td className="tnum px-5 py-2.5 text-right text-[12.5px]">
                    {entry.borderKm ? `${formatNumber(entry.borderKm, 0)} km` : "—"}
                  </td>
                  <td className="tnum px-5 py-2.5 text-right text-[12.5px] text-[var(--fg-muted)]">
                    {formatNumber(entry.centroidKm, 0)} km
                  </td>
                  <td className="tnum px-5 py-2.5 text-right text-[12.5px] text-[var(--fg-muted)]">
                    {entry.municipality._count.radarSignals || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CardBody className="border-t">
          <p className="text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
            A extensão da fronteira é aproximada a partir dos vértices compartilhados na malha do
            IBGE, e a distância é medida entre os centroides. Fronteiras mais extensas costumam
            indicar integração territorial mais forte — deslocamento pendular, cadeia de
            fornecedores e serviços compartilhados.
          </p>
        </CardBody>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader
          eyebrow="Mapa"
          title="Posição no território"
          description={`${municipality.name} e seus limítrofes destacados na malha estadual.`}
        />
        <StateMapPanel height={440} initialMetric="pib" compact highlightSlugs={highlight} />
      </Card>

      {signals.length ? (
        <Card>
          <CardHeader
            eyebrow="Transbordamento"
            title="Movimentos no entorno"
            description="O que o Radar detectou nos municípios limítrofes nos últimos 90 dias."
          />
          <div>
            {signals.map((signal) => (
              <SignalCard key={signal.id} signal={signal} variant="compact" />
            ))}
          </div>
          <CardBody className="border-t">
            <Link
              href={`/ia?q=${encodeURIComponent(`Quais cidades vizinhas de ${municipality.name} podem ser afetadas por um novo investimento?`)}`}
              className="text-[12.5px] font-medium text-[var(--accent)] hover:underline"
            >
              Perguntar à Atlas AI sobre efeitos no entorno →
            </Link>
          </CardBody>
        </Card>
      ) : null}
    </div>
  );
}
