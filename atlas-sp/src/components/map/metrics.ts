/** Métricas temáticas do mapa. Cada uma define escala, formato e legenda. */
import { formatCompact, formatCurrencyScaled, formatNumber } from "@/lib/format";

export type MapMetricKey =
  | "pib" | "pibPerCapita" | "populacao" | "densidade" | "emprego"
  | "receita" | "investimentos" | "sinais" | "setor";

export type MapMetric = {
  key: MapMetricKey;
  label: string;
  shortLabel: string;
  description: string;
  /** Escala logarítmica é obrigatória para grandezas com cauda longa. */
  scale: "log" | "linear" | "categorical";
  format: (value: number | null) => string;
  unit?: string;
};

export const MAP_METRICS: MapMetric[] = [
  {
    key: "pib", label: "PIB municipal", shortLabel: "PIB", scale: "log",
    description: "Produto interno bruto a preços correntes, último ano disponível.",
    format: (value) => formatCurrencyScaled(value),
  },
  {
    key: "pibPerCapita", label: "PIB per capita", shortLabel: "PIB per capita", scale: "log",
    description: "PIB dividido pela população residente estimada.",
    format: (value) => (value === null ? "—" : `R$ ${formatCompact(value)}`),
  },
  {
    key: "populacao", label: "População", shortLabel: "População", scale: "log",
    description: "População residente estimada.",
    format: (value) => (value === null ? "—" : formatCompact(value)),
  },
  {
    key: "densidade", label: "Densidade demográfica", shortLabel: "Densidade", scale: "log",
    description: "Habitantes por km², derivada da área calculada sobre a malha do IBGE.",
    format: (value) => (value === null ? "—" : `${formatNumber(value, 0)} hab/km²`),
  },
  {
    key: "emprego", label: "Empregos formais", shortLabel: "Emprego", scale: "log",
    description: "Estoque de vínculos formais ativos.",
    format: (value) => (value === null ? "—" : formatCompact(value)),
  },
  {
    key: "receita", label: "Receita municipal", shortLabel: "Receita", scale: "log",
    description: "Receita corrente realizada no exercício.",
    format: (value) => formatCurrencyScaled(value),
  },
  {
    key: "investimentos", label: "Investimentos anunciados", shortLabel: "Investimentos", scale: "log",
    description: "Soma dos valores anunciados nos últimos 12 meses.",
    format: (value) => (value ? formatCurrencyScaled(value) : "Sem registro"),
  },
  {
    key: "sinais", label: "Atividade no Radar", shortLabel: "Radar", scale: "linear",
    description: "Movimentos detectados nos últimos 90 dias.",
    format: (value) => (value === null || value === 0 ? "Sem movimento" : `${formatNumber(value)} movimento(s)`),
  },
  {
    key: "setor", label: "Setor predominante", shortLabel: "Setor", scale: "categorical",
    description: "Setor de maior participação no valor adicionado do município.",
    format: () => "—",
  },
];

export const MAP_METRIC_BY_KEY = new Map(MAP_METRICS.map((metric) => [metric.key, metric]));

/**
 * Paleta sequencial em cinco degraus, calibrada para funcionar nos dois temas.
 * Evitamos arco-íris: variação de luminosidade em um único matiz é mais legível
 * e não sugere categorias onde há continuidade.
 */
export const CHOROPLETH_STOPS = {
  light: ["#e9e5de", "#bdd2d9", "#8ab2c0", "#4f8ba1", "#23566a"],
  dark: ["#24211d", "#2c4b57", "#3a6d80", "#4f92aa", "#7fbdd3"],
} as const;

export const NO_DATA_COLOR = { light: "#f0ede8", dark: "#1c1a17" } as const;

/** Quebras por quantis: distribui as cores pela distribuição real dos dados. */
export function computeBreaks(values: number[], buckets = 5): number[] {
  const sorted = values.filter((value) => Number.isFinite(value) && value > 0).sort((a, b) => a - b);
  if (sorted.length < buckets) return sorted;
  const breaks: number[] = [];
  for (let i = 1; i < buckets; i++) {
    breaks.push(sorted[Math.floor((i / buckets) * sorted.length)]);
  }
  return breaks;
}
