"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { PlanTier } from "@prisma/client";

export function ManageSubscription({
  hasProvider,
  tier,
}: {
  hasProvider: boolean;
  tier: PlanTier;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const openPortal = () => {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/assinatura/portal", { method: "POST" });
      const payload = (await response.json()) as { status?: string; url?: string; message?: string };
      if (payload.status === "redirect" && payload.url) {
        window.location.href = payload.url;
        return;
      }
      setMessage(payload.message ?? "Não foi possível abrir a gestão de assinatura.");
    });
  };

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex flex-wrap gap-2">
        {tier !== "ENTERPRISE" ? (
          <Link
            href="/planos"
            className="inline-flex h-9 items-center rounded-[var(--radius-sm)] bg-[var(--accent)] px-3.5 text-[13px] font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110"
          >
            {tier === "FREE" ? "Fazer upgrade" : "Mudar de plano"}
          </Link>
        ) : null}
        <button
          type="button"
          onClick={openPortal}
          disabled={pending}
          className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border px-3.5 text-[13px] font-medium transition-colors hover:bg-[var(--bg-inset)] disabled:opacity-60"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
          Gerenciar pagamento
        </button>
      </div>

      {!hasProvider ? (
        <p className="rounded-[var(--radius-sm)] border border-dashed px-3 py-2 text-[11.5px] leading-relaxed text-[var(--fg-muted)]">
          Não há pagamento vinculado a esta conta. Nenhuma cobrança foi feita ou simulada — os
          adaptadores de Stripe e Mercado Pago existem e entram em operação quando as credenciais
          forem configuradas.
        </p>
      ) : null}

      {message ? (
        <p className="text-[12px] leading-relaxed text-[var(--fg-muted)]">{message}</p>
      ) : null}
    </div>
  );
}
