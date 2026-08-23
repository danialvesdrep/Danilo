import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { verifyPassword, hashPassword } from "@/server/auth/password";
import { createSession, hashIp } from "@/server/auth/session";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "login"), LIMITS.login);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: `Muitas tentativas. Tente novamente em ${Math.ceil(limit.retryAfterSeconds / 60)} minuto(s).` },
      { status: 429 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Informe e-mail e senha." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email } });

  // Sempre executa uma verificação de hash, mesmo sem usuário: sem isso, o
  // tempo de resposta revelaria quais e-mails existem na base.
  const valid = user
    ? await verifyPassword(parsed.data.password, user.passwordHash)
    : await verifyPassword(parsed.data.password, await hashPassword("verificacao-constante"));

  if (!user || !valid) {
    await prisma.auditLog.create({
      data: {
        action: "login.falha",
        target: email,
        ipHash: hashIp(request.headers.get("x-forwarded-for")?.split(",")[0] ?? null),
      },
    });
    return NextResponse.json({ error: "E-mail ou senha incorretos." }, { status: 401 });
  }

  await createSession(user.id);
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "login.sucesso",
      ipHash: hashIp(request.headers.get("x-forwarded-for")?.split(",")[0] ?? null),
    },
  });

  return NextResponse.json({ ok: true });
}
