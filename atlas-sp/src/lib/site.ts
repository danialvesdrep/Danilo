export const SITE = {
  name: "Atlas SP",
  tagline: "Inteligência territorial, econômica e política do Estado de São Paulo",
  description:
    "Acompanhe os 645 municípios paulistas em um só lugar: economia, política, empresas, investimentos, indicadores e os movimentos que merecem atenção — sempre com a fonte ao lado do dado.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  locale: "pt_BR",
  municipalityCount: 645,
} as const;

export const DISCLAIMER_INDEX =
  "Índice proprietário do Atlas SP. Não é indicador oficial e não substitui análise própria.";
