import "server-only";
import { cache } from "react";
import { prisma } from "@/server/db/prisma";
import { toNumber } from "@/server/db/prisma";
import type { Provenance } from "@/components/data/provenance";

/**
 * Camada de consulta do município. Toda tela lê daqui — nenhuma página monta
 * query própria. Cada valor devolvido vem acompanhado de sua proveniência.
 */

export type IndicatorValue = {
  slug: string;
  name: string;
  shortName: string;
  category: string;
  unit: string;
  precision: number;
  value: number | null;
  previousValue: number | null;
  deltaPct: number | null;
  referenceLabel: string | null;
  municipalLevel: boolean;
  description: string;
  methodology: string;
  isDemo: boolean;
  provenance: Provenance | null;
  history: Array<{ label: string; value: number }>;
};

export type MunicipalityDetail = NonNullable<Awaited<ReturnType<typeof getMunicipality>>>;

export const getMunicipality = cache(async (slug: string) => {
  const municipality = await prisma.municipality.findUnique({
    where: { slug },
    select: {
      id: true, ibgeCode: true, name: true, slug: true, uf: true, latitude: true,
      longitude: true, areaKm2: true, ddd: true, isCapital: true, bbox: true,
      mesoName: true, mesoCode: true, microName: true, microCode: true, overview: true,
      websiteUrl: true, updatedAt: true,
      regionMemberships: {
        select: { region: { select: { id: true, name: true, slug: true, kind: true, summary: true } } },
      },
      government: {
        select: {
          websiteUrl: true, transparencyUrl: true, officialGazetteUrl: true,
          departments: {
            select: { id: true, name: true, area: true, headName: true, websiteUrl: true, isDemo: true },
            orderBy: { name: "asc" },
          },
        },
      },
      council: {
        select: { seats: true, legislature: true, websiteUrl: true },
      },
      _count: { select: { companies: true, radarSignals: true, investments: true, neighborsFrom: true } },
    },
  });
  return municipality;
});

/** Indicadores mais recentes do município, com variação e histórico. */
export const getIndicators = cache(async (municipalityId: string): Promise<IndicatorValue[]> => {
  const [indicators, points] = await Promise.all([
    prisma.indicator.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
    prisma.dataPoint.findMany({
      where: { municipalityId },
      orderBy: { referenceStart: "asc" },
      select: {
        normalizedValue: true, referenceLabel: true, referenceStart: true, publishedAt: true,
        retrievedAt: true, methodology: true, confidence: true, isDemo: true, sourceUrl: true,
        indicator: { select: { slug: true } },
        source: { select: { name: true, organization: true, tier: true, url: true } },
      },
    }),
  ]);

  const bySlug = new Map<string, typeof points>();
  for (const point of points) {
    if (!point.indicator) continue;
    const list = bySlug.get(point.indicator.slug) ?? [];
    list.push(point);
    bySlug.set(point.indicator.slug, list);
  }

  return indicators.map((indicator) => {
    const series = bySlug.get(indicator.slug) ?? [];
    const latest = series[series.length - 1];
    const previous = series[series.length - 2];
    const value = latest ? toNumber(latest.normalizedValue) : null;
    const previousValue = previous ? toNumber(previous.normalizedValue) : null;

    return {
      slug: indicator.slug,
      name: indicator.name,
      shortName: indicator.shortName,
      category: indicator.category,
      unit: indicator.unit,
      precision: indicator.precision,
      value,
      previousValue,
      deltaPct:
        value !== null && previousValue !== null && previousValue !== 0
          ? ((value - previousValue) / Math.abs(previousValue)) * 100
          : null,
      referenceLabel: latest?.referenceLabel ?? null,
      municipalLevel: indicator.municipalLevel,
      description: indicator.description,
      methodology: indicator.methodology,
      isDemo: latest?.isDemo ?? false,
      provenance: latest
        ? {
            sourceName: latest.source.name,
            organization: latest.source.organization,
            tier: latest.source.tier,
            url: latest.source.url,
            sourceUrl: latest.sourceUrl,
            referenceLabel: latest.referenceLabel,
            publishedAt: latest.publishedAt,
            retrievedAt: latest.retrievedAt,
            methodology: latest.methodology ?? indicator.methodology,
            confidence: toNumber(latest.confidence),
            isDemo: latest.isDemo,
          }
        : null,
      history: series
        .filter((point) => /^\d{4}$/.test(point.referenceLabel))
        .map((point) => ({ label: point.referenceLabel, value: toNumber(point.normalizedValue) ?? 0 })),
    };
  });
});

export const getIndicatorMap = cache(async (municipalityId: string) => {
  const list = await getIndicators(municipalityId);
  return new Map(list.map((indicator) => [indicator.slug, indicator]));
});

/** DNA econômico: composição setorial do município. */
export const getSectorProfile = cache(async (municipalityId: string) => {
  const rows = await prisma.municipalitySector.findMany({
    where: { municipalityId },
    orderBy: { sharePct: "desc" },
    select: {
      sharePct: true, employmentPct: true, trend: true, relevance: true, rationale: true,
      referenceLabel: true, isDemo: true,
      sector: { select: { id: true, slug: true, name: true, macroSector: true, color: true, description: true } },
    },
  });
  return rows.map((row) => ({
    sector: row.sector,
    sharePct: toNumber(row.sharePct) ?? 0,
    employmentPct: toNumber(row.employmentPct),
    trend: row.trend,
    relevance: toNumber(row.relevance) ?? 0,
    rationale: row.rationale,
    referenceLabel: row.referenceLabel,
    isDemo: row.isDemo,
  }));
});

/** Composição por macrossetor, derivada do valor adicionado bruto. */
export const getMacroComposition = cache(async (municipalityId: string) => {
  const indicators = await getIndicatorMap(municipalityId);
  const parts = [
    { key: "servicos", label: "Serviços", slug: "vab-servicos", color: "#2f6b82" },
    { key: "industria", label: "Indústria", slug: "vab-industria", color: "#b3701f" },
    { key: "publico", label: "Administração pública", slug: "vab-administracao", color: "#8a8f9e" },
    { key: "agro", label: "Agropecuária", slug: "vab-agropecuaria", color: "#6f9e4b" },
  ];
  const values = parts.map((part) => ({
    ...part,
    value: indicators.get(part.slug)?.value ?? null,
    isDemo: indicators.get(part.slug)?.isDemo ?? false,
    referenceLabel: indicators.get(part.slug)?.referenceLabel ?? null,
    provenance: indicators.get(part.slug)?.provenance ?? null,
  }));
  const total = values.reduce((sum, part) => sum + (part.value ?? 0), 0);
  if (total <= 0) return { available: false as const, parts: [] };
  return {
    available: true as const,
    total,
    isDemo: values.some((part) => part.isDemo),
    referenceLabel: values.find((part) => part.referenceLabel)?.referenceLabel ?? null,
    provenance: values.find((part) => part.provenance)?.provenance ?? null,
    parts: values
      .map((part) => ({ ...part, sharePct: ((part.value ?? 0) / total) * 100 }))
      .sort((a, b) => b.sharePct - a.sharePct),
  };
});

export const getNeighbors = cache(async (municipalityId: string) => {
  const rows = await prisma.municipalityNeighbor.findMany({
    where: { fromId: municipalityId },
    orderBy: { borderKm: "desc" },
    select: {
      borderKm: true, centroidKm: true,
      to: {
        select: {
          id: true, name: true, slug: true, mesoName: true, areaKm2: true,
          _count: { select: { radarSignals: true } },
        },
      },
    },
  });
  return rows.map((row) => ({
    municipality: row.to,
    borderKm: row.borderKm,
    centroidKm: row.centroidKm,
  }));
});

export const getGovernment = cache(async (municipalityId: string) => {
  const [mandates, councilMembers] = await Promise.all([
    prisma.mandate.findMany({
      where: { municipalityId, isCurrent: true },
      orderBy: { office: "asc" },
      select: {
        office: true, officeLabel: true, startDate: true, endDate: true, sourceUrl: true, isDemo: true,
        person: {
          select: {
            id: true, name: true, slug: true, photoUrl: true, biography: true, isDemo: true,
            social: { select: { platform: true, url: true, handle: true } },
          },
        },
        party: { select: { acronym: true, name: true, color: true } },
      },
    }),
    prisma.councilMember.findMany({
      where: { councilId: municipalityId, isCurrent: true },
      select: {
        role: true, committees: true, isDemo: true,
        person: { select: { id: true, name: true, slug: true, isDemo: true } },
        party: { select: { acronym: true, name: true, color: true } },
      },
    }),
  ]);

  const byParty = new Map<string, { acronym: string; name: string; color: string | null; seats: number }>();
  for (const member of councilMembers) {
    if (!member.party) continue;
    const entry = byParty.get(member.party.acronym) ?? { ...member.party, seats: 0 };
    entry.seats += 1;
    byParty.set(member.party.acronym, entry);
  }

  return {
    mayor: mandates.find((mandate) => mandate.office === "PREFEITO") ?? null,
    viceMayor: mandates.find((mandate) => mandate.office === "VICE_PREFEITO") ?? null,
    councilMembers: councilMembers.sort((a, b) => {
      if (a.role && !b.role) return -1;
      if (!a.role && b.role) return 1;
      return a.person.name.localeCompare(b.person.name, "pt-BR");
    }),
    partyComposition: [...byParty.values()].sort((a, b) => b.seats - a.seats),
  };
});

export const getCouncilProjects = cache(async (municipalityId: string, limit = 20) =>
  prisma.councilProject.findMany({
    where: { councilId: municipalityId },
    orderBy: { presentedAt: "desc" },
    take: limit,
    select: {
      id: true, code: true, title: true, summary: true, theme: true, status: true,
      presentedAt: true, decidedAt: true, sourceUrl: true, isDemo: true,
    },
  }),
);

/** Índices proprietários calculados para o município. */
export const getIndexScores = cache(async (municipalityId: string) => {
  const scores = await prisma.indexScore.findMany({
    where: { municipalityId },
    orderBy: { computedAt: "desc" },
    select: {
      value: true, rank: true, trend: true, breakdown: true, referenceLabel: true, computedAt: true,
      index: { select: { slug: true, name: true, description: true, methodology: true, disclaimer: true } },
    },
  });
  const seen = new Set<string>();
  return scores
    .filter((score) => {
      if (seen.has(score.index.slug)) return false;
      seen.add(score.index.slug);
      return true;
    })
    .map((score) => ({
      ...score.index,
      value: toNumber(score.value) ?? 0,
      rank: score.rank,
      trend: score.trend,
      breakdown: score.breakdown as Array<{ label: string; weight: number; value: number; rawValue: number }>,
      referenceLabel: score.referenceLabel,
      computedAt: score.computedAt,
    }));
});

export const getTimeline = cache(async (municipalityId: string, limit = 60) =>
  prisma.timelineEvent.findMany({
    where: { municipalityId },
    orderBy: { occurredAt: "desc" },
    take: limit,
    select: {
      id: true, kind: true, title: true, description: true, occurredAt: true,
      sourceUrl: true, importance: true, isDemo: true,
      signal: { select: { slug: true, score: true, category: true } },
    },
  }),
);

export const getMunicipalityCompanies = cache(async (municipalityId: string, limit = 24) =>
  prisma.company.findMany({
    where: { municipalityId },
    orderBy: { name: "asc" },
    take: limit,
    select: {
      id: true, name: true, slug: true, description: true, employeeBand: true,
      foundedYear: true, websiteUrl: true, isDemo: true,
      sector: { select: { name: true, slug: true, color: true } },
      _count: { select: { investments: true, articles: true } },
    },
  }),
);

export const getMunicipalityInvestments = cache(async (municipalityId: string, limit = 20) =>
  prisma.investment.findMany({
    where: { municipalityId },
    orderBy: { announcedAt: "desc" },
    take: limit,
    select: {
      id: true, slug: true, title: true, amountBRL: true, jobsAnnounced: true, status: true,
      announcedAt: true, expectedAt: true, description: true, sourceUrl: true, isDemo: true,
      company: { select: { name: true, slug: true } },
      sector: { select: { name: true, slug: true, color: true } },
    },
  }),
);

export const getMunicipalityNews = cache(async (municipalityId: string, limit = 24) => {
  const rows = await prisma.articleMunicipality.findMany({
    where: { municipalityId },
    orderBy: { article: { publishedAt: "desc" } },
    take: limit,
    select: {
      confidence: true,
      article: {
        select: {
          id: true, slug: true, title: true, summary: true, url: true, category: true,
          publishedAt: true, importance: true, isDemo: true,
          source: { select: { name: true, homepage: true, tier: true } },
          sectors: { select: { sector: { select: { name: true, slug: true, color: true } } } },
        },
      },
    },
  });
  return rows.map((row) => ({ ...row.article, confidence: toNumber(row.confidence) ?? 1 }));
});

export const getDocuments = cache(async (municipalityId: string, limit = 20) =>
  prisma.document.findMany({
    where: { municipalityId },
    orderBy: { publishedAt: "desc" },
    take: limit,
    select: {
      id: true, slug: true, title: true, kind: true, url: true, publishedAt: true,
      summary: true, isDemo: true, source: { select: { name: true, organization: true } },
    },
  }),
);
