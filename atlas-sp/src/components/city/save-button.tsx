"use client";

import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Salvar cidade em "Minha visão". Sem sessão, leva ao cadastro em vez de
 * falhar silenciosamente.
 */
export function SaveCityButton({
  municipalityId,
  name,
  initiallySaved = false,
}: {
  municipalityId: string;
  name: string;
  initiallySaved?: boolean;
}) {
  const [saved, setSaved] = useState(initiallySaved);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const toggle = () => {
    startTransition(async () => {
      setMessage(null);
      const response = await fetch("/api/minha-visao/cidades", {
        method: saved ? "DELETE" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ municipalityId }),
      });
      if (response.status === 401) {
        window.location.href = `/entrar?proximo=${encodeURIComponent(window.location.pathname)}`;
        return;
      }
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setMessage(payload.error ?? "Não foi possível salvar.");
        return;
      }
      setSaved((value) => !value);
    });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-pressed={saved}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 text-[13px] font-medium transition-colors",
          saved
            ? "border-[var(--accent-border)] bg-[var(--accent-subtle)] text-[var(--accent)]"
            : "hover:bg-[var(--bg-inset)]",
        )}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : saved ? (
          <BookmarkCheck className="size-3.5" aria-hidden />
        ) : (
          <Bookmark className="size-3.5" aria-hidden />
        )}
        {saved ? "Salva" : "Salvar"}
        <span className="sr-only">{name}</span>
      </button>
      {message ? (
        <p className="absolute right-0 top-full mt-1 whitespace-nowrap rounded-[var(--radius-xs)] border bg-[var(--bg-raised)] px-2 py-1 text-[11px] text-[var(--fall)] shadow-[var(--shadow-card)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
