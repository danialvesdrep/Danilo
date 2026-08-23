import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PendingIntegration } from "@/components/ui/empty";
import { DemoBadge } from "@/components/data/provenance";
import { getMunicipalityCompanies } from "@/server/queries/municipality";
import type { MunicipalityDetail } from "@/server/queries/municipality";

export async function CompaniesTab({ municipality }: { municipality: MunicipalityDetail }) {
  const companies = await getMunicipalityCompanies(municipality.id, 60);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          eyebrow="Empresas"
          title={`Empresas registradas em ${municipality.name}`}
          description="Empresas com presença relevante segundo os registros carregados na plataforma."
        />
        {companies.length ? (
          <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {companies.map((company) => (
              <div key={company.id} className="bg-[var(--bg-raised)] px-4 py-3.5">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/empresa/${company.slug}`}
                    className="text-[13.5px] font-medium leading-snug hover:text-[var(--accent)]"
                  >
                    {company.name}
                  </Link>
                  {company.isDemo ? <DemoBadge compact /> : null}
                </div>
                {company.sector ? (
                  <span className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] text-[var(--fg-muted)]">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: company.sector.color ?? "var(--accent)" }}
                      aria-hidden
                    />
                    {company.sector.name}
                  </span>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {company.employeeBand ? (
                    <Badge tone="outline">{company.employeeBand} funcionários</Badge>
                  ) : null}
                  {company.foundedYear ? <Badge tone="outline">desde {company.foundedYear}</Badge> : null}
                  {company._count.investments > 0 ? (
                    <Badge tone="accent">{company._count.investments} investimento(s)</Badge>
                  ) : null}
                </div>
                {company.websiteUrl ? (
                  <a
                    href={company.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-[var(--accent)] hover:underline"
                  >
                    Site
                    <ExternalLink className="size-2.5" aria-hidden />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nenhuma empresa registrada"
            description="O tecido empresarial do município ainda não foi carregado."
          />
        )}
      </Card>

      <PendingIntegration
        source="base pública de CNPJ da Receita Federal"
        what={`O cadastro completo de estabelecimentos ativos em ${municipality.name}, com CNAE principal e porte,`}
      />
    </div>
  );
}
