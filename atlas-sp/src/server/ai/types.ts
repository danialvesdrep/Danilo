/** Contratos da camada de IA. Nenhuma tela conhece o provedor concreto. */

export type Citation = {
  /** Identificador legível da evidência, ex.: "IBGE · PIB · 2024". */
  label: string;
  kind: "indicador" | "noticia" | "documento" | "sinal" | "investimento" | "cadastro" | "indice";
  source: string;
  sourceTier: "OFICIAL" | "INSTITUCIONAL" | "JORNALISTICA" | "SECUNDARIA" | "DEMONSTRACAO";
  referenceLabel?: string | null;
  url?: string | null;
  href?: string | null;
  isDemo: boolean;
};

/** Um fato é sempre uma afirmação verificável ancorada em uma citação. */
export type Fact = {
  statement: string;
  citationIndex: number;
  value?: number | null;
  unit?: string | null;
};

export type Hypothesis = {
  statement: string;
  /** O que confirmaria ou refutaria a hipótese. */
  wouldConfirm: string;
};

export type AtlasAnswer = {
  /** Resposta em uma frase; vazia quando não há dados suficientes. */
  headline: string;
  facts: Fact[];
  /** Leitura derivada dos fatos — explicitamente separada deles. */
  interpretation: string | null;
  hypotheses: Hypothesis[];
  citations: Citation[];
  provider: string;
  model?: string | null;
  confidence: number;
  insufficientData: boolean;
  /** Aviso exibido quando a resposta se apoia em dados de demonstração. */
  usesDemoData: boolean;
  /** Caminho percorrido no grafo, quando houve. */
  reasoningPath?: string[];
};

/** Pacote de evidências recuperado do banco antes de qualquer geração. */
export type EvidenceBundle = {
  question: string;
  scope: {
    municipalities: Array<{ id: string; name: string; slug: string }>;
    sectors: Array<{ id: string; name: string; slug: string }>;
    people: Array<{ id: string; name: string; slug: string }>;
    companies: Array<{ id: string; name: string; slug: string }>;
  };
  intent: QuestionIntent;
  facts: Fact[];
  citations: Citation[];
  notes: string[];
  reasoningPath: string[];
};

export type QuestionIntent =
  | "panorama"
  | "economia"
  | "comparacao"
  | "setores"
  | "politica"
  | "investimentos"
  | "radar"
  | "vizinhanca"
  | "indefinida";

export interface AIProvider {
  readonly name: string;
  readonly model?: string;
  /**
   * Recebe evidências já recuperadas e devolve a redação.
   * Contrato inegociável: o provedor não pode introduzir fatos que não estejam
   * no pacote — o que ele acrescenta é organização e linguagem.
   */
  compose(bundle: EvidenceBundle): Promise<AtlasAnswer>;
}
