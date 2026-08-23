import type { PrismaClient } from "@prisma/client";

/**
 * Catálogo de fontes. Toda fonte que o produto pretende usar é registrada aqui
 * — inclusive as que ainda não têm ingestão conectada, que ficam visíveis no
 * painel de qualidade como "em integração" em vez de desaparecer.
 */
export const DATA_SOURCES = [
  {
    slug: "ibge-malha-municipal",
    name: "Malha Municipal Digital",
    organization: "IBGE",
    tier: "OFICIAL" as const,
    url: "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais",
    apiUrl: "https://servicodados.ibge.gov.br/api/v3/malhas",
    license: "Dados abertos — IBGE",
    description:
      "Recorte territorial dos 645 municípios paulistas, com códigos IBGE, mesorregiões e microrregiões.",
    methodology:
      "Polígonos da malha municipal do IBGE. Área, centroide, bounding box e adjacências são calculados pelo Atlas SP a partir dessa malha, por geometria esférica; divergem em menos de 1% das áreas oficiais publicadas pelo IBGE.",
    refreshHours: 24 * 365,
  },
  {
    slug: "ibge-localidades",
    name: "API de Localidades",
    organization: "IBGE",
    tier: "OFICIAL" as const,
    url: "https://servicodados.ibge.gov.br/api/docs/localidades",
    apiUrl: "https://servicodados.ibge.gov.br/api/v1/localidades",
    license: "Dados abertos — IBGE",
    description: "Cadastro de municípios, sedes, DDD e hierarquia regional.",
    methodology: "Cadastro oficial de localidades do IBGE.",
    refreshHours: 24 * 30,
  },
  {
    slug: "ibge-sidra-populacao",
    name: "SIDRA — Estimativas de População",
    organization: "IBGE",
    tier: "OFICIAL" as const,
    url: "https://sidra.ibge.gov.br/tabela/6579",
    apiUrl: "https://apisidra.ibge.gov.br/values/t/6579",
    license: "Dados abertos — IBGE",
    description: "Estimativas anuais da população residente por município.",
    methodology: "Tabela 6579 do SIDRA. Ingestão via API SIDRA, sem transformação de valores.",
    refreshHours: 24 * 30,
  },
  {
    slug: "ibge-pib-municipios",
    name: "PIB dos Municípios",
    organization: "IBGE",
    tier: "OFICIAL" as const,
    url: "https://www.ibge.gov.br/estatisticas/economicas/contas-nacionais/9088-produto-interno-bruto-dos-municipios.html",
    apiUrl: "https://apisidra.ibge.gov.br/values/t/5938",
    license: "Dados abertos — IBGE",
    description:
      "PIB municipal a preços correntes e valor adicionado bruto por atividade econômica.",
    methodology:
      "Tabela 5938 do SIDRA. O valor adicionado por atividade é a base do Perfil Econômico municipal.",
    refreshHours: 24 * 90,
  },
  {
    slug: "seade",
    name: "Repositório de Dados",
    organization: "Fundação SEADE",
    tier: "OFICIAL" as const,
    url: "https://repositorio.seade.gov.br/",
    apiUrl: "https://repositorio.seade.gov.br/api/3/action/",
    license: "Dados abertos — Governo do Estado de São Paulo",
    description:
      "Indicadores socioeconômicos dos municípios paulistas, incluindo o IPRS e séries de emprego e renda.",
    methodology: "Repositório CKAN da Fundação SEADE.",
    refreshHours: 24 * 30,
  },
  {
    slug: "novo-caged",
    name: "Novo CAGED",
    organization: "Ministério do Trabalho e Emprego",
    tier: "OFICIAL" as const,
    url: "https://pdet.mte.gov.br/novo-caged",
    license: "Dados abertos — MTE",
    description: "Admissões, desligamentos e saldo de empregos formais por município e setor.",
    methodology:
      "Microdados mensais do Novo CAGED agregados por município e seção CNAE. Saldo = admissões − desligamentos.",
    refreshHours: 24 * 30,
  },
  {
    slug: "rais",
    name: "RAIS",
    organization: "Ministério do Trabalho e Emprego",
    tier: "OFICIAL" as const,
    url: "https://pdet.mte.gov.br/rais",
    license: "Dados abertos — MTE",
    description: "Estoque de vínculos formais, massa salarial e perfil do emprego por município.",
    methodology: "Microdados anuais da RAIS agregados por município.",
    refreshHours: 24 * 180,
  },
  {
    slug: "tesouro-siconfi",
    name: "SICONFI",
    organization: "Secretaria do Tesouro Nacional",
    tier: "OFICIAL" as const,
    url: "https://siconfi.tesouro.gov.br/",
    apiUrl: "https://apidatalake.tesouro.gov.br/ords/siconfi/tt/",
    license: "Dados abertos — STN",
    description: "Receitas, despesas e investimentos declarados pelas prefeituras.",
    methodology: "Declarações de Contas Anuais (DCA) e RREO publicadas no SICONFI.",
    refreshHours: 24 * 30,
  },
  {
    slug: "receita-federal-cnpj",
    name: "Cadastro Nacional da Pessoa Jurídica",
    organization: "Receita Federal",
    tier: "OFICIAL" as const,
    url: "https://dadosabertos.rfb.gov.br/CNPJ/",
    license: "Dados abertos — RFB",
    description: "Abertura e encerramento de empresas, CNAE principal e porte por município.",
    methodology: "Base pública de CNPJ, agregada por município e seção CNAE.",
    refreshHours: 24 * 30,
  },
  {
    slug: "comex-stat",
    name: "Comex Stat",
    organization: "MDIC / SECEX",
    tier: "OFICIAL" as const,
    url: "https://comexstat.mdic.gov.br/",
    license: "Dados abertos — MDIC",
    description: "Exportações e importações por município de origem.",
    methodology: "Séries mensais do Comex Stat, agregadas por município e por capítulo NCM.",
    refreshHours: 24 * 30,
  },
  {
    slug: "tse",
    name: "Dados Eleitorais",
    organization: "Tribunal Superior Eleitoral",
    tier: "OFICIAL" as const,
    url: "https://dadosabertos.tse.jus.br/",
    license: "Dados abertos — TSE",
    description: "Candidaturas, resultados e filiações partidárias por município.",
    methodology: "Repositório de dados eleitorais do TSE.",
    refreshHours: 24 * 30,
  },
  {
    slug: "bacen",
    name: "SGS — Sistema Gerenciador de Séries Temporais",
    organization: "Banco Central do Brasil",
    tier: "OFICIAL" as const,
    url: "https://www3.bcb.gov.br/sgspub/",
    apiUrl: "https://api.bcb.gov.br/dados/serie/",
    license: "Dados abertos — BCB",
    description: "Séries macroeconômicas usadas como contexto estadual e nacional.",
    methodology: "API pública de séries temporais do Banco Central.",
    refreshHours: 24,
  },
  {
    slug: "ipea",
    name: "Ipeadata",
    organization: "Ipea",
    tier: "OFICIAL" as const,
    url: "http://www.ipeadata.gov.br/",
    license: "Dados abertos — Ipea",
    description: "Séries regionais e o IDHM municipal, em parceria com PNUD e Fundação João Pinheiro.",
    methodology: "Ipeadata regional.",
    refreshHours: 24 * 90,
  },
  {
    slug: "anp",
    name: "Levantamento de Preços de Combustíveis",
    organization: "ANP",
    tier: "OFICIAL" as const,
    url: "https://www.gov.br/anp/pt-br/assuntos/precos-e-defesa-da-concorrencia/precos",
    license: "Dados abertos — ANP",
    description: "Preços médios de combustíveis por município pesquisado.",
    methodology:
      "Pesquisa semanal da ANP. Cobre apenas os municípios da amostra — os demais recebem o contexto regional, sempre identificado como tal.",
    refreshHours: 24 * 7,
  },
  {
    slug: "diarios-oficiais",
    name: "Diários Oficiais Municipais",
    organization: "Prefeituras e Câmaras",
    tier: "OFICIAL" as const,
    url: "https://queridodiario.ok.org.br/",
    license: "Publicação oficial",
    description: "Atos, contratos, nomeações e editais publicados pelos municípios.",
    methodology: "Coleta por adaptador de documentos; nunca reproduzimos o texto integral.",
    refreshHours: 24,
  },
  {
    slug: "portal-transparencia",
    name: "Portal da Transparência",
    organization: "Controladoria-Geral da União",
    tier: "OFICIAL" as const,
    url: "https://portaldatransparencia.gov.br/",
    apiUrl: "https://api.portaldatransparencia.gov.br/api-de-dados/",
    license: "Dados abertos — CGU",
    description: "Transferências federais e convênios com municípios.",
    methodology: "API de dados abertos da CGU.",
    refreshHours: 24 * 7,
  },
  {
    slug: "tce-sp",
    name: "Tribunal de Contas do Estado de São Paulo",
    organization: "TCE-SP",
    tier: "OFICIAL" as const,
    url: "https://www.tce.sp.gov.br/",
    license: "Publicação oficial",
    description: "Prestações de contas e pareceres sobre a gestão municipal.",
    methodology: "Publicações do TCE-SP.",
    refreshHours: 24 * 7,
  },
  {
    slug: "atlas-sp-demo",
    name: "Conjunto de demonstração Atlas SP",
    organization: "Atlas SP",
    tier: "DEMONSTRACAO" as const,
    url: null,
    license: "Uso interno",
    description:
      "Dados sintéticos, gerados de forma determinística, que preenchem as telas enquanto as ingestões oficiais não estão conectadas. Nunca representam a realidade e aparecem sempre com o rótulo DEMONSTRAÇÃO.",
    methodology:
      "Geração determinística a partir de uma semente fixa, calibrada apenas para produzir ordens de grandeza plausíveis e permitir avaliar a experiência do produto. Não deve ser citado, exportado ou usado como evidência.",
    refreshHours: null,
    isDemo: true,
  },
] satisfies Array<{
  slug: string;
  name: string;
  organization: string;
  tier: "OFICIAL" | "INSTITUCIONAL" | "JORNALISTICA" | "SECUNDARIA" | "DEMONSTRACAO";
  url?: string | null;
  apiUrl?: string | null;
  license?: string | null;
  description: string;
  methodology: string;
  refreshHours?: number | null;
  isDemo?: boolean;
}>;

export async function seedSources(prisma: PrismaClient) {
  for (const source of DATA_SOURCES) {
    await prisma.dataSource.upsert({
      where: { slug: source.slug },
      update: {
        name: source.name,
        organization: source.organization,
        tier: source.tier,
        url: source.url ?? null,
        apiUrl: source.apiUrl ?? null,
        license: source.license ?? null,
        description: source.description,
        methodology: source.methodology,
        refreshHours: source.refreshHours ?? null,
        isDemo: source.isDemo ?? false,
      },
      create: {
        slug: source.slug,
        name: source.name,
        organization: source.organization,
        tier: source.tier,
        url: source.url ?? null,
        apiUrl: source.apiUrl ?? null,
        license: source.license ?? null,
        description: source.description,
        methodology: source.methodology,
        refreshHours: source.refreshHours ?? null,
        isDemo: source.isDemo ?? false,
      },
    });
  }
  return prisma.dataSource.count();
}
