/**
 * Rótulos de exibição compartilhados entre servidor e cliente.
 *
 * Vivem fora de `src/server` de propósito: componentes de cliente precisam
 * deles, e importar de um módulo marcado com `server-only` arrastaria o Prisma
 * para o pacote do navegador.
 */
import type { NewsCategory, SignalCategory, EntityType, RelationKind } from "@prisma/client";

export const CATEGORY_LABEL: Record<SignalCategory, string> = {
  INVESTIMENTO: "Investimento",
  EMPREGO: "Emprego",
  INDUSTRIA: "Indústria",
  COMERCIO: "Comércio",
  SERVICOS: "Serviços",
  AGRONEGOCIO: "Agronegócio",
  TECNOLOGIA: "Tecnologia",
  INFRAESTRUTURA: "Infraestrutura",
  OBRAS: "Obras",
  POLITICA: "Política",
  GOVERNO: "Governo",
  CAMARA: "Câmara",
  EMPRESAS: "Empresas",
  SAUDE: "Saúde",
  EDUCACAO: "Educação",
  LOGISTICA: "Logística",
  PORTOS: "Portos",
  ENERGIA: "Energia",
  TURISMO: "Turismo",
  MEIO_AMBIENTE: "Meio ambiente",
  JUSTICA: "Justiça",
  REGULACAO: "Regulação",
  CLIMA: "Eventos climáticos",
  ARRECADACAO: "Arrecadação",
  FINANCAS_PUBLICAS: "Finanças públicas",
};

export const NEWS_CATEGORY_LABEL: Record<NewsCategory, string> = {
  POLITICA: "Política",
  ECONOMIA: "Economia",
  EMPRESAS: "Empresas",
  INDUSTRIA: "Indústria",
  AGRO: "Agro",
  INFRAESTRUTURA: "Infraestrutura",
  SAUDE: "Saúde",
  EDUCACAO: "Educação",
  SEGURANCA: "Segurança",
  JUSTICA: "Justiça",
  MEIO_AMBIENTE: "Meio ambiente",
  TURISMO: "Turismo",
  COMERCIO: "Comércio",
  TECNOLOGIA: "Tecnologia",
  TRABALHO: "Trabalho",
};

export const ENTITY_LABEL: Record<EntityType, string> = {
  MUNICIPIO: "Municípios",
  REGIAO: "Regiões",
  PESSOA: "Pessoas",
  EMPRESA: "Empresas",
  SETOR: "Setores",
  PARTIDO: "Partidos",
  NOTICIA: "Notícias",
  INVESTIMENTO: "Investimentos",
  SINAL: "Movimentos",
  INDICADOR: "Indicadores",
  DOCUMENTO: "Documentos",
  ORGAO: "Órgãos",
};

export const RELATION_LABEL: Record<RelationKind, string> = {
  LOCALIZADA_EM: "localizada em",
  ATUA_EM: "atua em",
  PERTENCE_A: "pertence a",
  VIZINHO_DE: "vizinho de",
  MENCIONA: "menciona",
  INVESTE_EM: "investe em",
  GOVERNA: "governa",
  REPRESENTA: "representa",
  EMPREGA: "emprega",
  IMPACTA: "impacta",
  DERIVA_DE: "deriva de",
  RELACIONADO_A: "relacionado a",
};

export const SOURCE_TIER_LABEL = {
  OFICIAL: "Fonte oficial",
  INSTITUCIONAL: "Fonte institucional",
  JORNALISTICA: "Fonte jornalística",
  SECUNDARIA: "Fonte secundária",
  DEMONSTRACAO: "Demonstração",
} as const;

export const INDICATOR_CATEGORY_LABEL: Record<string, string> = {
  DEMOGRAFIA: "Demografia",
  ECONOMIA: "Economia",
  TRABALHO: "Trabalho",
  RENDA: "Renda",
  FINANCAS_PUBLICAS: "Finanças públicas",
  EDUCACAO: "Educação",
  SAUDE: "Saúde",
  INFRAESTRUTURA: "Infraestrutura",
  SEGURANCA: "Segurança",
  MEIO_AMBIENTE: "Meio ambiente",
  EMPRESAS: "Empresas",
  COMERCIO_EXTERIOR: "Comércio exterior",
  PRECOS: "Preços",
  POLITICA: "Política",
};

export const TIMELINE_KIND_LABEL: Record<string, string> = {
  ECONOMIA: "Economia",
  POLITICA: "Política",
  EMPRESA: "Empresa",
  INFRAESTRUTURA: "Infraestrutura",
  INVESTIMENTO: "Investimento",
  ELEICAO: "Eleição",
  INDICADOR: "Indicador",
  NOTICIA: "Notícia",
  RADAR: "Radar",
};
