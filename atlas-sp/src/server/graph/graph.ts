import "server-only";
import { prisma } from "@/server/db/prisma";
import type { EntityType, RelationKind } from "@prisma/client";

/**
 * Grafo de entidades.
 *
 * A tabela `Relationship` guarda arestas tipadas entre quaisquer entidades.
 * Este módulo faz a travessia e devolve nós já rotulados, que é o que a IA
 * e as telas de contexto consomem. É a peça que transforma páginas isoladas
 * em um sistema conectado: partindo de uma notícia chega-se ao município, ao
 * setor, à empresa, ao investimento e ao histórico sem perder o fio.
 */

export type GraphNode = {
  type: EntityType;
  id: string;
  label: string;
  href: string;
  subtitle?: string;
  isDemo?: boolean;
};

export type GraphEdge = {
  kind: RelationKind;
  weight: number;
  from: GraphNode;
  to: GraphNode;
  origin: string;
};

export type Neighborhood = {
  center: GraphNode;
  edges: GraphEdge[];
  /** Nós agrupados por tipo, ordenados por peso da relação. */
  byType: Partial<Record<EntityType, GraphNode[]>>;
};

const HREF: Record<EntityType, (slug: string) => string> = {
  MUNICIPIO: (slug) => `/cidade/${slug}`,
  REGIAO: (slug) => `/regiao/${slug}`,
  PESSOA: (slug) => `/pessoa/${slug}`,
  EMPRESA: (slug) => `/empresa/${slug}`,
  SETOR: (slug) => `/setores/${slug}`,
  PARTIDO: (slug) => `/partido/${slug}`,
  NOTICIA: (slug) => `/noticias/${slug}`,
  INVESTIMENTO: (slug) => `/investimentos/${slug}`,
  SINAL: (slug) => `/radar/${slug}`,
  INDICADOR: (slug) => `/indicadores/${slug}`,
  DOCUMENTO: (slug) => `/documentos/${slug}`,
  ORGAO: (slug) => `/orgao/${slug}`,
};

// Rótulos de relação ficam em `@/lib/labels` (uso compartilhado com o cliente).
export { RELATION_LABEL } from "@/lib/labels";

/** Carrega rótulos de um conjunto de ids agrupados por tipo, em lote. */
async function hydrate(refs: Array<{ type: EntityType; id: string }>): Promise<Map<string, GraphNode>> {
  const byType = new Map<EntityType, string[]>();
  for (const ref of refs) {
    const list = byType.get(ref.type) ?? [];
    list.push(ref.id);
    byType.set(ref.type, list);
  }

  const nodes = new Map<string, GraphNode>();
  const add = (type: EntityType, id: string, label: string, slug: string, subtitle?: string, isDemo?: boolean) => {
    nodes.set(`${type}:${id}`, { type, id, label, href: HREF[type](slug), subtitle, isDemo });
  };

  await Promise.all(
    [...byType.entries()].map(async ([type, ids]) => {
      const unique = [...new Set(ids)];
      switch (type) {
        case "MUNICIPIO": {
          const rows = await prisma.municipality.findMany({
            where: { id: { in: unique } },
            select: { id: true, name: true, slug: true, mesoName: true },
          });
          rows.forEach((row) => add(type, row.id, row.name, row.slug, row.mesoName ?? undefined));
          break;
        }
        case "REGIAO": {
          const rows = await prisma.region.findMany({
            where: { id: { in: unique } },
            select: { id: true, name: true, slug: true, kind: true },
          });
          rows.forEach((row) =>
            add(type, row.id, row.name, row.slug, row.kind.replace(/_/g, " ").toLowerCase()),
          );
          break;
        }
        case "PESSOA": {
          const rows = await prisma.person.findMany({
            where: { id: { in: unique } },
            select: { id: true, name: true, slug: true, isDemo: true, party: { select: { acronym: true } } },
          });
          rows.forEach((row) => add(type, row.id, row.name, row.slug, row.party?.acronym, row.isDemo));
          break;
        }
        case "EMPRESA": {
          const rows = await prisma.company.findMany({
            where: { id: { in: unique } },
            select: { id: true, name: true, slug: true, isDemo: true, sector: { select: { name: true } } },
          });
          rows.forEach((row) => add(type, row.id, row.name, row.slug, row.sector?.name, row.isDemo));
          break;
        }
        case "SETOR": {
          const rows = await prisma.economicSector.findMany({
            where: { id: { in: unique } },
            select: { id: true, name: true, slug: true, macroSector: true },
          });
          rows.forEach((row) => add(type, row.id, row.name, row.slug, row.macroSector.toLowerCase()));
          break;
        }
        case "NOTICIA": {
          const rows = await prisma.newsArticle.findMany({
            where: { id: { in: unique } },
            select: { id: true, title: true, slug: true, isDemo: true, source: { select: { name: true } } },
          });
          rows.forEach((row) => add(type, row.id, row.title, row.slug, row.source.name, row.isDemo));
          break;
        }
        case "SINAL": {
          const rows = await prisma.radarSignal.findMany({
            where: { id: { in: unique } },
            select: { id: true, headline: true, slug: true, isDemo: true, score: true },
          });
          rows.forEach((row) => add(type, row.id, row.headline, row.slug, `score ${row.score}`, row.isDemo));
          break;
        }
        case "INVESTIMENTO": {
          const rows = await prisma.investment.findMany({
            where: { id: { in: unique } },
            select: { id: true, title: true, slug: true, isDemo: true },
          });
          rows.forEach((row) => add(type, row.id, row.title, row.slug, undefined, row.isDemo));
          break;
        }
        default:
          break;
      }
    }),
  );

  return nodes;
}

/** Vizinhança de uma entidade no grafo (1 salto). */
export async function neighborhood(
  type: EntityType,
  id: string,
  options: { kinds?: RelationKind[]; limitPerKind?: number } = {},
): Promise<Neighborhood | null> {
  const limit = options.limitPerKind ?? 12;
  const where = options.kinds?.length ? { kind: { in: options.kinds } } : {};

  const [outgoing, incoming] = await Promise.all([
    prisma.relationship.findMany({
      where: { fromType: type, fromId: id, ...where },
      orderBy: { weight: "desc" },
      take: limit * 6,
    }),
    prisma.relationship.findMany({
      where: { toType: type, toId: id, ...where },
      orderBy: { weight: "desc" },
      take: limit * 6,
    }),
  ]);

  const refs: Array<{ type: EntityType; id: string }> = [{ type, id }];
  for (const edge of outgoing) refs.push({ type: edge.toType, id: edge.toId });
  for (const edge of incoming) refs.push({ type: edge.fromType, id: edge.fromId });

  const nodes = await hydrate(refs);
  const center = nodes.get(`${type}:${id}`);
  if (!center) return null;

  const edges: GraphEdge[] = [];
  for (const edge of outgoing) {
    const target = nodes.get(`${edge.toType}:${edge.toId}`);
    if (!target) continue;
    edges.push({ kind: edge.kind, weight: Number(edge.weight.toString()), from: center, to: target, origin: edge.origin });
  }
  for (const edge of incoming) {
    const source = nodes.get(`${edge.fromType}:${edge.fromId}`);
    if (!source) continue;
    edges.push({ kind: edge.kind, weight: Number(edge.weight.toString()), from: source, to: center, origin: edge.origin });
  }

  const byType: Partial<Record<EntityType, GraphNode[]>> = {};
  const seen = new Set<string>();
  for (const edge of edges.sort((a, b) => b.weight - a.weight)) {
    const other = edge.from.id === id && edge.from.type === type ? edge.to : edge.from;
    const key = `${other.type}:${other.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const list = byType[other.type] ?? [];
    if (list.length >= limit) continue;
    list.push(other);
    byType[other.type] = list;
  }

  return { center, edges, byType };
}

/**
 * Caminho mais curto entre duas entidades, até `maxDepth` saltos.
 * Usado pela IA para justificar por que duas coisas estão relacionadas.
 */
export async function shortestPath(
  from: { type: EntityType; id: string },
  to: { type: EntityType; id: string },
  maxDepth = 3,
): Promise<GraphNode[] | null> {
  type Key = string;
  const key = (ref: { type: EntityType; id: string }) => `${ref.type}:${ref.id}`;
  const target = key(to);
  const previous = new Map<Key, Key | null>([[key(from), null]]);
  let frontier: Array<{ type: EntityType; id: string }> = [from];

  for (let depth = 0; depth < maxDepth; depth++) {
    if (!frontier.length) break;
    const edges = await prisma.relationship.findMany({
      where: {
        OR: [
          { AND: [{ fromType: { in: [...new Set(frontier.map((ref) => ref.type))] } }, { fromId: { in: frontier.map((ref) => ref.id) } }] },
          { AND: [{ toType: { in: [...new Set(frontier.map((ref) => ref.type))] } }, { toId: { in: frontier.map((ref) => ref.id) } }] },
        ],
      },
      take: 4000,
    });

    const next: Array<{ type: EntityType; id: string }> = [];
    for (const edge of edges) {
      const pairs = [
        { source: { type: edge.fromType, id: edge.fromId }, dest: { type: edge.toType, id: edge.toId } },
        { source: { type: edge.toType, id: edge.toId }, dest: { type: edge.fromType, id: edge.fromId } },
      ];
      for (const { source, dest } of pairs) {
        if (!previous.has(key(source))) continue;
        if (previous.has(key(dest))) continue;
        previous.set(key(dest), key(source));
        next.push(dest);
        if (key(dest) === target) {
          const chain: Key[] = [target];
          let cursor = previous.get(target) ?? null;
          while (cursor) {
            chain.unshift(cursor);
            cursor = previous.get(cursor) ?? null;
          }
          const nodes = await hydrate(
            chain.map((entry) => {
              const [entityType, entityId] = entry.split(":");
              return { type: entityType as EntityType, id: entityId };
            }),
          );
          return chain.map((entry) => nodes.get(entry)).filter(Boolean) as GraphNode[];
        }
      }
    }
    frontier = next;
  }
  return null;
}
