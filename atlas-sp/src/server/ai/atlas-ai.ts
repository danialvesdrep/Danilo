import "server-only";
import { createHash } from "node:crypto";
import { prisma, toNumber } from "@/server/db/prisma";
import { createProvider } from "./remote-provider";
import { retrieveEvidence } from "./retrieval";
import { formatCurrencyScaled, formatDate, formatNumber } from "@/lib/format";
import type { AtlasAnswer, Citation, EvidenceBundle, Fact } from "./types";

/** Orquestração do Atlas AI: recuperar → compor → registrar. */

export async function ask(
  question: string,
  options: { municipalityId?: string; userId?: string; persist?: boolean } = {},
): Promise<AtlasAnswer> {
  const bundle = await retrieveEvidence(question, { municipalityId: options.municipalityId });

  if (bundle.facts.length === 0) {
    return {
      headline: "",
      facts: [],
      interpretation: null,
      hypotheses: [],
      citations: bundle.citations,
      provider: "grounded-local",
      confidence: 0,
      insufficientData: true,
      usesDemoData: false,
      reasoningPath: [
        ...bundle.reasoningPath,
        "Nenhuma evidência recuperada — a pergunta não foi respondida",
      ],
    };
  }

  const provider = createProvider();
  const answer = await provider.compose(bundle);

  if (options.persist !== false && options.municipalityId) {
    await persistAnalysis(answer, bundle, "RESPOSTA_PERGUNTA", { municipalityId: options.municipalityId });
  }
  return answer;
}

async function persistAnalysis(
  answer: AtlasAnswer,
  bundle: EvidenceBundle,
  kind: "PANORAMA_MUNICIPAL" | "POR_QUE_IMPORTA" | "CONTEXTO_ECONOMICO" | "COMPARACAO" | "RESPOSTA_PERGUNTA" | "MOMENTO_ECONOMICO",
  target: { municipalityId?: string; signalId?: string },
) {
  await prisma.aIAnalysis.create({
    data: {
      kind,
      municipalityId: target.municipalityId ?? null,
      signalId: target.signalId ?? null,
      question: bundle.question,
      facts: answer.facts as never,
      interpretation: answer.interpretation,
      hypotheses: answer.hypotheses as never,
      citations: answer.citations as never,
      provider: answer.provider,
      model: answer.model ?? null,
      promptHash: createHash("sha256").update(bundle.question).digest("hex").slice(0, 32),
      confidence: answer.confidence,
      insufficientData: answer.insufficientData,
      expiresAt: new Date(Date.now() + 24 * 3_600_000),
    },
  });
}

/**
 * "Por que isso importa?" — o fluxo central do produto.
 *
 * Cruza o movimento com a cidade, o setor, os indicadores, o emprego, o
 * histórico, os investimentos e os municípios vizinhos, e devolve contexto
 * rastreável. Nada aqui é opinião sobre mérito: a saída descreve mecanismos
 * plausíveis e diz o que confirmaria cada um.
 */
export async function explainSignal(signalSlug: string): Promise<AtlasAnswer | null> {
  const signal = await prisma.radarSignal.findUnique({
    where: { slug: signalSlug },
    select: {
      id: true, slug: true, headline: true, description: true, category: true, score: true,
      occurredAt: true, isDemo: true, scoreRationale: true,
      municipality: { select: { id: true, name: true, slug: true, mesoName: true } },
      sector: { select: { id: true, name: true, slug: true } },
      company: { select: { id: true, name: true, slug: true } },
      investment: { select: { amountBRL: true, jobsAnnounced: true, status: true, expectedAt: true } },
      sources: {
        select: {
          article: {
            select: {
              title: true, url: true, publishedAt: true, isDemo: true,
              source: { select: { name: true, tier: true } },
            },
          },
        },
      },
    },
  });
  if (!signal) return null;

  const cached = await prisma.aIAnalysis.findFirst({
    where: { signalId: signal.id, kind: "POR_QUE_IMPORTA", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (cached) {
    return {
      headline: (cached.facts as never as Fact[])[0]?.statement ?? "",
      facts: cached.facts as never as Fact[],
      interpretation: cached.interpretation,
      hypotheses: cached.hypotheses as never as AtlasAnswer["hypotheses"],
      citations: cached.citations as never as Citation[],
      provider: cached.provider,
      model: cached.model,
      confidence: toNumber(cached.confidence) ?? 0.5,
      insufficientData: cached.insufficientData,
      usesDemoData: (cached.citations as never as Citation[]).some((citation) => citation.isDemo),
    };
  }

  const facts: Fact[] = [];
  const citations: Citation[] = [];
  const notes: string[] = [];
  const cite = (citation: Citation) => {
    citations.push(citation);
    return citations.length - 1;
  };

  const signalCitation = cite({
    label: signal.headline,
    kind: "sinal",
    source: signal.sources[0]?.article.source.name ?? "Atlas SP — Radar",
    sourceTier: signal.sources[0]?.article.source.tier ?? "DEMONSTRACAO",
    referenceLabel: formatDate(signal.occurredAt),
    url: signal.sources[0]?.article.url ?? null,
    href: `/radar/${signal.slug}`,
    isDemo: signal.isDemo,
  });
  facts.push({
    statement: `${formatDate(signal.occurredAt)} — ${signal.headline}, em ${signal.municipality.name}.`,
    citationIndex: signalCitation,
  });

  // Valor e empregos anunciados, relativizados pela economia local.
  const amount = toNumber(signal.investment?.amountBRL);
  const gdpPoint = await prisma.dataPoint.findFirst({
    where: { municipalityId: signal.municipality.id, indicator: { slug: "pib" } },
    orderBy: { referenceStart: "desc" },
    select: {
      normalizedValue: true, referenceLabel: true, isDemo: true,
      source: { select: { name: true, organization: true, tier: true, url: true } },
    },
  });
  const gdp = gdpPoint ? toNumber(gdpPoint.normalizedValue) : null;

  if (gdpPoint && gdp) {
    const index = cite({
      label: `PIB de ${signal.municipality.name} · ${gdpPoint.referenceLabel}`,
      kind: "indicador",
      source: `${gdpPoint.source.organization} — ${gdpPoint.source.name}`,
      sourceTier: gdpPoint.source.tier,
      referenceLabel: gdpPoint.referenceLabel,
      url: gdpPoint.source.url,
      isDemo: gdpPoint.isDemo,
    });
    facts.push({
      statement: `PIB de ${signal.municipality.name} em ${gdpPoint.referenceLabel}: ${formatCurrencyScaled(gdp)}.`,
      citationIndex: index,
    });
    if (amount) {
      const share = (amount / gdp) * 100;
      notes.push(
        `O valor anunciado (${formatCurrencyScaled(amount)}) equivale a ${formatNumber(share, share < 1 ? 2 : 1)}% do PIB municipal de ${gdpPoint.referenceLabel} — é essa ordem de grandeza que define se o movimento tem peso local ou apenas setorial.`,
      );
    }
  }

  if (signal.investment?.jobsAnnounced) {
    const employmentPoint = await prisma.dataPoint.findFirst({
      where: { municipalityId: signal.municipality.id, indicator: { slug: "emprego-formal" } },
      orderBy: { referenceStart: "desc" },
      select: {
        normalizedValue: true, referenceLabel: true, isDemo: true,
        source: { select: { name: true, organization: true, tier: true, url: true } },
      },
    });
    const stock = employmentPoint ? toNumber(employmentPoint.normalizedValue) : null;
    if (employmentPoint && stock) {
      const index = cite({
        label: `Emprego formal em ${signal.municipality.name} · ${employmentPoint.referenceLabel}`,
        kind: "indicador",
        source: `${employmentPoint.source.organization} — ${employmentPoint.source.name}`,
        sourceTier: employmentPoint.source.tier,
        referenceLabel: employmentPoint.referenceLabel,
        url: employmentPoint.source.url,
        isDemo: employmentPoint.isDemo,
      });
      facts.push({
        statement: `Estoque de empregos formais em ${signal.municipality.name}: ${formatNumber(stock)} vínculos (${employmentPoint.referenceLabel}).`,
        citationIndex: index,
      });
      const share = (signal.investment.jobsAnnounced / stock) * 100;
      notes.push(
        `Os ${formatNumber(signal.investment.jobsAnnounced)} postos anunciados representariam ${formatNumber(share, 2)}% do estoque atual de vínculos formais do município, caso se concretizem integralmente.`,
      );
    }
  }

  // Peso do setor na economia local: define o alcance da cadeia afetada.
  if (signal.sector) {
    const sectorProfile = await prisma.municipalitySector.findUnique({
      where: { municipalityId_sectorId: { municipalityId: signal.municipality.id, sectorId: signal.sector.id } },
      select: { sharePct: true, employmentPct: true, trend: true, referenceLabel: true, isDemo: true },
    });
    if (sectorProfile) {
      const share = toNumber(sectorProfile.sharePct) ?? 0;
      const index = cite({
        label: `${signal.sector.name} em ${signal.municipality.name}`,
        kind: "indicador",
        source: "Atlas SP — composição setorial",
        sourceTier: sectorProfile.isDemo ? "DEMONSTRACAO" : "OFICIAL",
        referenceLabel: sectorProfile.referenceLabel,
        href: `/setores/${signal.sector.slug}`,
        isDemo: sectorProfile.isDemo,
      });
      facts.push({
        statement: `${signal.sector.name} responde por ${formatNumber(share, 1)}% do valor adicionado de ${signal.municipality.name}.`,
        citationIndex: index,
      });
      notes.push(
        share > 20
          ? `Por ser um setor concentrado na cidade, movimentos nele tendem a se propagar a fornecedores, arrecadação e emprego local com mais intensidade.`
          : `Como o setor não é dominante na cidade, o efeito tende a ficar mais contido na própria cadeia do que na economia municipal como um todo.`,
      );
    }
  }

  // Histórico: movimentos anteriores da mesma empresa ou do mesmo setor na cidade.
  const history = await prisma.radarSignal.findMany({
    where: {
      municipalityId: signal.municipality.id,
      id: { not: signal.id },
      OR: [
        signal.company ? { companyId: signal.company.id } : {},
        signal.sector ? { sectorId: signal.sector.id } : {},
      ].filter((clause) => Object.keys(clause).length > 0),
      occurredAt: { lt: signal.occurredAt },
    },
    orderBy: { occurredAt: "desc" },
    take: 3,
    select: { headline: true, slug: true, occurredAt: true, isDemo: true },
  });
  for (const previous of history) {
    const index = cite({
      label: previous.headline,
      kind: "sinal",
      source: "Atlas SP — Radar",
      sourceTier: previous.isDemo ? "DEMONSTRACAO" : "JORNALISTICA",
      referenceLabel: formatDate(previous.occurredAt),
      href: `/radar/${previous.slug}`,
      isDemo: previous.isDemo,
    });
    facts.push({
      statement: `Antecedente na mesma cidade e setor: ${previous.headline} (${formatDate(previous.occurredAt)}).`,
      citationIndex: index,
    });
  }
  if (history.length) {
    notes.push(
      `O movimento não é isolado: a plataforma registra ${history.length} evento(s) anterior(es) do mesmo setor ou da mesma empresa na cidade.`,
    );
  }

  // Transbordamento regional: quem está no raio de influência.
  const neighbors = await prisma.municipalityNeighbor.findMany({
    where: { fromId: signal.municipality.id },
    orderBy: { borderKm: "desc" },
    take: 6,
    select: { to: { select: { name: true, slug: true } }, borderKm: true },
  });
  if (neighbors.length) {
    const index = cite({
      label: `Vizinhança de ${signal.municipality.name}`,
      kind: "cadastro",
      source: "IBGE — Malha Municipal Digital",
      sourceTier: "OFICIAL",
      isDemo: false,
    });
    facts.push({
      statement: `Municípios limítrofes de ${signal.municipality.name}: ${neighbors.map((neighbor) => neighbor.to.name).join(", ")}.`,
      citationIndex: index,
    });
    notes.push(
      `Efeitos sobre mão de obra e fornecedores costumam atravessar a divisa municipal — ${neighbors
        .slice(0, 3)
        .map((neighbor) => neighbor.to.name)
        .join(", ")} são os vizinhos com maior extensão de fronteira.`,
    );
  }

  const bundle: EvidenceBundle = {
    question: `Por que "${signal.headline}" importa?`,
    intent: "radar",
    scope: {
      municipalities: [signal.municipality],
      sectors: signal.sector ? [signal.sector] : [],
      companies: signal.company ? [signal.company] : [],
      people: [],
    },
    facts,
    citations,
    notes,
    reasoningPath: [
      `Movimento em ${signal.municipality.name} (categoria ${signal.category.toLowerCase()})`,
      signal.sector ? `Setor ${signal.sector.name}` : "Sem setor associado",
      signal.company ? `Empresa ${signal.company.name}` : "Sem empresa associada",
      "Cruzamento com PIB, emprego, composição setorial, histórico e vizinhança",
    ],
  };

  const answer = await createProvider().compose(bundle);
  await persistAnalysis(answer, bundle, "POR_QUE_IMPORTA", { signalId: signal.id });
  return answer;
}

/** Panorama do município exibido no topo do perfil. */
export async function municipalityOverview(municipalityId: string, municipalityName: string) {
  const cached = await prisma.aIAnalysis.findFirst({
    where: { municipalityId, kind: "PANORAMA_MUNICIPAL", expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (cached) {
    return {
      headline: cached.interpretation ?? "",
      facts: cached.facts as never as Fact[],
      interpretation: cached.interpretation,
      hypotheses: cached.hypotheses as never as AtlasAnswer["hypotheses"],
      citations: cached.citations as never as Citation[],
      provider: cached.provider,
      model: cached.model,
      confidence: toNumber(cached.confidence) ?? 0.5,
      insufficientData: cached.insufficientData,
      usesDemoData: (cached.citations as never as Citation[]).some((citation) => citation.isDemo),
    } satisfies AtlasAnswer;
  }

  // O enunciado é interno: restringimos o escopo ao município para que palavras
  // do próprio texto não sejam lidas como menção a outra cidade.
  const bundle = await retrieveEvidence(
    `Como está a economia de ${municipalityName} e o que mudou recentemente?`,
    { municipalityId, restrictToMunicipality: true, maxFacts: 8 },
  );
  const answer = await createProvider().compose(bundle);
  await persistAnalysis(answer, bundle, "PANORAMA_MUNICIPAL", { municipalityId });
  return answer;
}

export const SAMPLE_QUESTIONS = [
  "Como está a economia de Campinas?",
  "Quais setores mais empregam em Sorocaba?",
  "Compare Campinas e São José dos Campos.",
  "O que mudou na economia de Ribeirão Preto?",
  "Quais foram os principais acontecimentos políticos em Santos nos últimos 30 dias?",
  "Quais são os principais projetos da Câmara de Jundiaí?",
  "Quais cidades vizinhas de Sorocaba podem ser afetadas por um investimento industrial?",
  "Quais municípios tiveram novos investimentos industriais?",
];
