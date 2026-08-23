import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { DemoBadge, DemoNotice } from "@/components/data/provenance";
import { getGovernment, getCouncilProjects } from "@/server/queries/municipality";
import { formatDate, formatPercent } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

const STATUS_TONE = {
  APRESENTADO: "neutral",
  EM_COMISSAO: "accent",
  APROVADO: "rise",
  SANCIONADO: "rise",
  REJEITADO: "fall",
  ARQUIVADO: "outline",
} as const;

/** Câmara Municipal: composição partidária e atividade legislativa. */
export async function CouncilTab({ municipality }: { municipality: MunicipalityDetail }) {
  const [government, projects] = await Promise.all([
    getGovernment(municipality.id),
    getCouncilProjects(municipality.id, 24),
  ]);

  if (!municipality.council) {
    return (
      <Card>
        <EmptyState
          title="Câmara não cadastrada"
          description={`A composição da Câmara de ${municipality.name} depende da ingestão dos dados do TSE e do portal da Casa.`}
        />
      </Card>
    );
  }

  const seats = municipality.council.seats;
  const anyDemo = government.councilMembers.some((member) => member.isDemo);

  return (
    <div className="space-y-6">
      {anyDemo ? (
        <DemoNotice>
          A composição desta Câmara pertence ao conjunto de{" "}
          <strong className="font-semibold text-[var(--fg)]">demonstração</strong>: os vereadores
          listados não são pessoas reais. O número de cadeiras, esse sim, segue o limite
          constitucional para a faixa populacional do município.
        </DemoNotice>
      ) : null}

      <Card>
        <CardHeader
          eyebrow="Composição"
          title={`Câmara Municipal de ${municipality.name}`}
          description={`${seats} cadeiras · legislatura ${municipality.council.legislature ?? "atual"}`}
        />
        <CardBody>
          {/* Diagrama de assentos: leitura imediata do equilíbrio partidário. */}
          <div className="flex flex-wrap gap-1">
            {government.partyComposition.flatMap((party) =>
              Array.from({ length: party.seats }).map((_, index) => (
                <span
                  key={`${party.acronym}-${index}`}
                  title={`${party.acronym} — ${party.name}`}
                  className="size-4 rounded-sm"
                  style={{ backgroundColor: party.color ?? "var(--border-strong)" }}
                />
              )),
            )}
          </div>

          <ul className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {government.partyComposition.map((party) => (
              <li key={party.acronym} className="flex items-center gap-2.5">
                <span
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: party.color ?? "var(--border-strong)" }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium" title={party.name}>
                  {party.acronym}
                </span>
                <span className="tnum shrink-0 text-[12.5px]">{party.seats}</span>
                <span className="tnum w-12 shrink-0 text-right text-[11px] text-[var(--fg-subtle)]">
                  {formatPercent((party.seats / seats) * 100, 0)}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t pt-3 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
            A plataforma registra a composição declarada. Não classifica bancadas como situação ou
            oposição, nem atribui posição política a nenhum parlamentar.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader eyebrow="Parlamentares" title="Vereadores" description={`${government.councilMembers.length} registrado(s)`} />
        {government.councilMembers.length ? (
          <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
            {government.councilMembers.map((member) => (
              <div key={member.person.id} className="bg-[var(--bg-raised)] px-4 py-3">
                <div className="flex items-start justify-between gap-2">
                  <Link
                    href={`/pessoa/${member.person.slug}`}
                    className="text-[13px] font-medium leading-snug hover:text-[var(--accent)]"
                  >
                    {member.person.name}
                  </Link>
                  {member.person.isDemo ? <DemoBadge compact /> : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {member.party ? (
                    <Badge tone="outline" title={member.party.name}>
                      {member.party.acronym}
                    </Badge>
                  ) : null}
                  {member.role ? <Badge tone="accent">{member.role}</Badge> : null}
                </div>
                {member.committees.length ? (
                  <p className="mt-1.5 text-[11px] leading-snug text-[var(--fg-subtle)]">
                    {member.committees.join(" · ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="Vereadores não cadastrados" />
        )}
      </Card>

      <Card>
        <CardHeader
          eyebrow="Atividade da Câmara"
          title="Proposições registradas"
          description="Projetos em tramitação e decididos, conforme registrado na plataforma."
        />
        {projects.length ? (
          <ul>
            {projects.map((project) => (
              <li key={project.id} className="border-b px-5 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11px] text-[var(--fg-subtle)]">{project.code}</span>
                  <Badge tone={STATUS_TONE[project.status]}>
                    {project.status.replace(/_/g, " ").toLowerCase()}
                  </Badge>
                  {project.theme ? <Badge tone="outline">{project.theme}</Badge> : null}
                  {project.isDemo ? <DemoBadge compact /> : null}
                </div>
                <p className="mt-1.5 text-[13.5px] font-medium leading-snug">{project.title}</p>
                {project.summary ? (
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--fg-muted)]">
                    {project.summary}
                  </p>
                ) : null}
                <p className="mt-1.5 text-[11px] text-[var(--fg-subtle)]">
                  Apresentado em {formatDate(project.presentedAt)}
                  {project.decidedAt ? ` · decidido em ${formatDate(project.decidedAt)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="Nenhuma proposição registrada" />
        )}
      </Card>
    </div>
  );
}
