"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Send, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { AnswerBlock } from "./answer";
import type { AtlasAnswer } from "@/server/ai/types";

type Turn = { question: string; answer: AtlasAnswer | null; error?: string };

/**
 * Interface do Atlas AI. Não é um chat de propósito geral: a caixa aceita
 * perguntas sobre o acervo da plataforma e a resposta vem sempre estruturada
 * em fatos, interpretação, hipóteses e fontes.
 */
export function AtlasChat({
  municipalityId,
  suggestions = [],
  initialQuestion,
  className,
}: {
  municipalityId?: string;
  suggestions?: string[];
  initialQuestion?: string;
  className?: string;
}) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, setPending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const send = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || pending) return;
    setInput("");
    setPending(true);
    setTurns((previous) => [...previous, { question: trimmed, answer: null }]);

    try {
      const response = await fetch("/api/ia/perguntar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pergunta: trimmed, municipioId: municipalityId }),
      });
      const payload = (await response.json()) as AtlasAnswer & { error?: string };
      setTurns((previous) => {
        const next = [...previous];
        const last = next[next.length - 1];
        if (!response.ok) last.error = payload.error ?? "Falha ao consultar o Atlas AI.";
        else last.answer = payload;
        return next;
      });
    } catch {
      setTurns((previous) => {
        const next = [...previous];
        next[next.length - 1].error = "Não foi possível falar com o servidor.";
        return next;
      });
    } finally {
      setPending(false);
    }
  };

  useEffect(() => {
    if (initialQuestion && !startedRef.current) {
      startedRef.current = true;
      void send(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuestion]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [turns.length, pending]);

  return (
    <div className={cn("space-y-4", className)}>
      {turns.length === 0 && suggestions.length ? (
        <div>
          <p className="eyebrow mb-2">Comece por aqui</p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => void send(suggestion)}
                className="rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-left text-[12.5px] text-[var(--fg-muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--fg)]"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {turns.map((turn, index) => (
        <div key={index} className="space-y-2">
          <p className="flex items-start gap-2 text-[13.5px] font-medium">
            <Sparkles className="mt-0.5 size-3.5 shrink-0 text-[var(--fg-subtle)]" aria-hidden />
            {turn.question}
          </p>
          {turn.error ? (
            <p className="rounded-[var(--radius-md)] border border-dashed px-4 py-3 text-[12.5px] text-[var(--fall)]">
              {turn.error}
            </p>
          ) : turn.answer ? (
            <AnswerBlock answer={turn.answer} />
          ) : (
            <div className="flex items-center gap-2 rounded-[var(--radius-md)] border px-4 py-3 text-[12.5px] text-[var(--fg-muted)]">
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Recuperando evidências no banco de conhecimento…
            </div>
          )}
        </div>
      ))}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          void send(input);
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Pergunte sobre economia, política, setores, investimentos ou vizinhança..."
          disabled={pending}
          className="h-10 flex-1 rounded-[var(--radius-md)] border bg-[var(--bg-raised)] px-3 text-[13.5px] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent-border)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending || !input.trim()}
          className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--accent)] px-4 text-[13px] font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110 disabled:opacity-50"
        >
          {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
          Perguntar
        </button>
      </form>

      <p className="text-[11px] leading-relaxed text-[var(--fg-subtle)]">
        O Atlas AI usa somente o acervo da plataforma. Quando a evidência não existe, ele diz que não
        encontrou dados confiáveis suficientes — não estima nem preenche lacunas.
      </p>
      <div ref={bottomRef} />
    </div>
  );
}
