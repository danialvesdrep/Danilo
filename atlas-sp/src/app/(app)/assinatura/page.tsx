import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { ManageSubscription } from "@/components/billing/manage";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { formatCents, formatDate } from "@/lib/format";

export const metadata: Metadata = {
  title: "Assinatura",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<string, { label: string; tone: "rise" | "signal" | "fall" | "neutral" }> = {
  ACTIVE: { label: "Ativa", tone: "rise" },
  TRIALING: { label: "Em período de teste", tone: "accent" as never },
  PAST_DUE: { label: "Pagamento pendente", tone: "signal" },
  CANCELED: { label: "Cancelada", tone: "fall" },
  INCOMPLETE: { label: "Incompleta", tone: "signal" },
  NAO_CONFIGURADO: { label: "Cobrança não conectada", tone: "neutral" },
};

export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?proximo=/assinatura");

  const subscription = await prisma.subscription.findUnique({
    where: { userId: user.id },
    include: { plan: true },
  });

  const status = STATUS_LABEL[subscription?.status ?? "ACTIVE"] ?? STATUS_LABEL.ACTIVE;
  const limits = (subscription?.plan.limits as Record<string, number | boolean>) ?? {};

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Assinatura"
        description="Plano atual, limites de uso e gestão do pagamento."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Assinatura" }]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader eyebrow="Plano atual" title={subscription?.plan.name ?? "Free"} />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={status.tone as never}>{status.label}</Badge>
              {subscription?.provider && subscription.provider !== "none" ? (
                <Badge tone="outline" mono>{subscription.provider}</Badge>
              ) : null}
              {subscription?.currentPeriodEnd ? (
                <span className="text-[12px] text-[var(--fg-muted)]">
                  Renova em {formatDate(subscription.currentPeriodEnd)}
                </span>
              ) : null}
              {subscription?.trialEndsAt ? (
                <span className="text-[12px] text-[var(--fg-muted)]">
                  Teste até {formatDate(subscription.trialEndsAt)}
                </span>
              ) : null}
            </div>

            <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">
              {subscription?.plan.description}
            </p>

            {subscription?.plan.priceMonthly ? (
              <p className="text-[13px]">
                <span className="metric-value text-[20px] font-semibold">
                  {formatCents(subscription.plan.priceMonthly)}
                </span>
                <span className="ml-1.5 text-[12px] text-[var(--fg-subtle)]">por mês</span>
              </p>
            ) : null}

            <ManageSubscription
              hasProvider={Boolean(subscription?.providerCustomerId)}
              tier={subscription?.plan.tier ?? "FREE"}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Limites" title="O que o plano permite" dense />
          <CardBody dense>
            <dl className="space-y-2 text-[12.5px]">
              {[
                ["Cidades salvas", limits.savedMunicipalities],
                ["Alertas ativos", limits.alerts],
                ["Perguntas à IA por dia", limits.aiQuestionsPerDay],
                ["Municípios por comparação", limits.comparisonSlots],
                ["Histórico do Radar (dias)", limits.radarHistoryDays],
                ["Exportações por mês", limits.exports],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between gap-3">
                  <dt className="text-[var(--fg-muted)]">{label as string}</dt>
                  <dd className="tnum font-medium">
                    {typeof value === "number" ? (value === -1 ? "Ilimitado" : value) : "—"}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--fg-muted)]">Acesso via API</dt>
                <dd className="font-medium">{limits.apiAccess ? "Sim" : "Não"}</dd>
              </div>
            </dl>
            <Link
              href="/planos"
              className="mt-4 inline-block text-[12.5px] font-medium text-[var(--accent)] hover:underline"
            >
              Comparar planos
            </Link>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
