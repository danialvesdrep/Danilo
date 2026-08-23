import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { PlanActions } from "@/components/billing/plan-actions";
import { prisma } from "@/server/db/prisma";
import { getCurrentUser } from "@/server/auth/session";
import { formatCents } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = {
  title: "Planos",
  description:
    "Planos do Atlas SP: Free para explorar os 645 municípios, Pro para acompanhar o Estado todos os dias e Enterprise para equipes.",
};

export default async function PlansPage() {
  const [plans, user] = await Promise.all([
    prisma.plan.findMany({ where: { active: true }, orderBy: { displayOrder: "asc" } }),
    getCurrentUser(),
  ]);

  const billingConfigured = (process.env.BILLING_PROVIDER ?? "none") !== "none";

  return (
    <>
      <PageHeader
        eyebrow="Assinatura"
        title="Planos"
        description="Comece pelo Free e evolua quando precisar de alertas, comparações e Atlas AI sem fila."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Planos" }]}
      />

      {!billingConfigured ? (
        <div className="mb-6 rounded-[var(--radius-md)] border border-dashed px-4 py-3 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
          <strong className="font-semibold text-[var(--fg)]">Cobrança não conectada neste ambiente.</strong>{" "}
          A arquitetura de assinatura está implementada — planos, limites por recurso, checkout,
          webhooks e gestão — com adaptadores para Stripe e Mercado Pago. Falta apenas configurar as
          credenciais do provedor. Nenhum pagamento é simulado.
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {plans.map((plan) => {
          const features = plan.features as string[];
          const limits = plan.limits as Record<string, number | boolean>;
          const isCurrent = user?.planTier === plan.tier;
          const featured = plan.tier === "PRO";

          return (
            <Card
              key={plan.id}
              className={cn(featured && "border-[var(--accent-border)] shadow-[var(--shadow-card)]")}
            >
              <CardBody className="flex h-full flex-col">
                <div className="flex items-center gap-2">
                  <h2 className="text-[17px] font-semibold">{plan.name}</h2>
                  {featured ? <Badge tone="accent">Mais escolhido</Badge> : null}
                  {isCurrent ? <Badge tone="signal">Seu plano</Badge> : null}
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                  {plan.description}
                </p>

                <div className="mt-5">
                  <p className="metric-value text-[30px] font-semibold leading-none tracking-[-0.02em]">
                    {plan.priceMonthly === null
                      ? "Sob consulta"
                      : plan.priceMonthly === 0
                        ? "Grátis"
                        : formatCents(plan.priceMonthly)}
                  </p>
                  {plan.priceMonthly ? (
                    <p className="mt-1 text-[12px] text-[var(--fg-subtle)]">
                      por mês · {formatCents(plan.priceYearly)} no plano anual
                      {plan.trialDays ? ` · ${plan.trialDays} dias de teste` : ""}
                    </p>
                  ) : null}
                </div>

                <ul className="mt-5 flex-1 space-y-2">
                  {features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-[12.5px] leading-relaxed">
                      <Check className="mt-0.5 size-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
                      {feature}
                    </li>
                  ))}
                </ul>

                <dl className="mt-5 space-y-1 border-t pt-4 text-[11.5px] text-[var(--fg-subtle)]">
                  <Limit label="Cidades salvas" value={limits.savedMunicipalities} />
                  <Limit label="Alertas" value={limits.alerts} />
                  <Limit label="Perguntas à IA por dia" value={limits.aiQuestionsPerDay} />
                  <Limit label="Municípios por comparação" value={limits.comparisonSlots} />
                  <Limit label="Histórico do Radar (dias)" value={limits.radarHistoryDays} />
                  <div className="flex justify-between gap-2">
                    <dt>Acesso via API</dt>
                    <dd className="font-medium">{limits.apiAccess ? "Sim" : "Não"}</dd>
                  </div>
                </dl>

                <div className="mt-5">
                  <PlanActions
                    tier={plan.tier}
                    isCurrent={isCurrent}
                    isFree={plan.priceMonthly === 0}
                    isEnterprise={plan.priceMonthly === null}
                    authenticated={Boolean(user)}
                  />
                </div>
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardBody>
          <p className="text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
            Preços em reais, com faturamento mensal ou anual, e alteráveis pelo painel
            administrativo. Upgrade e downgrade passam a valer no ciclo seguinte; o cancelamento
            mantém o acesso até o fim do período já pago. Assinaturas Enterprise são contratadas
            diretamente — fale conosco pelo formulário indicado em{" "}
            <Link href="/termos" className="text-[var(--accent)] hover:underline">Termos de Uso</Link>.
          </p>
        </CardBody>
      </Card>
    </>
  );
}

function Limit({ label, value }: { label: string; value: number | boolean | undefined }) {
  const display =
    typeof value === "number" ? (value === -1 ? "Ilimitado" : value.toLocaleString("pt-BR")) : "—";
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="font-medium">{display}</dd>
    </div>
  );
}
