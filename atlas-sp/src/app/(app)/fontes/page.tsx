import type { Metadata } from "next";
import { ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { getSources } from "@/server/queries/state";
import { SOURCE_TIER_LABEL } from "@/lib/labels";
import { formatRelative } from "@/lib/format";

export const metadata: Metadata = {
  title: "Fontes e metodologia",
  description:
    "Catálogo das fontes de dados usadas pelo Atlas SP — órgão, licença, cadência de atualização e metodologia declarada.",
};

export const revalidate = 3600;

export default async function SourcesPage() {
  const sources = await getSources();
  const byTier = new Map<string, typeof sources>();
  for (const source of sources) {
    const list = byTier.get(source.tier) ?? [];
    list.push(source);
    byTier.set(source.tier, list);
  }

  return (
    <>
      <PageHeader
        eyebrow="Proveniência"
        title="Fontes e metodologia"
        description="Toda observação exibida na plataforma nasce em uma destas fontes. As pendentes de ingestão aparecem aqui como 'aguardando conexão'."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Fontes" }]}
      />

      <div className="space-y-6">
        {[...byTier.entries()].map(([tier, list]) => (
          <Card key={tier}>
            <CardHeader eyebrow="Nível" title={SOURCE_TIER_LABEL[tier as keyof typeof SOURCE_TIER_LABEL]} description={`${list.length} fonte(s)`} />
            <ul>
              {list.map((source) => (
                <li key={source.id} className="border-b px-5 py-4 last:border-b-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-[14px] font-medium">
                      {source.organization} · {source.name}
                    </p>
                    {source.isDemo ? <Badge tone="signal">demonstração</Badge> : null}
                    {source.lastSyncAt ? (
                      <Badge tone="accent">sincronizada {formatRelative(source.lastSyncAt)}</Badge>
                    ) : (
                      <Badge tone="outline">aguardando ingestão</Badge>
                    )}
                    <Badge tone="outline">{source._count.dataPoints.toLocaleString("pt-BR")} observações</Badge>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                    {source.description}
                  </p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
                    {source.methodology}
                  </p>
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:underline"
                    >
                      Abrir fonte
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
    </>
  );
}
