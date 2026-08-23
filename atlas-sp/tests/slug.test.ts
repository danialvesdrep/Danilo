import { describe, expect, it } from "vitest";
import { deaccent, municipalitySlug, normalizeKey, slugify, levenshtein } from "@/lib/slug";

describe("normalização de texto", () => {
  it("gera slugs consistentes", () => {
    expect(slugify("São José dos Campos")).toBe("sao-jose-dos-campos");
    expect(municipalitySlug("Ilhabela")).toBe("ilhabela-sp");
    expect(municipalitySlug("Santa Bárbara d'Oeste")).toBe("santa-barbara-doeste-sp");
  });

  it("normaliza chaves de município equivalentes para a mesma forma", () => {
    const key = normalizeKey("Campinas");
    expect(normalizeKey("Campinas/SP")).toBe(key);
    expect(normalizeKey("Campinas - SP")).toBe(key);
    expect(normalizeKey("Município de Campinas")).toBe(key);
    expect(normalizeKey("CAMPINAS")).toBe(key);
  });

  it("remove diacríticos", () => {
    expect(deaccent("São Paulo")).toBe("Sao Paulo"); // remove só o diacrítico
  });

  it("distância de edição respeita o corte", () => {
    expect(levenshtein("sorocaba", "sorocba", 3)).toBe(1);
    expect(levenshtein("campinas", "curitiba", 3)).toBeGreaterThan(3);
  });
});
