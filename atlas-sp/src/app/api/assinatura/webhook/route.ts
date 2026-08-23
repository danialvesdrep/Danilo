import { NextResponse } from "next/server";
import { createBilling } from "@/server/billing/provider";
import { prisma } from "@/server/db/prisma";

export const dynamic = "force-dynamic";

/**
 * Webhook de cobrança. A assinatura da requisição é verificada pelo adaptador
 * antes de qualquer escrita — um evento sem assinatura válida é descartado.
 */
export async function POST(request: Request) {
  const billing = createBilling();
  if (!billing.configured) {
    return NextResponse.json({ error: "Cobrança não configurada." }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature =
    request.headers.get("stripe-signature") ?? request.headers.get("x-signature") ?? null;

  const event = await billing.parseWebhook(rawBody, signature);
  if (!event) {
    return NextResponse.json({ error: "Assinatura do webhook inválida." }, { status: 400 });
  }

  try {
    if (event.providerSubId || event.providerCustomerId) {
      const subscription = await prisma.subscription.findFirst({
        where: {
          OR: [
            event.providerSubId ? { providerSubId: event.providerSubId } : {},
            event.providerCustomerId ? { providerCustomerId: event.providerCustomerId } : {},
          ].filter((clause) => Object.keys(clause).length > 0),
        },
      });

      if (subscription) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: event.status ?? subscription.status,
            currentPeriodEnd: event.currentPeriodEnd ?? subscription.currentPeriodEnd,
            providerSubId: event.providerSubId ?? subscription.providerSubId,
            providerCustomerId: event.providerCustomerId ?? subscription.providerCustomerId,
          },
        });
        await prisma.auditLog.create({
          data: {
            userId: subscription.userId,
            action: `assinatura.${event.type}`,
            detail: { status: event.status ?? null },
          },
        });
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[assinatura] falha ao processar webhook:", error);
    return NextResponse.json({ error: "Falha ao processar evento." }, { status: 500 });
  }
}
