import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { DemoBadge } from "@/components/data/provenance";
import { Metric } from "@/components/data/metric";
import { getMunicipalityInvestments } from "@/server/queries/municipality";
import { toNumber } from "@/server/db/prisma";
import { formatCurrencyScaled, formatDate, formatNumber } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

const STATUS_TONE = {
  ANUNCIADO: "signal",
  EM_IMPLANTACAO: "accent",
  CONCLUIDO: "rise",
  SUSPENSO: "outline",
  CANCELADO: "fall",
} as const;

export async function InvestmentsTab({ municipality }: { municipality: MunicipalityDetail }) {
  const investments = await getMunicipalityInvestments(municipality.id, 40);

  if (!investments.length) {
    return (
      <Card>
        <EmptyState
          title="Nenhum investimento registrado"
          description={`Nenhum anúncio de investimento em ${municipality.name} foi capturado pelas fontes conectadas.`}
        />
      </Card>
    );
  }

  const total = investments.reduce((sum, item) => sum + (toNumber(item.amountBRL) ?? 0), 0);
  const jobs = investments.reduce((sum, item) => sum + (item.jobsAnnounced ?? 0), 0);
  const anyDemo = investments.some((item) => item.isDemo);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          eyebrow="Investimentos"
          title="O que foi anunciado"
          description="Valores anunciados, não realizados. A plataforma acompanha a evolução quando as fontes publicam atualização."
        />
        <CardBody className="grid gap-6 sm:grid-cols-3">
          <Metric label="Total anunciado" value={total} unit="BRL" size="lg" isDemo={anyDemo} />
          <Metric label="Postos previstos" value={jobs} unit="vinculos" size="lg" isDemo={anyDemo} />
          <Metric label="Projetos" value={investments.length} unit="unidades" size="lg" />
        </CardBody>
      </Card>

      <Card>
        <CardHeader eyebrow="Projetos" title="Registros individuais" />
        <ul>
          {investments.map((investment) => (
            <li key={investment.id} className="border-b px-5 py-4 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[investment.status]}>
                  {investment.status.replace(/_/g, " ").toLowerCase()}
                </Badge>
                {investment.sector ? (
                  <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--fg-muted)]">
                    <span
                      className="size-1.5 rounded-full"
                      style={{ backgroundColor: investment.sector.color ?? "var(--accent)" }}
                      aria-hidden
                    />
                    {investment.sector.name}
                  </span>
                ) : null}
                {investment.isDemo ? <DemoBadge compact /> : null}
              </div>

              <p className="mt-1.5 text-[14px] font-medium leading-snug">{investment.title}</p>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                {investment.description}
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12px]">
                {investment.company ? (
                  <Link
                    href={`/empresa/${investment.company.slug}`}
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {investment.company.name}
                  </Link>
                ) : null}
                {investment.amountBRL ? (
                  <span className="tnum font-medium">
                    {formatCurrencyScaled(toNumber(investment.amountBRL))}
                  </span>
                ) : null}
                {investment.jobsAnnounced ? (
                  <span className="tnum text-[var(--fg-muted)]">
                    {formatNumber(investment.jobsAnnounced)} postos
                  </span>
                ) : null}
                <span className="text-[var(--fg-subtle)]">
                  Anunciado em {formatDate(investment.announcedAt)}
                </span>
                {investment.expectedAt ? (
                  <span className="text-[var(--fg-subtle)]">
                    Previsão: {formatDate(investment.expectedAt)}
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
