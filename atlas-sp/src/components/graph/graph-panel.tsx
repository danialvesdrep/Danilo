import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { DemoBadge } from "@/components/data/provenance";
import type { Neighborhood } from "@/server/graph/graph";
import { ENTITY_LABEL as TYPE_LABEL } from "@/lib/labels";
import type { EntityType } from "@prisma/client";

/**
 * Vizinhança de uma entidade no grafo. É o componente que materializa o
 * princípio de que nada na plataforma é uma página isolada.
 */
export function GraphPanel({
  graph,
  title = "Conexões",
  description,
}: {
  graph: Neighborhood;
  title?: string;
  description?: string;
}) {
  const groups = Object.entries(graph.byType).filter(([, nodes]) => nodes && nodes.length > 0);
  if (!groups.length) return null;

  return (
    <Card>
      <CardHeader
        eyebrow="Grafo de entidades"
        title={title}
        description={
          description ??
          `${graph.edges.length} relação(ões) partindo de ${graph.center.label}.`
        }
        dense
      />
      <div className="space-y-3 px-4 py-3.5">
        {groups.map(([type, nodes]) => (
          <div key={type}>
            <p className="eyebrow mb-1.5">{TYPE_LABEL[type as EntityType]}</p>
            <ul className="flex flex-wrap gap-1.5">
              {nodes!.map((node) => (
                <li key={`${node.type}-${node.id}`}>
                  <Link
                    href={node.href}
                    className="inline-flex max-w-[16rem] items-center gap-1.5 rounded-[var(--radius-xs)] border px-2 py-1 text-[11.5px] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--bg-inset)]"
                  >
                    <span className="truncate">{node.label}</span>
                    {node.subtitle ? (
                      <span className="shrink-0 text-[10px] text-[var(--fg-subtle)]">
                        {node.subtitle}
                      </span>
                    ) : null}
                    {node.isDemo ? <DemoBadge compact /> : null}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}
