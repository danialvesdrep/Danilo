import "server-only";
import { XMLParser } from "fast-xml-parser";
import type { Job, JobResult } from "../types";
import { emptyResult } from "../types";
import { prisma } from "@/server/db/prisma";
import { resolveMentions, invalidateEntityIndex } from "@/server/entities/resolve";
import { slugify } from "@/lib/slug";
import type { NewsCategory } from "@prisma/client";

/**
 * Ingestão de notícias.
 *
 * Lê feeds RSS/Atom das fontes cadastradas, resolve as entidades mencionadas no
 * título e no resumo e grava a matéria já ligada a município, setor e empresa.
 * Nunca armazena o texto integral: título, resumo próprio e link.
 */

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

type FeedItem = { title?: string; description?: string; summary?: string; link?: unknown; pubDate?: string; updated?: string; published?: string };

/** Classificação por palavras-chave. Barata, auditável e suficiente como primeira camada. */
const CATEGORY_RULES: Array<{ category: NewsCategory; patterns: RegExp[] }> = [
  { category: "INDUSTRIA", patterns: [/\bfábrica\b/i, /\bindustrial\b/i, /\bmontadora\b/i, /\bplanta\b/i] },
  { category: "EMPRESAS", patterns: [/\bempresa\b/i, /\binvestimento\b/i, /\baporte\b/i, /\bexpansão\b/i] },
  { category: "AGRO", patterns: [/\bagro\b/i, /\bsafra\b/i, /\bcana\b/i, /\bpecuária\b/i, /\bcolheita\b/i] },
  { category: "INFRAESTRUTURA", patterns: [/\bobra\b/i, /\brodovia\b/i, /\bferrovia\b/i, /\baeroporto\b/i, /\bporto\b/i] },
  { category: "POLITICA", patterns: [/\bprefeit/i, /\bvereador/i, /\bcâmara\b/i, /\bsecretári/i, /\beleiç/i] },
  { category: "SAUDE", patterns: [/\bhospital\b/i, /\bsaúde\b/i, /\bupa\b/i, /\bvacina/i] },
  { category: "EDUCACAO", patterns: [/\bescola\b/i, /\buniversidade\b/i, /\bcreche\b/i, /\bensino\b/i] },
  { category: "TRABALHO", patterns: [/\bemprego\b/i, /\bvagas?\b/i, /\bcontrata/i, /\bdemiss/i] },
  { category: "TECNOLOGIA", patterns: [/\btecnologia\b/i, /\bstartup\b/i, /\bdata center\b/i, /\bsoftware\b/i] },
  { category: "MEIO_AMBIENTE", patterns: [/\bambiental\b/i, /\bdesmatamento\b/i, /\bsaneamento\b/i, /\bresíduos\b/i] },
  { category: "JUSTICA", patterns: [/\bjustiça\b/i, /\bliminar\b/i, /\bmpsp\b/i, /\btribunal\b/i] },
  { category: "SEGURANCA", patterns: [/\bpolícia\b/i, /\bsegurança\b/i, /\bhomicíd/i] },
  { category: "COMERCIO", patterns: [/\bcomércio\b/i, /\bvarejo\b/i, /\bshopping\b/i] },
];

export function classify(text: string): NewsCategory {
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(text))) return rule.category;
  }
  return "ECONOMIA";
}

/** Importância editorial 0..100 a partir de sinais do próprio texto. */
export function editorialImportance(title: string, summary: string): number {
  const text = `${title} ${summary}`;
  let score = 45;
  if (/\bR\$\s?\d/.test(text)) score += 18;
  if (/\bbilh(ão|ões)\b/i.test(text)) score += 14;
  else if (/\bmilh(ão|ões)\b/i.test(text)) score += 8;
  if (/\b\d{2,}\s?(mil\s)?(vagas|empregos|postos)\b/i.test(text)) score += 12;
  if (/\banuncia|inaugura|assina|aprova\b/i.test(text)) score += 6;
  return Math.max(0, Math.min(100, score));
}

function extractLink(item: FeedItem): string | null {
  if (typeof item.link === "string") return item.link;
  if (Array.isArray(item.link)) {
    const alternate = item.link.find(
      (entry: Record<string, string>) => entry["@_rel"] === "alternate" || !entry["@_rel"],
    );
    return (alternate as Record<string, string> | undefined)?.["@_href"] ?? null;
  }
  if (item.link && typeof item.link === "object") {
    return (item.link as Record<string, string>)["@_href"] ?? null;
  }
  return null;
}

/** Remove marcação e corta o resumo — não guardamos o texto integral. */
export function makeSummary(raw: string, limit = 320): string {
  const clean = raw
    .replace(/<[^>]*>/g, " ")
    .replace(/&[a-z]+;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (clean.length <= limit) return clean;
  const cut = clean.slice(0, limit);
  return `${cut.slice(0, cut.lastIndexOf(" "))}…`;
}

export const newsJob: Job = {
  key: "news-ingestion",
  name: "Ingestão de notícias",
  description: "Lê os feeds das fontes cadastradas, resolve entidades e indexa as matérias.",
  cadence: "HORARIA",
  requiresNetwork: true,

  async run(context): Promise<JobResult> {
    const result = emptyResult();
    const sources = await prisma.newsSource.findMany({
      where: { active: true, feedUrl: { not: null } },
    });

    if (!context.externalEnabled) {
      result.issues.push({
        severity: "AVISO",
        code: "ingestao-desligada",
        message: "Ingestão externa desligada (INGESTION_ENABLED=false). Nenhum feed foi consultado.",
      });
      return result;
    }
    if (!sources.length) {
      result.issues.push({
        severity: "AVISO",
        code: "sem-feeds",
        message:
          "Nenhuma fonte com feed cadastrado. Cadastre veículos e URLs de feed no painel administrativo.",
      });
      return result;
    }

    invalidateEntityIndex();

    for (const source of sources) {
      try {
        const response = await fetch(source.feedUrl!, {
          headers: { "user-agent": "AtlasSP/1.0 (+https://atlassp.com.br)" },
          signal: AbortSignal.timeout(30_000),
        });
        if (!response.ok) throw new Error(`Feed respondeu ${response.status}`);

        const parsed = parser.parse(await response.text()) as Record<string, unknown>;
        const rss = (parsed.rss as { channel?: { item?: unknown } } | undefined)?.channel?.item;
        const feed = (parsed.feed as { entry?: unknown } | undefined)?.entry;
        const items = (rss ?? feed ?? []) as FeedItem[] | FeedItem;
        const list = Array.isArray(items) ? items : [items];
        result.itemsRead += list.length;

        for (const item of list) {
          const title = String(item.title ?? "").trim();
          const url = extractLink(item);
          if (!title || !url) {
            result.itemsSkipped += 1;
            continue;
          }

          const publishedAt = new Date(item.pubDate ?? item.published ?? item.updated ?? Date.now());
          const summary = makeSummary(String(item.description ?? item.summary ?? title));
          const mentions = await resolveMentions(`${title} ${summary}`, { minConfidence: 0.6 });
          const municipalities = mentions.filter((mention) => mention.type === "MUNICIPIO");

          // Sem município identificado a matéria não entra: o produto é
          // territorial, e uma notícia sem lugar não tem onde ser exibida.
          if (!municipalities.length) {
            result.itemsSkipped += 1;
            result.issues.push({
              severity: "INFO",
              code: "sem-municipio",
              message: `Matéria descartada por não resolver município: ${title.slice(0, 80)}`,
            });
            continue;
          }

          const slug = `${slugify(title).slice(0, 80)}-${publishedAt.getTime().toString(36)}`;
          const article = await prisma.newsArticle.upsert({
            where: { url },
            update: { title, summary, publishedAt },
            create: {
              slug,
              title,
              summary,
              url,
              sourceId: source.id,
              category: classify(`${title} ${summary}`),
              publishedAt,
              importance: editorialImportance(title, summary),
              isDemo: false,
            },
          });

          await prisma.articleMunicipality.createMany({
            data: municipalities.map((mention) => ({
              articleId: article.id,
              municipalityId: mention.id,
              confidence: mention.confidence,
            })),
            skipDuplicates: true,
          });

          const companies = mentions.filter((mention) => mention.type === "EMPRESA");
          if (companies.length) {
            await prisma.articleCompany.createMany({
              data: companies.map((mention) => ({ articleId: article.id, companyId: mention.id })),
              skipDuplicates: true,
            });
          }

          await prisma.relationship.createMany({
            data: municipalities.map((mention) => ({
              fromType: "NOTICIA" as const,
              fromId: article.id,
              toType: "MUNICIPIO" as const,
              toId: mention.id,
              kind: "MENCIONA" as const,
              weight: mention.confidence,
              origin: "resolucao-entidades",
            })),
            skipDuplicates: true,
          });

          result.itemsWritten += 1;
        }

        await prisma.newsSource.update({
          where: { id: source.id },
          data: { lastFetchAt: new Date() },
        });
      } catch (error) {
        result.issues.push({
          severity: "ERRO",
          code: "falha-feed",
          message: `${source.name}: ${(error as Error).message}`,
        });
      }
    }

    return result;
  },
};
