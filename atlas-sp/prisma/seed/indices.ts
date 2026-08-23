import type { PrismaClient, TrendDirection } from "@prisma/client";

/**
 * Índices proprietários do Atlas SP.
 *
 * São construções da plataforma, calculadas a partir dos dados disponíveis.
 * Cada índice carrega metodologia, componentes e um disclaimer obrigatório:
 * não são indicadores oficiais e não devem ser lidos como tal.
 */
import { INDICES, INDEX_DISCLAIMER } from "../../src/lib/indices";

export async function seedIndices(prisma: PrismaClient) {
  for (const index of INDICES) {
    const record = await prisma.proprietaryIndex.upsert({
      where: { slug: index.slug },
      update: {
        name: index.name,
        description: index.description,
        methodology: index.methodology,
        disclaimer: INDEX_DISCLAIMER,
      },
      create: {
        slug: index.slug,
        name: index.name,
        description: index.description,
        methodology: index.methodology,
        disclaimer: INDEX_DISCLAIMER,
      },
    });
    await prisma.indexComponent.deleteMany({ where: { indexId: record.id } });
    await prisma.indexComponent.createMany({
      data: index.components.map((component) => ({
        indexId: record.id,
        signalKey: component.signalKey,
        label: component.label,
        weight: component.weight,
      })),
    });
  }
  return prisma.proprietaryIndex.count();
}

/** Normaliza um vetor de valores para 0..100 por posição relativa (rank percentil). */
function percentileNormalize(values: Map<string, number>): Map<string, number> {
  const sorted = [...values.entries()].sort((a, b) => a[1] - b[1]);
  const result = new Map<string, number>();
  const total = sorted.length || 1;
  sorted.forEach(([key], index) => {
    result.set(key, (index / Math.max(1, total - 1)) * 100);
  });
  return result;
}

function trendFor(value: number): TrendDirection {
  if (value >= 80) return "FORTE_ALTA";
  if (value >= 62) return "ALTA";
  if (value >= 38) return "ESTAVEL";
  if (value >= 20) return "QUEDA";
  return "FORTE_QUEDA";
}

/**
 * Calcula os índices para todos os municípios a partir do que já está no banco.
 * Roda no seed e também como job de pipeline — a fonte é sempre o banco, nunca
 * um valor gravado à mão.
 */
export async function computeIndexScores(prisma: PrismaClient) {
  const municipalities = await prisma.municipality.findMany({ select: { id: true } });
  const ids = municipalities.map((municipality) => municipality.id);
  const referenceLabel = new Date().toISOString().slice(0, 7);
  const since90 = new Date(Date.now() - 90 * 86_400_000);
  const since30 = new Date(Date.now() - 30 * 86_400_000);
  const since365 = new Date(Date.now() - 365 * 86_400_000);

  const [
    employmentStock,
    netJobs,
    gdpSeries,
    companySeries,
    radarEconomic,
    radarPolitical,
    investments,
    projects,
    news30,
    news365,
  ] = await Promise.all([
    prisma.dataPoint.findMany({
      where: { indicator: { slug: "emprego-formal" }, referenceLabel: "2024" },
      select: { municipalityId: true, normalizedValue: true },
    }),
    prisma.dataPoint.findMany({
      where: { indicator: { slug: "saldo-empregos" }, referenceStart: { gte: since365 } },
      select: { municipalityId: true, normalizedValue: true },
    }),
    prisma.dataPoint.findMany({
      where: { indicator: { slug: "pib" }, referenceLabel: { in: ["2023", "2024"] } },
      select: { municipalityId: true, normalizedValue: true, referenceLabel: true },
    }),
    prisma.dataPoint.findMany({
      where: { indicator: { slug: "empresas-ativas" }, referenceLabel: { in: ["2023", "2024"] } },
      select: { municipalityId: true, normalizedValue: true, referenceLabel: true },
    }),
    prisma.radarSignal.groupBy({
      by: ["municipalityId"],
      where: {
        occurredAt: { gte: since90 },
        category: { in: ["INVESTIMENTO", "EMPREGO", "INDUSTRIA", "COMERCIO", "SERVICOS", "AGRONEGOCIO", "TECNOLOGIA", "LOGISTICA", "PORTOS", "EMPRESAS"] },
      },
      _count: { _all: true },
      _avg: { score: true },
    }),
    prisma.radarSignal.groupBy({
      by: ["municipalityId"],
      where: {
        occurredAt: { gte: since90 },
        category: { in: ["POLITICA", "GOVERNO", "CAMARA", "REGULACAO", "FINANCAS_PUBLICAS", "ARRECADACAO", "JUSTICA"] },
      },
      _count: { _all: true },
    }),
    prisma.investment.groupBy({
      by: ["municipalityId"],
      where: { announcedAt: { gte: since365 } },
      _count: { _all: true },
      _sum: { amountBRL: true, jobsAnnounced: true },
    }),
    prisma.councilProject.groupBy({
      by: ["councilId"],
      where: { presentedAt: { gte: since365 } },
      _count: { _all: true },
    }),
    prisma.articleMunicipality.groupBy({
      by: ["municipalityId"],
      where: { article: { publishedAt: { gte: since30 } } },
      _count: { _all: true },
    }),
    prisma.articleMunicipality.groupBy({
      by: ["municipalityId"],
      where: { article: { publishedAt: { gte: since365 } } },
      _count: { _all: true },
    }),
  ]);

  const num = (value: unknown) => (value === null || value === undefined ? 0 : Number(value.toString()));

  const stockById = new Map(employmentStock.map((row) => [row.municipalityId!, num(row.normalizedValue)]));
  const netJobsById = new Map<string, number[]>();
  for (const row of netJobs) {
    const list = netJobsById.get(row.municipalityId!) ?? [];
    list.push(num(row.normalizedValue));
    netJobsById.set(row.municipalityId!, list);
  }
  const gdpById = new Map<string, { previous: number; current: number }>();
  for (const row of gdpSeries) {
    const entry = gdpById.get(row.municipalityId!) ?? { previous: 0, current: 0 };
    if (row.referenceLabel === "2023") entry.previous = num(row.normalizedValue);
    else entry.current = num(row.normalizedValue);
    gdpById.set(row.municipalityId!, entry);
  }
  const companiesById = new Map<string, { previous: number; current: number }>();
  for (const row of companySeries) {
    const entry = companiesById.get(row.municipalityId!) ?? { previous: 0, current: 0 };
    if (row.referenceLabel === "2023") entry.previous = num(row.normalizedValue);
    else entry.current = num(row.normalizedValue);
    companiesById.set(row.municipalityId!, entry);
  }
  const radarEconomicById = new Map(radarEconomic.map((row) => [row.municipalityId, row._count._all]));
  const radarPoliticalById = new Map(radarPolitical.map((row) => [row.municipalityId, row._count._all]));
  const investmentById = new Map(
    investments.map((row) => [
      row.municipalityId,
      { count: row._count._all, amount: num(row._sum.amountBRL), jobs: row._sum.jobsAnnounced ?? 0 },
    ]),
  );
  const projectsById = new Map(projects.map((row) => [row.councilId, row._count._all]));
  const news30ById = new Map(news30.map((row) => [row.municipalityId, row._count._all]));
  const news365ById = new Map(news365.map((row) => [row.municipalityId, row._count._all]));

  // ── Componentes brutos ────────────────────────────────────────
  const raw = {
    saldoRelativo: new Map<string, number>(),
    variacaoPib: new Map<string, number>(),
    aberturaEmpresas: new Map<string, number>(),
    radarEconomico: new Map<string, number>(),
    valorSobrePib: new Map<string, number>(),
    numeroAnuncios: new Map<string, number>(),
    empregosPrevistos: new Map<string, number>(),
    saldo12m: new Map<string, number>(),
    consistencia: new Map<string, number>(),
    radarPolitico: new Map<string, number>(),
    proposicoes: new Map<string, number>(),
    volume30d: new Map<string, number>(),
    diversidade: new Map<string, number>(),
  };

  for (const id of ids) {
    const stock = stockById.get(id) ?? 0;
    const monthly = netJobsById.get(id) ?? [];
    const saldo = monthly.reduce((sum, value) => sum + value, 0);
    const gdp = gdpById.get(id);
    const companies = companiesById.get(id);
    const investment = investmentById.get(id);
    const news30Count = news30ById.get(id) ?? 0;
    const news365Count = news365ById.get(id) ?? 0;

    raw.saldoRelativo.set(id, stock > 0 ? (saldo / stock) * 100 : 0);
    raw.variacaoPib.set(id, gdp && gdp.previous > 0 ? ((gdp.current - gdp.previous) / gdp.previous) * 100 : 0);
    raw.aberturaEmpresas.set(id, companies && companies.previous > 0 ? ((companies.current - companies.previous) / companies.previous) * 100 : 0);
    raw.radarEconomico.set(id, radarEconomicById.get(id) ?? 0);
    raw.valorSobrePib.set(id, investment && gdp?.current ? investment.amount / gdp.current : 0);
    raw.numeroAnuncios.set(id, investment?.count ?? 0);
    raw.empregosPrevistos.set(id, investment?.jobs ?? 0);
    raw.saldo12m.set(id, stock > 0 ? (saldo / stock) * 100 : 0);
    raw.consistencia.set(id, monthly.length ? monthly.filter((value) => value > 0).length / monthly.length : 0);
    raw.radarPolitico.set(id, radarPoliticalById.get(id) ?? 0);
    raw.proposicoes.set(id, projectsById.get(id) ?? 0);
    // Volume recente comparado à média mensal do próprio município.
    raw.volume30d.set(id, news365Count > 0 ? news30Count / (news365Count / 12) : 0);
    raw.diversidade.set(id, news30Count);
  }

  const normalized = Object.fromEntries(
    Object.entries(raw).map(([key, values]) => [key, percentileNormalize(values)]),
  ) as Record<keyof typeof raw, Map<string, number>>;

  const definitions: Array<{
    slug: string;
    parts: Array<{ key: keyof typeof raw; label: string; weight: number }>;
  }> = [
    {
      slug: "economic-momentum",
      parts: [
        { key: "saldoRelativo", label: "Saldo de empregos relativo ao estoque", weight: 0.35 },
        { key: "variacaoPib", label: "Variação do PIB", weight: 0.25 },
        { key: "aberturaEmpresas", label: "Abertura líquida de empresas", weight: 0.2 },
        { key: "radarEconomico", label: "Densidade de sinais econômicos no Radar", weight: 0.2 },
      ],
    },
    {
      slug: "investment-momentum",
      parts: [
        { key: "valorSobrePib", label: "Valor anunciado sobre o PIB", weight: 0.55 },
        { key: "numeroAnuncios", label: "Número de anúncios", weight: 0.25 },
        { key: "empregosPrevistos", label: "Empregos previstos", weight: 0.2 },
      ],
    },
    {
      slug: "employment-momentum",
      parts: [
        { key: "saldo12m", label: "Saldo acumulado em 12 meses", weight: 0.6 },
        { key: "consistencia", label: "Consistência mensal do saldo", weight: 0.4 },
      ],
    },
    {
      slug: "political-activity",
      parts: [
        { key: "radarPolitico", label: "Sinais políticos no Radar", weight: 0.6 },
        { key: "proposicoes", label: "Proposições legislativas no período", weight: 0.4 },
      ],
    },
    {
      slug: "news-momentum",
      parts: [
        { key: "volume30d", label: "Volume de matérias em 30 dias frente à média", weight: 0.7 },
        { key: "diversidade", label: "Diversidade de fontes", weight: 0.3 },
      ],
    },
  ];

  let written = 0;
  for (const definition of definitions) {
    const index = await prisma.proprietaryIndex.findUnique({ where: { slug: definition.slug } });
    if (!index) continue;

    const scores = ids.map((id) => {
      const breakdown = definition.parts.map((part) => ({
        key: part.key,
        label: part.label,
        weight: part.weight,
        value: Number((normalized[part.key].get(id) ?? 0).toFixed(2)),
        rawValue: Number((raw[part.key].get(id) ?? 0).toFixed(4)),
      }));
      const value = breakdown.reduce((sum, part) => sum + part.value * part.weight, 0);
      return { municipalityId: id, value: Number(value.toFixed(2)), breakdown };
    });

    scores.sort((a, b) => b.value - a.value);
    const rows = scores.map((score, position) => ({
      indexId: index.id,
      municipalityId: score.municipalityId,
      value: score.value,
      rank: position + 1,
      trend: trendFor(score.value),
      breakdown: score.breakdown as never,
      referenceLabel,
    }));

    await prisma.indexScore.deleteMany({ where: { indexId: index.id, referenceLabel } });
    for (let i = 0; i < rows.length; i += 2000) {
      await prisma.indexScore.createMany({ data: rows.slice(i, i + 2000), skipDuplicates: true });
    }
    written += rows.length;
  }
  return written;
}
