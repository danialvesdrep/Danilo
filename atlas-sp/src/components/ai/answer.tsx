import Link from "next/link";
import { AlertTriangle, BookOpen, FlaskConical, Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/data/provenance";
import type { AtlasAnswer } from "@/server/ai/types";

const TIER_TONE = {
  OFICIAL: "accent",
  INSTITUCIONAL: "accent",
  JORNALISTICA: "neutral",
  SECUNDARIA: "neutral",
  DEMONSTRACAO: "signal",
} as const;

/**
 * Apresentação de uma resposta do Atlas AI.
 *
 * A separação visual entre FATO, INTERPRETAÇÃO e HIPÓTESE é o contrato da
 * plataforma com o usuário: ele precisa saber, sem esforço, o que é dado e o
 * que é leitura. Toda afirmação factual leva o número da citação.
 */
export function AnswerBlock({
  answer,
  question,
  className,
  compact = false,
}: {
  answer: AtlasAnswer;
  question?: string;
  className?: string;
  compact?: boolean;
}) {
  if (answer.insufficientData) {
    return (
      <div className={cn("rounded-[var(--radius-lg)] border border-dashed px-5 py-6 text-center", className)}>
        <AlertTriangle className="mx-auto size-5 text-[var(--fg-subtle)]" aria-hidden />
        <p className="mt-3 text-[14px] font-medium">
          Não encontrei dados confiáveis suficientes para responder.
        </p>
        <p className="mx-auto mt-1.5 max-w-md text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
          O Atlas AI responde apenas com base no que está no banco de conhecimento da plataforma.
          Quando a evidência não existe, a resposta é essa — e não uma estimativa.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("rounded-[var(--radius-lg)] border bg-[var(--bg-raised)]", className)}>
      <div className="flex items-start justify-between gap-3 border-b px-5 py-3.5">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            <Sparkles className="size-3" aria-hidden />
            Atlas AI
          </p>
          {question ? (
            <p className="mt-1.5 text-[13px] font-medium text-[var(--fg-muted)]">{question}</p>
          ) : null}
          <p className="headline mt-1 text-[17px]">{answer.headline}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <Badge
            tone="outline"
            mono
            title="Confiança calculada a partir do número e da qualidade das evidências"
          >
            {Math.round(answer.confidence * 100)}% confiança
          </Badge>
          {answer.usesDemoData ? <DemoBadge compact /> : null}
        </div>
      </div>

      <Section icon={BookOpen} title="Fatos" subtitle="O que as fontes sustentam" className="border-b">
        <ul className="space-y-2">
          {answer.facts.map((fact, index) => (
            <li key={index} className="flex gap-2.5 text-[13px] leading-relaxed">
              <span className="mt-[3px] shrink-0 font-mono text-[10px] text-[var(--fg-subtle)]">
                [{fact.citationIndex}]
              </span>
              <span>{fact.statement}</span>
            </li>
          ))}
        </ul>
      </Section>

      {answer.interpretation ? (
        <Section
          icon={Lightbulb}
          title="Interpretação"
          subtitle="Leitura derivada dos fatos acima — não é um dado novo"
          className="border-b bg-[var(--bg-subtle)]"
        >
          <p className="text-[13px] leading-relaxed text-[var(--fg-muted)]">{answer.interpretation}</p>
        </Section>
      ) : null}

      {answer.hypotheses.length ? (
        <Section
          icon={FlaskConical}
          title="Hipóteses"
          subtitle="Possibilidades que os dados disponíveis não confirmam"
          className="border-b"
        >
          <ul className="space-y-3">
            {answer.hypotheses.map((hypothesis, index) => (
              <li key={index}>
                <p className="text-[13px] leading-relaxed">{hypothesis.statement}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
                  <span className="font-medium">O que confirmaria:</span> {hypothesis.wouldConfirm}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {answer.citations.length ? (
        <div className="px-5 py-4">
          <p className="eyebrow mb-2.5">Fontes utilizadas</p>
          <ol className="space-y-1.5">
            {answer.citations.map((citation, index) => (
              <li key={index} className="flex gap-2.5 text-[12px] leading-relaxed">
                <span className="shrink-0 font-mono text-[10px] text-[var(--fg-subtle)]">[{index}]</span>
                <span className="min-w-0">
                  {citation.href ? (
                    <Link href={citation.href} className="font-medium hover:text-[var(--accent)]">
                      {citation.label}
                    </Link>
                  ) : (
                    <span className="font-medium">{citation.label}</span>
                  )}
                  <span className="text-[var(--fg-muted)]"> — {citation.source}</span>
                  <Badge tone={TIER_TONE[citation.sourceTier]} className="ml-1.5 align-middle">
                    {citation.sourceTier.toLowerCase()}
                  </Badge>
                  {citation.url ? (
                    <a
                      href={citation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-1.5 text-[11px] text-[var(--accent)] hover:underline"
                    >
                      abrir
                    </a>
                  ) : null}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      {!compact ? (
        <div className="border-t px-5 py-2.5 text-[11px] leading-relaxed text-[var(--fg-subtle)]">
          Resposta composta pelo provedor <span className="font-mono">{answer.provider}</span>
          {answer.model ? ` (${answer.model})` : ""} a partir exclusivamente das evidências listadas.
          {answer.usesDemoData
            ? " Parte das evidências é do conjunto de demonstração — a leitura só se sustenta após conectadas as fontes oficiais."
            : ""}
        </div>
      ) : null}
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
  className,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-5 py-4", className)}>
      <div className="mb-2.5 flex items-baseline gap-2">
        <Icon className="size-3.5 shrink-0 translate-y-0.5 text-[var(--fg-subtle)]" aria-hidden />
        <span className="text-[12px] font-semibold uppercase tracking-[0.06em]">{title}</span>
        <span className="text-[11.5px] text-[var(--fg-subtle)]">{subtitle}</span>
      </div>
      {children}
    </div>
  );
}
