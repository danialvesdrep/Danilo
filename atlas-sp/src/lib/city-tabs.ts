/**
 * Definição das abas do perfil municipal.
 *
 * Fica fora do componente de cliente porque a página (servidor) precisa validar
 * o parâmetro `?aba=` — valores exportados de um módulo `"use client"` chegam ao
 * servidor como referência opaca, não como o array.
 */
export const CITY_TABS = [
  { key: "visao-geral", label: "Visão geral" },
  { key: "economia", label: "Economia" },
  { key: "setores", label: "Setores" },
  { key: "radar", label: "Radar" },
  { key: "politica", label: "Governança" },
  { key: "camara", label: "Câmara" },
  { key: "noticias", label: "Notícias" },
  { key: "indicadores", label: "Indicadores" },
  { key: "empresas", label: "Empresas" },
  { key: "investimentos", label: "Investimentos" },
  { key: "timeline", label: "Linha do tempo" },
  { key: "mapa", label: "Mapa" },
  { key: "documentos", label: "Documentos" },
  { key: "vizinhos", label: "Vizinhos" },
  { key: "ia", label: "Atlas AI" },
] as const;

export type CityTabKey = (typeof CITY_TABS)[number]["key"];
