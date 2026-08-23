"use client";

import { useState } from "react";
import { ExternalLink, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";

export type Provenance = {
  sourceName: string;
  organization: string;
  tier: "OFICIAL" | "INSTITUCIONAL" | "JORNALISTICA" | "SECUNDARIA" | "DEMONSTRACAO";
  url?: string | null;
  sourceUrl?: string | null;
  referenceLabel?: string | null;
  retrievedAt?: Date | string | null;
  publishedAt?: Date | string | null;
  methodology?: string | null;
  confidence?: number | null;
  isDemo?: boolean;
};

const TIER_LABEL: Record<Provenance["tier"], string> = {
  OFICIAL: "Fonte oficial",
  INSTITUCIONAL: "Fonte institucional",
  JORNALISTICA: "Fonte jornalística",
  SECUNDARIA: "Fonte secundária",
  DEMONSTRACAO: "Demonstração",
};

/**
 * Nenhum número relevante aparece na plataforma sem este componente ao lado.
 * Clicar abre a origem: fonte, período de referência, metodologia e link.
 */
export function SourceTag({ provenance, className }: { provenance: Provenance; className?: string }) {
  const [open, setOpen] = useState(false);
  const link = provenance.sourceUrl ?? provenance.url ?? null;

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        onBlur={() => setTimeout(() => setOpen(false), 140)}
        aria-expanded={open}
        className={cn(
          "inline-flex items-center gap-1 rounded-[var(--radius-xs)] px-1 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] transition-colors",
          provenance.isDemo || provenance.tier === "DEMONSTRACAO"
            ? "text-[var(--signal)] hover:bg-[var(--signal-subtle)]"
            : "text-[var(--fg-subtle)] hover:bg-[var(--bg-inset)] hover:text-[var(--fg-muted)]",
        )}
      >
        <Info className="size-3" aria-hidden />
        Fonte
      </button>

      {open ? (
        <span
          role="dialog"
          className="absolute bottom-full left-0 z-40 mb-1.5 w-[min(21rem,calc(100vw-2rem))] rounded-[var(--radius-md)] border bg-[var(--bg-raised)] p-3 text-left shadow-[var(--shadow-pop)]"
        >
          <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--fg-subtle)]">
            {TIER_LABEL[provenance.tier]}
          </span>
          <span className="mt-1 block text-[13px] font-medium leading-snug">
            {provenance.organization} · {provenance.sourceName}
          </span>

          <span className="mt-2 block space-y-1 text-[12px] leading-relaxed text-[var(--fg-muted)]">
            {provenance.referenceLabel ? (
              <span className="block">
                Período de referência: <span className="tnum">{provenance.referenceLabel}</span>
              </span>
            ) : null}
            {provenance.publishedAt ? (
              <span className="block">Publicado em {formatDate(provenance.publishedAt)}</span>
            ) : null}
            {provenance.retrievedAt ? (
              <span className="block">Coletado em {formatDate(provenance.retrievedAt)}</span>
            ) : null}
            {typeof provenance.confidence === "number" ? (
              <span className="block">
                Confiança declarada: <span className="tnum">{Math.round(provenance.confidence * 100)}%</span>
              </span>
            ) : null}
          </span>

          {provenance.methodology ? (
            <span className="mt-2 block border-t pt-2 text-[12px] leading-relaxed text-[var(--fg-muted)]">
              {provenance.methodology}
            </span>
          ) : null}

          {link ? (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-[12px] font-medium text-[var(--accent)] hover:underline"
            >
              Abrir fonte original
              <ExternalLink className="size-3" aria-hidden />
            </a>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}

/**
 * Marca dados sintéticos. Obrigatório em qualquer valor gerado pelo conjunto
 * de demonstração — a regra do produto é que o usuário nunca confunda os dois.
 */
export function DemoBadge({
  className,
  label = "Demonstração",
  compact = false,
}: {
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <span
      title="Dado sintético do conjunto de demonstração. Não corresponde à realidade e não deve ser citado."
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-xs)] border border-[var(--signal-border)] bg-[var(--signal-subtle)] font-mono uppercase tracking-[0.08em] text-[var(--signal)]",
        compact ? "px-1 py-px text-[9px]" : "px-1.5 py-0.5 text-[10px]",
        className,
      )}
    >
      <span className="size-1 rounded-full bg-[var(--signal)]" aria-hidden />
      {label}
    </span>
  );
}

/** Faixa explicativa exibida no topo de áreas majoritariamente sintéticas. */
export function DemoNotice({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-md)] border border-[var(--signal-border)] bg-[var(--signal-subtle)] px-3.5 py-2.5 text-[12.5px] leading-relaxed text-[var(--fg-muted)]",
        className,
      )}
    >
      <DemoBadge compact className="mt-0.5 shrink-0" />
      <p>
        {children ?? (
          <>
            As séries econômicas, pessoas, empresas e notícias desta área pertencem ao conjunto de
            demonstração e <strong className="font-semibold text-[var(--fg)]">não correspondem à realidade</strong>.
            Elas existem para que a experiência do produto possa ser avaliada enquanto as ingestões
            oficiais não estão conectadas.
          </>
        )}
      </p>
    </div>
  );
}
