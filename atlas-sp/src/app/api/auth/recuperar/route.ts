import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { hashToken } from "@/server/auth/session";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ email: z.string().email().max(255) });

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "recuperar"), LIMITS.passwordReset);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Muitas solicitações. Tente mais tarde." }, { status: 429 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });

  const email = parsed.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });

  if (user) {
    const token = randomBytes(32).toString("base64url");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 3_600_000),
      },
    });
    const link = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/redefinir-senha?token=${token}`;

    // O envio de e-mail é um adaptador ainda não conectado. Em vez de fingir
    // que enviamos, registramos o link no log do servidor para o ambiente de
    // desenvolvimento e deixamos o ponto de integração explícito.
    if (process.env.NODE_ENV !== "production") {
      console.info(`[auth] link de redefinição para ${email}: ${link}`);
    } else {
      console.warn(
        "[auth] provedor de e-mail não configurado: o link de redefinição foi gerado mas não enviado.",
      );
    }
    await prisma.auditLog.create({ data: { userId: user.id, action: "senha.redefinicao-solicitada" } });
  }

  // A resposta é a mesma exista ou não a conta — não confirmamos e-mails.
  return NextResponse.json({ ok: true });
}
