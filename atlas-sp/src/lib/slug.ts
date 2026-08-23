/** Normalização de texto compartilhada entre slugs, busca e resolução de entidades. */

/** Remove acentos e reduz a caixa baixa. */
export function deaccent(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u00aa\u00ba]/g, "");
}

/** Slug de URL: `São José dos Campos` → `sao-jose-dos-campos`. */
export function slugify(input: string): string {
  return deaccent(input)
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Slug de município inclui a UF: `campinas-sp`. */
export function municipalitySlug(name: string, uf = "SP"): string {
  return `${slugify(name)}-${uf.toLowerCase()}`;
}

const STOPWORDS = new Set([
  "de", "da", "do", "das", "dos", "e", "a", "o", "as", "os", "em", "no", "na",
  "municipio", "cidade", "prefeitura", "sp", "sao-paulo",
]);

/**
 * Chave canônica usada pela resolução de entidades. Ignora pontuação, acentos,
 * caixa e conectivos, de modo que "Campinas/SP", "Município de Campinas" e
 * "campinas - sp" convergem para a mesma chave.
 */
export function normalizeKey(input: string): string {
  const base = deaccent(input)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/[\s-]+/)
    .filter(Boolean);
  const meaningful = base.filter((token) => !STOPWORDS.has(token));
  return (meaningful.length ? meaningful : base).join(" ").trim();
}

/** Distância de Levenshtein com corte antecipado, para sugestões de busca. */
export function levenshtein(a: string, b: string, max = 3): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
      current.push(value);
      if (value < rowMin) rowMin = value;
    }
    if (rowMin > max) return max + 1;
    previous = current;
  }
  return previous[b.length];
}
