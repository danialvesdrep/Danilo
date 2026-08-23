import type { AIProvider, AtlasAnswer, EvidenceBundle } from "./types";

/**
 * Provedor padrão: redige a resposta a partir exclusivamente do pacote de
 * evidências, sem chamada externa e sem modelo de linguagem.
 *
 * Existe por três razões: garante que a plataforma responda mesmo sem chave de
 * API; serve de linha de base para avaliar os provedores com modelo; e torna
 * impossível, por construção, que a resposta contenha um fato que não veio do
 * banco. Quando não há evidência suficiente, ele diz isso — não preenche.
 */
export class GroundedLocalProvider implements AIProvider {
  readonly name = "grounded-local";

  async compose(bundle: EvidenceBundle): Promise<AtlasAnswer> {
    const usesDemoData = bundle.citations.some((citation) => citation.isDemo);

    if (bundle.facts.length === 0) {
      return {
        headline: "",
        facts: [],
        interpretation: null,
        hypotheses: [],
        citations: bundle.citations,
        provider: this.name,
        confidence: 0,
        insufficientData: true,
        usesDemoData,
        reasoningPath: bundle.reasoningPath,
      };
    }

    const place = bundle.scope.municipalities.map((municipality) => municipality.name);
    const subject =
      place.length === 1 ? place[0] : place.length > 1 ? place.join(" e ") : "o Estado de São Paulo";

    const headline = HEADLINES[bundle.intent](subject, bundle);
    const interpretation = buildInterpretation(bundle);

    // A confiança cai com dados de demonstração e sobe com número de evidências
    // vindas de fonte oficial.
    const official = bundle.citations.filter(
      (citation) => citation.sourceTier === "OFICIAL" && !citation.isDemo,
    ).length;
    const confidence = Math.min(
      0.9,
      0.28 + Math.min(bundle.facts.length, 8) * 0.05 + official * 0.06 - (usesDemoData ? 0.15 : 0),
    );

    return {
      headline,
      facts: bundle.facts,
      interpretation,
      hypotheses: buildHypotheses(bundle),
      citations: bundle.citations,
      provider: this.name,
      confidence: Math.max(0.1, confidence),
      insufficientData: false,
      usesDemoData,
      reasoningPath: bundle.reasoningPath,
    };
  }
}

const HEADLINES: Record<EvidenceBundle["intent"], (subject: string, bundle: EvidenceBundle) => string> = {
  panorama: (subject) => `Panorama de ${subject} a partir dos dados disponíveis na plataforma.`,
  economia: (subject) => `Leitura econômica de ${subject} com base nas séries carregadas.`,
  comparacao: (subject) => `Comparação entre ${subject} nos indicadores disponíveis.`,
  setores: (subject) => `Composição setorial de ${subject} segundo o valor adicionado.`,
  politica: (subject) => `Situação político-institucional registrada para ${subject}.`,
  investimentos: (subject) => `Investimentos registrados em ${subject} no período coberto.`,
  radar: (subject) => `Movimentos detectados pelo Radar em ${subject}.`,
  vizinhanca: (subject) => `Relações territoriais de ${subject} e municípios do entorno.`,
  indefinida: (subject) => `O que a plataforma sabe sobre ${subject}.`,
};

function buildInterpretation(bundle: EvidenceBundle): string | null {
  if (bundle.notes.length === 0) return null;
  // As notas são conclusões já derivadas na recuperação — comparações entre
  // séries, posições em ranking, contagens. Aqui elas viram texto corrido,
  // sempre rotuladas como leitura, nunca como fato novo.
  return bundle.notes.join(" ");
}

function buildHypotheses(bundle: EvidenceBundle): AtlasAnswer["hypotheses"] {
  const hypotheses: AtlasAnswer["hypotheses"] = [];
  const hasInvestment = bundle.facts.some((fact) => /investimento|aporte/i.test(fact.statement));
  const hasEmployment = bundle.facts.some((fact) => /emprego|vínculo/i.test(fact.statement));

  if (hasInvestment && hasEmployment) {
    hypotheses.push({
      statement:
        "Os anúncios de investimento registrados podem ajudar a explicar o comportamento recente do emprego formal, mas os dados disponíveis não permitem estabelecer a relação.",
      wouldConfirm:
        "Séries mensais de admissões por seção CNAE no município, cruzadas com a data de início de operação de cada projeto.",
    });
  }
  if (bundle.intent === "vizinhanca") {
    hypotheses.push({
      statement:
        "O efeito sobre os municípios vizinhos tende a depender da existência de cadeia de fornecedores local, o que a plataforma ainda não mede diretamente.",
      wouldConfirm:
        "Dados de relação comercial entre empresas por município, ou matriz insumo-produto regional.",
    });
  }
  if (bundle.citations.some((citation) => citation.isDemo)) {
    hypotheses.push({
      statement:
        "Parte das evidências acima vem do conjunto de demonstração; qualquer leitura só se sustenta depois de conectadas as ingestões oficiais.",
      wouldConfirm: "Sincronização das fontes IBGE, SEADE, Novo CAGED e Tesouro Nacional.",
    });
  }
  return hypotheses;
}
