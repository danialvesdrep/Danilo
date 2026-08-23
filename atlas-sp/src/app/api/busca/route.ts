import { NextResponse } from "next/server";
import { globalSearch } from "@/server/search/global";
import { clientKey, rateLimit, LIMITS } from "@/server/auth/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const limit = rateLimit(clientKey(request, "busca"), LIMITS.search);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Muitas consultas. Tente novamente em instantes." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const perGroup = Math.min(Number(searchParams.get("por_grupo") ?? 5), 20);

  try {
    const results = await globalSearch(query, { limitPerGroup: perGroup });
    return NextResponse.json(results, {
      headers: { "cache-control": "private, max-age=15" },
    });
  } catch (error) {
    console.error("[busca] falha:", error);
    return NextResponse.json({ error: "Falha ao consultar o índice de busca." }, { status: 500 });
  }
}
