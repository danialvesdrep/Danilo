import "server-only";
import { cache } from "react";
import { prisma } from "@/server/db/prisma";
import { toNumber } from "@/server/db/prisma";
import type { Prisma, SignalCategory } from "@prisma/client";

/** Consultas do Radar — a camada de inteligência do produto. */

export type RadarFilters = {
  categories?: SignalCategory[];
  municipalityId?: string;
  municipalitySlug?: string;
  regionId?: string;
  sectorSlug?: string;
  minScore?: number;
  sinceDays?: number;
  search?: string;
  limit?: number;
  cursor?: string;
};

const signalSelect = {
  id: true, slug: true, headline: true, description: true, category: true,
  occurredAt: true, detectedAt: true, score: true, importance: true, urgency: true,
  economicImpact: true, politicalImpact: true, regionalImpact: true, scoreRationale: true,
  isDemo: true,
  municipality: { select: { id: true, name: true, slug: true, mesoName: true, latitude: true, longitude: true } },
  sector: { select: { name: true, slug: true, color: true } },
  company: { select: { name: true, slug: true } },
  investment: { select: { slug: true, amountBRL: true, jobsAnnounced: true, status: true } },
  sources: {
    select: {
      role: true,
      article: {
        select: {
          id: true, slug: true, title: true, url: true, publishedAt: true, isDemo: true,
          source: { select: { name: true, tier: true, homepage: true } },
        },
      },
    },
  },
} satisfies Prisma.RadarSignalSelect;

export type RadarSignalItem = Prisma.RadarSignalGetPayload<{ select: typeof signalSelect }> & {
  amountBRL: number | null;
};

function buildWhere(filters: RadarFilters): Prisma.RadarSignalWhereInput {
  const where: Prisma.RadarSignalWhereInput = { status: "PUBLICADO" };
  if (filters.categories?.length) where.category = { in: filters.categories };
  if (filters.municipalityId) where.municipalityId = filters.municipalityId;
  if (filters.municipalitySlug) where.municipality = { slug: filters.municipalitySlug };
  if (filters.sectorSlug) where.sector = { slug: filters.sectorSlug };
  if (filters.regionId) where.municipality = { regionMemberships: { some: { regionId: filters.regionId } } };
  if (typeof filters.minScore === "number") where.score = { gte: filters.minScore };
  if (filters.sinceDays) {
    where.occurredAt = { gte: new Date(Date.now() - filters.sinceDays * 86_400_000) };
  }
  if (filters.search) {
    where.OR = [
      { headline: { contains: filters.search, mode: "insensitive" } },
      { description: { contains: filters.search, mode: "insensitive" } },
      { municipality: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }
  return where;
}

export async function getRadarSignals(filters: RadarFilters = {}) {
  const take = Math.min(filters.limit ?? 20, 100);
  const signals = await prisma.radarSignal.findMany({
    where: buildWhere(filters),
    // Relevância antes de cronologia: o Radar não é um feed.
    orderBy: [{ score: "desc" }, { occurredAt: "desc" }],
    take: take + 1,
    ...(filters.cursor ? { cursor: { id: filters.cursor }, skip: 1 } : {}),
    select: signalSelect,
  });

  const hasMore = signals.length > take;
  const page = hasMore ? signals.slice(0, take) : signals;
  return {
    signals: page.map((signal) => ({
      ...signal,
      amountBRL: toNumber(signal.investment?.amountBRL),
    })),
    nextCursor: hasMore ? page[page.length - 1]?.id ?? null : null,
  };
}

export const getSignal = cache(async (slug: string) => {
  const signal = await prisma.radarSignal.findUnique({
    where: { slug },
    select: {
      ...signalSelect,
      analyses: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true, kind: true, facts: true, interpretation: true, hypotheses: true,
          citations: true, provider: true, model: true, confidence: true,
          insufficientData: true, createdAt: true,
        },
      },
    },
  });
  if (!signal) return null;
  return { ...signal, amountBRL: toNumber(signal.investment?.amountBRL) };
});

/** Contagem por categoria, para os filtros do Radar. */
export async function getRadarCategoryCounts(sinceDays = 30) {
  const rows = await prisma.radarSignal.groupBy({
    by: ["category"],
    where: { status: "PUBLICADO", occurredAt: { gte: new Date(Date.now() - sinceDays * 86_400_000) } },
    _count: { _all: true },
    orderBy: { _count: { category: "desc" } },
  });
  return rows.map((row) => ({ category: row.category, count: row._count._all }));
}

/** Resumo do Radar exibido na home: quantos movimentos e onde. */
export const getRadarSummary = cache(async () => {
  const since24h = new Date(Date.now() - 86_400_000);
  const since7d = new Date(Date.now() - 7 * 86_400_000);

  const [last24h, last7d, highPriority, topMunicipalities, totalMunicipalities] = await Promise.all([
    prisma.radarSignal.count({ where: { status: "PUBLICADO", detectedAt: { gte: since24h } } }),
    prisma.radarSignal.count({ where: { status: "PUBLICADO", detectedAt: { gte: since7d } } }),
    prisma.radarSignal.count({
      where: { status: "PUBLICADO", occurredAt: { gte: since7d }, score: { gte: 70 } },
    }),
    prisma.radarSignal.groupBy({
      by: ["municipalityId"],
      where: { status: "PUBLICADO", occurredAt: { gte: since7d } },
      _count: { _all: true },
      _max: { score: true },
      orderBy: { _count: { municipalityId: "desc" } },
      take: 6,
    }),
    prisma.municipality.count(),
  ]);

  const municipalities = await prisma.municipality.findMany({
    where: { id: { in: topMunicipalities.map((row) => row.municipalityId) } },
    select: { id: true, name: true, slug: true },
  });
  const byId = new Map(municipalities.map((municipality) => [municipality.id, municipality]));

  return {
    last24h,
    last7d,
    highPriority,
    monitoredMunicipalities: totalMunicipalities,
    activeMunicipalities: topMunicipalities
      .map((row) => ({
        municipality: byId.get(row.municipalityId)!,
        count: row._count._all,
        maxScore: row._max.score ?? 0,
      }))
      .filter((row) => row.municipality),
  };
});

/**
 * "Agora": movimentos recentes ordenados por uma mistura de recência e score.
 * Deliberadamente não é um feed cronológico puro — relevância pesa mais.
 */
export async function getNowFeed(limit = 12) {
  const signals = await prisma.radarSignal.findMany({
    where: { status: "PUBLICADO", occurredAt: { gte: new Date(Date.now() - 14 * 86_400_000) } },
    orderBy: [{ occurredAt: "desc" }],
    take: limit * 4,
    select: signalSelect,
  });

  const now = Date.now();
  return signals
    .map((signal) => {
      const hours = (now - signal.occurredAt.getTime()) / 3_600_000;
      // Meia-vida de 36 h combinada ao score: o que é grande sobrevive mais tempo.
      const recency = Math.exp(-hours / 52);
      return { ...signal, amountBRL: toNumber(signal.investment?.amountBRL), rank: signal.score * 0.6 + recency * 100 * 0.4 };
    })
    .sort((a, b) => b.rank - a.rank)
    .slice(0, limit);
}

/** Sinais em municípios vizinhos — usado na análise de transbordamento. */
export async function getNeighborSignals(municipalityId: string, limit = 8) {
  const neighbors = await prisma.municipalityNeighbor.findMany({
    where: { fromId: municipalityId },
    select: { toId: true },
  });
  if (!neighbors.length) return [];
  return prisma.radarSignal.findMany({
    where: {
      status: "PUBLICADO",
      municipalityId: { in: neighbors.map((neighbor) => neighbor.toId) },
      occurredAt: { gte: new Date(Date.now() - 90 * 86_400_000) },
    },
    orderBy: [{ score: "desc" }],
    take: limit,
    select: signalSelect,
  });
}

// Os rótulos de exibição ficam em `@/lib/labels` para que componentes de
// cliente possam usá-los sem arrastar o Prisma para o navegador.
export { CATEGORY_LABEL } from "@/lib/labels";
