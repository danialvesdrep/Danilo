import type { PrismaClient, TrendDirection } from "@prisma/client";
import { createRng } from "./rng";
import { normalizeKey } from "../../src/lib/slug";

/**
 * Camada econômica de DEMONSTRAÇÃO.
 *
 * Não existe hoje, no ambiente de execução, acesso às APIs do IBGE, SEADE,
 * CAGED e Tesouro (bloqueio de rede de saída). Enquanto essas ingestões não
 * estiverem ligadas, o produto precisa de uma camada navegável — e ela é
 * gerada aqui, de forma determinística, gravada com `isDemo: true` e exibida
 * sempre sob o rótulo DEMONSTRAÇÃO.
 *
 * Calibração: a ordem de grandeza das maiores cidades é usada apenas para que
 * a navegação faça sentido (o mapa e os rankings ficariam ilegíveis com portes
 * sorteados). Nenhum número corresponde ao valor real, e nenhum deles deve ser
 * citado, exportado ou usado como evidência.
 */

/** Faixas de porte usadas apenas para calibrar a demonstração. */
const TIER_POPULATION: Record<string, [number, number]> = {
  metropole: [11_000_000, 12_500_000],
  grande: [700_000, 1_400_000],
  media_alta: [280_000, 700_000],
  media: [120_000, 280_000],
  pequena_alta: [45_000, 120_000],
  pequena: [12_000, 45_000],
  muito_pequena: [1_800, 12_000],
};

const TIER_BY_NAME: Record<string, keyof typeof TIER_POPULATION> = {};
const assign = (tier: keyof typeof TIER_POPULATION, names: string[]) => {
  for (const name of names) TIER_BY_NAME[normalizeKey(name)] = tier;
};

assign("metropole", ["São Paulo"]);
assign("grande", [
  "Guarulhos", "Campinas", "São Bernardo do Campo", "Santo André", "Osasco",
  "São José dos Campos", "Ribeirão Preto", "Sorocaba", "Santos", "Mauá",
]);
assign("media_alta", [
  "São José do Rio Preto", "Mogi das Cruzes", "Diadema", "Jundiaí", "Piracicaba",
  "Carapicuíba", "Bauru", "Itaquaquecetuba", "São Vicente", "Franca",
  "Praia Grande", "Guarujá", "Taubaté", "Limeira", "Suzano", "Taboão da Serra",
  "Sumaré", "Barueri", "Embu das Artes", "São Carlos", "Marília", "Indaiatuba",
  "Cotia", "Americana", "Jacareí", "Araraquara", "Presidente Prudente",
  "Hortolândia", "Rio Claro", "Itapevi", "Ferraz de Vasconcelos", "Santa Bárbara d'Oeste",
  "Bragança Paulista", "Itapecerica da Serra", "Pindamonhangaba", "São Caetano do Sul",
  "Araçatuba", "Itu", "Franco da Rocha", "Mogi Guaçu", "Atibaia", "Jaú",
  "Botucatu", "Santana de Parnaíba", "Valinhos", "Sertãozinho", "Catanduva",
  "Ribeirão Pires", "Salto", "Poá", "Ourinhos", "Votorantim", "Paulínia", "Cubatão",
]);

type MunicipalityInput = {
  id: string;
  name: string;
  ibgeCode: string;
  areaKm2: number | null;
  mesoName: string | null;
  isCapital: boolean;
  neighborCount: number;
  metroSlugs: string[];
};

/** Arquétipos de vocação econômica: definem a composição do valor adicionado. */
type Archetype = {
  key: string;
  label: string;
  /** Peso por setor (slug) — normalizado na geração. */
  mix: Record<string, number>;
  /** Participação-alvo dos macrossetores no valor adicionado. */
  macro: { industria: number; servicos: number; comercio: number; agro: number; publico: number };
};

const ARCHETYPES: Archetype[] = [
  {
    key: "metropolitano-servicos",
    label: "Polo metropolitano de serviços",
    mix: { financeiro: 3, servicos_empresariais: 3, tecnologia: 2.5, comercio: 2, saude: 1.5, educacao: 1.2, imobiliario: 1.2, construcao: 1, logistica: 1 },
    macro: { industria: 16, servicos: 62, comercio: 13, agro: 1, publico: 8 },
  },
  {
    key: "industrial-diversificado",
    label: "Base industrial diversificada",
    mix: { industria_geral: 3, automotivo: 2, metalurgia: 1.6, quimica: 1.4, logistica: 1.3, comercio: 1.2, servicos_empresariais: 1 },
    macro: { industria: 38, servicos: 39, comercio: 12, agro: 2, publico: 9 },
  },
  {
    key: "tecnologia-pesquisa",
    label: "Tecnologia e pesquisa",
    mix: { tecnologia: 3, servicos_empresariais: 2, educacao: 1.8, saude: 1.5, aeroespacial: 1.2, industria_geral: 1.2, comercio: 1 },
    macro: { industria: 26, servicos: 52, comercio: 11, agro: 2, publico: 9 },
  },
  {
    key: "agroindustrial",
    label: "Agroindústria",
    mix: { agronegocio: 3, alimentos_bebidas: 2.4, energia: 1.4, logistica: 1.2, comercio: 1.2, industria_geral: 1 },
    macro: { industria: 27, servicos: 30, comercio: 12, agro: 22, publico: 9 },
  },
  {
    key: "agropecuario",
    label: "Economia agropecuária",
    mix: { agronegocio: 4, comercio: 1.4, alimentos_bebidas: 1.2, servicos_empresariais: 0.8 },
    macro: { industria: 11, servicos: 26, comercio: 13, agro: 34, publico: 16 },
  },
  {
    key: "logistico-portuario",
    label: "Logística e comércio exterior",
    mix: { portos: 3, logistica: 2.6, comercio: 1.6, quimica: 1.2, servicos_empresariais: 1 },
    macro: { industria: 22, servicos: 52, comercio: 14, agro: 1, publico: 11 },
  },
  {
    key: "saude-educacao",
    label: "Polo de saúde e educação",
    mix: { saude: 3, educacao: 2.4, comercio: 1.6, servicos_empresariais: 1.2, farmaceutica: 1 },
    macro: { industria: 17, servicos: 55, comercio: 14, agro: 3, publico: 11 },
  },
  {
    key: "turistico",
    label: "Turismo e serviços",
    mix: { turismo: 3, comercio: 2, construcao: 1.4, imobiliario: 1.2, meio_ambiente: 0.8 },
    macro: { industria: 13, servicos: 52, comercio: 19, agro: 5, publico: 11 },
  },
  {
    key: "administrativo",
    label: "Economia de base administrativa",
    mix: { administracao_publica: 3, comercio: 1.8, agronegocio: 1.4, educacao: 1, saude: 1 },
    macro: { industria: 9, servicos: 27, comercio: 15, agro: 17, publico: 32 },
  },
];

const ARCHETYPE_BY_KEY = new Map(ARCHETYPES.map((archetype) => [archetype.key, archetype]));

/** Mesorregiões com vocação predominante conhecida na literatura econômica regional. */
const MESO_BIAS: Record<string, string[]> = {
  "Metropolitana de São Paulo": ["metropolitano-servicos", "industrial-diversificado", "logistico-portuario"],
  "Campinas": ["tecnologia-pesquisa", "industrial-diversificado", "agroindustrial"],
  "Ribeirão Preto": ["agroindustrial", "saude-educacao", "agropecuario"],
  "Vale do Paraíba Paulista": ["tecnologia-pesquisa", "industrial-diversificado", "turistico"],
  "Piracicaba": ["agroindustrial", "industrial-diversificado", "tecnologia-pesquisa"],
  "Litoral Sul Paulista": ["logistico-portuario", "turistico", "agropecuario"],
  "Macro Metropolitana Paulista": ["industrial-diversificado", "logistico-portuario", "turistico"],
  "Araraquara": ["agroindustrial", "saude-educacao", "industrial-diversificado"],
  "Bauru": ["agroindustrial", "saude-educacao", "agropecuario"],
  "São José do Rio Preto": ["agropecuario", "saude-educacao", "agroindustrial"],
  "Araçatuba": ["agropecuario", "agroindustrial", "administrativo"],
  "Presidente Prudente": ["agropecuario", "administrativo", "saude-educacao"],
  "Marília": ["agroindustrial", "agropecuario", "saude-educacao"],
  "Assis": ["agropecuario", "agroindustrial", "administrativo"],
  "Itapetininga": ["agropecuario", "industrial-diversificado", "administrativo"],
};

const ANNUAL_YEARS = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
const LATEST_YEAR = ANNUAL_YEARS[ANNUAL_YEARS.length - 1];
/** Fatores anuais aplicados às séries: 2020 reproduz uma retração generalizada. */
const YEAR_SHOCK: Record<number, number> = {
  2018: 1, 2019: 1.02, 2020: 0.955, 2021: 1.06, 2022: 1.05, 2023: 1.035, 2024: 1.04,
};

type Profile = {
  municipalityId: string;
  archetype: Archetype;
  population: number;
  gdp: number;
  gdpPerCapita: number;
  sectorShares: Array<{ slug: string; share: number; trend: TrendDirection; relevance: number }>;
  macro: Archetype["macro"];
  employment: number;
  netJobs: number;
  companies: number;
  revenue: number;
  momentum: number;
};

function tierFor(input: MunicipalityInput, rand: ReturnType<typeof createRng>): keyof typeof TIER_POPULATION {
  const known = TIER_BY_NAME[normalizeKey(input.name)];
  if (known) return known;
  const inMetro = input.metroSlugs.length > 0;
  const roll = rand.next();
  if (inMetro) {
    if (roll < 0.18) return "media_alta";
    if (roll < 0.5) return "media";
    if (roll < 0.85) return "pequena_alta";
    return "pequena";
  }
  const large = (input.areaKm2 ?? 300) > 900;
  if (roll < 0.03) return "media";
  if (roll < 0.14) return "pequena_alta";
  if (roll < 0.55) return "pequena";
  return large ? "pequena" : "muito_pequena";
}

function pickArchetype(input: MunicipalityInput, rand: ReturnType<typeof createRng>, tier: string): Archetype {
  if (input.name === "Santos" || input.name === "Guarujá" || input.name === "Cubatão") {
    return ARCHETYPE_BY_KEY.get("logistico-portuario")!;
  }
  if (input.isCapital) return ARCHETYPE_BY_KEY.get("metropolitano-servicos")!;
  const candidates = MESO_BIAS[input.mesoName ?? ""] ?? ["agropecuario", "administrativo", "industrial-diversificado"];
  // Municípios muito pequenos concentram administração pública e agropecuária.
  if (tier === "muito_pequena" && rand.chance(0.6)) {
    return ARCHETYPE_BY_KEY.get(rand.chance(0.5) ? "administrativo" : "agropecuario")!;
  }
  const key = candidates[Math.min(candidates.length - 1, Math.floor(rand.next() * candidates.length))];
  return ARCHETYPE_BY_KEY.get(key) ?? ARCHETYPES[0];
}

function trendFrom(momentum: number, rand: ReturnType<typeof createRng>): TrendDirection {
  const value = momentum + rand.float(-0.35, 0.35);
  if (value > 0.6) return "FORTE_ALTA";
  if (value > 0.2) return "ALTA";
  if (value > -0.2) return "ESTAVEL";
  if (value > -0.6) return "QUEDA";
  return "FORTE_QUEDA";
}

export function buildProfile(input: MunicipalityInput, sectorSlugs: Set<string>): Profile {
  const rand = createRng(`atlas-sp:${input.ibgeCode}`);
  const tier = tierFor(input, rand);
  const [minPop, maxPop] = TIER_POPULATION[tier];
  const population = Math.round(rand.float(minPop, maxPop));
  const archetype = pickArchetype(input, rand, tier);

  // PIB per capita varia com a vocação: serviços metropolitanos e indústria
  // pesada sustentam patamares mais altos que economias administrativas.
  const perCapitaBase: Record<string, [number, number]> = {
    "metropolitano-servicos": [72_000, 96_000],
    "industrial-diversificado": [58_000, 105_000],
    "tecnologia-pesquisa": [62_000, 98_000],
    "agroindustrial": [45_000, 82_000],
    "agropecuario": [32_000, 62_000],
    "logistico-portuario": [55_000, 92_000],
    "saude-educacao": [40_000, 66_000],
    "turistico": [28_000, 52_000],
    "administrativo": [22_000, 40_000],
  };
  const [minPc, maxPc] = perCapitaBase[archetype.key] ?? [30_000, 55_000];
  const gdpPerCapita = Math.round(rand.float(minPc, maxPc));
  const gdp = Math.round(population * gdpPerCapita);

  const weights = Object.entries(archetype.mix).map(([slug, weight]) => ({
    slug: slug.replace(/_/g, "-"),
    weight: weight * rand.float(0.75, 1.3),
  }));
  const usable = weights.filter((entry) => sectorSlugs.has(entry.slug));
  const total = usable.reduce((sum, entry) => sum + entry.weight, 0) || 1;
  const momentum = rand.float(-1, 1);
  const sectorShares = usable
    .map((entry) => {
      const share = (entry.weight / total) * 100;
      return {
        slug: entry.slug,
        share: Number(share.toFixed(2)),
        trend: trendFrom(momentum * 0.6, rand),
        relevance: Number(Math.min(100, share * 1.4 + rand.float(0, 18)).toFixed(2)),
      };
    })
    .sort((a, b) => b.share - a.share);

  const employmentRate = archetype.key === "metropolitano-servicos" ? 0.42 : rand.float(0.16, 0.34);
  const employment = Math.round(population * employmentRate);
  const netJobs = Math.round(employment * rand.float(-0.012, 0.028) * (1 + momentum * 0.5));
  const companies = Math.round(population * rand.float(0.045, 0.095));
  const revenue = Math.round(gdp * rand.float(0.05, 0.12));

  return {
    municipalityId: input.id,
    archetype,
    population,
    gdp,
    gdpPerCapita,
    sectorShares,
    macro: archetype.macro,
    employment,
    netJobs,
    companies,
    revenue,
    momentum,
  };
}

type SeriesRow = {
  sourceId: string;
  indicatorId: string;
  municipalityId: string;
  normalizedValue: number;
  unit: string;
  referenceStart: Date;
  referenceEnd: Date;
  referenceLabel: string;
  publishedAt: Date;
  methodology: string;
  confidence: number;
  isDemo: boolean;
  status: "PUBLICADO";
};

export async function seedDemoEconomy(prisma: PrismaClient) {
  const demoSource = await prisma.dataSource.findUniqueOrThrow({
    where: { slug: "atlas-sp-demo" },
  });
  const sectors = await prisma.economicSector.findMany();
  const sectorIdBySlug = new Map(sectors.map((sector) => [sector.slug, sector.id]));
  const sectorSlugs = new Set(sectorIdBySlug.keys());

  const indicators = await prisma.indicator.findMany();
  const indicatorBySlug = new Map(indicators.map((indicator) => [indicator.slug, indicator]));

  const municipalities = await prisma.municipality.findMany({
    select: {
      id: true, name: true, ibgeCode: true, areaKm2: true, mesoName: true, isCapital: true,
      _count: { select: { neighborsFrom: true } },
      regionMemberships: { select: { region: { select: { slug: true, kind: true } } } },
    },
  });

  const profiles = new Map<string, Profile>();
  const seriesRows: SeriesRow[] = [];
  const sectorRows: Array<{
    municipalityId: string; sectorId: string; sharePct: number; employmentPct: number;
    trend: TrendDirection; relevance: number; rationale: string; referenceLabel: string; isDemo: boolean;
  }> = [];

  const methodology =
    "Série de DEMONSTRAÇÃO gerada de forma determinística pelo Atlas SP enquanto a ingestão da fonte oficial não está conectada. Não corresponde a valores reais.";

  const push = (
    indicatorSlug: string,
    municipalityId: string,
    value: number,
    year: number,
    unit: string,
  ) => {
    const indicator = indicatorBySlug.get(indicatorSlug);
    if (!indicator) return;
    seriesRows.push({
      sourceId: demoSource.id,
      indicatorId: indicator.id,
      municipalityId,
      normalizedValue: value,
      unit,
      referenceStart: new Date(Date.UTC(year, 0, 1)),
      referenceEnd: new Date(Date.UTC(year, 11, 31)),
      referenceLabel: String(year),
      publishedAt: new Date(Date.UTC(year + 1, 5, 1)),
      methodology,
      confidence: 0.4,
      isDemo: true,
      status: "PUBLICADO",
    });
  };

  for (const municipality of municipalities) {
    const metroSlugs = municipality.regionMemberships
      .filter((membership) => membership.region.kind === "REGIAO_METROPOLITANA")
      .map((membership) => membership.region.slug);

    const profile = buildProfile(
      {
        id: municipality.id,
        name: municipality.name,
        ibgeCode: municipality.ibgeCode,
        areaKm2: municipality.areaKm2,
        mesoName: municipality.mesoName,
        isCapital: municipality.isCapital,
        neighborCount: municipality._count.neighborsFrom,
        metroSlugs,
      },
      sectorSlugs,
    );
    profiles.set(municipality.id, profile);

    const rand = createRng(`series:${municipality.ibgeCode}`);
    // Retropolação: a série é construída do ano mais recente para trás,
    // aplicando o fator anual e um ruído específico do município.
    let population = profile.population;
    let gdp = profile.gdp;
    let employment = profile.employment;
    let companies = profile.companies;
    let revenue = profile.revenue;

    for (let i = ANNUAL_YEARS.length - 1; i >= 0; i--) {
      const year = ANNUAL_YEARS[i];
      push("populacao", municipality.id, Math.round(population), year, "pessoas");
      push("pib", municipality.id, Math.round(gdp), year, "BRL");
      push("pib-per-capita", municipality.id, Math.round(gdp / population), year, "BRL_UNIT");
      push("emprego-formal", municipality.id, Math.round(employment), year, "vinculos");
      push("empresas-ativas", municipality.id, Math.round(companies), year, "empresas");
      push("receita-municipal", municipality.id, Math.round(revenue), year, "BRL");
      push("despesa-municipal", municipality.id, Math.round(revenue * rand.float(0.9, 1.05)), year, "BRL");
      push("investimento-publico", municipality.id, Math.round(revenue * rand.float(0.03, 0.14)), year, "BRL");
      push("salario-medio", municipality.id, Math.round(2100 + (gdp / population) * rand.float(0.018, 0.042)), year, "BRL_UNIT");

      const industria = gdp * (profile.macro.industria / 100);
      const servicos = gdp * (profile.macro.servicos / 100);
      const agro = gdp * (profile.macro.agro / 100);
      const publico = gdp * (profile.macro.publico / 100);
      push("vab-industria", municipality.id, Math.round(industria), year, "BRL");
      push("vab-servicos", municipality.id, Math.round(servicos), year, "BRL");
      push("vab-agropecuaria", municipality.id, Math.round(agro), year, "BRL");
      push("vab-administracao", municipality.id, Math.round(publico), year, "BRL");

      if (municipality.areaKm2) {
        push("densidade-demografica", municipality.id, Number((population / municipality.areaKm2).toFixed(1)), year, "hab/km2");
      }

      const shock = YEAR_SHOCK[year] ?? 1;
      population /= 1 + (shock - 1) * 0.25 + rand.float(-0.002, 0.006);
      gdp /= shock + rand.float(-0.02, 0.03);
      employment /= shock + rand.float(-0.03, 0.04);
      companies /= 1 + (shock - 1) * 0.7 + rand.float(-0.01, 0.02);
      revenue /= shock + rand.float(-0.02, 0.03);
    }

    // Área territorial: dado calculado sobre a malha do IBGE, não é demonstração.
    // Fica registrado com a fonte real correspondente mais adiante.

    for (const entry of profile.sectorShares) {
      const sectorId = sectorIdBySlug.get(entry.slug);
      if (!sectorId) continue;
      sectorRows.push({
        municipalityId: municipality.id,
        sectorId,
        sharePct: entry.share,
        employmentPct: Number(Math.min(100, entry.share * createRng(`emp:${municipality.ibgeCode}:${entry.slug}`).float(0.7, 1.35)).toFixed(2)),
        trend: entry.trend,
        relevance: entry.relevance,
        rationale: `Participação estimada no valor adicionado a partir do perfil "${profile.archetype.label}". Conjunto de demonstração.`,
        referenceLabel: String(LATEST_YEAR),
        isDemo: true,
      });
    }
  }

  // Saldo mensal de empregos nos últimos 12 meses.
  const now = new Date();
  for (const municipality of municipalities) {
    const profile = profiles.get(municipality.id)!;
    const rand = createRng(`caged:${municipality.ibgeCode}`);
    for (let back = 11; back >= 0; back--) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1));
      const monthly = Math.round((profile.netJobs / 12) * rand.float(0.3, 2.1));
      const indicator = indicatorBySlug.get("saldo-empregos")!;
      seriesRows.push({
        sourceId: demoSource.id,
        indicatorId: indicator.id,
        municipalityId: municipality.id,
        normalizedValue: monthly,
        unit: "vinculos",
        referenceStart: date,
        referenceEnd: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)),
        referenceLabel: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`,
        publishedAt: new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 20)),
        methodology,
        confidence: 0.4,
        isDemo: true,
        status: "PUBLICADO",
      });
    }
  }

  await prisma.dataPoint.deleteMany({ where: { sourceId: demoSource.id } });
  for (let i = 0; i < seriesRows.length; i += 5000) {
    await prisma.dataPoint.createMany({ data: seriesRows.slice(i, i + 5000), skipDuplicates: true });
  }

  await prisma.municipalitySector.deleteMany({});
  for (let i = 0; i < sectorRows.length; i += 3000) {
    await prisma.municipalitySector.createMany({ data: sectorRows.slice(i, i + 3000), skipDuplicates: true });
  }

  // Arestas ATUA_EM: município → setor, com peso pela participação.
  await prisma.relationship.deleteMany({ where: { kind: "ATUA_EM", fromType: "MUNICIPIO" } });
  const edges = sectorRows.map((row) => ({
    fromType: "MUNICIPIO" as const,
    fromId: row.municipalityId,
    toType: "SETOR" as const,
    toId: row.sectorId,
    kind: "ATUA_EM" as const,
    weight: Number((row.sharePct / 100).toFixed(3)),
    origin: "perfil-economico",
  }));
  for (let i = 0; i < edges.length; i += 3000) {
    await prisma.relationship.createMany({ data: edges.slice(i, i + 3000), skipDuplicates: true });
  }

  return { profiles, dataPoints: seriesRows.length, sectorProfiles: sectorRows.length };
}

/** Área territorial calculada sobre a malha do IBGE — dado real, não demonstração. */
export async function seedAreaIndicator(prisma: PrismaClient) {
  const source = await prisma.dataSource.findUniqueOrThrow({
    where: { slug: "ibge-malha-municipal" },
  });
  const indicator = await prisma.indicator.findUniqueOrThrow({ where: { slug: "area-territorial" } });
  const municipalities = await prisma.municipality.findMany({
    select: { id: true, areaKm2: true },
  });
  const rows = municipalities
    .filter((municipality) => municipality.areaKm2 !== null)
    .map((municipality) => ({
      sourceId: source.id,
      indicatorId: indicator.id,
      municipalityId: municipality.id,
      normalizedValue: municipality.areaKm2!,
      unit: "km2",
      referenceStart: new Date(Date.UTC(2024, 0, 1)),
      referenceEnd: new Date(Date.UTC(2024, 11, 31)),
      referenceLabel: "2024",
      methodology:
        "Área calculada por geometria esférica sobre a Malha Municipal Digital do IBGE. Divergência típica inferior a 1% frente à área oficial publicada.",
      confidence: 0.95,
      isDemo: false,
      status: "PUBLICADO" as const,
    }));
  await prisma.dataPoint.deleteMany({ where: { sourceId: source.id, indicatorId: indicator.id } });
  for (let i = 0; i < rows.length; i += 5000) {
    await prisma.dataPoint.createMany({ data: rows.slice(i, i + 5000), skipDuplicates: true });
  }
  return rows.length;
}
