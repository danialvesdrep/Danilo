import { ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PendingIntegration, EmptyState } from "@/components/ui/empty";
import { DemoBadge } from "@/components/data/provenance";
import { getDocuments } from "@/server/queries/municipality";
import { formatDate } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

export async function DocumentsTab({ municipality }: { municipality: MunicipalityDetail }) {
  const documents = await getDocuments(municipality.id, 40);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          eyebrow="Documentos"
          title={`Atos e publicações de ${municipality.name}`}
          description="Indexamos metadados e link para o documento original — nunca reproduzimos o conteúdo integral."
        />
        {documents.length ? (
          <ul>
            {documents.map((document) => (
              <li key={document.id} className="border-b px-5 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="outline">{document.kind.replace(/_/g, " ").toLowerCase()}</Badge>
                  <span className="text-[11px] text-[var(--fg-subtle)]">
                    {formatDate(document.publishedAt)}
                  </span>
                  {document.source ? (
                    <span className="text-[11px] text-[var(--fg-muted)]">
                      {document.source.organization}
                    </span>
                  ) : null}
                  {document.isDemo ? <DemoBadge compact /> : null}
                </div>
                <p className="mt-1 text-[13.5px] font-medium leading-snug">{document.title}</p>
                {document.summary ? (
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--fg-muted)]">
                    {document.summary}
                  </p>
                ) : null}
                <a
                  href={document.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 inline-flex items-center gap-1 text-[12px] text-[var(--accent)] hover:underline"
                >
                  Abrir documento
                  <ExternalLink className="size-2.5" aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="Nenhum documento indexado"
            description="A ingestão de diários oficiais e atos municipais está mapeada na arquitetura, mas ainda não foi conectada."
          />
        )}
      </Card>

      <PendingIntegration
        source="Querido Diário, portais municipais e TCE-SP"
        what={`A indexação de diários oficiais, contratos, editais e atos de ${municipality.name}`}
      />
    </div>
  );
}
