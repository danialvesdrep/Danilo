import type { SignalCategory } from "@prisma/client";

/**
 * Motor de pontuação do Radar.
 *
 * O score é um ÍNDICE PROPRIETÁRIO do Atlas SP, não um indicador oficial.
 * Ele existe para ordenar a atenção do usuário, não para medir a realidade.
 * Cada componente é registrado em `scoreRationale` para que a interface possa
 * abrir a caixa-preta e mostrar exatamente como o número foi formado.
 */

export const SCORE_WEIGHTS = {
  importance: 0.32,
  urgency: 0.18,
  economicImpact: 0.22,
  politicalImpact: 0.12,
  regionalImpact: 0.16,
} as const;

export const SCORE_METHODOLOGY = `O score do Radar combina cinco eixos, cada um normalizado de 0 a 100:

• Importância (peso ${SCORE_WEIGHTS.importance * 100}%) — porte do município, número de fontes independentes e natureza do movimento.
• Urgência (peso ${SCORE_WEIGHTS.urgency * 100}%) — quão recente é o movimento; decai ao longo de 45 dias.
• Impacto econômico (peso ${SCORE_WEIGHTS.economicImpact * 100}%) — valor anunciado e empregos previstos, relativizados pelo PIB municipal.
• Impacto político (peso ${SCORE_WEIGHTS.politicalImpact * 100}%) — se o movimento passa por decisão do Executivo, da Câmara ou de órgão regulador.
• Impacto regional (peso ${SCORE_WEIGHTS.regionalImpact * 100}%) — capacidade de transbordar para municípios vizinhos, ponderada pela concentração do setor na cidade.

É um índice proprietário, calculado a partir dos dados disponíveis na plataforma. Não substitui análise própria e não deve ser lido como medida oficial de relevância.`;

/** Peso político e regional por categoria de movimento. */
const CATEGORY_PROFILE: Record<SignalCategory, { political: number; regional: number; base: number }> = {
  INVESTIMENTO: { political: 35, regional: 78, base: 72 },
  EMPREGO: { political: 30, regional: 55, base: 60 },
  INDUSTRIA: { political: 28, regional: 72, base: 66 },
  COMERCIO: { political: 20, regional: 40, base: 50 },
  SERVICOS: { political: 20, regional: 45, base: 52 },
  AGRONEGOCIO: { political: 32, regional: 70, base: 62 },
  TECNOLOGIA: { political: 25, regional: 60, base: 62 },
  INFRAESTRUTURA: { political: 62, regional: 85, base: 70 },
  OBRAS: { political: 66, regional: 70, base: 64 },
  POLITICA: { political: 92, regional: 35, base: 58 },
  GOVERNO: { political: 88, regional: 38, base: 58 },
  CAMARA: { political: 85, regional: 30, base: 52 },
  EMPRESAS: { political: 22, regional: 55, base: 58 },
  SAUDE: { political: 58, regional: 66, base: 58 },
  EDUCACAO: { political: 55, regional: 52, base: 54 },
  LOGISTICA: { political: 35, regional: 80, base: 62 },
  PORTOS: { political: 48, regional: 92, base: 70 },
  ENERGIA: { political: 55, regional: 82, base: 66 },
  TURISMO: { political: 30, regional: 48, base: 48 },
  MEIO_AMBIENTE: { political: 62, regional: 68, base: 56 },
  JUSTICA: { political: 78, regional: 45, base: 58 },
  REGULACAO: { political: 80, regional: 60, base: 60 },
  CLIMA: { political: 45, regional: 75, base: 58 },
  ARRECADACAO: { political: 70, regional: 35, base: 54 },
  FINANCAS_PUBLICAS: { political: 74, regional: 35, base: 56 },
};

export type ScoreInput = {
  category: SignalCategory;
  /** População do município — proxy de alcance do movimento. */
  population: number;
  /** PIB municipal, usado para relativizar o valor anunciado. */
  gdp: number;
  amountBRL?: number | null;
  jobs?: number | null;
  /** Número de fontes independentes que sustentam o movimento. */
  sourceCount: number;
  daysAgo: number;
  /** Participação do setor no valor adicionado do município (0..100). */
  sectorShare: number;
  /** Momento econômico do município (-1..1). */
  momentum: number;
};

export type ScoreComponent = {
  key: string;
  label: string;
  value: number;
  weight: number;
  detail: string;
};

export type ScoreResult = {
  importance: number;
  urgency: number;
  economicImpact: number;
  politicalImpact: number;
  regionalImpact: number;
  score: number;
  scoreRationale: {
    methodologyVersion: string;
    components: ScoreComponent[];
    /** Frases curtas que a interface usa em "Por que este score?". */
    drivers: string[];
  };
};

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

/** Escala logarítmica: diferencia bem tanto R$ 10 mi quanto R$ 1 bi. */
const logScale = (value: number, floor: number, ceiling: number) => {
  if (value <= floor) return 0;
  if (value >= ceiling) return 100;
  return ((Math.log10(value) - Math.log10(floor)) / (Math.log10(ceiling) - Math.log10(floor))) * 100;
};

export function scoreSignal(input: ScoreInput): ScoreResult {
  const profile = CATEGORY_PROFILE[input.category];
  const drivers: string[] = [];

  // ── Importância ───────────────────────────────────────────────
  const reach = logScale(Math.max(input.population, 1), 2_000, 12_000_000);
  const corroboration = clamp((Math.min(input.sourceCount, 4) / 4) * 100);
  const importance = clamp(profile.base * 0.5 + reach * 0.32 + corroboration * 0.18);
  if (reach > 70) drivers.push("Município de grande porte, o que amplia o alcance do movimento.");
  if (input.sourceCount >= 3) drivers.push(`Movimento sustentado por ${input.sourceCount} fontes independentes.`);
  else if (input.sourceCount === 1) drivers.push("Movimento sustentado por uma única fonte — confirmação pendente.");

  // ── Urgência ──────────────────────────────────────────────────
  // Decaimento exponencial com meia-vida de ~10 dias.
  const urgency = clamp(100 * Math.exp(-input.daysAgo / 14));
  if (input.daysAgo <= 2) drivers.push("Detectado nas últimas 48 horas.");

  // ── Impacto econômico ─────────────────────────────────────────
  const amount = input.amountBRL ?? 0;
  const absoluteAmount = amount > 0 ? logScale(amount, 1e6, 3e9) : 0;
  // Relevância relativa: quanto o anúncio pesa frente ao PIB municipal.
  const relativeAmount = amount > 0 && input.gdp > 0 ? clamp((amount / input.gdp) * 900) : 0;
  const jobsScore = input.jobs ? logScale(input.jobs, 10, 5_000) : 0;
  const economicImpact = amount > 0 || input.jobs
    ? clamp(absoluteAmount * 0.4 + relativeAmount * 0.35 + jobsScore * 0.25)
    : clamp(profile.base * 0.55 + Math.abs(input.momentum) * 20);
  if (relativeAmount > 55) drivers.push("Valor anunciado é expressivo frente ao PIB do município.");
  if ((input.jobs ?? 0) >= 500) drivers.push(`Previsão de ${input.jobs} postos de trabalho.`);

  // ── Impacto político ──────────────────────────────────────────
  const politicalImpact = clamp(profile.political + (input.category === "POLITICA" ? reach * 0.08 : 0));

  // ── Impacto regional ──────────────────────────────────────────
  // Setores concentrados transbordam mais: a cadeia local é mais densa.
  const concentration = clamp(input.sectorShare * 2.2);
  const regionalImpact = clamp(profile.regional * 0.62 + concentration * 0.23 + reach * 0.15);
  if (regionalImpact > 72) drivers.push("Alto potencial de transbordamento para municípios vizinhos.");

  const components: ScoreComponent[] = [
    { key: "importance", label: "Importância", value: Math.round(importance), weight: SCORE_WEIGHTS.importance,
      detail: `Porte do município e corroboração por ${input.sourceCount} fonte(s).` },
    { key: "urgency", label: "Urgência", value: Math.round(urgency), weight: SCORE_WEIGHTS.urgency,
      detail: `Movimento detectado há ${input.daysAgo} dia(s); decaimento com meia-vida de 14 dias.` },
    { key: "economicImpact", label: "Impacto econômico", value: Math.round(economicImpact), weight: SCORE_WEIGHTS.economicImpact,
      detail: amount > 0
        ? `Valor anunciado e empregos previstos, relativizados pelo PIB municipal.`
        : `Sem valor anunciado; estimado pela natureza do movimento e pelo momento econômico local.` },
    { key: "politicalImpact", label: "Impacto político", value: Math.round(politicalImpact), weight: SCORE_WEIGHTS.politicalImpact,
      detail: `Grau de dependência de decisão pública para a categoria ${input.category.toLowerCase()}.` },
    { key: "regionalImpact", label: "Impacto regional", value: Math.round(regionalImpact), weight: SCORE_WEIGHTS.regionalImpact,
      detail: `Concentração do setor no município (${input.sectorShare.toFixed(1)}% do valor adicionado) e alcance territorial.` },
  ];

  const score = Math.round(
    components.reduce((sum, component) => sum + component.value * component.weight, 0),
  );

  return {
    importance: Math.round(importance),
    urgency: Math.round(urgency),
    economicImpact: Math.round(economicImpact),
    politicalImpact: Math.round(politicalImpact),
    regionalImpact: Math.round(regionalImpact),
    score: clamp(score),
    scoreRationale: { methodologyVersion: "radar-v1", components, drivers },
  };
}

/** Faixas usadas na interface para traduzir o score em linguagem simples. */
export function scoreBand(score: number): { label: string; tone: "critico" | "alto" | "medio" | "baixo" } {
  if (score >= 78) return { label: "Prioridade máxima", tone: "critico" };
  if (score >= 62) return { label: "Alta relevância", tone: "alto" };
  if (score >= 45) return { label: "Relevância moderada", tone: "medio" };
  return { label: "Monitoramento", tone: "baixo" };
}
