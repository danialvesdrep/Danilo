import { NextResponse } from "next/server";
import { createBilling } from "@/server/billing/provider";
import { requireUser, AuthError } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const user = await requireUser();
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { providerCustomerId: true },
    });

    if (!subscription?.providerCustomerId) {
      return NextResponse.json({
        status: "nao_configurado",
        message:
          "Não há assinatura ativa em um provedor de pagamento para esta conta. Nada a gerenciar.",
      });
    }

    const billing = createBilling();
    const result = await billing.createPortalSession(
      subscription.providerCustomerId,
      `${SITE.url}/assinatura`,
    );
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Falha ao abrir o portal." }, { status: 500 });
  }
}
