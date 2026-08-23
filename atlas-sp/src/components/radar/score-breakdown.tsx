"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { SCORE_METHODOLOGY, scoreBand } from "@/server/radar/scoring";

type Component = { key: string; label: string; value: number; weight: number; detail: string };
type Rationale = { methodologyVersion: string; components: Component[]; drivers: string[] };

/**
 * Abre a caixa-preta do score. O produto trata o índice como proprietário e
 * mostra exatamente como cada eixo entrou na conta — não há número mágico.
 */
export function ScoreBreakdown({
  score,
  rationale,
  className,
}: {
  score: number;
  rationale: Rationale;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const band = scoreBand(score);

  return (
    <div className={cn("rounded-[var(--radius-lg)] border bg-[var(--bg-raised)]", className)}>
      <div className="flex items-center gap-4 border-b px-5 py-4">
        <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-[var(--radius-md)] bg-[var(--signal-subtle)] text-[var(--signal)]">
          <span className="metric-value text-[22px] font-semibold leading-none">{score}</span>
          <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.08em] opacity-75">/100</span>
        </div>
        <div className="min-w-0">
          <p className="eyebrow">Score do Radar · índice proprietário</p>
          <p className="mt-1 text-[15px] font-semibold">{band.label}</p>
          <p className="mt-0.5 text-[12px] text-[var(--fg-muted)]">
            Composto por cinco eixos ponderados. Não é indicador oficial.
          </p>
        </div>
      </div>

      <div className="space-y-3 px-5 py-4">
        {rationale.components.map((component) => (
          <div key={component.key}>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[12.5px] font-medium">{component.label}</span>
              <span className="tnum shrink-0 text-[12px] text-[var(--fg-muted)]">
                {component.value}
                <span className="ml-1.5 text-[11px] text-[var(--fg-subtle)]">
                  × {formatNumber(component.weight * 100, 0)}%
                </span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--bg-inset)]">
              <div
                className="h-full rounded-full bg-[var(--signal)] transition-[width] duration-500"
                style={{ width: `${component.value}%` }}
              />
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-[var(--fg-subtle)]">{component.detail}</p>
          </div>
        ))}
      </div>

      {rationale.drivers.length ? (
        <div className="border-t px-5 py-3">
          <p className="eyebrow mb-2">O que puxou este score</p>
          <ul className="space-y-1">
            {rationale.drivers.map((driver) => (
              <li key={driver} className="flex gap-2 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                <span className="mt-[7px] size-1 shrink-0 rounded-full bg-[var(--signal)]" aria-hidden />
                {driver}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="border-t">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="flex w-full items-center justify-between px-5 py-2.5 text-[12px] font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
        >
          Metodologia completa
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden />
        </button>
        {open ? (
          <div className="border-t px-5 py-4">
            <p className="whitespace-pre-line text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
              {SCORE_METHODOLOGY}
            </p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--fg-subtle)]">
              versão {rationale.methodologyVersion}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
