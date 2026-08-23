import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { AlertsManager } from "@/components/alerts/manager";
import { getCurrentUser, planLimit } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";

export const metadata: Metadata = {
  title: "Alertas",
  robots: { index: false, follow: false },
};

export default async function AlertsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?proximo=/alertas");

  const [alerts, municipalities, sectors, deliveries] = await Promise.all([
    prisma.alert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        municipality: { select: { name: true, slug: true } },
        _count: { select: { deliveries: true } },
      },
    }),
    prisma.municipality.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.economicSector.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.alertDelivery.findMany({
      where: { alert: { userId: user.id } },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, title: true, body: true, url: true, createdAt: true, readAt: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Monitoramento"
        title="Alertas"
        description="Escolha o que monitorar — uma cidade, uma pessoa, uma empresa, um setor ou um assunto — e receba aviso quando o Radar detectar algo acima do score que você definir."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Alertas" }]}
      />

      <AlertsManager
        alerts={alerts.map((alert) => ({
          id: alert.id,
          label: alert.label,
          scope: alert.scope,
          minScore: alert.minScore,
          active: alert.active,
          municipality: alert.municipality?.name ?? null,
          keyword: alert.keyword,
          deliveries: alert._count.deliveries,
          lastTriggeredAt: alert.lastTriggeredAt?.toISOString() ?? null,
        }))}
        municipalities={municipalities}
        sectors={sectors}
        limit={planLimit(user, "alerts", 1)}
        planName={user.planName}
        deliveries={deliveries.map((delivery) => ({
          ...delivery,
          createdAt: delivery.createdAt.toISOString(),
          readAt: delivery.readAt?.toISOString() ?? null,
        }))}
      />
    </>
  );
}
