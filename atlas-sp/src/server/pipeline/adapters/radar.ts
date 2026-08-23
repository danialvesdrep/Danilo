import "server-only";
import type { Job, JobResult } from "../types";
import { emptyResult } from "../types";
import { prisma, toNumber } from "@/server/db/prisma";
import { scoreSignal } from "@/server/radar/scoring";
import { slugify } from "@/lib/slug";

/**
 * Recalcula os scores do Radar a partir dos sinais publicados. Roda toda hora
 * para que a decadência de urgência acompanhe o tempo real, sem depender de
 * ingestão externa.
 */
export const scoreRefreshJob: Job = {
  key: "radar-recomputar-scores",
  name: "Recalcular scores do Radar",
  description:
    "Reaplica a fórmula de pontuação sobre os sinais publicados nos últimos 90 dias — mantém a urgência coerente com o relógio.",
  cadence: "HORARIA",
  requiresNetwork: false,

  async run(context): Promise<JobResult> {
    const result = emptyResult();
    const since = new Date(context.now.getTime() - 90 * 86_400_000);
    const signals = await prisma.radarSignal.findMany({
      where: { status: "PUBLICADO", occurredAt: { gte: since } },
      include: {
        municipality: {
          select: {
            id: true, name: true, ibgeCode: true,
            _count: { select: { neighborsFrom: true } },
          },
        },
        _count: { select: { sources: true } },
      },
    });

    // Populações e PIB mais recentes por município — dependências do score.
    const municipalityIds = [...new Set(signals.map((signal) => signal.municipalityId))];
    const points = await prisma.dataPoint.findMany({
      where: {
        municipalityId: { in: municipalityIds },
        indicator: { slug: { in: ["populacao", "pib"] } },
      },
      orderBy: { referenceStart: "desc" },
      select: {
        municipalityId: true, normalizedValue: true,
        indicator: { select: { slug: true } },
      },
    });
    const latest = new Map<string, { population?: number; gdp?: number }>();
    for (const point of points) {
      if (!point.indicator || !point.municipalityId) continue;
      const entry = latest.get(point.municipalityId) ?? {};
      const key = point.indicator.slug === "populacao" ? "population" : "gdp";
      if (entry[key] === undefined) entry[key] = toNumber(point.normalizedValue) ?? undefined;
      latest.set(point.municipalityId, entry);
    }

    const sectorShares = await prisma.municipalitySector.findMany({
      where: { municipalityId: { in: municipalityIds } },
      select: { municipalityId: true, sectorId: true, sharePct: true },
    });
    const shareByMunicipalitySector = new Map<string, number>();
    for (const row of sectorShares) {
      shareByMunicipalitySector.set(
        `${row.municipalityId}:${row.sectorId}`,
        toNumber(row.sharePct) ?? 0,
      );
    }

    for (const signal of signals) {
      result.itemsRead += 1;
      const daysAgo = Math.floor(
        (context.now.getTime() - signal.occurredAt.getTime()) / 86_400_000,
      );
      const info = latest.get(signal.municipalityId) ?? {};
      const share = signal.sectorId
        ? shareByMunicipalitySector.get(`${signal.municipalityId}:${signal.sectorId}`) ?? 0
        : 5;

      const scored = scoreSignal({
        category: signal.category,
        population: info.population ?? 20_000,
        gdp: info.gdp ?? 5e9,
        amountBRL: null,
        jobs: null,
        sourceCount: signal._count.sources,
        daysAgo,
        sectorShare: share,
        momentum: 0,
      });

      // Score dos investimentos usa o valor anunciado, quando existe.
      if (signal.investmentId) {
        const investment = await prisma.investment.findUnique({
          where: { id: signal.investmentId },
          select: { amountBRL: true, jobsAnnounced: true },
        });
        if (investment) {
          const withInvestment = scoreSignal({
            category: signal.category,
            population: info.population ?? 20_000,
            gdp: info.gdp ?? 5e9,
            amountBRL: toNumber(investment.amountBRL),
            jobs: investment.jobsAnnounced,
            sourceCount: signal._count.sources,
            daysAgo,
            sectorShare: share,
            momentum: 0,
          });
          Object.assign(scored, withInvestment);
        }
      }

      await prisma.radarSignal.update({
        where: { id: signal.id },
        data: {
          importance: scored.importance,
          urgency: scored.urgency,
          economicImpact: scored.economicImpact,
          politicalImpact: scored.politicalImpact,
          regionalImpact: scored.regionalImpact,
          score: scored.score,
          scoreRationale: scored.scoreRationale as never,
        },
      });
      result.itemsWritten += 1;
    }
    return result;
  },
};

/**
 * Dispara os alertas: para cada aviso ainda não entregue, gera uma AlertDelivery.
 * O envio externo (push, e-mail, webhook) é responsabilidade do canal — este
 * job apenas materializa o aviso.
 */
export const alertsDispatchJob: Job = {
  key: "alertas-disparar",
  name: "Disparar alertas",
  description: "Materializa avisos para os alertas ativos a partir dos sinais publicados.",
  cadence: "HORARIA",
  requiresNetwork: false,

  async run(context): Promise<JobResult> {
    const result = emptyResult();
    const alerts = await prisma.alert.findMany({ where: { active: true } });
    for (const alert of alerts) {
      const window = new Date(
        (alert.lastTriggeredAt ?? new Date(context.now.getTime() - 24 * 3_600_000)).getTime() - 60_000,
      );
      const signals = await prisma.radarSignal.findMany({
        where: {
          status: "PUBLICADO",
          score: { gte: alert.minScore },
          occurredAt: { gte: window },
          ...(alert.municipalityId ? { municipalityId: alert.municipalityId } : {}),
          ...(alert.categories.length ? { category: { in: alert.categories as never[] } } : {}),
          ...(alert.keyword
            ? {
                OR: [
                  { headline: { contains: alert.keyword, mode: "insensitive" } },
                  { description: { contains: alert.keyword, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: {
          id: true, slug: true, headline: true, description: true, score: true,
          municipality: { select: { name: true } },
        },
        take: 20,
      });

      if (!signals.length) continue;
      result.itemsRead += signals.length;

      await prisma.alertDelivery.createMany({
        data: signals.map((signal) => ({
          alertId: alert.id,
          signalId: signal.id,
          title: `Novo movimento em ${signal.municipality.name}`,
          body: `${signal.headline} · score ${signal.score}/100`,
          url: `/radar/${signal.slug}`,
        })),
      });
      await prisma.alert.update({ where: { id: alert.id }, data: { lastTriggeredAt: context.now } });
      result.itemsWritten += signals.length;
    }
    return result;
  },
};
