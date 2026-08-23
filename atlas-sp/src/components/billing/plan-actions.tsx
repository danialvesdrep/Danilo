"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import type { PlanTier } from "@prisma/client";

/**
 * Ações do plano. Quando a cobrança não está configurada, a resposta do
 * servidor é exibida como está — sem fluxo falso de pagamento.
 */
export function PlanActions({
  tier,
  isCurrent,
  isFree,
  isEnterprise,
  authenticated,
}: {
  tier: PlanTier;
  isCurrent: boolean;
  isFree: boolean;
  isEnterprise: boolean;
  authenticated: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (isCurrent) {
    return (
      <button
        type="button"
        disabled
        className="h-10 w-full rounded-[var(--radius-sm)] border text-[13px] font-medium text-[var(--fg-muted)]"
      >
        Plano atual
      </button>
    );
  }

  if (isEnterprise) {
    return (
      <a
        href="mailto:contato@atlassp.com.br?subject=Atlas%20SP%20Enterprise"
        className="inline-flex h-10 w-full items-center justify-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] text-[13px] font-medium transition-colors hover:bg-[var(--bg-inset)]"
      >
        Falar com o time
      </a>
    );
  }

  const start = () => {
    if (!authenticated) {
      router.push(`/cadastro?proximo=${encodeURIComponent("/planos")}`);
      return;
    }
    if (isFree) {
      router.push("/dashboard");
      return;
    }
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/assinatura/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tier, intervalo: "monthly" }),
      });
      const payload = (await response.json()) as {
        status?: string;
        url?: string;
        message?: string;
        error?: string;
      };
      if (payload.status === "redirect" && payload.url) {
        window.location.href = payload.url;
        return;
      }
      setMessage(payload.message ?? payload.error ?? "Não foi possível iniciar a assinatura.");
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[13px] font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
        {isFree ? "Começar grátis" : "Assinar"}
      </button>
      {message ? (
        <p className="mt-2 rounded-[var(--radius-xs)] border border-dashed px-2.5 py-2 text-[11.5px] leading-relaxed text-[var(--fg-muted)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
