import { NextResponse } from "next/server";
import { z } from "zod";
import { ask } from "@/server/ai/atlas-ai";
import { getCurrentUser, planLimit } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 45;

const schema = z.object({
  pergunta: z.string().min(3).max(500),
  municipioId: z.string().cuid().optional(),
});

export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "ia"), LIMITS.ai);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitas perguntas em sequência. Aguarde um instante." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Pergunta inválida." }, { status: 400 });
  }

  const user = await getCurrentUser();

  // Cota diária por plano. Sem sessão, aplica-se o limite do plano gratuito.
  const dailyCap = planLimit(user, "aiQuestionsPerDay", 5);
  if (dailyCap !== -1 && user) {
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    const used = await prisma.aIAnalysis.count({
      where: { kind: "RESPOSTA_PERGUNTA", createdAt: { gte: since } },
    });
    if (used >= dailyCap) {
      return NextResponse.json(
        {
          error: `Você atingiu o limite de ${dailyCap} perguntas por dia do plano ${user.planName}. Faça upgrade para continuar.`,
          upgradeUrl: "/planos",
        },
        { status: 402 },
      );
    }
  }

  try {
    const answer = await ask(parsed.data.pergunta, {
      municipalityId: parsed.data.municipioId,
      userId: user?.id,
    });
    return NextResponse.json(answer);
  } catch (error) {
    console.error("[ia] falha ao responder:", error);
    return NextResponse.json(
      { error: "Não foi possível consultar o banco de conhecimento agora." },
      { status: 500 },
    );
  }
}
