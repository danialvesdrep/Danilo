import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendMark, ShareBar } from "@/components/data/metric";
import { EmptyState } from "@/components/ui/empty";
import { DemoBadge } from "@/components/data/provenance";
import { getSectorProfile } from "@/server/queries/municipality";
import { formatPercent } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

/** Setores do município: participação, tendência e relevância relativa. */
export async function SectorsTab({ municipality }: { municipality: MunicipalityDetail }) {
  const sectors = await getSectorProfile(municipality.id);

  if (!sectors.length) {
    return (
      <Card>
        <EmptyState
          title="Perfil setorial não disponível"
          description={`A composição setorial de ${municipality.name} depende da ingestão do valor adicionado por atividade e do emprego por seção CNAE.`}
        />
      </Card>
    );
  }

  const rising = sectors.filter((entry) => entry.trend === "ALTA" || entry.trend === "FORTE_ALTA");
  const falling = sectors.filter((entry) => entry.trend === "QUEDA" || entry.trend === "FORTE_QUEDA");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          eyebrow="Composição"
          title={`Setores em destaque em ${municipality.name}`}
          description="Participação estimada no valor adicionado e no emprego, com a tendência apurada pela plataforma."
        />
        <CardBody>
          <ShareBar
            height={12}
            items={sectors.map((entry) => ({
              label: entry.sector.name,
              value: entry.sharePct,
              color: entry.sector.color,
            }))}
          />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="border-b">
                  <th className="pb-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                    Setor
                  </th>
                  <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                    Valor adicionado
                  </th>
                  <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                    Emprego
                  </th>
                  <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                    Relevância
                  </th>
                  <th className="pb-2 text-right text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                    Tendência
                  </th>
                </tr>
              </thead>
              <tbody>
                {sectors.map((entry) => (
                  <tr key={entry.sector.slug} className="border-b last:border-b-0">
                    <td className="py-2.5">
                      <Link
                        href={`/setores/${entry.sector.slug}`}
                        className="inline-flex items-center gap-2 text-[13px] font-medium hover:text-[var(--accent)]"
                      >
                        <span
                          className="size-2 rounded-sm"
                          style={{ backgroundColor: entry.sector.color ?? "var(--accent)" }}
                          aria-hidden
                        />
                        {entry.sector.name}
                      </Link>
                      <span className="ml-3 text-[11px] text-[var(--fg-subtle)]">
                        {entry.sector.macroSector.toLowerCase()}
                      </span>
                    </td>
                    <td className="tnum py-2.5 text-right text-[13px] font-medium">
                      {formatPercent(entry.sharePct, 1)}
                    </td>
                    <td className="tnum py-2.5 text-right text-[13px] text-[var(--fg-muted)]">
                      {entry.employmentPct === null ? "—" : formatPercent(entry.employmentPct, 1)}
                    </td>
                    <td className="tnum py-2.5 text-right text-[13px] text-[var(--fg-muted)]">
                      {entry.relevance.toFixed(0)}
                    </td>
                    <td className="py-2.5 text-right">
                      <TrendMark trend={entry.trend} className="justify-end" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 border-t pt-3 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
            {sectors[0].rationale} Relevância é um índice proprietário de 0 a 100 que combina a
            participação do setor no município com a sua concentração relativa.
          </p>
        </CardBody>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Movimento" title="Setores em alta" dense />
          <CardBody dense>
            {rising.length ? (
              <ul className="space-y-2">
                {rising.map((entry) => (
                  <li key={entry.sector.slug} className="flex items-center gap-3">
                    <Link
                      href={`/setores/${entry.sector.slug}`}
                      className="min-w-0 flex-1 truncate text-[13px] hover:text-[var(--accent)]"
                    >
                      {entry.sector.name}
                    </Link>
                    <span className="tnum text-[12px] text-[var(--fg-muted)]">
                      {formatPercent(entry.sharePct, 1)}
                    </span>
                    <TrendMark trend={entry.trend} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-[var(--fg-muted)]">
                Nenhum setor com tendência de alta no período apurado.
              </p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Movimento" title="Setores em queda" dense />
          <CardBody dense>
            {falling.length ? (
              <ul className="space-y-2">
                {falling.map((entry) => (
                  <li key={entry.sector.slug} className="flex items-center gap-3">
                    <Link
                      href={`/setores/${entry.sector.slug}`}
                      className="min-w-0 flex-1 truncate text-[13px] hover:text-[var(--accent)]"
                    >
                      {entry.sector.name}
                    </Link>
                    <span className="tnum text-[12px] text-[var(--fg-muted)]">
                      {formatPercent(entry.sharePct, 1)}
                    </span>
                    <TrendMark trend={entry.trend} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[12.5px] text-[var(--fg-muted)]">
                Nenhum setor com tendência de queda no período apurado.
              </p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
