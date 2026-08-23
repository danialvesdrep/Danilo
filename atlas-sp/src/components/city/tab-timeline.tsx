import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { DemoBadge } from "@/components/data/provenance";
import { getTimeline } from "@/server/queries/municipality";
import { TIMELINE_KIND_LABEL as KIND_LABEL } from "@/lib/labels";
import { formatDate } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

/** Linha do tempo do município: política, economia, empresas e movimentos. */
export async function TimelineTab({ municipality }: { municipality: MunicipalityDetail }) {
  const events = await getTimeline(municipality.id, 120);

  if (!events.length) {
    return (
      <Card>
        <EmptyState title="Linha do tempo vazia" description="Nenhum evento registrado para este município." />
      </Card>
    );
  }

  const byYear = new Map<number, typeof events>();
  for (const event of events) {
    const year = event.occurredAt.getFullYear();
    const list = byYear.get(year) ?? [];
    list.push(event);
    byYear.set(year, list);
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Histórico"
        title={`Linha do tempo de ${municipality.name}`}
        description="Política, economia, empresas, infraestrutura e movimentos do Radar em ordem cronológica."
      />
      <div className="px-5 py-4">
        {[...byYear.entries()]
          .sort((a, b) => b[0] - a[0])
          .map(([year, list]) => (
            <section key={year} className="relative pb-6 last:pb-0">
              <h3 className="headline sticky top-16 z-10 -mx-1 bg-[var(--bg-raised)] px-1 pb-2 text-[20px]">
                {year}
              </h3>
              <ol className="relative ml-2 border-l pl-5">
                {list.map((event) => (
                  <li key={event.id} className="relative pb-4 last:pb-0">
                    <span
                      className="absolute -left-[26px] top-1.5 size-2 rounded-full border-2 border-[var(--bg-raised)]"
                      style={{
                        backgroundColor:
                          event.kind === "RADAR" ? "var(--signal)" : "var(--border-strong)",
                      }}
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-[var(--fg-subtle)]">
                        {formatDate(event.occurredAt)}
                      </span>
                      <Badge tone={event.kind === "RADAR" ? "signal" : "outline"}>
                        {KIND_LABEL[event.kind] ?? event.kind}
                      </Badge>
                      {event.isDemo ? <DemoBadge compact /> : null}
                    </div>
                    {event.signal ? (
                      <Link
                        href={`/radar/${event.signal.slug}`}
                        className="mt-1 block text-[13.5px] font-medium leading-snug hover:text-[var(--accent)]"
                      >
                        {event.title}
                      </Link>
                    ) : (
                      <p className="mt-1 text-[13.5px] font-medium leading-snug">{event.title}</p>
                    )}
                    {event.description ? (
                      <p className="mt-0.5 text-[12px] leading-relaxed text-[var(--fg-muted)]">
                        {event.description}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}
      </div>
    </Card>
  );
}
