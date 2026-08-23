import Link from "next/link";
import { ArrowUpRight, Building2, MapPin, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/data/provenance";
import { formatCurrencyScaled, formatNumber, formatRelative } from "@/lib/format";
import { scoreBand } from "@/server/radar/scoring";
import { CATEGORY_LABEL } from "@/lib/labels";
import type { SignalCategory } from "@prisma/client";

export type SignalCardData = {
  slug: string;
  headline: string;
  description: string;
  category: SignalCategory;
  occurredAt: Date;
  score: number;
  isDemo: boolean;
  amountBRL?: number | null;
  municipality: { name: string; slug: string; mesoName: string | null };
  sector?: { name: string; slug: string; color: string | null } | null;
  company?: { name: string; slug: string } | null;
  investment?: { jobsAnnounced: number | null } | null;
  sources?: Array<{ article: { source: { name: string } } }>;
};

const TONE_CLASS = {
  critico: "bg-[var(--signal)] text-[var(--signal-fg)]",
  alto: "bg-[var(--signal-subtle)] text-[var(--signal)] border border-[var(--signal-border)]",
  medio: "bg-[var(--bg-inset)] text-[var(--fg-muted)] border border-[var(--border)]",
  baixo: "bg-transparent text-[var(--fg-subtle)] border border-[var(--border)]",
} as const;

/**
 * Cartão de movimento do Radar.
 *
 * Nunca mostra só o fato: entrega cidade, setor, empresa, valor, score com
 * faixa de leitura, quantas fontes sustentam e os caminhos para aprofundar.
 */
export function SignalCard({
  signal,
  variant = "default",
  className,
}: {
  signal: SignalCardData;
  variant?: "default" | "compact" | "featured";
  className?: string;
}) {
  const band = scoreBand(signal.score);
  const sourceCount = signal.sources?.length ?? 0;

  if (variant === "compact") {
    return (
      <Link
        href={`/radar/${signal.slug}`}
        className={cn(
          "group flex items-start gap-3 border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--bg-inset)]",
          className,
        )}
      >
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] font-mono text-[12px] font-medium tabular-nums",
            TONE_CLASS[band.tone],
          )}
          title={`${band.label} — score ${signal.score}/100`}
        >
          {signal.score}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="text-[12px] font-medium text-[var(--accent)]">
              {signal.municipality.name}
            </span>
            <span className="text-[11px] text-[var(--fg-subtle)]">
              {CATEGORY_LABEL[signal.category]}
            </span>
            {signal.isDemo ? <DemoBadge compact /> : null}
          </span>
          <span className="mt-0.5 block text-[13.5px] font-medium leading-snug group-hover:text-[var(--accent)]">
            {signal.headline}
          </span>
          <span className="mt-1 block text-[11.5px] text-[var(--fg-subtle)]">
            {formatRelative(signal.occurredAt)}
            {sourceCount ? ` · ${sourceCount} fonte${sourceCount > 1 ? "s" : ""}` : ""}
          </span>
        </span>
      </Link>
    );
  }

  return (
    <article
      className={cn(
        "group relative rounded-[var(--radius-lg)] border bg-[var(--bg-raised)] transition-[border-color,box-shadow] hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card)]",
        variant === "featured" && "border-[var(--signal-border)]",
        className,
      )}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={cn(
            "flex size-10 shrink-0 flex-col items-center justify-center rounded-[var(--radius-sm)] font-mono leading-none tabular-nums",
            TONE_CLASS[band.tone],
          )}
          title={`${band.label} — índice proprietário do Radar`}
        >
          <span className="text-[14px] font-semibold">{signal.score}</span>
          <span className="mt-0.5 text-[8px] uppercase opacity-70">score</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <Link
              href={`/cidade/${signal.municipality.slug}`}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-[var(--accent)] hover:underline"
            >
              <MapPin className="size-3" aria-hidden />
              {signal.municipality.name}
            </Link>
            <Badge tone="outline">{CATEGORY_LABEL[signal.category]}</Badge>
            {signal.sector ? (
              <span className="inline-flex items-center gap-1 text-[11.5px] text-[var(--fg-muted)]">
                <span
                  className="size-1.5 rounded-full"
                  style={{ backgroundColor: signal.sector.color ?? "var(--accent)" }}
                  aria-hidden
                />
                {signal.sector.name}
              </span>
            ) : null}
            {signal.isDemo ? <DemoBadge compact /> : null}
          </div>

          <h3 className="mt-1.5 text-[15px] font-semibold leading-snug tracking-[-0.01em]">
            <Link href={`/radar/${signal.slug}`} className="hover:text-[var(--accent)]">
              {signal.headline}
            </Link>
          </h3>

          <p className="mt-1.5 line-clamp-2 text-[13px] leading-relaxed text-[var(--fg-muted)]">
            {signal.description}
          </p>

          {(signal.amountBRL || signal.investment?.jobsAnnounced || signal.company) ? (
            <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px]">
              {signal.company ? (
                <span className="inline-flex items-center gap-1 text-[var(--fg-muted)]">
                  <Building2 className="size-3" aria-hidden />
                  {signal.company.name}
                </span>
              ) : null}
              {signal.amountBRL ? (
                <span className="tnum font-medium">{formatCurrencyScaled(signal.amountBRL)}</span>
              ) : null}
              {signal.investment?.jobsAnnounced ? (
                <span className="tnum text-[var(--fg-muted)]">
                  {formatNumber(signal.investment.jobsAnnounced)} postos previstos
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t px-4 py-2.5 text-[12px]">
        <Link
          href={`/radar/${signal.slug}#por-que-importa`}
          className="inline-flex items-center gap-1 font-medium text-[var(--signal)] hover:underline"
        >
          <Sparkles className="size-3" aria-hidden />
          Por que isso importa?
        </Link>
        <Link
          href={`/radar/${signal.slug}`}
          className="text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
        >
          Ver contexto
        </Link>
        <Link
          href={`/cidade/${signal.municipality.slug}`}
          className="text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
        >
          Abrir cidade
        </Link>
        <span className="ml-auto flex items-center gap-2 text-[11px] text-[var(--fg-subtle)]">
          {sourceCount ? `${sourceCount} fonte${sourceCount > 1 ? "s" : ""}` : "Sem fonte"}
          <span aria-hidden>·</span>
          {formatRelative(signal.occurredAt)}
          <ArrowUpRight
            className="size-3 opacity-0 transition-opacity group-hover:opacity-60"
            aria-hidden
          />
        </span>
      </div>
    </article>
  );
}
