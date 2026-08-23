import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireUser, AuthError, planLimit, withinLimit } from "@/server/auth/session";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";

export const dynamic = "force-dynamic";

const schema = z.object({ municipalityId: z.string().cuid() });

export async function GET() {
  try {
    const user = await requireUser();
    const saved = await prisma.savedMunicipality.findMany({
      where: { userId: user.id },
      orderBy: { position: "asc" },
      select: {
        position: true,
        municipality: { select: { id: true, name: true, slug: true, mesoName: true } },
      },
    });
    return NextResponse.json({ saved });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Falha ao carregar." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "salvar"), LIMITS.write);
  if (!limit.allowed) return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });

  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Município inválido." }, { status: 400 });

    const used = await prisma.savedMunicipality.count({ where: { userId: user.id } });
    const cap = planLimit(user, "savedMunicipalities", 3);
    if (!withinLimit(cap, used)) {
      return NextResponse.json(
        {
          error: `Seu plano ${user.planName} permite salvar até ${cap} cidades. Faça upgrade para acompanhar mais.`,
          upgradeUrl: "/planos",
        },
        { status: 402 },
      );
    }

    await prisma.savedMunicipality.upsert({
      where: {
        userId_municipalityId: { userId: user.id, municipalityId: parsed.data.municipalityId },
      },
      update: {},
      create: { userId: user.id, municipalityId: parsed.data.municipalityId, position: used },
    });

    return NextResponse.json({ ok: true, saved: used + 1, limit: cap });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Falha ao salvar a cidade." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Município inválido." }, { status: 400 });

    await prisma.savedMunicipality.deleteMany({
      where: { userId: user.id, municipalityId: parsed.data.municipalityId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Falha ao remover." }, { status: 500 });
  }
}
