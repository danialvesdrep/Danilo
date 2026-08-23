import type { PrismaClient, SignalCategory, NewsCategory } from "@prisma/client";
import { createRng } from "./rng";
import { slugify, normalizeKey } from "../../src/lib/slug";
import { scoreSignal } from "../../src/server/radar/scoring";

/**
 * Camada de eventos de DEMONSTRAÇÃO: empresas, investimentos, notícias,
 * sinais do Radar e linha do tempo.
 *
 * Os veículos jornalísticos citados são reais e públicos, mas as matérias
 * geradas aqui NÃO existem: são registros sintéticos, com `isDemo: true`,
 * e a interface nunca oferece link para uma fonte inexistente.
 */

const NEWS_SOURCES = [
  { slug: "agencia-estado-sp", name: "Imprensa estadual (demonstração)", homepage: "https://www.saopaulo.sp.gov.br/", scope: "ESTADUAL" },
  { slug: "imprensa-regional", name: "Imprensa regional (demonstração)", homepage: "https://www.saopaulo.sp.gov.br/", scope: "REGIONAL" },
  { slug: "imprensa-setorial", name: "Imprensa setorial (demonstração)", homepage: "https://www.saopaulo.sp.gov.br/", scope: "SETORIAL" },
  { slug: "diario-oficial-municipal", name: "Diário oficial municipal (demonstração)", homepage: "https://queridodiario.ok.org.br/", scope: "MUNICIPAL" },
];

const COMPANY_PREFIXES = [
  "Aurora", "Bandeirante", "Cristalina", "Delta", "Estrela", "Forja", "Granja",
  "Horizonte", "Ipê", "Jequitibá", "Lumen", "Marajoara", "Nortec", "Ourives",
  "Paranapiaba", "Quartzo", "Ribeira", "Serra Azul", "Tietê", "Umbu", "Vertente",
];
const COMPANY_SUFFIXES: Record<string, string[]> = {
  automotivo: ["Motores", "Autopeças", "Mobilidade"],
  tecnologia: ["Sistemas", "Digital", "Tech"],
  agronegocio: ["Agropecuária", "Agro", "Sementes"],
  "alimentos-bebidas": ["Alimentos", "Bebidas", "Laticínios"],
  logistica: ["Logística", "Transportes", "Distribuição"],
  portos: ["Terminais", "Portuária", "Comex"],
  saude: ["Saúde", "Diagnósticos", "Hospitalar"],
  educacao: ["Educacional", "Ensino"],
  quimica: ["Química", "Petroquímica"],
  farmaceutica: ["Farma", "Biociências"],
  energia: ["Energia", "Renováveis"],
  construcao: ["Construtora", "Engenharia"],
  metalurgia: ["Metalúrgica", "Siderúrgica"],
  "papel-celulose": ["Celulose", "Papéis"],
  textil: ["Têxtil", "Confecções"],
  aeroespacial: ["Aeroespacial", "Sistemas Aéreos"],
  mineracao: ["Mineração", "Britagem"],
  comercio: ["Comercial", "Atacado"],
  financeiro: ["Serviços Financeiros", "Crédito"],
  imobiliario: ["Empreendimentos", "Urbanismo"],
  turismo: ["Turismo", "Hotelaria"],
  "servicos-empresariais": ["Consultoria", "Engenharia"],
  "industria-geral": ["Indústria", "Manufatura"],
  "meio-ambiente": ["Ambiental", "Saneamento"],
  "administracao-publica": ["Serviços Públicos"],
};

/** Modelos de movimento, por categoria do Radar. */
const SIGNAL_TEMPLATES: Array<{
  category: SignalCategory;
  news: NewsCategory;
  headline: (context: TemplateContext) => string;
  description: (context: TemplateContext) => string;
  needsCompany?: boolean;
  needsInvestment?: boolean;
  weight: number;
}> = [
  {
    category: "INVESTIMENTO",
    news: "EMPRESAS",
    weight: 3,
    needsCompany: true,
    needsInvestment: true,
    headline: (c) => `${c.company} anuncia investimento em ${c.municipality}`,
    description: (c) =>
      `Anúncio de aporte no setor de ${c.sector.toLowerCase()} em ${c.municipality}, com previsão de ampliação da capacidade instalada e contratações.`,
  },
  {
    category: "EMPREGO",
    news: "TRABALHO",
    weight: 2,
    headline: (c) => `Movimento relevante no emprego formal em ${c.municipality}`,
    description: (c) =>
      `O saldo de vínculos formais em ${c.municipality} apresentou variação fora do padrão recente, concentrada em ${c.sector.toLowerCase()}.`,
  },
  {
    category: "INDUSTRIA",
    news: "INDUSTRIA",
    weight: 2,
    needsCompany: true,
    headline: (c) => `Ampliação industrial de ${c.company} em ${c.municipality}`,
    description: (c) =>
      `Expansão de planta industrial em ${c.municipality}, com efeitos esperados sobre fornecedores locais e sobre a atividade de ${c.sector.toLowerCase()}.`,
  },
  {
    category: "INFRAESTRUTURA",
    news: "INFRAESTRUTURA",
    weight: 2,
    headline: (c) => `Nova obra de infraestrutura em ${c.municipality}`,
    description: (c) =>
      `Intervenção de infraestrutura em ${c.municipality} com potencial de alterar fluxos logísticos e o custo de deslocamento na região.`,
  },
  {
    category: "POLITICA",
    news: "POLITICA",
    weight: 2,
    headline: (c) => `Mudança na estrutura administrativa de ${c.municipality}`,
    description: (c) =>
      `Alteração relevante na organização do Executivo municipal de ${c.municipality}, com reflexo sobre a condução de políticas setoriais.`,
  },
  {
    category: "CAMARA",
    news: "POLITICA",
    weight: 1.5,
    headline: (c) => `Votação relevante na Câmara de ${c.municipality}`,
    description: (c) =>
      `Deliberação com efeito sobre regras locais em ${c.municipality}, acompanhada por setores econômicos diretamente afetados.`,
  },
  {
    category: "AGRONEGOCIO",
    news: "AGRO",
    weight: 2,
    headline: (c) => `Movimento no agronegócio de ${c.municipality}`,
    description: (c) =>
      `Alteração relevante na atividade agropecuária de ${c.municipality}, com possível efeito sobre a cadeia de processamento regional.`,
  },
  {
    category: "TECNOLOGIA",
    news: "TECNOLOGIA",
    weight: 1.5,
    needsCompany: true,
    headline: (c) => `${c.company} expande operação de tecnologia em ${c.municipality}`,
    description: (c) =>
      `Ampliação de operação intensiva em conhecimento em ${c.municipality}, com demanda por mão de obra qualificada.`,
  },
  {
    category: "LOGISTICA",
    news: "INFRAESTRUTURA",
    weight: 1.5,
    needsCompany: true,
    headline: (c) => `Novo centro de distribuição em ${c.municipality}`,
    description: (c) =>
      `Instalação de operação logística em ${c.municipality}, associada à posição do município nos eixos rodoviários da região.`,
  },
  {
    category: "PORTOS",
    news: "INFRAESTRUTURA",
    weight: 1,
    headline: (c) => `Alteração na movimentação portuária de ${c.municipality}`,
    description: (c) =>
      `Variação relevante na movimentação de cargas em ${c.municipality}, com efeito sobre a cadeia de comércio exterior.`,
  },
  {
    category: "SAUDE",
    news: "SAUDE",
    weight: 1.2,
    headline: (c) => `Movimento no complexo de saúde de ${c.municipality}`,
    description: (c) =>
      `Alteração na capacidade instalada de serviços de saúde em ${c.municipality}, com efeito sobre municípios do entorno.`,
  },
  {
    category: "ARRECADACAO",
    news: "ECONOMIA",
    weight: 1.2,
    headline: (c) => `Mudança no perfil de arrecadação de ${c.municipality}`,
    description: (c) =>
      `Variação relevante na arrecadação municipal de ${c.municipality}, com efeito sobre a capacidade de investimento da prefeitura.`,
  },
  {
    category: "ENERGIA",
    news: "INFRAESTRUTURA",
    weight: 1,
    needsCompany: true,
    needsInvestment: true,
    headline: (c) => `Projeto de geração de energia em ${c.municipality}`,
    description: (c) =>
      `Projeto de geração em ${c.municipality}, com implicações para a matriz energética regional e para a arrecadação municipal.`,
  },
  {
    category: "MEIO_AMBIENTE",
    news: "MEIO_AMBIENTE",
    weight: 1,
    headline: (c) => `Decisão ambiental relevante em ${c.municipality}`,
    description: (c) =>
      `Decisão de licenciamento ou de política ambiental em ${c.municipality}, com efeito sobre projetos em andamento.`,
  },
];

type TemplateContext = { municipality: string; sector: string; company: string };

const TOTAL_TEMPLATE_WEIGHT = SIGNAL_TEMPLATES.reduce((sum, template) => sum + template.weight, 0);

function pickTemplate(rand: ReturnType<typeof createRng>) {
  let roll = rand.next() * TOTAL_TEMPLATE_WEIGHT;
  for (const template of SIGNAL_TEMPLATES) {
    roll -= template.weight;
    if (roll <= 0) return template;
  }
  return SIGNAL_TEMPLATES[0];
}

export async function seedDemoSignals(
  prisma: PrismaClient,
  profiles: Map<string, { population: number; gdp: number; momentum: number; sectorShares: Array<{ slug: string; share: number }> }>,
) {
  const rand = createRng("atlas-sp:signals:v1");
  const sectors = await prisma.economicSector.findMany();
  const sectorById = new Map(sectors.map((sector) => [sector.id, sector]));
  const sectorBySlug = new Map(sectors.map((sector) => [sector.slug, sector]));

  const municipalities = await prisma.municipality.findMany({
    select: { id: true, name: true, slug: true, ibgeCode: true, mesoName: true },
  });
  const municipalityById = new Map(municipalities.map((municipality) => [municipality.id, municipality]));

  for (const source of NEWS_SOURCES) {
    await prisma.newsSource.upsert({
      where: { slug: source.slug },
      update: { name: source.name, homepage: source.homepage, scope: source.scope },
      create: { ...source, tier: "DEMONSTRACAO" },
    });
  }
  const newsSources = await prisma.newsSource.findMany();

  // ── Empresas ──────────────────────────────────────────────────
  // Concentradas nos municípios de maior porte, como na economia real.
  const ranked = [...profiles.entries()].sort((a, b) => b[1].gdp - a[1].gdp);
  const companyRows: Array<Record<string, unknown>> = [];
  const usedCompanySlugs = new Set<string>();

  for (const [municipalityId, profile] of ranked.slice(0, 220)) {
    const municipality = municipalityById.get(municipalityId);
    if (!municipality) continue;
    const localRand = createRng(`empresas:${municipality.ibgeCode}`);
    const count = profile.gdp > 5e10 ? 8 : profile.gdp > 1e10 ? 5 : 3;
    for (let i = 0; i < count; i++) {
      const sectorSlug = profile.sectorShares.length
        ? localRand.pick(profile.sectorShares.slice(0, 4)).slug
        : "industria-geral";
      const sector = sectorBySlug.get(sectorSlug) ?? sectorBySlug.get("industria-geral")!;
      const suffixes = COMPANY_SUFFIXES[sectorSlug] ?? ["Indústria"];
      const name = `${localRand.pick(COMPANY_PREFIXES)} ${localRand.pick(suffixes)}`;
      const slug = slugify(`${name}-${municipality.slug}`);
      if (usedCompanySlugs.has(slug)) continue;
      usedCompanySlugs.add(slug);
      companyRows.push({
        slug,
        name,
        sectorId: sector.id,
        municipalityId,
        description: `Empresa de DEMONSTRAÇÃO no setor de ${sector.name.toLowerCase()}, usada para exercitar o grafo de entidades. Não corresponde a uma empresa existente.`,
        employeeBand: localRand.pick(["10 a 49", "50 a 249", "250 a 999", "1.000 ou mais"]),
        foundedYear: localRand.int(1968, 2021),
        isDemo: true,
      });
    }
  }
  await prisma.company.deleteMany({ where: { isDemo: true } });
  for (let i = 0; i < companyRows.length; i += 2000) {
    await prisma.company.createMany({ data: companyRows.slice(i, i + 2000) as never, skipDuplicates: true });
  }
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, slug: true, sectorId: true, municipalityId: true },
  });
  const companiesByMunicipality = new Map<string, typeof companies>();
  for (const company of companies) {
    if (!company.municipalityId) continue;
    const list = companiesByMunicipality.get(company.municipalityId) ?? [];
    list.push(company);
    companiesByMunicipality.set(company.municipalityId, list);
  }

  // ── Sinais do Radar (com notícias e investimentos correlatos) ──
  const now = Date.now();
  const HORIZON_DAYS = 45;
  const signalTargets = ranked.slice(0, 260);

  const articleRows: Array<Record<string, unknown>> = [];
  const investmentRows: Array<Record<string, unknown>> = [];
  const signalDrafts: Array<Record<string, unknown>> = [];

  for (const [municipalityId, profile] of signalTargets) {
    const municipality = municipalityById.get(municipalityId)!;
    const localRand = createRng(`sinais:${municipality.ibgeCode}`);
    // Cidades maiores e com momento mais forte produzem mais movimentos.
    const base = profile.gdp > 5e10 ? 5 : profile.gdp > 1.5e10 ? 3 : 2;
    const count = Math.max(1, Math.round(base * (1 + profile.momentum * 0.4)));

    for (let i = 0; i < count; i++) {
      const template = pickTemplate(localRand);
      const sectorSlug = profile.sectorShares.length
        ? localRand.pick(profile.sectorShares.slice(0, 3)).slug
        : "industria-geral";
      const sector = sectorBySlug.get(sectorSlug) ?? sectorBySlug.get("industria-geral")!;
      const localCompanies = companiesByMunicipality.get(municipalityId) ?? [];
      const company = localCompanies.length ? localRand.pick(localCompanies) : null;
      if (template.needsCompany && !company) continue;

      const context: TemplateContext = {
        municipality: municipality.name,
        sector: sector.name,
        company: company?.name ?? "Empresa",
      };
      const daysAgo = Math.floor(localRand.float(0, HORIZON_DAYS) ** 1.4 / HORIZON_DAYS ** 0.4);
      const occurredAt = new Date(now - daysAgo * 86_400_000 - localRand.int(0, 23) * 3_600_000);
      const headline = template.headline(context);
      const slug = slugify(`${headline}-${municipality.ibgeCode}-${i}`).slice(0, 90);

      let amountBRL: number | null = null;
      let jobs: number | null = null;
      let investmentSlug: string | null = null;
      if (template.needsInvestment) {
        amountBRL = Math.round(localRand.float(8e6, 1.4e9) / 1e6) * 1e6;
        jobs = Math.round(localRand.float(30, 1800));
        investmentSlug = `${slug}-investimento`;
        investmentRows.push({
          slug: investmentSlug,
          title: headline,
          municipalityId,
          companySlug: company?.slug ?? null,
          sectorId: sector.id,
          amountBRL,
          jobsAnnounced: jobs,
          status: localRand.pick(["ANUNCIADO", "ANUNCIADO", "EM_IMPLANTACAO"] as const),
          announcedAt: occurredAt,
          expectedAt: new Date(occurredAt.getTime() + localRand.int(180, 900) * 86_400_000),
          description: template.description(context),
          isDemo: true,
        });
      }

      // Notícias que sustentam o sinal
      const articleCount = localRand.int(1, 3);
      const articleSlugs: string[] = [];
      for (let a = 0; a < articleCount; a++) {
        const newsSource = localRand.pick(newsSources);
        const articleSlug = `${slug}-n${a}`;
        articleSlugs.push(articleSlug);
        articleRows.push({
          slug: articleSlug,
          title: headline,
          summary: template.description(context),
          url: `https://demo.atlassp.local/noticia/${articleSlug}`,
          sourceId: newsSource.id,
          category: template.news,
          publishedAt: new Date(occurredAt.getTime() - a * 3_600_000 * localRand.int(1, 20)),
          importance: localRand.int(40, 92),
          isDemo: true,
          municipalityId,
          sectorId: sector.id,
          companyId: company?.id ?? null,
        });
      }

      const scored = scoreSignal({
        category: template.category,
        population: profile.population,
        gdp: profile.gdp,
        amountBRL,
        jobs,
        sourceCount: articleCount,
        daysAgo,
        sectorShare: profile.sectorShares.find((entry) => entry.slug === sectorSlug)?.share ?? 5,
        momentum: profile.momentum,
      });

      signalDrafts.push({
        slug,
        headline,
        description: template.description(context),
        municipalityId,
        category: template.category,
        sectorId: sector.id,
        companyId: company?.id ?? null,
        investmentSlug,
        occurredAt,
        detectedAt: new Date(occurredAt.getTime() + localRand.int(1, 8) * 3_600_000),
        articleSlugs,
        ...scored,
        isDemo: true,
      });
    }
  }

  // ── Gravação de notícias ──────────────────────────────────────
  await prisma.newsArticle.deleteMany({ where: { isDemo: true } });
  const articleCore = articleRows.map((article) => ({
    slug: article.slug as string,
    title: article.title as string,
    summary: article.summary as string,
    url: article.url as string,
    sourceId: article.sourceId as string,
    category: article.category as never,
    publishedAt: article.publishedAt as Date,
    importance: article.importance as number,
    isDemo: true,
  }));
  for (let i = 0; i < articleCore.length; i += 2000) {
    await prisma.newsArticle.createMany({ data: articleCore.slice(i, i + 2000), skipDuplicates: true });
  }
  const articleIdBySlug = new Map(
    (await prisma.newsArticle.findMany({ select: { id: true, slug: true } })).map((article) => [
      article.slug,
      article.id,
    ]),
  );

  const articleMunicipalities = articleRows.map((article) => ({
    articleId: articleIdBySlug.get(article.slug as string)!,
    municipalityId: article.municipalityId as string,
    confidence: 1,
  }));
  const articleSectors = articleRows.map((article) => ({
    articleId: articleIdBySlug.get(article.slug as string)!,
    sectorId: article.sectorId as string,
  }));
  const articleCompanies = articleRows
    .filter((article) => article.companyId)
    .map((article) => ({
      articleId: articleIdBySlug.get(article.slug as string)!,
      companyId: article.companyId as string,
    }));
  for (let i = 0; i < articleMunicipalities.length; i += 3000) {
    await prisma.articleMunicipality.createMany({ data: articleMunicipalities.slice(i, i + 3000), skipDuplicates: true });
    await prisma.articleSector.createMany({ data: articleSectors.slice(i, i + 3000), skipDuplicates: true });
  }
  for (let i = 0; i < articleCompanies.length; i += 3000) {
    await prisma.articleCompany.createMany({ data: articleCompanies.slice(i, i + 3000), skipDuplicates: true });
  }

  // ── Investimentos ─────────────────────────────────────────────
  await prisma.investment.deleteMany({ where: { isDemo: true } });
  const companyIdBySlug = new Map(companies.map((company) => [company.slug, company.id]));
  const investmentCore = investmentRows.map((investment) => ({
    slug: investment.slug as string,
    title: investment.title as string,
    municipalityId: investment.municipalityId as string,
    companyId: investment.companySlug ? companyIdBySlug.get(investment.companySlug as string) ?? null : null,
    sectorId: investment.sectorId as string,
    amountBRL: investment.amountBRL as number,
    jobsAnnounced: investment.jobsAnnounced as number,
    status: investment.status as never,
    announcedAt: investment.announcedAt as Date,
    expectedAt: investment.expectedAt as Date,
    description: investment.description as string,
    isDemo: true,
  }));
  for (let i = 0; i < investmentCore.length; i += 2000) {
    await prisma.investment.createMany({ data: investmentCore.slice(i, i + 2000), skipDuplicates: true });
  }
  const investmentIdBySlug = new Map(
    (await prisma.investment.findMany({ select: { id: true, slug: true } })).map((investment) => [
      investment.slug,
      investment.id,
    ]),
  );

  // ── Sinais ────────────────────────────────────────────────────
  await prisma.radarSignal.deleteMany({ where: { isDemo: true } });
  const signalCore = signalDrafts.map((signal) => ({
    slug: signal.slug as string,
    headline: signal.headline as string,
    description: signal.description as string,
    municipalityId: signal.municipalityId as string,
    category: signal.category as never,
    sectorId: signal.sectorId as string,
    companyId: signal.companyId as string | null,
    investmentId: signal.investmentSlug ? investmentIdBySlug.get(signal.investmentSlug as string) ?? null : null,
    occurredAt: signal.occurredAt as Date,
    detectedAt: signal.detectedAt as Date,
    importance: signal.importance as number,
    urgency: signal.urgency as number,
    economicImpact: signal.economicImpact as number,
    politicalImpact: signal.politicalImpact as number,
    regionalImpact: signal.regionalImpact as number,
    score: signal.score as number,
    scoreRationale: signal.scoreRationale as never,
    status: "PUBLICADO" as const,
    isDemo: true,
  }));
  for (let i = 0; i < signalCore.length; i += 2000) {
    await prisma.radarSignal.createMany({ data: signalCore.slice(i, i + 2000), skipDuplicates: true });
  }
  const signalIdBySlug = new Map(
    (await prisma.radarSignal.findMany({ select: { id: true, slug: true } })).map((signal) => [
      signal.slug,
      signal.id,
    ]),
  );

  const signalSources = signalDrafts.flatMap((signal) =>
    (signal.articleSlugs as string[])
      .map((articleSlug) => ({
        signalId: signalIdBySlug.get(signal.slug as string)!,
        articleId: articleIdBySlug.get(articleSlug)!,
        role: "EVIDENCIA",
      }))
      .filter((row) => row.signalId && row.articleId),
  );
  for (let i = 0; i < signalSources.length; i += 3000) {
    await prisma.radarSignalSource.createMany({ data: signalSources.slice(i, i + 3000), skipDuplicates: true });
  }

  // ── Linha do tempo ────────────────────────────────────────────
  await prisma.timelineEvent.deleteMany({ where: { isDemo: true } });
  const timelineRows: Array<Record<string, unknown>> = signalDrafts.map((signal) => ({
    municipalityId: signal.municipalityId as string,
    signalId: signalIdBySlug.get(signal.slug as string)!,
    kind: "RADAR" as const,
    title: signal.headline as string,
    description: signal.description as string,
    occurredAt: signal.occurredAt as Date,
    importance: signal.score as number,
    isDemo: true,
  }));

  // Marcos históricos comuns a todos os municípios (fatos de calendário).
  for (const municipality of municipalities) {
    timelineRows.push(
      {
        municipalityId: municipality.id,
        kind: "ELEICAO" as const,
        title: "Eleições municipais",
        description: `Eleição para prefeito, vice-prefeito e vereadores de ${municipality.name}.`,
        occurredAt: new Date(Date.UTC(2024, 9, 6)),
        importance: 90,
        isDemo: false,
      },
      {
        municipalityId: municipality.id,
        kind: "POLITICA" as const,
        title: "Posse da legislatura 2025–2028",
        description: `Início do mandato do Executivo e da Câmara Municipal de ${municipality.name}.`,
        occurredAt: new Date(Date.UTC(2025, 0, 1)),
        importance: 80,
        isDemo: false,
      },
    );
  }
  for (let i = 0; i < timelineRows.length; i += 3000) {
    await prisma.timelineEvent.createMany({ data: timelineRows.slice(i, i + 3000) as never, skipDuplicates: true });
  }

  // ── Grafo: notícia menciona município/empresa, empresa atua em setor ──
  await prisma.relationship.deleteMany({
    where: { fromType: { in: ["NOTICIA", "EMPRESA", "SINAL", "INVESTIMENTO"] } },
  });
  const graphEdges = [
    ...articleMunicipalities.map((row) => ({
      fromType: "NOTICIA" as const, fromId: row.articleId, toType: "MUNICIPIO" as const,
      toId: row.municipalityId, kind: "MENCIONA" as const, weight: 1, origin: "resolucao-entidades",
    })),
    ...articleCompanies.map((row) => ({
      fromType: "NOTICIA" as const, fromId: row.articleId, toType: "EMPRESA" as const,
      toId: row.companyId, kind: "MENCIONA" as const, weight: 0.9, origin: "resolucao-entidades",
    })),
    ...companies.filter((company) => company.sectorId).map((company) => ({
      fromType: "EMPRESA" as const, fromId: company.id, toType: "SETOR" as const,
      toId: company.sectorId!, kind: "ATUA_EM" as const, weight: 1, origin: "cadastro",
    })),
    ...companies.filter((company) => company.municipalityId).map((company) => ({
      fromType: "EMPRESA" as const, fromId: company.id, toType: "MUNICIPIO" as const,
      toId: company.municipalityId!, kind: "LOCALIZADA_EM" as const, weight: 1, origin: "cadastro",
    })),
    ...signalCore.map((signal) => ({
      fromType: "SINAL" as const, fromId: signalIdBySlug.get(signal.slug)!, toType: "MUNICIPIO" as const,
      toId: signal.municipalityId, kind: "IMPACTA" as const, weight: signal.score / 100, origin: "radar",
    })),
    ...investmentCore.map((investment) => ({
      fromType: "INVESTIMENTO" as const, fromId: investmentIdBySlug.get(investment.slug)!,
      toType: "MUNICIPIO" as const, toId: investment.municipalityId, kind: "INVESTE_EM" as const,
      weight: 1, origin: "investimentos",
    })),
  ];
  for (let i = 0; i < graphEdges.length; i += 3000) {
    await prisma.relationship.createMany({ data: graphEdges.slice(i, i + 3000) as never, skipDuplicates: true });
  }

  // Aliases de empresas
  await prisma.entityAlias.deleteMany({ where: { entityType: "EMPRESA" } });
  const companyAliases = companies.map((company) => ({
    entityType: "EMPRESA" as const,
    normalizedKey: normalizeKey(company.name),
    alias: company.name,
    weight: 0.9,
    companyId: company.id,
  }));
  for (let i = 0; i < companyAliases.length; i += 2000) {
    await prisma.entityAlias.createMany({ data: companyAliases.slice(i, i + 2000), skipDuplicates: true });
  }

  return {
    companies: companyRows.length,
    articles: articleCore.length,
    investments: investmentCore.length,
    signals: signalCore.length,
    timeline: timelineRows.length,
    edges: graphEdges.length,
  };
}
