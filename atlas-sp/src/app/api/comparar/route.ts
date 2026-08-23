import { NextResponse } from "next/server";
import { prisma, toNumber } from "@/server/db/prisma";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";
import { getCurrentUser, planLimit } from "@/server/auth/session";

/** Payload consumido pelo comparador. Tipado aqui e reusado no cliente. */
export type ComparePayload = {
  municipalities: Array<{ id: string; slug: string; name: string; mesoName: string | null }>;
  indicators: Array<{
    slug: string;
    name: string;
    shortName: string;
    unit: string;
    precision: number;
    higherIsBetter: boolean | null;
    referenceLabel: string | null;
    values: Record<string, number | null>;
  }>;
  series: Array<{
    slug: string;
    name: string;
    unit: string;
    precision: number;
    points: Array<Record<string, string | number>>;
  }>;
  sectors: Record<string, Array<{ slug: string; name: string; sharePct: number }>>;
  radar: Record<string, number>;
  isDemo: boolean;
};

const COMPARED_INDICATORS = [
  "populacao", "pib", "pib-per-capita", "emprego-formal", "salario-medio",
  "empresas-ativas", "receita-municipal", "despesa-municipal", "investimento-publico",
  "densidade-demografica", "area-territorial", "vab-industria", "vab-servicos", "vab-agropecuaria",
];

const CHARTED = ["pib", "emprego-formal"];

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, "comparar"), LIMITS.api);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const slugs = (searchParams.get("cidades") ?? "")
    .split(",")
    .map((slug) => slug.trim())
    .filter(Boolean);

  if (!slugs.length) {
    return NextResponse.json({ error: "Informe ao menos um município." }, { status: 400 });
  }

  // O número de slots comparáveis é um limite de plano.
  const user = await getCurrentUser();
  const slots = planLimit(user, "comparisonSlots", 2);
  const allowed = slugs.slice(0, slots === -1 ? 4 : Math.min(slots, 4));

  const municipalities = await prisma.municipality.findMany({
    where: { slug: { in: allowed } },
    select: { id: true, slug: true, name: true, mesoName: true },
  });
  // Preserva a ordem pedida pelo usuário.
  const ordered = allowed
    .map((slug) => municipalities.find((municipality) => municipality.slug === slug))
    .filter(Boolean) as typeof municipalities;

  if (!ordered.length) {
    return NextResponse.json({ error: "Nenhum município encontrado." }, { status: 404 });
  }

  const ids = ordered.map((municipality) => municipality.id);
  const bySlug = new Map(ordered.map((municipality) => [municipality.id, municipality.slug]));

  const [indicators, points, sectorRows, radarRows] = await Promise.all([
    prisma.indicator.findMany({
      where: { slug: { in: COMPARED_INDICATORS } },
      orderBy: { displayOrder: "asc" },
    }),
    prisma.dataPoint.findMany({
      where: { municipalityId: { in: ids }, indicator: { slug: { in: COMPARED_INDICATORS } } },
      orderBy: { referenceStart: "asc" },
      select: {
        municipalityId: true, normalizedValue: true, referenceLabel: true, isDemo: true,
        indicator: { select: { slug: true } },
      },
    }),
    prisma.municipalitySector.findMany({
      where: { municipalityId: { in: ids } },
      orderBy: { sharePct: "desc" },
      select: {
        municipalityId: true, sharePct: true,
        sector: { select: { slug: true, name: true } },
      },
    }),
    prisma.radarSignal.groupBy({
      by: ["municipalityId"],
      where: { municipalityId: { in: ids }, occurredAt: { gte: new Date(Date.now() - 90 * 86_400_000) } },
      _count: { _all: true },
    }),
  ]);

  // Índice: indicador → município → série ordenada
  const index = new Map<string, Map<string, Array<{ label: string; value: number }>>>();
  let isDemo = false;
  for (const point of points) {
    if (!point.indicator || !point.municipalityId) continue;
    if (point.isDemo) isDemo = true;
    const perIndicator = index.get(point.indicator.slug) ?? new Map();
    const list = perIndicator.get(point.municipalityId) ?? [];
    list.push({ label: point.referenceLabel, value: toNumber(point.normalizedValue) ?? 0 });
    perIndicator.set(point.municipalityId, list);
    index.set(point.indicator.slug, perIndicator);
  }

  const payload: ComparePayload = {
    municipalities: ordered,
    indicators: indicators.map((indicator) => {
      const perIndicator = index.get(indicator.slug);
      const values: Record<string, number | null> = {};
      let referenceLabel: string | null = null;
      for (const municipality of ordered) {
        const series = perIndicator?.get(municipality.id);
        const latest = series?.[series.length - 1];
        values[municipality.slug] = latest?.value ?? null;
        if (latest && !referenceLabel) referenceLabel = latest.label;
      }
      return {
        slug: indicator.slug,
        name: indicator.name,
        shortName: indicator.shortName,
        unit: indicator.unit,
        precision: indicator.precision,
        higherIsBetter: indicator.higherIsBetter,
        referenceLabel,
        values,
      };
    }),
    series: CHARTED.map((slug) => {
      const indicator = indicators.find((entry) => entry.slug === slug);
      const perIndicator = index.get(slug);
      if (!indicator || !perIndicator) return null;

      // Une os rótulos de período de todos os municípios comparados.
      const labels = [
        ...new Set(
          [...perIndicator.values()].flatMap((series) =>
            series.filter((point) => /^\d{4}$/.test(point.label)).map((point) => point.label),
          ),
        ),
      ].sort();

      return {
        slug,
        name: indicator.name,
        unit: indicator.unit,
        precision: indicator.precision,
        points: labels.map((label) => {
          const row: Record<string, string | number> = { label };
          for (const municipality of ordered) {
            const value = perIndicator.get(municipality.id)?.find((point) => point.label === label);
            if (value) row[municipality.slug] = value.value;
          }
          return row;
        }),
      };
    }).filter(Boolean) as ComparePayload["series"],
    sectors: Object.fromEntries(
      ordered.map((municipality) => [
        municipality.slug,
        sectorRows
          .filter((row) => row.municipalityId === municipality.id)
          .map((row) => ({
            slug: row.sector.slug,
            name: row.sector.name,
            sharePct: toNumber(row.sharePct) ?? 0,
          })),
      ]),
    ),
    radar: Object.fromEntries(
      ordered.map((municipality) => [
        municipality.slug,
        radarRows.find((row) => row.municipalityId === municipality.id)?._count._all ?? 0,
      ]),
    ),
    isDemo,
  };

  return NextResponse.json(payload, { headers: { "cache-control": "private, max-age=60" } });
}
