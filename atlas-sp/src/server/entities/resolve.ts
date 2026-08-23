import "server-only";
import { prisma } from "@/server/db/prisma";
import { normalizeKey, levenshtein } from "@/lib/slug";
import type { EntityType } from "@prisma/client";

/**
 * Resolução de entidades.
 *
 * "Campinas", "Campinas/SP", "Município de Campinas" e "campinas - sp" precisam
 * convergir para o mesmo município. O mecanismo tem três camadas:
 *
 *  1. Chave normalizada exata — remove acento, caixa, pontuação e conectivos.
 *  2. Menção dentro de texto livre — varre n-gramas do texto contra o índice.
 *  3. Aproximação tipográfica — distância de edição, usada só quando o termo
 *     é longo o bastante para que o erro não gere falso positivo.
 *
 * Ambiguidade não é resolvida no chute: quando duas entidades disputam a mesma
 * chave, quem decide é o contexto (município já conhecido, região, setor). Sem
 * contexto suficiente, devolvemos os candidatos e deixamos claro que há dúvida.
 */

export type ResolvedEntity = {
  type: EntityType;
  id: string;
  label: string;
  slug: string;
  /** 0..1 — confiança da resolução. */
  confidence: number;
  /** Como a entidade foi encontrada, para auditoria. */
  method: "chave-exata" | "alias" | "mencao-em-texto" | "aproximacao";
  context?: string;
};

type AliasRow = {
  entityType: EntityType;
  normalizedKey: string;
  alias: string;
  weight: number;
  municipalityId: string | null;
  personId: string | null;
  companyId: string | null;
};

/** Índice de aliases carregado sob demanda e reutilizado no processo. */
let aliasIndex: {
  loadedAt: number;
  byKey: Map<string, AliasRow[]>;
  labels: Map<string, { label: string; slug: string; context?: string }>;
  maxTokens: number;
} | null = null;

const INDEX_TTL_MS = 5 * 60_000;

async function loadIndex() {
  if (aliasIndex && Date.now() - aliasIndex.loadedAt < INDEX_TTL_MS) return aliasIndex;

  const [aliases, municipalities, people, companies] = await Promise.all([
    prisma.entityAlias.findMany({
      select: {
        entityType: true, normalizedKey: true, alias: true, weight: true,
        municipalityId: true, personId: true, companyId: true,
      },
    }),
    prisma.municipality.findMany({ select: { id: true, name: true, slug: true, mesoName: true } }),
    prisma.person.findMany({
      select: {
        id: true, name: true, slug: true,
        mandates: { where: { isCurrent: true }, take: 1, select: { municipality: { select: { name: true } }, officeLabel: true, office: true } },
      },
    }),
    prisma.company.findMany({
      select: { id: true, name: true, slug: true, municipality: { select: { name: true } } },
    }),
  ]);

  const byKey = new Map<string, AliasRow[]>();
  let maxTokens = 1;
  for (const alias of aliases) {
    const row: AliasRow = { ...alias, weight: Number(alias.weight.toString()) };
    const list = byKey.get(alias.normalizedKey) ?? [];
    list.push(row);
    byKey.set(alias.normalizedKey, list);
    maxTokens = Math.max(maxTokens, alias.normalizedKey.split(" ").length);
  }

  const labels = new Map<string, { label: string; slug: string; context?: string }>();
  for (const municipality of municipalities) {
    labels.set(`MUNICIPIO:${municipality.id}`, {
      label: municipality.name,
      slug: municipality.slug,
      context: municipality.mesoName ?? undefined,
    });
  }
  for (const person of people) {
    const mandate = person.mandates[0];
    labels.set(`PESSOA:${person.id}`, {
      label: person.name,
      slug: person.slug,
      context: mandate ? `${mandate.officeLabel ?? mandate.office} · ${mandate.municipality.name}` : undefined,
    });
  }
  for (const company of companies) {
    labels.set(`EMPRESA:${company.id}`, {
      label: company.name,
      slug: company.slug,
      context: company.municipality?.name,
    });
  }

  aliasIndex = { loadedAt: Date.now(), byKey, labels, maxTokens };
  return aliasIndex;
}

export function invalidateEntityIndex() {
  aliasIndex = null;
}

function entityIdOf(row: AliasRow): string | null {
  return row.municipalityId ?? row.personId ?? row.companyId ?? null;
}

/** Resolve um termo isolado (uma busca do usuário, por exemplo). */
export async function resolveTerm(
  term: string,
  options: { types?: EntityType[]; limit?: number; contextMunicipalityId?: string } = {},
): Promise<ResolvedEntity[]> {
  const index = await loadIndex();
  const key = normalizeKey(term);
  if (!key) return [];

  const limit = options.limit ?? 8;
  const results: ResolvedEntity[] = [];
  const seen = new Set<string>();

  const push = (row: AliasRow, confidence: number, method: ResolvedEntity["method"]) => {
    const id = entityIdOf(row);
    if (!id) return;
    if (options.types && !options.types.includes(row.entityType)) return;
    const composite = `${row.entityType}:${id}`;
    if (seen.has(composite)) return;
    const label = index.labels.get(composite);
    if (!label) return;
    seen.add(composite);
    results.push({
      type: row.entityType,
      id,
      label: label.label,
      slug: label.slug,
      confidence: Math.min(1, confidence * row.weight),
      method,
      context: label.context,
    });
  };

  // 1. Chave exata
  for (const row of index.byKey.get(key) ?? []) push(row, 1, "chave-exata");

  // 2. Prefixo — autocompletar
  if (results.length < limit) {
    for (const [candidateKey, rows] of index.byKey) {
      if (results.length >= limit * 3) break;
      if (candidateKey === key || !candidateKey.startsWith(key)) continue;
      const ratio = key.length / candidateKey.length;
      for (const row of rows) push(row, 0.72 + ratio * 0.2, "alias");
    }
  }

  // 3. Aproximação tipográfica — só para termos longos, para não confundir
  //    municípios de nome curto e parecido (ex.: "Ibiúna" e "Iguape").
  if (results.length < limit && key.length >= 5) {
    for (const [candidateKey, rows] of index.byKey) {
      if (Math.abs(candidateKey.length - key.length) > 2) continue;
      const distance = levenshtein(key, candidateKey, 2);
      if (distance > 2) continue;
      const confidence = distance === 1 ? 0.7 : 0.52;
      for (const row of rows) push(row, confidence, "aproximacao");
    }
  }

  // Desempate por contexto: entidade ligada ao município em foco sobe.
  if (options.contextMunicipalityId) {
    for (const result of results) {
      if (result.type === "MUNICIPIO" && result.id === options.contextMunicipalityId) {
        result.confidence = Math.min(1, result.confidence + 0.2);
      }
    }
  }

  // A precedência do método vem antes da confiança: um nome escrito exatamente
  // como está no cadastro nunca pode perder para uma aproximação tipográfica,
  // mesmo quando seu alias tem peso reduzido por ambiguidade.
  const methodRank: Record<ResolvedEntity["method"], number> = {
    "chave-exata": 0,
    alias: 1,
    "mencao-em-texto": 2,
    aproximacao: 3,
  };
  return results
    .sort(
      (a, b) => methodRank[a.method] - methodRank[b.method] || b.confidence - a.confidence,
    )
    .slice(0, limit);
}

/**
 * Extrai entidades mencionadas em texto livre — é o que liga uma notícia
 * ingerida ao município, à empresa e ao setor corretos.
 */
export async function resolveMentions(
  text: string,
  options: { types?: EntityType[]; minConfidence?: number } = {},
): Promise<ResolvedEntity[]> {
  const index = await loadIndex();
  const minConfidence = options.minConfidence ?? 0.6;
  const tokens = normalizeKey(text).split(" ").filter(Boolean);
  if (!tokens.length) return [];

  const found = new Map<string, ResolvedEntity>();
  const maxWindow = Math.min(index.maxTokens, 5);

  // n-gramas do maior para o menor: "sao jose dos campos" vence "sao jose".
  const consumed = new Array(tokens.length).fill(false);
  for (let window = maxWindow; window >= 1; window--) {
    for (let start = 0; start + window <= tokens.length; start++) {
      if (consumed.slice(start, start + window).some(Boolean)) continue;
      const candidate = tokens.slice(start, start + window).join(" ");
      const rows = index.byKey.get(candidate);
      if (!rows) continue;
      for (const row of rows) {
        const id = entityIdOf(row);
        if (!id) continue;
        if (options.types && !options.types.includes(row.entityType)) continue;
        const composite = `${row.entityType}:${id}`;
        const label = index.labels.get(composite);
        if (!label) continue;
        // Termos de uma palavra só são aceitos com peso alto, para evitar que
        // nomes comuns capturem menções que não são da entidade.
        const lengthFactor = window === 1 ? 0.78 : 1;
        const confidence = Math.min(1, Number(row.weight) * lengthFactor);
        if (confidence < minConfidence) continue;
        const existing = found.get(composite);
        if (!existing || existing.confidence < confidence) {
          found.set(composite, {
            type: row.entityType, id, label: label.label, slug: label.slug,
            confidence, method: "mencao-em-texto", context: label.context,
          });
        }
      }
      if (rows.length) {
        for (let i = start; i < start + window; i++) consumed[i] = true;
      }
    }
  }

  return [...found.values()].sort((a, b) => b.confidence - a.confidence);
}

/** Municípios cuja chave normalizada colide — expostos no painel de qualidade. */
export async function findAmbiguousKeys(): Promise<Array<{ key: string; entities: string[] }>> {
  const rows = await prisma.$queryRaw<Array<{ normalizedKey: string; labels: string[] }>>`
    SELECT ea."normalizedKey", array_agg(DISTINCT m.name) AS labels
    FROM "EntityAlias" ea
    JOIN "Municipality" m ON m.id = ea."municipalityId"
    WHERE ea."entityType" = 'MUNICIPIO'
    GROUP BY ea."normalizedKey"
    HAVING COUNT(DISTINCT ea."municipalityId") > 1`;
  return rows.map((row) => ({ key: row.normalizedKey, entities: row.labels }));
}
