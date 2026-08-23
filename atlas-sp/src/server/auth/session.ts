import "server-only";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { prisma } from "@/server/db/prisma";
import type { PlanTier, UserRole } from "@prisma/client";

/**
 * Sessão própria: token opaco no cookie + registro no banco, assinado com JWT
 * para permitir verificação sem consulta em rotas de leitura.
 *
 * Escolha deliberada de não amarrar o produto a um provedor de identidade:
 * a interface de autenticação é pequena e trocável (Supabase Auth, Auth0 ou
 * SSO corporativo entram substituindo apenas este módulo).
 */

const COOKIE_NAME = "atlas_session";
const SESSION_DAYS = Number(process.env.AUTH_SESSION_DAYS ?? 30);

function secretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET ausente ou curto demais. Gere com: openssl rand -base64 48",
    );
  }
  return new TextEncoder().encode(secret);
}

export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

/** IP nunca é guardado em claro (LGPD): apenas um hash com sal do segredo. */
export const hashIp = (ip: string | null) =>
  ip ? createHash("sha256").update(`${ip}:${process.env.AUTH_SECRET ?? ""}`).digest("hex").slice(0, 32) : null;

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  planTier: PlanTier;
  planName: string;
  limits: Record<string, number | boolean>;
  subscriptionStatus: string;
};

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  const headerList = await headers();

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
      userAgent: headerList.get("user-agent")?.slice(0, 300) ?? null,
      ipHash: hashIp(
        headerList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
          headerList.get("x-real-ip") ??
          null,
      ),
    },
  });

  const jwt = await new SignJWT({ sid: token })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .setSubject(userId)
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });

  await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: new Date() } });
  return token;
}

export async function destroySession() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (raw) {
    try {
      const { payload } = await jwtVerify(raw, secretKey());
      const sid = payload.sid as string | undefined;
      if (sid) await prisma.session.deleteMany({ where: { tokenHash: hashToken(sid) } });
    } catch {
      // Token inválido: basta remover o cookie.
    }
  }
  cookieStore.delete(COOKIE_NAME);
}

const FREE_LIMITS = {
  savedMunicipalities: 3,
  alerts: 1,
  aiQuestionsPerDay: 5,
  comparisonSlots: 2,
  radarHistoryDays: 7,
  exports: 0,
  apiAccess: false,
};

/** Usuário da requisição, ou null. Cacheável por requisição no React. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  let sid: string;
  try {
    const { payload } = await jwtVerify(raw, secretKey());
    sid = payload.sid as string;
    if (!sid) return null;
  } catch {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(sid) },
    include: {
      user: { include: { subscription: { include: { plan: true } } } },
    },
  });
  if (!session || session.expiresAt < new Date()) return null;

  // Atualiza lastSeenAt no máximo uma vez por hora para não escrever a cada request.
  if (Date.now() - session.lastSeenAt.getTime() > 3_600_000) {
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }

  const plan = session.user.subscription?.plan;
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    planTier: plan?.tier ?? "FREE",
    planName: plan?.name ?? "Free",
    limits: (plan?.limits as Record<string, number | boolean>) ?? FREE_LIMITS,
    subscriptionStatus: session.user.subscription?.status ?? "ACTIVE",
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) throw new AuthError("Autenticação necessária", 401);
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") throw new AuthError("Acesso restrito à administração", 403);
  return user;
}

export class AuthError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = "AuthError";
  }
}

/** Comparação em tempo constante para valores derivados de entrada do usuário. */
export function safeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

/** Limite numérico do plano; -1 significa ilimitado. */
export function planLimit(user: SessionUser | null, key: string, fallback: number): number {
  if (!user) return fallback;
  const value = user.limits?.[key];
  return typeof value === "number" ? value : fallback;
}

export function withinLimit(limit: number, used: number): boolean {
  return limit === -1 || used < limit;
}
