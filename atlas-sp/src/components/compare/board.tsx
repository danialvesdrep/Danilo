"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/data/provenance";
import { ComparisonChart } from "@/components/charts/series";
import { normalizeKey } from "@/lib/slug";
import { formatUnit, formatNumber, formatPercent } from "@/lib/format";
import type { ComparePayload } from "@/app/api/comparar/route";

const SERIES_COLORS = ["#2f6b82", "#b3701f", "#4a9e7a", "#8e5b9e"];
const MAX_SLOTS = 4;

/**
 * Comparador. A seleção vive na URL, de modo que uma comparação montada possa
 * ser compartilhada como link.
 */
export function CompareBoard({
  options,
  initialSlugs,
}: {
  options: Array<{ slug: string; name: string; meso: string | null }>;
  initialSlugs: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(initialSlugs);
  const [data, setData] = useState<ComparePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");

  const suggestions = useMemo(() => {
    const key = normalizeKey(query);
    if (key.length < 2) return [];
    return options
      .filter((option) => !selected.includes(option.slug) && normalizeKey(option.name).includes(key))
      .slice(0, 8);
  }, [query, options, selected]);

  const load = useCallback(async (slugs: string[]) => {
    if (slugs.length === 0) {
      setData(null);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/comparar?cidades=${slugs.join(",")}`);
      if (response.ok) setData((await response.json()) as ComparePayload);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(selected);
    const params = selected.length ? `?cidades=${selected.join(",")}` : "";
    window.history.replaceState(null, "", `/comparar${params}`);
  }, [selected, load]);

  const add = (slug: string) => {
    if (selected.length >= MAX_SLOTS) return;
    setSelected((current) => [...current, slug]);
    setQuery("");
  };

  const remove = (slug: string) => setSelected((current) => current.filter((value) => value !== slug));

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            {selected.map((slug, index) => {
              const option = options.find((entry) => entry.slug === slug);
              return (
                <span
                  key={slug}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border px-2.5 py-1.5 text-[13px] font-medium"
                  style={{ borderColor: SERIES_COLORS[index] }}
                >
                  <span className="size-2 rounded-sm" style={{ backgroundColor: SERIES_COLORS[index] }} aria-hidden />
                  {option?.name ?? slug}
                  <button
                    type="button"
                    onClick={() => remove(slug)}
                    aria-label={`Remover ${option?.name ?? slug}`}
                    className="text-[var(--fg-subtle)] transition-colors hover:text-[var(--fall)]"
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </span>
              );
            })}

            {selected.length < MAX_SLOTS ? (
              <div className="relative">
                <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-dashed px-2.5 py-1.5">
                  <Plus className="size-3 text-[var(--fg-subtle)]" aria-hidden />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Adicionar município..."
                    className="w-44 bg-transparent text-[13px] outline-none placeholder:text-[var(--fg-subtle)]"
                  />
                </div>
                {suggestions.length ? (
                  <ul className="absolute left-0 top-full z-30 mt-1 w-64 overflow-hidden rounded-[var(--radius-md)] border bg-[var(--bg-raised)] shadow-[var(--shadow-pop)]">
                    {suggestions.map((option) => (
                      <li key={option.slug}>
                        <button
                          type="button"
                          onClick={() => add(option.slug)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors hover:bg-[var(--bg-inset)]"
                        >
                          <span className="text-[13px]">{option.name}</span>
                          <span className="text-[11px] text-[var(--fg-subtle)]">{option.meso}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            ) : null}

            {loading ? <Loader2 className="size-4 animate-spin text-[var(--fg-subtle)]" aria-hidden /> : null}
          </div>

          {selected.length === 0 ? (
            <p className="mt-3 text-[12.5px] text-[var(--fg-muted)]">
              Escolha até {MAX_SLOTS} municípios para comparar. Sugestões: Campinas, Ribeirão Preto,
              Sorocaba, São José dos Campos.
            </p>
          ) : null}
        </CardBody>
      </Card>

      {data && data.municipalities.length ? (
        <>
          <Card>
            <CardHeader
              eyebrow="Indicadores"
              title="Comparação direta"
              description="Mesmo indicador, mesmo período de referência, lado a lado."
            />
            <div className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-left">
                <thead>
                  <tr className="border-b">
                    <th className="px-5 py-2.5 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                      Indicador
                    </th>
                    {data.municipalities.map((municipality, index) => (
                      <th key={municipality.slug} className="px-5 py-2.5 text-right">
                        <Link
                          href={`/cidade/${municipality.slug}`}
                          className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold hover:text-[var(--accent)]"
                        >
                          <span className="size-2 rounded-sm" style={{ backgroundColor: SERIES_COLORS[index] }} aria-hidden />
                          {municipality.name}
                        </Link>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.indicators.map((indicator) => {
                    const values = data.municipalities.map(
                      (municipality) => indicator.values[municipality.slug] ?? null,
                    );
                    const best = indicator.higherIsBetter === null ? null : Math.max(...values.map((v) => v ?? -Infinity));
                    return (
                      <tr key={indicator.slug} className="border-b last:border-b-0">
                        <td className="px-5 py-2.5">
                          <span className="text-[13px] font-medium">{indicator.shortName}</span>
                          {indicator.referenceLabel ? (
                            <span className="ml-2 font-mono text-[10.5px] text-[var(--fg-subtle)]">
                              {indicator.referenceLabel}
                            </span>
                          ) : null}
                        </td>
                        {data.municipalities.map((municipality, index) => {
                          const value = indicator.values[municipality.slug] ?? null;
                          const isBest = best !== null && value === best && values.filter((v) => v === best).length === 1;
                          return (
                            <td
                              key={municipality.slug}
                              className={cn(
                                "tnum px-5 py-2.5 text-right text-[13px]",
                                isBest && "font-semibold",
                              )}
                            >
                              {value === null ? (
                                <span className="text-[var(--fg-subtle)]">—</span>
                              ) : (
                                formatUnit(value, indicator.unit, indicator.precision)
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {data.isDemo ? (
              <CardBody className="border-t">
                <p className="flex items-center gap-2 text-[11.5px] text-[var(--fg-subtle)]">
                  <DemoBadge compact />
                  Parte das séries comparadas vem do conjunto de demonstração.
                </p>
              </CardBody>
            ) : null}
          </Card>

          {data.series.map((series) => (
            <Card key={series.slug}>
              <CardHeader eyebrow="Série histórica" title={series.name} dense />
              <CardBody dense>
                <ComparisonChart
                  data={series.points}
                  unit={series.unit}
                  precision={series.precision}
                  series={data.municipalities.map((municipality, index) => ({
                    key: municipality.slug,
                    label: municipality.name,
                    color: SERIES_COLORS[index],
                  }))}
                />
              </CardBody>
            </Card>
          ))}

          <Card>
            <CardHeader eyebrow="Perfil" title="Composição setorial" dense />
            <CardBody dense>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {data.municipalities.map((municipality, index) => (
                  <div key={municipality.slug}>
                    <p className="flex items-center gap-1.5 text-[12.5px] font-semibold">
                      <span className="size-2 rounded-sm" style={{ backgroundColor: SERIES_COLORS[index] }} aria-hidden />
                      {municipality.name}
                    </p>
                    <ul className="mt-2 space-y-1">
                      {(data.sectors[municipality.slug] ?? []).slice(0, 5).map((sector) => (
                        <li key={sector.slug} className="flex items-baseline justify-between gap-2">
                          <span className="min-w-0 truncate text-[12px] text-[var(--fg-muted)]">{sector.name}</span>
                          <span className="tnum shrink-0 text-[12px] font-medium">
                            {formatPercent(sector.sharePct, 1)}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] text-[var(--fg-subtle)]">
                      {formatNumber(data.radar[municipality.slug] ?? 0)} movimento(s) no Radar em 90 dias
                    </p>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        </>
      ) : null}
    </div>
  );
}
