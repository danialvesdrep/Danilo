import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { hashPassword, validatePasswordStrength } from "@/server/auth/password";
import { createSession, hashToken } from "@/server/auth/session";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ token: z.string().min(10), password: z.string().min(1).max(200) });

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "redefinir"), LIMITS.passwordReset);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas tentativas. Tente mais tarde." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Link inválido." }, { status: 400 });

  const weakness = validatePasswordStrength(parsed.data.password);
  if (weakness) return NextResponse.json({ error: weakness }, { status: 400 });

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(parsed.data.token) },
  });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link expirado ou já utilizado. Solicite outro." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash: await hashPassword(parsed.data.password) },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    // Todas as sessões antigas caem: redefinir senha encerra acessos anteriores.
    prisma.session.deleteMany({ where: { userId: record.userId } }),
    prisma.auditLog.create({ data: { userId: record.userId, action: "senha.redefinida" } }),
  ]);

  await createSession(record.userId);
  return NextResponse.json({ ok: true });
}
