/**
 * Definição dos índices proprietários do Atlas SP.
 *
 * Vive em `src/lib` porque tanto o seed quanto as telas de metodologia
 * precisam da mesma descrição — a fonte da verdade é uma só.
 */
export const INDEX_DISCLAIMER =
  "Índice proprietário do Atlas SP, calculado a partir dos dados disponíveis na plataforma. Não é indicador oficial, não é produzido por órgão estatístico e não deve ser citado como medida oficial. A composição e os pesos estão descritos na metodologia e os componentes podem ser abertos item a item.";

export const INDICES = [
  {
    slug: "economic-momentum",
    name: "Economic Momentum",
    description:
      "Sintetiza o ritmo recente da economia municipal combinando emprego, abertura de empresas e movimentos econômicos detectados pelo Radar.",
    methodology:
      "Média ponderada de quatro componentes normalizados de 0 a 100 no universo dos 645 municípios: saldo de empregos dos últimos 12 meses relativo ao estoque (35%), variação do PIB no último par de anos disponível (25%), abertura líquida de empresas (20%) e densidade de sinais econômicos do Radar nos últimos 90 dias (20%).",
    components: [
      { signalKey: "saldo-empregos-relativo", label: "Saldo de empregos relativo ao estoque", weight: 0.35 },
      { signalKey: "variacao-pib", label: "Variação do PIB", weight: 0.25 },
      { signalKey: "abertura-empresas", label: "Abertura líquida de empresas", weight: 0.2 },
      { signalKey: "radar-economico", label: "Densidade de sinais econômicos no Radar", weight: 0.2 },
    ],
  },
  {
    slug: "investment-momentum",
    name: "Investment Momentum",
    description: "Mede a intensidade recente de anúncios de investimento no município.",
    methodology:
      "Soma dos valores anunciados nos últimos 12 meses relativizada pelo PIB municipal (55%), número de anúncios distintos (25%) e empregos previstos (20%). Todos os componentes são normalizados de 0 a 100 no universo estadual.",
    components: [
      { signalKey: "valor-investido-sobre-pib", label: "Valor anunciado sobre o PIB", weight: 0.55 },
      { signalKey: "numero-anuncios", label: "Número de anúncios", weight: 0.25 },
      { signalKey: "empregos-previstos", label: "Empregos previstos", weight: 0.2 },
    ],
  },
  {
    slug: "employment-momentum",
    name: "Employment Momentum",
    description: "Acompanha a trajetória do emprego formal em relação ao próprio histórico do município.",
    methodology:
      "Saldo acumulado de empregos formais nos últimos 12 meses relativizado pelo estoque (60%) e consistência mensal — proporção de meses com saldo positivo (40%).",
    components: [
      { signalKey: "saldo-12m", label: "Saldo acumulado em 12 meses", weight: 0.6 },
      { signalKey: "consistencia-mensal", label: "Consistência mensal do saldo", weight: 0.4 },
    ],
  },
  {
    slug: "political-activity",
    name: "Political Activity",
    description:
      "Intensidade da atividade político-institucional detectada no município, sem qualquer juízo de valor sobre seu conteúdo.",
    methodology:
      "Volume de sinais das categorias política, governo, Câmara, regulação e finanças públicas nos últimos 90 dias (60%) e proposições legislativas registradas no período (40%). O índice mede intensidade de atividade, não desempenho, qualidade ou alinhamento político.",
    components: [
      { signalKey: "radar-politico", label: "Sinais políticos no Radar", weight: 0.6 },
      { signalKey: "proposicoes", label: "Proposições legislativas no período", weight: 0.4 },
    ],
  },
  {
    slug: "news-momentum",
    name: "News Momentum",
    description: "Compara a atenção editorial recebida pelo município com seu próprio patamar habitual.",
    methodology:
      "Razão entre o volume de matérias indexadas nos últimos 30 dias e a média dos 12 meses anteriores (70%), somada à diversidade de fontes distintas no período (30%).",
    components: [
      { signalKey: "volume-30d", label: "Volume de matérias em 30 dias frente à média", weight: 0.7 },
      { signalKey: "diversidade-fontes", label: "Diversidade de fontes", weight: 0.3 },
    ],
  },
] as const;

