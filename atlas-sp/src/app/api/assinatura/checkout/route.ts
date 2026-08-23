import { NextResponse } from "next/server";
import { z } from "zod";
import { createBilling } from "@/server/billing/provider";
import { requireUser, AuthError } from "@/server/auth/session";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";
import { SITE } from "@/lib/site";

export const dynamic = "force-dynamic";

const schema = z.object({
  tier: z.enum(["PRO", "ENTERPRISE"]),
  intervalo: z.enum(["monthly", "yearly"]).default("monthly"),
});

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "checkout"), LIMITS.write);
  if (!limit.allowed) return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });

  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Plano inválido." }, { status: 400 });

    const billing = createBilling();
    const result = await billing.createCheckout({
      userId: user.id,
      email: user.email,
      planTier: parsed.data.tier,
      interval: parsed.data.intervalo,
      successUrl: `${SITE.url}/assinatura?status=sucesso`,
      cancelUrl: `${SITE.url}/planos?status=cancelado`,
    });

    return NextResponse.json(result, { status: result.status === "erro" ? 502 : 200 });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[assinatura] falha no checkout:", error);
    return NextResponse.json({ error: "Falha ao iniciar a assinatura." }, { status: 500 });
  }
}
