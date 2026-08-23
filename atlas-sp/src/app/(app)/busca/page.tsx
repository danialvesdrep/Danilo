import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty";
import { GlobalSearch } from "@/components/shell/global-search";
import { DemoBadge } from "@/components/data/provenance";
import { globalSearch } from "@/server/search/global";

export const metadata: Metadata = {
  title: "Busca",
  description: "Busca global no Atlas SP: cidades, pessoas, empresas, setores, indicadores, notícias e movimentos do Radar.",
  robots: { index: false, follow: true },
};

type Search = Promise<{ q?: string }>;

export default async function SearchPage({ searchParams }: { searchParams: Search }) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();
  const results = query.length >= 2 ? await globalSearch(query, { limitPerGroup: 12 }) : null;

  return (
    <>
      <PageHeader
        eyebrow="Busca global"
        title={query ? `Resultados para “${query}”` : "Busca"}
        description="A busca passa pela resolução de entidades: variações de escrita convergem para a mesma cidade, pessoa ou empresa."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Busca" }]}
      />

      <GlobalSearch className="mb-6 max-w-2xl" size="lg" autoFocus />

      {results && results.total > 0 ? (
        <div className="space-y-6">
          <p className="tnum text-[12px] text-[var(--fg-muted)]">
            {results.total} resultado(s) em {results.tookMs} ms
          </p>
          {results.groups.map((group) => (
            <Card key={group.group}>
              <CardHeader title={group.label} dense />
              <ul>
                {group.hits.map((hit) => (
                  <li key={`${hit.group}-${hit.id}`} className="border-b last:border-b-0">
                    <Link
                      href={hit.href}
                      className="flex items-center justify-between gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--bg-inset)]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-medium">{hit.title}</span>
                        {hit.subtitle ? (
                          <span className="block truncate text-[12px] text-[var(--fg-muted)]">
                            {hit.subtitle}
                          </span>
                        ) : null}
                      </span>
                      {hit.isDemo ? <DemoBadge compact /> : null}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : query.length >= 2 ? (
        <Card>
          <EmptyState
            title={`Nenhum resultado para “${query}”`}
            description="A busca cobre os 645 municípios, pessoas, empresas, setores, indicadores, notícias, investimentos e movimentos do Radar."
          />
        </Card>
      ) : null}
    </>
  );
}
