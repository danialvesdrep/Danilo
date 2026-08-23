"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/lib/cn";
import { Card, CardHeader } from "@/components/ui/card";
import { CATEGORY_LABEL } from "@/lib/labels";
import type { SignalCategory } from "@prisma/client";

const PERIODS = [
  { value: 1, label: "24 h" },
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
];

const SCORES = [
  { value: 0, label: "Todos" },
  { value: 45, label: "≥ 45" },
  { value: 62, label: "≥ 62" },
  { value: 78, label: "≥ 78" },
];

export function RadarFilters({
  counts,
  selected,
  minScore,
  sinceDays,
}: {
  counts: Array<{ category: SignalCategory; count: number }>;
  selected: SignalCategory[];
  minScore?: number;
  sinceDays: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString());
      mutate(params);
      router.push(`/radar?${params.toString()}`, { scroll: false });
    },
    [router, searchParams],
  );

  const toggleCategory = (category: SignalCategory) =>
    update((params) => {
      const current = params.getAll("categoria");
      params.delete("categoria");
      const next = current.includes(category)
        ? current.filter((value) => value !== category)
        : [...current, category];
      next.forEach((value) => params.append("categoria", value));
    });

  return (
    <Card>
      <CardHeader
        title="Filtros"
        dense
        action={
          selected.length || minScore || sinceDays !== 30 ? (
            <button
              type="button"
              onClick={() => router.push("/radar")}
              className="text-[11.5px] font-medium text-[var(--accent)] hover:underline"
            >
              Limpar
            </button>
          ) : null
        }
      />

      <div className="space-y-4 px-4 py-3.5">
        <div>
          <p className="eyebrow mb-2">Período</p>
          <div className="flex flex-wrap gap-1">
            {PERIODS.map((period) => (
              <button
                key={period.value}
                type="button"
                onClick={() => update((params) => params.set("periodo", String(period.value)))}
                className={cn(
                  "rounded-[var(--radius-xs)] border px-2 py-1 text-[11.5px] font-medium transition-colors",
                  sinceDays === period.value
                    ? "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "text-[var(--fg-muted)] hover:border-[var(--border-strong)]",
                )}
              >
                {period.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">Score mínimo</p>
          <div className="flex flex-wrap gap-1">
            {SCORES.map((score) => (
              <button
                key={score.value}
                type="button"
                onClick={() =>
                  update((params) => {
                    if (score.value === 0) params.delete("score");
                    else params.set("score", String(score.value));
                  })
                }
                className={cn(
                  "rounded-[var(--radius-xs)] border px-2 py-1 text-[11.5px] font-medium transition-colors",
                  (minScore ?? 0) === score.value
                    ? "border-transparent bg-[var(--accent)] text-[var(--accent-fg)]"
                    : "text-[var(--fg-muted)] hover:border-[var(--border-strong)]",
                )}
              >
                {score.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="eyebrow mb-2">Categorias</p>
          <div className="max-h-72 space-y-0.5 overflow-y-auto pr-1">
            {counts.map((entry) => {
              const active = selected.includes(entry.category);
              return (
                <button
                  key={entry.category}
                  type="button"
                  onClick={() => toggleCategory(entry.category)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-[var(--radius-xs)] px-2 py-1 text-left text-[12px] transition-colors",
                    active
                      ? "bg-[var(--accent-subtle)] font-medium text-[var(--accent)]"
                      : "text-[var(--fg-muted)] hover:bg-[var(--bg-inset)]",
                  )}
                >
                  <span className="truncate">{CATEGORY_LABEL[entry.category]}</span>
                  <span className="tnum shrink-0 text-[10.5px] text-[var(--fg-subtle)]">
                    {entry.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
