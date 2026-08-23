import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { LinkTabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty";
import { DemoBadge } from "@/components/data/provenance";
import { getLatestNews } from "@/server/queries/state";
import { NEWS_CATEGORY_LABEL } from "@/lib/labels";
import { formatDate, formatRelative } from "@/lib/format";

export const metadata: Metadata = {
  title: "Notícias dos municípios paulistas",
  description:
    "Agregador inteligente: indexamos título, resumo próprio e link, com o município, o setor e as entidades relacionadas de cada matéria.",
};

export const revalidate = 300;

type Search = Promise<{ categoria?: string }>;

export default async function NewsPage({ searchParams }: { searchParams: Search }) {
  const { categoria } = await searchParams;
  const valid = categoria && categoria in NEWS_CATEGORY_LABEL ? categoria : undefined;
  const articles = await getLatestNews(50, valid);

  const tabs = [
    { key: "todas", label: "Todas", href: "/noticias" },
    ...Object.entries(NEWS_CATEGORY_LABEL).map(([key, label]) => ({
      key,
      label,
      href: `/noticias?categoria=${key}`,
    })),
  ];

  return (
    <>
      <PageHeader
        eyebrow="Cobertura"
        title="Notícias"
        description="Uma notícia não termina na notícia. Cada matéria aqui está ligada ao município, ao setor e às entidades que ela envolve — e leva ao contexto por trás dela."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Notícias" }]}
      />

      <LinkTabs tabs={tabs} activeKey={valid ?? "todas"} className="mb-5" />

      <Card>
        {articles.length ? (
          <ul>
            {articles.map((article) => (
              <li key={article.id} className="border-b px-5 py-4 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="outline">
                    {NEWS_CATEGORY_LABEL[article.category] ?? article.category}
                  </Badge>
                  {article.municipalities.map((entry) => (
                    <Link
                      key={entry.municipality.slug}
                      href={`/cidade/${entry.municipality.slug}`}
                      className="text-[11.5px] font-medium text-[var(--accent)] hover:underline"
                    >
                      {entry.municipality.name}
                    </Link>
                  ))}
                  {article.sectors.map((entry) => (
                    <Link
                      key={entry.sector.slug}
                      href={`/setores/${entry.sector.slug}`}
                      className="inline-flex items-center gap-1 text-[11px] text-[var(--fg-muted)] hover:text-[var(--fg)]"
                    >
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: entry.sector.color ?? "var(--accent)" }}
                        aria-hidden
                      />
                      {entry.sector.name}
                    </Link>
                  ))}
                  {article.isDemo ? <DemoBadge compact /> : null}
                </div>

                <Link
                  href={`/noticias/${article.slug}`}
                  className="mt-1.5 block text-[15px] font-medium leading-snug hover:text-[var(--accent)]"
                >
                  {article.title}
                </Link>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg-muted)]">
                  {article.summary}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11.5px] text-[var(--fg-subtle)]">
                  <span>{article.source.name}</span>
                  <span>{formatDate(article.publishedAt)}</span>
                  <span>{formatRelative(article.publishedAt)}</span>
                  <Link
                    href={`/noticias/${article.slug}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    Entender o contexto
                  </Link>
                  {!article.isDemo ? (
                    <a
                      href={article.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 hover:text-[var(--fg)]"
                    >
                      Fonte original
                      <ExternalLink className="size-2.5" aria-hidden />
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhuma matéria nesta categoria" />
        )}
      </Card>
    </>
  );
}
