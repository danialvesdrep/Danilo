import { NextResponse } from "next/server";
import { findJob } from "@/server/pipeline/registry";
import { runJob } from "@/server/pipeline/runner";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Endpoint de jobs. Protegido por CRON_SECRET no header Authorization.
 * A ausência do secret bloqueia a rota — é isso o que separa "cron" de
 * "endpoint público que qualquer um pode acionar".
 */
export async function POST(request: Request, context: { params: Promise<{ job: string }> }) {
  const limit = rateLimit(clientKey(request, "cron"), LIMITS.write);
  if (!limit.allowed) return NextResponse.json({ error: "Muitas requisições." }, { status: 429 });

  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { job: key } = await context.params;
  const job = findJob(key);
  if (!job) return NextResponse.json({ error: "Job não encontrado." }, { status: 404 });

  try {
    const result = await runJob(job);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
