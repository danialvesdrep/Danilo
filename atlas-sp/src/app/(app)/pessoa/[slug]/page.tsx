import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState, PanelSkeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/shell/page-header";
import { DemoBadge, DemoNotice } from "@/components/data/provenance";
import { GraphPanel } from "@/components/graph/graph-panel";
import { prisma } from "@/server/db/prisma";
import { neighborhood } from "@/server/graph/graph";
import { formatDate } from "@/lib/format";

type Params = Promise<{ slug: string }>;

const personSelect = {
  id: true, slug: true, name: true, fullName: true, biography: true, photoUrl: true,
  websiteUrl: true, birthYear: true, isDemo: true,
  party: { select: { acronym: true, name: true, color: true, slug: true } },
  social: { select: { platform: true, url: true, handle: true, verified: true } },
  mandates: {
    orderBy: { startDate: "desc" as const },
    select: {
      office: true, officeLabel: true, startDate: true, endDate: true, isCurrent: true,
      sourceUrl: true, isDemo: true,
      municipality: { select: { name: true, slug: true, mesoName: true } },
      party: { select: { acronym: true } },
    },
  },
  councilSeats: {
    select: {
      role: true, committees: true, startDate: true, endDate: true, isCurrent: true,
      council: { select: { municipality: { select: { name: true, slug: true } } } },
      party: { select: { acronym: true } },
    },
  },
  articles: {
    take: 12,
    orderBy: { article: { publishedAt: "desc" as const } },
    select: {
      article: {
        select: {
          id: true, slug: true, title: true, publishedAt: true, isDemo: true,
          source: { select: { name: true } },
        },
      },
    },
  },
} as const;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const person = await prisma.person.findUnique({ where: { slug }, select: { name: true, isDemo: true } });
  if (!person) return { title: "Pessoa não encontrada" };
  return {
    title: person.name,
    description: `Perfil público de ${person.name}: cargos, mandatos, partido, atividade legislativa e menções na imprensa indexada.`,
    // Registros de demonstração não devem ser indexados como se fossem pessoas reais.
    robots: person.isDemo ? { index: false, follow: false } : undefined,
  };
}

/**
 * Perfil de pessoa pública. Somente informação pública e oficial: cargo,
 * mandato, partido, atividade legislativa e perfis institucionais. Nunca dados
 * pessoais sensíveis, endereço, contato privado ou avaliação de conduta.
 */
export default async function PersonPage({ params }: { params: Params }) {
  const { slug } = await params;
  const person = await prisma.person.findUnique({ where: { slug }, select: personSelect });
  if (!person) notFound();

  const current = person.mandates.find((mandate) => mandate.isCurrent);
  const seat = person.councilSeats.find((entry) => entry.isCurrent);
  const place = current?.municipality ?? seat?.council.municipality;

  return (
    <>
      <PageHeader
        eyebrow={
          current
            ? `${current.officeLabel ?? current.office.replace(/_/g, " ").toLowerCase()} · ${current.municipality.name}`
            : seat
              ? `Vereador · ${seat.council.municipality.name}`
              : "Perfil público"
        }
        title={person.name}
        description={person.fullName && person.fullName !== person.name ? person.fullName : undefined}
        breadcrumbs={[
          { label: "Atlas SP", href: "/dashboard" },
          ...(place ? [{ label: place.name, href: `/cidade/${place.slug}` }] : []),
          { label: "Pessoa" },
        ]}
      />

      {person.isDemo ? (
        <DemoNotice className="mb-6">
          Este é um registro de{" "}
          <strong className="font-semibold text-[var(--fg)]">demonstração</strong>: não corresponde a
          nenhuma pessoa real. Perfis verdadeiros dependem da ingestão dos dados do TSE e dos portais
          oficiais, ainda não conectados neste ambiente.
        </DemoNotice>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardBody>
              <div className="flex items-start gap-4">
                <div className="flex size-16 shrink-0 items-center justify-center rounded-full border bg-[var(--bg-inset)] text-[20px] font-semibold uppercase">
                  {person.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-[17px] font-semibold">{person.name}</h2>
                    {person.party ? (
                      <Link href={`/politica?partido=${person.party.acronym}`}>
                        <Badge tone="outline" title={person.party.name}>
                          {person.party.acronym}
                        </Badge>
                      </Link>
                    ) : null}
                    {person.isDemo ? <DemoBadge compact /> : null}
                  </div>
                  {person.biography ? (
                    <p className="mt-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">
                      {person.biography}
                    </p>
                  ) : null}
                  {person.websiteUrl ? (
                    <a
                      href={person.websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-[var(--accent)] hover:underline"
                    >
                      Site oficial
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  ) : null}
                  {person.social.length ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {person.social.map((profile) => (
                        <a
                          key={profile.url}
                          href={profile.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-[var(--radius-xs)] border px-1.5 py-0.5 text-[11px] text-[var(--fg-muted)] hover:border-[var(--border-strong)]"
                        >
                          {profile.platform.toLowerCase()}
                          {profile.handle ? ` · ${profile.handle}` : ""}
                        </a>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader eyebrow="Trajetória" title="Mandatos e cargos" />
            {person.mandates.length || person.councilSeats.length ? (
              <ol className="relative ml-7 border-l py-4 pr-5">
                {person.mandates.map((mandate, index) => (
                  <li key={index} className="relative pb-4 pl-5 last:pb-0">
                    <span
                      className="absolute -left-[5px] top-1.5 size-2 rounded-full border-2 border-[var(--bg-raised)] bg-[var(--accent)]"
                      aria-hidden
                    />
                    <p className="text-[13.5px] font-medium">
                      {mandate.officeLabel ?? mandate.office.replace(/_/g, " ").toLowerCase()}
                      {" · "}
                      <Link href={`/cidade/${mandate.municipality.slug}`} className="hover:text-[var(--accent)]">
                        {mandate.municipality.name}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-[var(--fg-subtle)]">
                      {formatDate(mandate.startDate)}
                      {mandate.endDate ? ` — ${formatDate(mandate.endDate)}` : " — atual"}
                      {mandate.party ? ` · ${mandate.party.acronym}` : ""}
                    </p>
                  </li>
                ))}
                {person.councilSeats.map((entry, index) => (
                  <li key={`seat-${index}`} className="relative pb-4 pl-5 last:pb-0">
                    <span
                      className="absolute -left-[5px] top-1.5 size-2 rounded-full border-2 border-[var(--bg-raised)] bg-[var(--border-strong)]"
                      aria-hidden
                    />
                    <p className="text-[13.5px] font-medium">
                      {entry.role ?? "Vereador"}
                      {" · Câmara de "}
                      <Link
                        href={`/cidade/${entry.council.municipality.slug}?aba=camara`}
                        className="hover:text-[var(--accent)]"
                      >
                        {entry.council.municipality.name}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-[11.5px] text-[var(--fg-subtle)]">
                      {formatDate(entry.startDate)}
                      {entry.endDate ? ` — ${formatDate(entry.endDate)}` : " — atual"}
                      {entry.party ? ` · ${entry.party.acronym}` : ""}
                    </p>
                    {entry.committees.length ? (
                      <p className="mt-0.5 text-[11px] text-[var(--fg-subtle)]">
                        Comissões: {entry.committees.join(", ")}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState title="Nenhum mandato registrado" />
            )}
          </Card>

          <Card>
            <CardHeader eyebrow="Imprensa" title="Menções indexadas" />
            {person.articles.length ? (
              <ul>
                {person.articles.map((entry) => (
                  <li key={entry.article.id} className="border-b px-5 py-2.5 last:border-b-0">
                    <Link
                      href={`/noticias/${entry.article.slug}`}
                      className="text-[13px] font-medium hover:text-[var(--accent)]"
                    >
                      {entry.article.title}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-[var(--fg-subtle)]">
                      {entry.article.source.name} · {formatDate(entry.article.publishedAt)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Nenhuma menção indexada" />
            )}
          </Card>
        </div>

        <aside className="space-y-6">
          <Suspense fallback={<Card><PanelSkeleton rows={3} /></Card>}>
            <PersonGraph personId={person.id} />
          </Suspense>

          <Card>
            <CardHeader eyebrow="Privacidade" title="O que registramos" dense />
            <CardBody dense>
              <p className="text-[12px] leading-relaxed text-[var(--fg-muted)]">
                Esta página reúne apenas informação pública de natureza institucional: cargo,
                mandato, filiação partidária, atividade legislativa e perfis oficiais. Não coletamos
                nem exibimos endereço, contato privado, dados pessoais sensíveis ou qualquer
                avaliação de conduta. Pedidos de correção ou remoção podem ser feitos pelos canais
                indicados na Política de Privacidade.
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}

async function PersonGraph({ personId }: { personId: string }) {
  const graph = await neighborhood("PESSOA", personId, { limitPerKind: 8 });
  if (!graph) return null;
  return <GraphPanel graph={graph} title="Conexões" />;
}
