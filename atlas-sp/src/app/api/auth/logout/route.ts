import { NextResponse } from "next/server";
import { destroySession } from "@/server/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  await destroySession();
  // O logout vem de um <form>: redirecionamos em vez de devolver JSON.
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
