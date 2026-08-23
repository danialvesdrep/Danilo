import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { Metric } from "@/components/data/metric";
import { EmptyState } from "@/components/ui/empty";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { JOBS } from "@/server/pipeline/registry";
import { formatDate, formatDateTime, formatNumber, formatRelative } from "@/lib/format";

export const metadata: Metadata = {
  title: "Administração",
  robots: { index: false, follow: false },
};

const QUALITY_TONE: Record<string, "rise" | "signal" | "fall"> = {
  OK: "rise", ATENCAO: "signal", FALHA: "fall",
};

/**
 * Painel administrativo. Reúne o que a operação precisa ver: fontes, jobs,
 * qualidade dos dados, revisão de sinais e usuários. Restrito ao papel ADMIN.
 */
export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?proximo=/admin");
  if (user.role !== "ADMIN") redirect("/dashboard");

  const [sources, quality, recentRuns, latestSignals, ambiguous, users, subscriptions, dataPoints] =
    await Promise.all([
      prisma.dataSource.findMany({ orderBy: [{ tier: "asc" }, { organization: "asc" }] }),
      prisma.dataQualityCheck.findMany({ orderBy: { key: "asc" } }),
      prisma.ingestionRun.findMany({
        orderBy: { startedAt: "desc" },
        take: 12,
        include: { source: { select: { name: true } }, _count: { select: { issues: true } } },
      }),
      prisma.radarSignal.findMany({
        orderBy: { detectedAt: "desc" },
        take: 8,
        select: {
          id: true, slug: true, headline: true, score: true, isDemo: true, status: true, detectedAt: true,
          municipality: { select: { name: true, slug: true } },
        },
      }),
      prisma.$queryRaw<Array<{ normalizedKey: string; count: bigint }>>`
        SELECT "normalizedKey", COUNT(DISTINCT "municipalityId")::bigint AS count
        FROM "EntityAlias" WHERE "entityType" = 'MUNICIPIO'
        GROUP BY "normalizedKey" HAVING COUNT(DISTINCT "municipalityId") > 1`,
      prisma.user.count(),
      prisma.subscription.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.dataPoint.count(),
    ]);

  const demoPoints = await prisma.dataPoint.count({ where: { isDemo: true } });

  return (
    <>
      <PageHeader
        eyebrow="Operação"
        title="Administração"
        description="Estado das fontes, dos jobs, da qualidade dos dados e das assinaturas."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Administração" }]}
      />

      <div className="mb-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card><CardBody><Metric label="Municípios" value={645} unit="unidades" size="lg" /></CardBody></Card>
        <Card><CardBody>
          <Metric label="Observações no banco" value={dataPoints} unit="unidades" size="lg" />
          <p className="mt-1 text-[11.5px] text-[var(--fg-subtle)]">
            {formatNumber(demoPoints)} de demonstração ({((demoPoints / (dataPoints || 1)) * 100).toFixed(1)}%)
          </p>
        </CardBody></Card>
        <Card><CardBody><Metric label="Usuários" value={users} unit="unidades" size="lg" /></CardBody></Card>
        <Card><CardBody>
          <p className="text-[11.5px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
            Assinaturas
          </p>
          <ul className="mt-2 space-y-1 text-[12px]">
            {subscriptions.map((entry) => (
              <li key={entry.status} className="flex justify-between gap-2">
                <span className="text-[var(--fg-muted)]">{entry.status.toLowerCase()}</span>
                <span className="tnum font-medium">{entry._count._all}</span>
              </li>
            ))}
            {!subscriptions.length ? <li className="text-[var(--fg-subtle)]">Nenhuma</li> : null}
          </ul>
        </CardBody></Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Qualidade" title="Verificações do banco" description="Rodam junto com o seed e também como job horário." />
          <ul>
            {quality.map((check) => (
              <li key={check.key} className="border-b px-5 py-3 last:border-b-0">
                <div className="flex items-center gap-2">
                  <Badge tone={QUALITY_TONE[check.status] ?? "neutral"}>{check.status.toLowerCase()}</Badge>
                  <span className="text-[13px] font-medium">{check.name}</span>
                </div>
                <p className="mt-1 text-[12px] leading-relaxed text-[var(--fg-muted)]">{check.detail}</p>
                <p className="mt-0.5 text-[11px] text-[var(--fg-subtle)]">
                  Última execução {check.lastRunAt ? formatDateTime(check.lastRunAt) : "nunca"}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader eyebrow="Pipeline" title="Jobs de ingestão e cálculo" description="Configure agendamento e credenciais externas por variável de ambiente." />
          <ul>
            {JOBS.map((job) => (
              <li key={job.key} className="border-b px-5 py-3 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[11.5px]">{job.key}</span>
                  <Badge tone="outline">{job.cadence.toLowerCase()}</Badge>
                  <Badge tone={job.requiresNetwork ? "signal" : "accent"}>
                    {job.requiresNetwork ? "requer rede" : "local"}
                  </Badge>
                </div>
                <p className="mt-1 text-[12.5px] font-medium">{job.name}</p>
                <p className="mt-0.5 text-[11.5px] leading-relaxed text-[var(--fg-muted)]">{job.description}</p>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Fontes" title="Catálogo" />
          <div className="max-h-[520px] overflow-y-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="sticky top-0 z-10 border-b bg-[var(--bg-raised)]">
                  <th className="px-5 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Fonte</th>
                  <th className="px-5 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Nível</th>
                  <th className="px-5 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Última sincronização</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => (
                  <tr key={source.id} className="border-b last:border-b-0">
                    <td className="px-5 py-2">
                      <p className="text-[13px] font-medium">{source.name}</p>
                      <p className="text-[11px] text-[var(--fg-subtle)]">{source.organization}</p>
                    </td>
                    <td className="px-5 py-2">
                      <Badge tone={source.tier === "OFICIAL" ? "accent" : source.tier === "DEMONSTRACAO" ? "signal" : "outline"}>
                        {source.tier.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-2 text-[11.5px] text-[var(--fg-muted)]">
                      {source.lastSyncAt ? formatRelative(source.lastSyncAt) : "aguardando ingestão"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <CardHeader eyebrow="Execuções" title="Últimas ingestões" />
          {recentRuns.length ? (
            <ul>
              {recentRuns.map((run) => (
                <li key={run.id} className="border-b px-5 py-2.5 last:border-b-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px]">{run.jobKey}</span>
                    <Badge tone={run.status === "SUCESSO" ? "rise" : run.status === "FALHA" ? "fall" : "signal"}>
                      {run.status.toLowerCase()}
                    </Badge>
                    {run._count.issues > 0 ? (
                      <Badge tone="signal">{run._count.issues} problema(s)</Badge>
                    ) : null}
                  </div>
                  <p className="mt-1 text-[11.5px] text-[var(--fg-muted)]">
                    {formatDateTime(run.startedAt)} · lido {run.itemsRead} · gravado {run.itemsWritten}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhuma execução registrada" />
          )}
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader eyebrow="Radar" title="Sinais recentes" />
          <ul>
            {latestSignals.map((signal) => (
              <li key={signal.id} className="border-b px-5 py-2.5 last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px]">{signal.score}</span>
                  <Badge tone={signal.status === "PUBLICADO" ? "accent" : "outline"}>
                    {signal.status.toLowerCase()}
                  </Badge>
                  {signal.isDemo ? <Badge tone="signal">demo</Badge> : null}
                </div>
                <Link href={`/radar/${signal.slug}`} className="mt-1 block text-[13px] font-medium hover:text-[var(--accent)]">
                  {signal.headline}
                </Link>
                <p className="text-[11px] text-[var(--fg-subtle)]">
                  {signal.municipality.name} · {formatRelative(signal.detectedAt)}
                </p>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <CardHeader eyebrow="Entidades" title="Aliases ambíguos" description="Chaves que apontam para mais de uma entidade — a resolução exige contexto." />
          {ambiguous.length ? (
            <ul>
              {ambiguous.map((row) => (
                <li key={row.normalizedKey} className="border-b px-5 py-2 last:border-b-0">
                  <span className="font-mono text-[12px]">{row.normalizedKey}</span>
                  <span className="ml-2 text-[11.5px] text-[var(--fg-muted)]">
                    {String(row.count)} municípios com essa chave
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nenhum alias ambíguo detectado" />
          )}
        </Card>
      </div>
    </>
  );
}
