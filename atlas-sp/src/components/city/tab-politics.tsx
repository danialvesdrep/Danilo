import Link from "next/link";
import { ExternalLink, Landmark } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PendingIntegration } from "@/components/ui/empty";
import { DemoBadge, DemoNotice } from "@/components/data/provenance";
import { getGovernment } from "@/server/queries/municipality";
import { formatDate } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

/**
 * Governança municipal. A plataforma descreve quem ocupa cada cargo e o que
 * está registrado — não emite juízo sobre desempenho nem classifica gestão.
 */
export async function PoliticsTab({ municipality }: { municipality: MunicipalityDetail }) {
  const government = await getGovernment(municipality.id);
  const departments = municipality.government?.departments ?? [];
  const anyDemo =
    government.mayor?.isDemo || government.viceMayor?.isDemo || departments.some((d) => d.isDemo);

  return (
    <div className="space-y-6">
      {anyDemo ? (
        <DemoNotice>
          Os nomes de ocupantes de cargo desta aba pertencem ao conjunto de{" "}
          <strong className="font-semibold text-[var(--fg)]">demonstração</strong> e não correspondem
          a pessoas reais. A composição verdadeira do Executivo de {municipality.name} depende da
          ingestão dos dados do TSE e do portal oficial da prefeitura, ainda não conectados.
        </DemoNotice>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2">
        <OfficeCard title="Prefeito" mandate={government.mayor} municipality={municipality.name} />
        <OfficeCard title="Vice-prefeito" mandate={government.viceMayor} municipality={municipality.name} />
      </div>

      <Card>
        <CardHeader
          eyebrow="Estrutura"
          title="Secretarias"
          description="Pastas registradas na estrutura administrativa do município."
        />
        {departments.length ? (
          <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {departments.map((department) => (
              <div key={department.id} className="bg-[var(--bg-raised)] px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[13px] font-medium leading-snug">{department.name}</p>
                  {department.isDemo ? <DemoBadge compact /> : null}
                </div>
                {department.area ? (
                  <p className="mt-0.5 text-[11px] uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                    {department.area}
                  </p>
                ) : null}
                {department.headName ? (
                  <p className="mt-1.5 text-[12.5px] text-[var(--fg-muted)]">{department.headName}</p>
                ) : null}
                {department.websiteUrl ? (
                  <a
                    href={department.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-[11.5px] text-[var(--accent)] hover:underline"
                  >
                    Site oficial
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Estrutura não disponível" />
        )}
      </Card>

      <Card>
        <CardHeader eyebrow="Transparência" title="Canais oficiais" />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-3">
            <OfficialLink label="Portal da prefeitura" url={municipality.government?.websiteUrl ?? null} />
            <OfficialLink label="Portal da transparência" url={municipality.government?.transparencyUrl ?? null} />
            <OfficialLink label="Diário oficial" url={municipality.government?.officialGazetteUrl ?? null} />
          </div>
          <PendingIntegration
            className="mt-4"
            source="portais oficiais das prefeituras e do Querido Diário"
            what={`O mapeamento dos canais oficiais de ${municipality.name}`}
          />
        </CardBody>
      </Card>
    </div>
  );
}

type Mandate = Awaited<ReturnType<typeof getGovernment>>["mayor"];

function OfficeCard({
  title,
  mandate,
  municipality,
}: {
  title: string;
  mandate: Mandate;
  municipality: string;
}) {
  if (!mandate) {
    return (
      <Card>
        <CardHeader eyebrow="Executivo" title={title} dense />
        <EmptyState
          icon={Landmark}
          title="Dados não disponíveis"
          description={`Não há registro carregado para ${title.toLowerCase()} de ${municipality}.`}
        />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader eyebrow="Executivo" title={title} dense />
      <CardBody dense>
        <div className="flex items-start gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full border bg-[var(--bg-inset)] text-[15px] font-semibold uppercase">
            {mandate.person.name.slice(0, 2)}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/pessoa/${mandate.person.slug}`}
                className="text-[15px] font-semibold hover:text-[var(--accent)]"
              >
                {mandate.person.name}
              </Link>
              {mandate.party ? (
                <Badge tone="outline" title={mandate.party.name}>
                  {mandate.party.acronym}
                </Badge>
              ) : null}
              {mandate.isDemo ? <DemoBadge compact /> : null}
            </div>
            <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
              Mandato de {formatDate(mandate.startDate)}
              {mandate.endDate ? ` a ${formatDate(mandate.endDate)}` : ""}
            </p>
            {mandate.person.biography ? (
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                {mandate.person.biography}
              </p>
            ) : null}
            {mandate.person.social.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {mandate.person.social.map((profile) => (
                  <a
                    key={profile.url}
                    href={profile.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-[var(--radius-xs)] border px-1.5 py-0.5 text-[11px] text-[var(--fg-muted)] hover:border-[var(--border-strong)]"
                  >
                    {profile.platform.toLowerCase()}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

function OfficialLink({ label, url }: { label: string; url: string | null }) {
  return (
    <div>
      <p className="text-[11.5px] uppercase tracking-[0.05em] text-[var(--fg-subtle)]">{label}</p>
      {url ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1 text-[13px] font-medium text-[var(--accent)] hover:underline"
        >
          Abrir
          <ExternalLink className="size-3" aria-hidden />
        </a>
      ) : (
        <p className="mt-1 text-[13px] text-[var(--fg-subtle)]">Não cadastrado</p>
      )}
    </div>
  );
}
