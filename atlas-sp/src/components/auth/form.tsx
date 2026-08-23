"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export function Field({
  label,
  name,
  type = "text",
  autoComplete,
  required = true,
  placeholder,
  hint,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
  hint?: string;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className="h-10 w-full rounded-[var(--radius-sm)] border bg-[var(--bg-raised)] px-3 text-[13.5px] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent-border)]"
      />
      {hint ? <span className="mt-1 block text-[11.5px] text-[var(--fg-subtle)]">{hint}</span> : null}
    </label>
  );
}

/**
 * Formulário de autenticação. Envia JSON para a rota da API e trata os estados
 * de erro no lugar de recarregar a página.
 */
export function AuthForm({
  action,
  submitLabel,
  children,
  successMessage,
  redirectTo,
  className,
}: {
  action: string;
  submitLabel: string;
  children: React.ReactNode;
  successMessage?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = Object.fromEntries(formData.entries());
    startTransition(async () => {
      setError(null);
      const response = await fetch(action, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Não foi possível concluir a operação.");
        return;
      }
      if (successMessage) {
        setDone(true);
        return;
      }
      const next = searchParams.get("proximo") ?? redirectTo ?? "/dashboard";
      router.push(next);
      router.refresh();
    });
  };

  if (done && successMessage) {
    return (
      <div className="flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[color-mix(in_srgb,var(--rise)_30%,transparent)] bg-[color-mix(in_srgb,var(--rise)_8%,transparent)] px-4 py-3">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-rise" aria-hidden />
        <p className="text-[12.5px] leading-relaxed">{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-4", className)}>
      {children}
      {error ? (
        <p className="flex items-start gap-2 rounded-[var(--radius-sm)] border border-[color-mix(in_srgb,var(--fall)_30%,transparent)] bg-[color-mix(in_srgb,var(--fall)_8%,transparent)] px-3 py-2 text-[12.5px] leading-relaxed text-[var(--fall)]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] text-[13.5px] font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        {submitLabel}
      </button>
    </form>
  );
}
