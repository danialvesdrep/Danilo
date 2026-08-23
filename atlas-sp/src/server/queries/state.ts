import "server-only";
import { cache } from "react";
import { prisma } from "@/server/db/prisma";
import { toNumber } from "@/server/db/prisma";

/** Consultas de recorte estadual e regional: home, mapa, economia, comparador. */

export type MunicipalityListItem = {
  id: string;
  ibgeCode: string;
  name: string;
  slug: string;
  mesoName: string | null;
  microName: string | null;
  latitude: number;
  longitude: number;
  areaKm2: number | null;
  population: number | null;
  gdp: number | null;
  gdpPerCapita: number | null;
  employment: number | null;
  topSector: string | null;
  topSectorColor: string | null;
  signalCount: number;
  topScore: number;
  isDemo: boolean;
};

/**
 * Cadastro completo com os agregados usados pelo mapa e pelas listagens.
 * Uma consulta só, agregando no banco: 645 linhas não podem virar 645 queries.
 */
export const getMunicipalityIndex = cache(async (): Promise<MunicipalityListItem[]> => {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    WITH latest_year AS (
      SELECT dp."municipalityId", i.slug, dp."normalizedValue", dp."isDemo",
             ROW_NUMBER() OVER (
               PARTITION BY dp."municipalityId", i.slug ORDER BY dp."referenceStart" DESC
             ) AS rn
      FROM "DataPoint" dp
      JOIN "Indicator" i ON i.id = dp."indicatorId"
      WHERE i.slug IN ('populacao', 'pib', 'pib-per-capita', 'emprego-formal')
        AND dp."municipalityId" IS NOT NULL
    ),
    pivot AS (
      SELECT "municipalityId",
        MAX(CASE WHEN slug = 'populacao' THEN "normalizedValue" END) AS population,
        MAX(CASE WHEN slug = 'pib' THEN "normalizedValue" END) AS gdp,
        MAX(CASE WHEN slug = 'pib-per-capita' THEN "normalizedValue" END) AS gdp_per_capita,
        MAX(CASE WHEN slug = 'emprego-formal' THEN "normalizedValue" END) AS employment,
        BOOL_OR("isDemo") AS is_demo
      FROM latest_year WHERE rn = 1 GROUP BY "municipalityId"
    ),
    top_sector AS (
      SELECT DISTINCT ON (ms."municipalityId") ms."municipalityId", s.name, s.color
      FROM "MunicipalitySector" ms
      JOIN "EconomicSector" s ON s.id = ms."sectorId"
      ORDER BY ms."municipalityId", ms."sharePct" DESC
    ),
    signals AS (
      SELECT "municipalityId", COUNT(*)::int AS signal_count, COALESCE(MAX(score), 0)::int AS top_score
      FROM "RadarSignal"
      WHERE status = 'PUBLICADO' AND "occurredAt" >= NOW() - INTERVAL '90 days'
      GROUP BY "municipalityId"
    )
    SELECT m.id, m."ibgeCode", m.name, m.slug, m."mesoName", m."microName",
           m.latitude, m.longitude, m."areaKm2",
           p.population, p.gdp, p.gdp_per_capita, p.employment, COALESCE(p.is_demo, false) AS is_demo,
           ts.name AS top_sector, ts.color AS top_sector_color,
           COALESCE(sg.signal_count, 0) AS signal_count, COALESCE(sg.top_score, 0) AS top_score
    FROM "Municipality" m
    LEFT JOIN pivot p ON p."municipalityId" = m.id
    LEFT JOIN top_sector ts ON ts."municipalityId" = m.id
    LEFT JOIN signals sg ON sg."municipalityId" = m.id
    ORDER BY m.name`;

  return rows.map((row) => ({
    id: row.id as string,
    ibgeCode: row.ibgeCode as string,
    name: row.name as string,
    slug: row.slug as string,
    mesoName: (row.mesoName as string) ?? null,
    microName: (row.microName as string) ?? null,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    areaKm2: row.areaKm2 === null ? null : Number(row.areaKm2),
    population: toNumber(row.population),
    gdp: toNumber(row.gdp),
    gdpPerCapita: toNumber(row.gdp_per_capita),
    employment: toNumber(row.employment),
    topSector: (row.top_sector as string) ?? null,
    topSectorColor: (row.top_sector_color as string) ?? null,
    signalCount: Number(row.signal_count ?? 0),
    topScore: Number(row.top_score ?? 0),
    isDemo: Boolean(row.is_demo),
  }));
});

/** Agregados do Estado, com a soma explícita das séries municipais. */
export const getStateSnapshot = cache(async () => {
  const municipalities = await getMunicipalityIndex();
  const withPopulation = municipalities.filter((municipality) => municipality.population !== null);
  const totalPopulation = withPopulation.reduce((sum, m) => sum + (m.population ?? 0), 0);
  const totalGdp = municipalities.reduce((sum, m) => sum + (m.gdp ?? 0), 0);
  const totalEmployment = municipalities.reduce((sum, m) => sum + (m.employment ?? 0), 0);
  const anyDemo = municipalities.some((municipality) => municipality.isDemo);

  return {
    municipalityCount: municipalities.length,
    coveredByData: withPopulation.length,
    totalPopulation,
    totalGdp,
    totalEmployment,
    gdpPerCapita: totalPopulation > 0 ? totalGdp / totalPopulation : null,
    isDemo: anyDemo,
    topByGdp: [...municipalities].sort((a, b) => (b.gdp ?? 0) - (a.gdp ?? 0)).slice(0, 10),
    topByGdpPerCapita: [...municipalities]
      .filter((m) => (m.population ?? 0) > 20_000)
      .sort((a, b) => (b.gdpPerCapita ?? 0) - (a.gdpPerCapita ?? 0))
      .slice(0, 10),
  };
});

/** Setores em alta e em queda no Estado, contados a partir dos perfis municipais. */
export const getSectorMomentum = cache(async () => {
  const rows = await prisma.municipalitySector.groupBy({
    by: ["sectorId", "trend"],
    _count: { _all: true },
    _avg: { sharePct: true },
  });
  const sectors = await prisma.economicSector.findMany({
    select: { id: true, name: true, slug: true, macroSector: true, color: true },
  });
  const byId = new Map(sectors.map((sector) => [sector.id, sector]));

  const aggregate = new Map<
    string,
    { rising: number; falling: number; stable: number; total: number; avgShare: number }
  >();
  for (const row of rows) {
    const entry = aggregate.get(row.sectorId) ?? { rising: 0, falling: 0, stable: 0, total: 0, avgShare: 0 };
    const count = row._count._all;
    entry.total += count;
    if (row.trend === "FORTE_ALTA" || row.trend === "ALTA") entry.rising += count;
    else if (row.trend === "QUEDA" || row.trend === "FORTE_QUEDA") entry.falling += count;
    else entry.stable += count;
    entry.avgShare = Math.max(entry.avgShare, toNumber(row._avg.sharePct) ?? 0);
    aggregate.set(row.sectorId, entry);
  }

  const list = [...aggregate.entries()]
    .map(([sectorId, entry]) => {
      const sector = byId.get(sectorId);
      if (!sector) return null;
      // Difusão: proporção de municípios em que o setor avança menos os que recuam.
      const diffusion = entry.total ? ((entry.rising - entry.falling) / entry.total) * 100 : 0;
      return { ...sector, ...entry, diffusion };
    })
    .filter(Boolean) as Array<
    ReturnType<typeof byId.get> & { rising: number; falling: number; stable: number; total: number; avgShare: number; diffusion: number }
  >;

  return {
    rising: [...list].sort((a, b) => b!.diffusion - a!.diffusion).slice(0, 6),
    falling: [...list].sort((a, b) => a!.diffusion - b!.diffusion).slice(0, 6),
    all: list.sort((a, b) => b!.total - a!.total),
  };
});

export const getRegions = cache(async () =>
  prisma.region.findMany({
    where: { kind: { in: ["MESORREGIAO", "REGIAO_METROPOLITANA"] } },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
    select: {
      id: true, name: true, slug: true, kind: true, summary: true,
      _count: { select: { memberships: true } },
    },
  }),
);

export const getRegion = cache(async (slug: string) =>
  prisma.region.findUnique({
    where: { slug },
    select: {
      id: true, name: true, slug: true, kind: true, summary: true, ibgeCode: true,
      parent: { select: { name: true, slug: true } },
      memberships: {
        select: {
          municipality: {
            select: { id: true, name: true, slug: true, latitude: true, longitude: true, areaKm2: true },
          },
        },
      },
    },
  }),
);

/** Ranking por índice proprietário — base da tela de economia. */
export const getIndexRanking = cache(async (indexSlug: string, limit = 20) => {
  const index = await prisma.proprietaryIndex.findUnique({ where: { slug: indexSlug } });
  if (!index) return null;
  const scores = await prisma.indexScore.findMany({
    where: { indexId: index.id },
    orderBy: { value: "desc" },
    take: limit,
    select: {
      value: true, rank: true, trend: true, breakdown: true, referenceLabel: true,
      municipality: { select: { id: true, name: true, slug: true, mesoName: true } },
    },
  });
  return {
    index,
    scores: scores.map((score) => ({
      ...score,
      value: toNumber(score.value) ?? 0,
      breakdown: score.breakdown as Array<{ label: string; weight: number; value: number; rawValue: number }>,
    })),
  };
});

export const getLatestNews = cache(async (limit = 20, category?: string) =>
  prisma.newsArticle.findMany({
    where: category ? { category: category as never } : {},
    orderBy: [{ publishedAt: "desc" }],
    take: limit,
    select: {
      id: true, slug: true, title: true, summary: true, url: true, category: true,
      publishedAt: true, importance: true, isDemo: true,
      source: { select: { name: true, homepage: true, tier: true } },
      municipalities: { select: { municipality: { select: { name: true, slug: true } } }, take: 3 },
      sectors: { select: { sector: { select: { name: true, slug: true, color: true } } }, take: 2 },
    },
  }),
);

export const getDataQuality = cache(async () =>
  prisma.dataQualityCheck.findMany({ orderBy: { key: "asc" } }),
);

export const getSources = cache(async () =>
  prisma.dataSource.findMany({
    orderBy: [{ tier: "asc" }, { organization: "asc" }],
    select: {
      id: true, slug: true, name: true, organization: true, tier: true, url: true,
      description: true, methodology: true, lastSyncAt: true, lastSyncOk: true,
      refreshHours: true, isDemo: true, active: true,
      _count: { select: { dataPoints: true } },
    },
  }),
);
