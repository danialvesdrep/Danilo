import "server-only";
import { prisma } from "@/server/db/prisma";
import { resolveTerm } from "@/server/entities/resolve";
import { normalizeKey } from "@/lib/slug";

/**
 * Busca global. Provedor padrão: PostgreSQL (trigrama + full-text em português
 * sem acento). A interface `SearchProvider` mantém o caminho aberto para
 * Meilisearch/OpenSearch sem tocar nas telas.
 */

export type SearchGroup =
  | "cidades" | "pessoas" | "empresas" | "setores" | "noticias"
  | "indicadores" | "investimentos" | "sinais" | "regioes" | "documentos";

export type SearchHit = {
  group: SearchGroup;
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  score: number;
  badge?: string;
  isDemo?: boolean;
};

export type SearchResponse = {
  query: string;
  normalized: string;
  groups: Array<{ group: SearchGroup; label: string; hits: SearchHit[] }>;
  total: number;
  tookMs: number;
};

const GROUP_LABEL: Record<SearchGroup, string> = {
  cidades: "Cidades",
  regioes: "Regiões",
  pessoas: "Pessoas",
  empresas: "Empresas",
  setores: "Setores",
  noticias: "Notícias",
  sinais: "Radar",
  investimentos: "Investimentos",
  indicadores: "Indicadores",
  documentos: "Documentos",
};

const GROUP_ORDER: SearchGroup[] = [
  "cidades", "sinais", "pessoas", "empresas", "setores",
  "noticias", "investimentos", "indicadores", "regioes", "documentos",
];

export async function globalSearch(
  query: string,
  { limitPerGroup = 5 }: { limitPerGroup?: number } = {},
): Promise<SearchResponse> {
  const started = Date.now();
  const trimmed = query.trim();
  const normalized = normalizeKey(trimmed);

  if (trimmed.length < 2) {
    return { query: trimmed, normalized, groups: [], total: 0, tookMs: 0 };
  }

  const pattern = `%${normalized}%`;
  const hits: SearchHit[] = [];

  // Cidades: passa pela resolução de entidades, que já entende as variações.
  const resolvedMunicipalities = await resolveTerm(trimmed, {
    types: ["MUNICIPIO"],
    limit: limitPerGroup * 2,
  });
  if (resolvedMunicipalities.length) {
    const municipalities = await prisma.municipality.findMany({
      where: { id: { in: resolvedMunicipalities.map((entity) => entity.id) } },
      select: { id: true, name: true, slug: true, mesoName: true, microName: true },
    });
    const byId = new Map(municipalities.map((municipality) => [municipality.id, municipality]));
    for (const entity of resolvedMunicipalities) {
      const municipality = byId.get(entity.id);
      if (!municipality) continue;
      hits.push({
        group: "cidades",
        id: municipality.id,
        title: municipality.name,
        subtitle: `${municipality.microName} · ${municipality.mesoName}`,
        href: `/cidade/${municipality.slug}`,
        score: entity.confidence,
        badge: "SP",
      });
    }
  }

  const [people, companies, sectors, regions, indicators, articles, signals, investments] =
    await Promise.all([
      prisma.$queryRaw<Array<{ id: string; name: string; slug: string; sim: number; isDemo: boolean; office: string | null; municipality: string | null }>>`
        SELECT p.id, p.name, p.slug, similarity(lower(p.name), ${normalized}) AS sim, p."isDemo",
               m.office::text AS office, mu.name AS municipality
        FROM "Person" p
        LEFT JOIN LATERAL (
          SELECT office, "municipalityId" FROM "Mandate"
          WHERE "personId" = p.id AND "isCurrent" = true LIMIT 1
        ) m ON true
        LEFT JOIN "Municipality" mu ON mu.id = m."municipalityId"
        WHERE lower(p.name) LIKE ${pattern} OR similarity(lower(p.name), ${normalized}) > 0.32
        ORDER BY sim DESC NULLS LAST LIMIT ${limitPerGroup}`,
      prisma.$queryRaw<Array<{ id: string; name: string; slug: string; sim: number; isDemo: boolean; sector: string | null; municipality: string | null }>>`
        SELECT c.id, c.name, c.slug, similarity(lower(c.name), ${normalized}) AS sim, c."isDemo",
               s.name AS sector, mu.name AS municipality
        FROM "Company" c
        LEFT JOIN "EconomicSector" s ON s.id = c."sectorId"
        LEFT JOIN "Municipality" mu ON mu.id = c."municipalityId"
        WHERE lower(c.name) LIKE ${pattern} OR similarity(lower(c.name), ${normalized}) > 0.32
        ORDER BY sim DESC NULLS LAST LIMIT ${limitPerGroup}`,
      prisma.economicSector.findMany({
        where: { name: { contains: trimmed, mode: "insensitive" } },
        select: { id: true, name: true, slug: true, macroSector: true },
        take: limitPerGroup,
      }),
      prisma.region.findMany({
        where: { name: { contains: trimmed, mode: "insensitive" } },
        select: { id: true, name: true, slug: true, kind: true },
        take: limitPerGroup,
      }),
      prisma.indicator.findMany({
        where: {
          OR: [
            { name: { contains: trimmed, mode: "insensitive" } },
            { shortName: { contains: trimmed, mode: "insensitive" } },
          ],
        },
        select: { id: true, name: true, slug: true, category: true, unit: true },
        take: limitPerGroup,
      }),
      prisma.$queryRaw<Array<{ id: string; title: string; slug: string; rank: number; publishedAt: Date; isDemo: boolean; source: string }>>`
        SELECT a.id, a.title, a.slug, a."publishedAt", a."isDemo", ns.name AS source,
               ts_rank(to_tsvector('portugues_sem_acento', a.title || ' ' || a.summary),
                       plainto_tsquery('portugues_sem_acento', ${trimmed})) AS rank
        FROM "NewsArticle" a
        JOIN "NewsSource" ns ON ns.id = a."sourceId"
        WHERE to_tsvector('portugues_sem_acento', a.title || ' ' || a.summary)
              @@ plainto_tsquery('portugues_sem_acento', ${trimmed})
        ORDER BY rank DESC, a."publishedAt" DESC LIMIT ${limitPerGroup}`,
      prisma.$queryRaw<Array<{ id: string; headline: string; slug: string; rank: number; score: number; occurredAt: Date; municipality: string; isDemo: boolean }>>`
        SELECT r.id, r.headline, r.slug, r.score, r."occurredAt", r."isDemo", m.name AS municipality,
               ts_rank(to_tsvector('portugues_sem_acento', r.headline || ' ' || r.description),
                       plainto_tsquery('portugues_sem_acento', ${trimmed})) AS rank
        FROM "RadarSignal" r
        JOIN "Municipality" m ON m.id = r."municipalityId"
        WHERE r.status = 'PUBLICADO'
          AND to_tsvector('portugues_sem_acento', r.headline || ' ' || r.description)
              @@ plainto_tsquery('portugues_sem_acento', ${trimmed})
        ORDER BY rank DESC, r.score DESC LIMIT ${limitPerGroup}`,
      prisma.investment.findMany({
        where: { title: { contains: trimmed, mode: "insensitive" } },
        select: {
          id: true, title: true, slug: true, amountBRL: true, isDemo: true,
          municipality: { select: { name: true } },
        },
        take: limitPerGroup,
      }),
    ]);

  for (const person of people) {
    hits.push({
      group: "pessoas", id: person.id, title: person.name,
      subtitle: [person.office, person.municipality].filter(Boolean).join(" · ") || undefined,
      href: `/pessoa/${person.slug}`, score: Number(person.sim ?? 0.4), isDemo: person.isDemo,
    });
  }
  for (const company of companies) {
    hits.push({
      group: "empresas", id: company.id, title: company.name,
      subtitle: [company.sector, company.municipality].filter(Boolean).join(" · ") || undefined,
      href: `/empresa/${company.slug}`, score: Number(company.sim ?? 0.4), isDemo: company.isDemo,
    });
  }
  for (const sector of sectors) {
    hits.push({
      group: "setores", id: sector.id, title: sector.name,
      subtitle: sector.macroSector.toLowerCase(),
      href: `/setores/${sector.slug}`, score: 0.6,
    });
  }
  for (const region of regions) {
    hits.push({
      group: "regioes", id: region.id, title: region.name,
      subtitle: region.kind.replace(/_/g, " ").toLowerCase(),
      href: `/regiao/${region.slug}`, score: 0.55,
    });
  }
  for (const indicator of indicators) {
    hits.push({
      group: "indicadores", id: indicator.id, title: indicator.name,
      subtitle: `${indicator.category.toLowerCase()} · ${indicator.unit}`,
      href: `/indicadores/${indicator.slug}`, score: 0.5,
    });
  }
  for (const article of articles) {
    hits.push({
      group: "noticias", id: article.id, title: article.title,
      subtitle: article.source, href: `/noticias/${article.slug}`,
      score: Number(article.rank ?? 0.3) + 0.3, isDemo: article.isDemo,
    });
  }
  for (const signal of signals) {
    hits.push({
      group: "sinais", id: signal.id, title: signal.headline,
      subtitle: `${signal.municipality} · score ${signal.score}`,
      href: `/radar/${signal.slug}`,
      score:
        Number(signal.rank ?? 0.3) +
        0.35 +
        (signal.headline.toLowerCase().includes(trimmed.toLowerCase()) ? 0.4 : 0),
      isDemo: signal.isDemo,
    });
  }
  for (const investment of investments) {
    hits.push({
      group: "investimentos", id: investment.id, title: investment.title,
      subtitle: investment.municipality.name, href: `/investimentos/${investment.slug}`,
      score: 0.45, isDemo: investment.isDemo,
    });
  }

  const grouped = GROUP_ORDER.map((group) => ({
    group,
    label: GROUP_LABEL[group],
    hits: hits
      .filter((hit) => hit.group === group)
      .sort((a, b) => b.score - a.score)
      .slice(0, limitPerGroup),
  })).filter((entry) => entry.hits.length > 0);

  return {
    query: trimmed,
    normalized,
    groups: grouped,
    total: grouped.reduce((sum, entry) => sum + entry.hits.length, 0),
    tookMs: Date.now() - started,
  };
}
