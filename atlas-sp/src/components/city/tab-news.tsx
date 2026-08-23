import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { DemoBadge } from "@/components/data/provenance";
import { getMunicipalityNews } from "@/server/queries/municipality";
import { formatDate, formatRelative } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

export async function NewsTab({ municipality }: { municipality: MunicipalityDetail }) {
  const articles = await getMunicipalityNews(municipality.id, 40);
  if (!articles.length) {
    return (
      <Card>
        <EmptyState
          title="Nenhuma matéria indexada"
          description={`Ainda não há matérias associadas a ${municipality.name}. A resolução de entidades vincula uma notícia ao município quando o texto o menciona de forma inequívoca.`}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        eyebrow="Notícias"
        title={`Cobertura sobre ${municipality.name}`}
        description="Indexamos título, resumo próprio e link para a fonte. Nunca reproduzimos o texto integral."
      />
      <ul>
        {articles.map((article) => (
          <li key={article.id} className="border-b px-5 py-3.5 last:border-b-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="outline">{article.category.toLowerCase()}</Badge>
              {article.sectors.map((entry) => (
                <span
                  key={entry.sector.slug}
                  className="inline-flex items-center gap-1 text-[11px] text-[var(--fg-muted)]"
                >
                  <span
                    className="size-1.5 rounded-full"
                    style={{ backgroundColor: entry.sector.color ?? "var(--accent)" }}
                    aria-hidden
                  />
                  {entry.sector.name}
                </span>
              ))}
              {article.isDemo ? <DemoBadge compact /> : null}
            </div>
            <Link
              href={`/noticias/${article.slug}`}
              className="mt-1.5 block text-[14px] font-medium leading-snug hover:text-[var(--accent)]"
            >
              {article.title}
            </Link>
            <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">{article.summary}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-[var(--fg-subtle)]">
              <span>{article.source.name}</span>
              <span>{formatDate(article.publishedAt)}</span>
              <span>{formatRelative(article.publishedAt)}</span>
              {!article.isDemo ? (
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[var(--accent)] hover:underline"
                >
                  Fonte original
                  <ExternalLink className="size-2.5" aria-hidden />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}
