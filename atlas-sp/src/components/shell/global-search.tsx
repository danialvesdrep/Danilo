"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Search, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { DemoBadge } from "@/components/data/provenance";
import type { SearchResponse } from "@/server/search/global";

/**
 * Busca global. Uma caixa só para toda a plataforma: entende cidade, pessoa,
 * empresa, setor, indicador, notícia e movimento do Radar, e passa pela
 * resolução de entidades antes de consultar o índice.
 */
export function GlobalSearch({
  placeholder = "Pesquise uma cidade, pessoa, empresa, setor ou assunto...",
  className,
  autoFocus = false,
  size = "md",
}: {
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  size?: "md" | "lg";
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const flat = results?.groups.flatMap((group) => group.hits) ?? [];

  // Ctrl/Cmd+K abre a busca de qualquer lugar da aplicação.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const search = useCallback(async (term: string) => {
    if (term.trim().length < 2) {
      setResults(null);
      setLoading(false);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const response = await fetch(`/api/busca?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Falha na busca");
      setResults((await response.json()) as SearchResponse);
      setActiveIndex(0);
    } catch (error) {
      if ((error as Error).name !== "AbortError") setResults(null);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, []);

  // Debounce curto: rápido o suficiente para parecer instantâneo, longo o
  // bastante para não disparar uma consulta por tecla.
  useEffect(() => {
    const timer = setTimeout(() => void search(query), 180);
    return () => clearTimeout(timer);
  }, [query, search]);

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    setResults(null);
    router.push(href);
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!flat.length) {
      if (event.key === "Enter" && query.trim().length >= 2) {
        go(`/busca?q=${encodeURIComponent(query)}`);
      }
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % flat.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + flat.length) % flat.length);
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(flat[activeIndex]?.href ?? `/busca?q=${encodeURIComponent(query)}`);
    }
  };

  let cursor = -1;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <Search
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--fg-subtle)]",
            size === "lg" ? "size-4" : "size-3.5",
          )}
          aria-hidden
        />
        <input
          ref={inputRef}
          value={query}
          autoFocus={autoFocus}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls="atlas-search-results"
          className={cn(
            "w-full rounded-[var(--radius-md)] border bg-[var(--bg-raised)] pl-9 pr-16 text-[var(--fg)] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent-border)]",
            size === "lg" ? "h-12 text-[15px]" : "h-9 text-[13.5px]",
          )}
        />
        <div className="absolute right-2.5 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {loading ? (
            <Loader2 className="size-3.5 animate-spin text-[var(--fg-subtle)]" aria-hidden />
          ) : (
            <kbd className="hidden rounded border px-1 py-0.5 font-mono text-[10px] text-[var(--fg-subtle)] sm:block">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {open && query.trim().length >= 2 ? (
        <div
          id="atlas-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-[70vh] overflow-y-auto rounded-[var(--radius-lg)] border bg-[var(--bg-raised)] shadow-[var(--shadow-pop)]"
        >
          {results && results.total > 0 ? (
            <>
              {results.groups.map((group) => (
                <div key={group.group} className="border-b last:border-b-0">
                  <div className="eyebrow px-3 pb-1 pt-2.5">{group.label}</div>
                  {group.hits.map((hit) => {
                    cursor += 1;
                    const active = cursor === activeIndex;
                    return (
                      <Link
                        key={`${hit.group}-${hit.id}`}
                        href={hit.href}
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setOpen(false);
                          setQuery("");
                        }}
                        className={cn(
                          "flex items-center justify-between gap-3 px-3 py-2 transition-colors",
                          active ? "bg-[var(--bg-inset)]" : "hover:bg-[var(--bg-inset)]",
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-medium">{hit.title}</span>
                          {hit.subtitle ? (
                            <span className="block truncate text-[11.5px] text-[var(--fg-muted)]">
                              {hit.subtitle}
                            </span>
                          ) : null}
                        </span>
                        <span className="flex shrink-0 items-center gap-1.5">
                          {hit.isDemo ? <DemoBadge compact /> : null}
                          {active ? (
                            <CornerDownLeft className="size-3 text-[var(--fg-subtle)]" aria-hidden />
                          ) : null}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
              <div className="flex items-center justify-between px-3 py-2 text-[11px] text-[var(--fg-subtle)]">
                <span className="tnum">
                  {results.total} resultado(s) em {results.tookMs} ms
                </span>
                <Link
                  href={`/busca?q=${encodeURIComponent(query)}`}
                  className="font-medium text-[var(--accent)] hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Ver todos
                </Link>
              </div>
            </>
          ) : loading ? (
            <div className="px-3 py-6 text-center text-[12.5px] text-[var(--fg-muted)]">
              Procurando…
            </div>
          ) : (
            <div className="px-3 py-6 text-center">
              <p className="text-[13px] font-medium">Nenhum resultado para “{query}”</p>
              <p className="mt-1 text-[12px] text-[var(--fg-muted)]">
                A busca cobre municípios, pessoas, empresas, setores, indicadores, notícias e
                movimentos do Radar.
              </p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
