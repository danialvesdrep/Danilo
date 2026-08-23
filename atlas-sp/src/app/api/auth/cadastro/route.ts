import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { hashPassword, validatePasswordStrength } from "@/server/auth/password";
import { createSession } from "@/server/auth/session";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "cadastro"), LIMITS.register);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas de cadastro. Tente mais tarde." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Preencha nome, e-mail e senha." }, { status: 400 });
  }

  const weakness = validatePasswordStrength(parsed.data.password);
  if (weakness) return NextResponse.json({ error: weakness }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return NextResponse.json(
      { error: "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha." },
      { status: 409 },
    );
  }

  const freePlan = await prisma.plan.findUnique({ where: { tier: "FREE" } });
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name.trim(),
      passwordHash: await hashPassword(parsed.data.password),
      ...(freePlan
        ? { subscription: { create: { planId: freePlan.id, status: "ACTIVE", provider: "none" } } }
        : {}),
    },
  });

  await createSession(user.id);
  await prisma.auditLog.create({ data: { userId: user.id, action: "conta.criada" } });

  return NextResponse.json({ ok: true });
}
