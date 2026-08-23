import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/server/db/prisma";
import { requireUser, AuthError, planLimit, withinLimit } from "@/server/auth/session";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  escopo: z.enum(["MUNICIPIO", "PESSOA", "EMPRESA", "SETOR", "ASSUNTO", "INVESTIMENTO"]),
  municipioId: z.string().cuid().optional(),
  alvoId: z.string().optional(),
  palavraChave: z.string().max(120).optional(),
  rotulo: z.string().min(2).max(120),
  scoreMinimo: z.number().int().min(0).max(100).default(60),
  categorias: z.array(z.string()).default([]),
});

export async function GET() {
  try {
    const user = await requireUser();
    const alerts = await prisma.alert.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      include: {
        municipality: { select: { name: true, slug: true } },
        _count: { select: { deliveries: true } },
      },
    });
    return NextResponse.json({ alerts });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Falha ao carregar alertas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "alerta"), LIMITS.write);
  if (!limit.allowed) return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });

  try {
    const user = await requireUser();
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Dados do alerta inválidos." }, { status: 400 });
    }

    const used = await prisma.alert.count({ where: { userId: user.id, active: true } });
    const cap = planLimit(user, "alerts", 1);
    if (!withinLimit(cap, used)) {
      return NextResponse.json(
        {
          error: `Seu plano ${user.planName} permite ${cap} alerta(s) ativo(s). Faça upgrade para monitorar mais.`,
          upgradeUrl: "/planos",
        },
        { status: 402 },
      );
    }

    const alert = await prisma.alert.create({
      data: {
        userId: user.id,
        scope: parsed.data.escopo,
        municipalityId: parsed.data.municipioId ?? null,
        targetId: parsed.data.alvoId ?? null,
        keyword: parsed.data.palavraChave ?? null,
        label: parsed.data.rotulo,
        minScore: parsed.data.scoreMinimo,
        categories: parsed.data.categorias as never,
      },
    });

    return NextResponse.json({ ok: true, alert });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[alertas] falha ao criar:", error);
    return NextResponse.json({ error: "Falha ao criar o alerta." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Alerta não informado." }, { status: 400 });

    await prisma.alert.deleteMany({ where: { id, userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Falha ao remover o alerta." }, { status: 500 });
  }
}
