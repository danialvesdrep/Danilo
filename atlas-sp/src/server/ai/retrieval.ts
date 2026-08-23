import "server-only";
import { prisma, toNumber } from "@/server/db/prisma";
import { resolveMentions } from "@/server/entities/resolve";
import { formatCurrencyScaled, formatNumber, formatUnit, formatDate } from "@/lib/format";
import type { Citation, EvidenceBundle, Fact, QuestionIntent } from "./types";

/**
 * Recuperação de evidências.
 *
 * Este é o coração do Atlas AI: antes de qualquer geração de texto, a pergunta
 * é ancorada em entidades reais e o pacote de evidências é montado a partir do
 * banco e do grafo. O que não estiver aqui não pode aparecer na resposta.
 */

const INTENT_PATTERNS: Array<{ intent: QuestionIntent; patterns: RegExp[] }> = [
  { intent: "comparacao", patterns: [/\bcompar(e|ar|ação)\b/i, /\bversus\b/i, /\bdiferença entre\b/i, /\bmelhor que\b/i] },
  { intent: "vizinhanca", patterns: [/vizinh/i, /\bpróxim[ao]s?\b/i, /\bentorno\b/i, /\bregi(ão|onal)\b.*afetad/i] },
  { intent: "investimentos", patterns: [/investimento/i, /\baporte\b/i, /\bnova f[áa]brica\b/i, /\bexpans(ão|ao)\b/i] },
  { intent: "setores", patterns: [/\bsetor(es)?\b/i, /\bque mais empreg/i, /\bvoca(ção|cao)\b/i, /\bind[úu]stria\b/i] },
  { intent: "politica", patterns: [/\bprefeit/i, /\bc[âa]mara\b/i, /\bvereador/i, /\bpol[íi]tic/i, /\bsecret[áa]ri/i, /\bprojeto de lei\b/i] },
  { intent: "radar", patterns: [/\bradar\b/i, /\bacontec/i, /\búltimos \d+ dias\b/i, /\bmovimento/i, /\bnot[íi]cias?\b/i] },
  { intent: "economia", patterns: [/\beconomia\b/i, /\bpib\b/i, /\bcrescendo\b/i, /\bcrescimento\b/i, /\bemprego\b/i, /\brenda\b/i] },
  { intent: "panorama", patterns: [/\bcomo est[áa]\b/i, /\bpanorama\b/i, /\bperfil\b/i, /\bo que sabe\b/i] },
];

export function detectIntent(question: string): QuestionIntent {
  for (const entry of INTENT_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(question))) return entry.intent;
  }
  return "indefinida";
}

/** Janela temporal pedida na pergunta ("últimos 30 dias"), em dias. */
function detectWindowDays(question: string): number {
  const explicit = question.match(/últimos?\s+(\d{1,3})\s+dias/i);
  if (explicit) return Math.min(365, Number(explicit[1]));
  if (/último m[êe]s|último mes/i.test(question)) return 30;
  if (/último ano/i.test(question)) return 365;
  if (/última semana/i.test(question)) return 7;
  return 90;
}

class BundleBuilder {
  readonly citations: Citation[] = [];
  readonly facts: Fact[] = [];
  readonly notes: string[] = [];
  readonly reasoningPath: string[] = [];
  private readonly citationKeys = new Map<string, number>();

  cite(citation: Citation): number {
    const key = `${citation.kind}:${citation.label}:${citation.referenceLabel ?? ""}`;
    const existing = this.citationKeys.get(key);
    if (existing !== undefined) return existing;
    const index = this.citations.length;
    this.citations.push(citation);
    this.citationKeys.set(key, index);
    return index;
  }

  fact(statement: string, citation: Citation, value?: number | null, unit?: string | null) {
    this.facts.push({ statement, citationIndex: this.cite(citation), value, unit });
  }

  note(text: string) {
    this.notes.push(text);
  }

  step(text: string) {
    this.reasoningPath.push(text);
  }
}

async function addIndicatorFacts(
  builder: BundleBuilder,
  municipality: { id: string; name: string },
  slugs: string[],
) {
  const points = await prisma.dataPoint.findMany({
    where: { municipalityId: municipality.id, indicator: { slug: { in: slugs } } },
    orderBy: { referenceStart: "desc" },
    select: {
      normalizedValue: true, referenceLabel: true, unit: true, isDemo: true, sourceUrl: true,
      publishedAt: true,
      indicator: { select: { slug: true, name: true, shortName: true, unit: true, precision: true } },
      source: { select: { name: true, organization: true, tier: true, url: true } },
    },
  });

  const bySlug = new Map<string, typeof points>();
  for (const point of points) {
    if (!point.indicator) continue;
    const list = bySlug.get(point.indicator.slug) ?? [];
    list.push(point);
    bySlug.set(point.indicator.slug, list);
  }

  for (const slug of slugs) {
    const series = bySlug.get(slug);
    if (!series?.length) continue;
    const latest = series[0];
    const previous = series[1];
    const value = toNumber(latest.normalizedValue);
    if (value === null || !latest.indicator) continue;

    const citation: Citation = {
      label: `${latest.indicator.name} · ${latest.referenceLabel}`,
      kind: "indicador",
      source: `${latest.source.organization} — ${latest.source.name}`,
      sourceTier: latest.source.tier,
      referenceLabel: latest.referenceLabel,
      url: latest.sourceUrl ?? latest.source.url,
      isDemo: latest.isDemo,
    };

    builder.fact(
      `${latest.indicator.name} de ${municipality.name} em ${latest.referenceLabel}: ${formatUnit(
        value,
        latest.indicator.unit,
        latest.indicator.precision,
      )}.`,
      citation,
      value,
      latest.indicator.unit,
    );

    const previousValue = previous ? toNumber(previous.normalizedValue) : null;
    if (previousValue !== null && previousValue !== 0 && previous) {
      const delta = ((value - previousValue) / Math.abs(previousValue)) * 100;
      // Variação abaixo de 0,5% é ruído para o leitor; não vira observação.
      if (Math.abs(delta) >= 0.5) {
        const direction = delta > 0 ? "avançou" : "recuou";
        builder.note(
          `${latest.indicator.shortName} de ${municipality.name} ${direction} ${formatNumber(
            Math.abs(delta),
            1,
          )}% entre ${previous.referenceLabel} e ${latest.referenceLabel}, de ${formatUnit(
            previousValue,
            latest.indicator.unit,
            latest.indicator.precision,
          )} para ${formatUnit(value, latest.indicator.unit, latest.indicator.precision)}.`,
        );
      }
    }
  }
}

async function addSectorFacts(builder: BundleBuilder, municipality: { id: string; name: string }) {
  const sectors = await prisma.municipalitySector.findMany({
    where: { municipalityId: municipality.id },
    orderBy: { sharePct: "desc" },
    take: 5,
    select: {
      sharePct: true, trend: true, referenceLabel: true, isDemo: true,
      sector: { select: { name: true, slug: true } },
    },
  });
  if (!sectors.length) return;

  const citation: Citation = {
    label: `Composição setorial de ${municipality.name}`,
    kind: "indicador",
    source: "Atlas SP — derivado do valor adicionado bruto",
    sourceTier: sectors[0].isDemo ? "DEMONSTRACAO" : "OFICIAL",
    referenceLabel: sectors[0].referenceLabel,
    isDemo: sectors[0].isDemo,
  };

  const top = sectors
    .slice(0, 3)
    .map((row) => `${row.sector.name} (${formatNumber(toNumber(row.sharePct) ?? 0, 1)}%)`)
    .join(", ");
  builder.fact(
    `Setores de maior participação no valor adicionado de ${municipality.name}: ${top}.`,
    citation,
  );

  const rising = sectors.filter((row) => row.trend === "ALTA" || row.trend === "FORTE_ALTA");
  const falling = sectors.filter((row) => row.trend === "QUEDA" || row.trend === "FORTE_QUEDA");
  if (rising.length) {
    builder.note(
      `Entre os principais setores, ${rising.map((row) => row.sector.name).join(", ")} apresentam tendência de alta na classificação da plataforma.`,
    );
  }
  if (falling.length) {
    builder.note(
      `${falling.map((row) => row.sector.name).join(", ")} aparecem com tendência de queda.`,
    );
  }
}

async function addRadarFacts(
  builder: BundleBuilder,
  municipality: { id: string; name: string },
  windowDays: number,
) {
  const signals = await prisma.radarSignal.findMany({
    where: {
      municipalityId: municipality.id,
      status: "PUBLICADO",
      occurredAt: { gte: new Date(Date.now() - windowDays * 86_400_000) },
    },
    orderBy: [{ score: "desc" }],
    take: 6,
    select: {
      slug: true, headline: true, description: true, category: true, score: true,
      occurredAt: true, isDemo: true,
      sources: {
        take: 1,
        select: { article: { select: { url: true, source: { select: { name: true, tier: true } } } } },
      },
    },
  });

  if (!signals.length) {
    builder.note(
      `Não há movimentos registrados pelo Radar em ${municipality.name} nos últimos ${windowDays} dias.`,
    );
    return;
  }

  for (const signal of signals) {
    const article = signal.sources[0]?.article;
    builder.fact(
      `${formatDate(signal.occurredAt)} — ${signal.headline} (categoria ${signal.category.toLowerCase()}, score ${signal.score}/100).`,
      {
        label: signal.headline,
        kind: "sinal",
        source: article?.source.name ?? "Atlas SP — Radar",
        sourceTier: article?.source.tier ?? "DEMONSTRACAO",
        referenceLabel: formatDate(signal.occurredAt),
        url: article?.url ?? null,
        href: `/radar/${signal.slug}`,
        isDemo: signal.isDemo,
      },
    );
  }
  builder.note(
    `O Radar registrou ${signals.length} movimento(s) relevante(s) em ${municipality.name} nos últimos ${windowDays} dias.`,
  );
}

async function addInvestmentFacts(
  builder: BundleBuilder,
  municipality: { id: string; name: string },
  windowDays: number,
) {
  const investments = await prisma.investment.findMany({
    where: {
      municipalityId: municipality.id,
      announcedAt: { gte: new Date(Date.now() - Math.max(windowDays, 365) * 86_400_000) },
    },
    orderBy: { announcedAt: "desc" },
    take: 6,
    select: {
      slug: true, title: true, amountBRL: true, jobsAnnounced: true, status: true,
      announcedAt: true, sourceUrl: true, isDemo: true,
      company: { select: { name: true } },
      sector: { select: { name: true } },
    },
  });
  if (!investments.length) return;

  let total = 0;
  let jobs = 0;
  for (const investment of investments) {
    const amount = toNumber(investment.amountBRL);
    total += amount ?? 0;
    jobs += investment.jobsAnnounced ?? 0;
    builder.fact(
      `${formatDate(investment.announcedAt)} — ${investment.title}${
        amount ? `, ${formatCurrencyScaled(amount)}` : ""
      }${investment.jobsAnnounced ? `, ${formatNumber(investment.jobsAnnounced)} postos previstos` : ""}.`,
      {
        label: investment.title,
        kind: "investimento",
        source: investment.company?.name ?? "Atlas SP — Investimentos",
        sourceTier: investment.isDemo ? "DEMONSTRACAO" : "JORNALISTICA",
        referenceLabel: formatDate(investment.announcedAt),
        url: investment.sourceUrl,
        href: `/investimentos/${investment.slug}`,
        isDemo: investment.isDemo,
      },
    );
  }
  builder.note(
    `Somados, os anúncios registrados em ${municipality.name} totalizam ${formatCurrencyScaled(total)}${
      jobs ? ` e ${formatNumber(jobs)} postos de trabalho previstos` : ""
    } — valores anunciados, não realizados.`,
  );
}

async function addPoliticsFacts(builder: BundleBuilder, municipality: { id: string; name: string }) {
  const [mandates, council, projects] = await Promise.all([
    prisma.mandate.findMany({
      where: { municipalityId: municipality.id, isCurrent: true },
      select: {
        office: true, startDate: true, endDate: true, isDemo: true, sourceUrl: true,
        person: { select: { name: true, slug: true } },
        party: { select: { acronym: true } },
      },
    }),
    prisma.council.findUnique({
      where: { municipalityId: municipality.id },
      select: { seats: true, legislature: true },
    }),
    prisma.councilProject.count({
      where: {
        councilId: municipality.id,
        presentedAt: { gte: new Date(Date.now() - 365 * 86_400_000) },
      },
    }),
  ]);

  for (const mandate of mandates) {
    builder.fact(
      `${mandate.office === "PREFEITO" ? "Prefeito" : "Vice-prefeito"} de ${municipality.name}: ${mandate.person.name}${
        mandate.party ? ` (${mandate.party.acronym})` : ""
      }, mandato iniciado em ${formatDate(mandate.startDate)}.`,
      {
        label: `Mandato — ${mandate.person.name}`,
        kind: "cadastro",
        source: mandate.isDemo ? "Atlas SP — conjunto de demonstração" : "TSE / prefeitura",
        sourceTier: mandate.isDemo ? "DEMONSTRACAO" : "OFICIAL",
        url: mandate.sourceUrl,
        href: `/pessoa/${mandate.person.slug}`,
        isDemo: mandate.isDemo,
      },
    );
  }
  if (council) {
    builder.fact(
      `A Câmara Municipal de ${municipality.name} tem ${council.seats} cadeiras na legislatura ${council.legislature ?? "atual"}.`,
      {
        label: `Composição da Câmara de ${municipality.name}`,
        kind: "cadastro",
        source: "Atlas SP — cadastro municipal",
        sourceTier: "DEMONSTRACAO",
        isDemo: true,
      },
    );
  }
  if (projects > 0) {
    builder.note(
      `Foram registradas ${projects} proposições na Câmara de ${municipality.name} nos últimos 12 meses.`,
    );
  }
}

async function addNeighborFacts(builder: BundleBuilder, municipality: { id: string; name: string }) {
  const neighbors = await prisma.municipalityNeighbor.findMany({
    where: { fromId: municipality.id },
    orderBy: { borderKm: "desc" },
    take: 8,
    select: { borderKm: true, centroidKm: true, to: { select: { id: true, name: true, slug: true } } },
  });

  if (!neighbors.length) {
    builder.fact(
      `${municipality.name} não faz fronteira terrestre com nenhum outro município.`,
      {
        label: `Vizinhança de ${municipality.name}`,
        kind: "cadastro",
        source: "IBGE — Malha Municipal Digital",
        sourceTier: "OFICIAL",
        isDemo: false,
      },
    );
    return [];
  }

  builder.fact(
    `${municipality.name} faz divisa com ${neighbors.length} municípios: ${neighbors
      .map((neighbor) => neighbor.to.name)
      .join(", ")}.`,
    {
      label: `Vizinhança de ${municipality.name}`,
      kind: "cadastro",
      source: "IBGE — Malha Municipal Digital",
      sourceTier: "OFICIAL",
      isDemo: false,
    },
  );

  const ids = neighbors.map((neighbor) => neighbor.to.id);
  const signals = await prisma.radarSignal.findMany({
    where: {
      municipalityId: { in: ids },
      status: "PUBLICADO",
      occurredAt: { gte: new Date(Date.now() - 90 * 86_400_000) },
    },
    orderBy: { score: "desc" },
    take: 4,
    select: {
      headline: true, slug: true, score: true, isDemo: true, occurredAt: true,
      municipality: { select: { name: true } },
    },
  });
  for (const signal of signals) {
    builder.fact(
      `Movimento em município vizinho — ${signal.municipality.name}: ${signal.headline} (score ${signal.score}/100).`,
      {
        label: signal.headline,
        kind: "sinal",
        source: "Atlas SP — Radar",
        sourceTier: signal.isDemo ? "DEMONSTRACAO" : "JORNALISTICA",
        referenceLabel: formatDate(signal.occurredAt),
        href: `/radar/${signal.slug}`,
        isDemo: signal.isDemo,
      },
    );
  }
  return neighbors;
}

async function addIndexFacts(builder: BundleBuilder, municipality: { id: string; name: string }) {
  const scores = await prisma.indexScore.findMany({
    where: { municipalityId: municipality.id },
    orderBy: { computedAt: "desc" },
    take: 5,
    select: {
      value: true, rank: true, referenceLabel: true,
      index: { select: { name: true, slug: true, disclaimer: true } },
    },
  });
  for (const score of scores) {
    builder.fact(
      `Índice ${score.index.name} de ${municipality.name}: ${formatNumber(toNumber(score.value) ?? 0, 1)}/100${
        score.rank ? `, posição ${score.rank} entre os 645 municípios` : ""
      }.`,
      {
        label: `${score.index.name} · ${score.referenceLabel}`,
        kind: "indice",
        source: "Atlas SP — índice proprietário",
        sourceTier: "SECUNDARIA",
        referenceLabel: score.referenceLabel,
        href: `/economia#${score.index.slug}`,
        isDemo: false,
      },
    );
  }
  if (scores.length) {
    builder.note(
      "Os índices citados são construções proprietárias do Atlas SP, não indicadores oficiais; a metodologia e os componentes de cada um estão abertos na plataforma.",
    );
  }
}

/** Monta o pacote de evidências para uma pergunta em linguagem natural. */
export async function retrieveEvidence(
  question: string,
  options: {
    municipalityId?: string;
    /**
     * Ignora entidades extraídas da pergunta e usa apenas o município passado.
     * Necessário para textos gerados internamente (como o panorama municipal),
     * em que palavras do próprio enunciado poderiam ser lidas como menções.
     */
    restrictToMunicipality?: boolean;
    /** Teto de fatos recuperados, para respostas curtas. */
    maxFacts?: number;
  } = {},
): Promise<EvidenceBundle> {
  const builder = new BundleBuilder();
  const intent = detectIntent(question);
  const windowDays = detectWindowDays(question);
  builder.step(`Intenção detectada: ${intent}`);

  const mentions = options.restrictToMunicipality
    ? []
    : await resolveMentions(question, { minConfidence: 0.55 });
  const municipalityIds = mentions
    .filter((mention) => mention.type === "MUNICIPIO")
    .slice(0, 4)
    .map((mention) => mention.id);
  if (options.municipalityId && !municipalityIds.includes(options.municipalityId)) {
    municipalityIds.unshift(options.municipalityId);
  }

  const [municipalities, sectors, people, companies] = await Promise.all([
    prisma.municipality.findMany({
      where: { id: { in: municipalityIds } },
      select: { id: true, name: true, slug: true },
    }),
    prisma.economicSector.findMany({
      where: { id: { in: mentions.filter((m) => m.type === "SETOR").map((m) => m.id) } },
      select: { id: true, name: true, slug: true },
    }),
    prisma.person.findMany({
      where: { id: { in: mentions.filter((m) => m.type === "PESSOA").map((m) => m.id) } },
      select: { id: true, name: true, slug: true },
    }),
    prisma.company.findMany({
      where: { id: { in: mentions.filter((m) => m.type === "EMPRESA").map((m) => m.id) } },
      select: { id: true, name: true, slug: true },
    }),
  ]);

  // Ordena conforme apareceram na pergunta, para que a comparação faça sentido.
  const ordered = municipalityIds
    .map((id) => municipalities.find((municipality) => municipality.id === id))
    .filter(Boolean) as typeof municipalities;

  if (ordered.length) {
    builder.step(`Entidades ancoradas: ${ordered.map((m) => m.name).join(", ")}`);
  } else {
    builder.step("Nenhuma entidade foi ancorada na pergunta");
  }

  const economicIndicators = [
    "populacao", "pib", "pib-per-capita", "emprego-formal", "saldo-empregos",
    "salario-medio", "empresas-ativas",
  ];

  for (const municipality of ordered) {
    switch (intent) {
      case "economia":
      case "comparacao":
      case "panorama":
        await addIndicatorFacts(builder, municipality, economicIndicators);
        await addSectorFacts(builder, municipality);
        await addIndexFacts(builder, municipality);
        if (intent === "panorama") await addRadarFacts(builder, municipality, windowDays);
        break;
      case "setores":
        await addSectorFacts(builder, municipality);
        await addIndicatorFacts(builder, municipality, ["pib", "emprego-formal", "saldo-empregos"]);
        break;
      case "politica":
        await addPoliticsFacts(builder, municipality);
        await addRadarFacts(builder, municipality, windowDays);
        break;
      case "investimentos":
        await addInvestmentFacts(builder, municipality, windowDays);
        await addSectorFacts(builder, municipality);
        break;
      case "radar":
        await addRadarFacts(builder, municipality, windowDays);
        await addInvestmentFacts(builder, municipality, windowDays);
        break;
      case "vizinhanca":
        // Aqui o que interessa é a relação territorial, não o perfil setorial:
        // só entram o porte econômico da cidade e o que acontece no entorno.
        await addNeighborFacts(builder, municipality);
        await addIndicatorFacts(builder, municipality, ["pib", "emprego-formal"]);
        break;
      default:
        await addIndicatorFacts(builder, municipality, ["populacao", "pib", "pib-per-capita", "emprego-formal"]);
        await addRadarFacts(builder, municipality, windowDays);
        break;
    }
  }

  // Comparação: a leitura comparativa é derivada aqui, não pelo modelo.
  if (intent === "comparacao" && ordered.length >= 2) {
    const comparison = await compareMunicipalities(ordered.map((m) => m.id));
    for (const line of comparison) builder.note(line);
    builder.step("Comparação calculada sobre as séries disponíveis");
  }

  if (!ordered.length && sectors.length) {
    const sector = sectors[0];
    const top = await prisma.municipalitySector.findMany({
      where: { sectorId: sector.id },
      orderBy: { sharePct: "desc" },
      take: 8,
      select: { sharePct: true, isDemo: true, municipality: { select: { name: true, slug: true } } },
    });
    for (const row of top) {
      builder.fact(
        `${row.municipality.name}: ${sector.name} responde por ${formatNumber(toNumber(row.sharePct) ?? 0, 1)}% do valor adicionado.`,
        {
          label: `${sector.name} em ${row.municipality.name}`,
          kind: "indicador",
          source: "Atlas SP — composição setorial",
          sourceTier: row.isDemo ? "DEMONSTRACAO" : "OFICIAL",
          href: `/cidade/${row.municipality.slug}`,
          isDemo: row.isDemo,
        },
      );
    }
  }

  const facts = options.maxFacts ? builder.facts.slice(0, options.maxFacts) : builder.facts;
  // Descarta citações que ficaram sem fato correspondente após o corte, e
  // reindexa os ponteiros para que nenhuma referência aponte para o vazio.
  const usedIndexes = [...new Set(facts.map((fact) => fact.citationIndex))].sort((a, b) => a - b);
  const remap = new Map(usedIndexes.map((original, position) => [original, position]));

  return {
    question,
    intent,
    scope: { municipalities: ordered, sectors, people, companies },
    facts: facts.map((fact) => ({ ...fact, citationIndex: remap.get(fact.citationIndex) ?? 0 })),
    citations: usedIndexes.map((index) => builder.citations[index]),
    notes: options.maxFacts ? builder.notes.slice(0, 5) : builder.notes,
    reasoningPath: builder.reasoningPath,
  };
}

/** Comparação numérica entre municípios, calculada no servidor. */
export async function compareMunicipalities(ids: string[]): Promise<string[]> {
  const points = await prisma.dataPoint.findMany({
    where: {
      municipalityId: { in: ids },
      indicator: { slug: { in: ["populacao", "pib", "pib-per-capita", "emprego-formal"] } },
      referenceLabel: "2024",
    },
    select: {
      municipalityId: true, normalizedValue: true,
      indicator: { select: { slug: true, shortName: true, unit: true, precision: true } },
      municipality: { select: { name: true } },
    },
  });

  const bySlug = new Map<string, Array<{ name: string; value: number; unit: string; precision: number; shortName: string }>>();
  for (const point of points) {
    if (!point.indicator || !point.municipality) continue;
    const value = toNumber(point.normalizedValue);
    if (value === null) continue;
    const list = bySlug.get(point.indicator.slug) ?? [];
    list.push({
      name: point.municipality.name,
      value,
      unit: point.indicator.unit,
      precision: point.indicator.precision,
      shortName: point.indicator.shortName,
    });
    bySlug.set(point.indicator.slug, list);
  }

  const lines: string[] = [];
  for (const [, entries] of bySlug) {
    if (entries.length < 2) continue;
    const sorted = [...entries].sort((a, b) => b.value - a.value);
    const leader = sorted[0];
    const last = sorted[sorted.length - 1];
    const ratio = last.value !== 0 ? leader.value / last.value : null;
    lines.push(
      `Em ${leader.shortName.toLowerCase()}, ${leader.name} lidera com ${formatUnit(
        leader.value,
        leader.unit,
        leader.precision,
      )}, contra ${formatUnit(last.value, last.unit, last.precision)} de ${last.name}${
        ratio && ratio > 1.05 ? ` — uma razão de ${formatNumber(ratio, 1)} vez(es)` : ""
      }.`,
    );
  }
  return lines;
}
