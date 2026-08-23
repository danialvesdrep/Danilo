"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";
import { Loader2, Layers } from "lucide-react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { DemoBadge } from "@/components/data/provenance";
import { formatNumber } from "@/lib/format";
import { MAP_METRICS, MAP_METRIC_BY_KEY, CHOROPLETH_STOPS, computeBreaks, type MapMetricKey } from "./metrics";
import type { MapFeatureProperties } from "./state-map";

// MapLibre depende de APIs do navegador: só carrega no cliente.
const StateMap = dynamic(() => import("./state-map").then((module) => module.StateMap), {
  ssr: false,
  loading: () => (
    <div className="flex size-full items-center justify-center bg-[var(--bg-inset)]">
      <Loader2 className="size-5 animate-spin text-[var(--fg-subtle)]" aria-hidden />
    </div>
  ),
});

/**
 * Painel do mapa: métrica, legenda, cartão de contexto no hover e ações.
 * Os dados chegam por `/api/geo/municipios` — a página não carrega a malha
 * no servidor, o que mantém o HTML leve e permite cache no CDN.
 */
export function StateMapPanel({
  height = 620,
  initialMetric = "pib",
  compact = false,
  highlightSlugs,
  className,
}: {
  height?: number;
  initialMetric?: MapMetricKey;
  compact?: boolean;
  highlightSlugs?: string[];
  className?: string;
}) {
  const [metric, setMetric] = useState<MapMetricKey>(initialMetric);
  const [data, setData] = useState<FeatureCollection | null>(null);
  const [hovered, setHovered] = useState<MapFeatureProperties | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/geo/municipios")
      .then((response) => {
        if (!response.ok) throw new Error("Falha ao carregar a malha municipal");
        return response.json();
      })
      .then((payload: FeatureCollection) => {
        if (!cancelled) setData(payload);
      })
      .catch((cause: Error) => {
        if (!cancelled) setError(cause.message);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const definition = MAP_METRIC_BY_KEY.get(metric)!;

  const legend = useMemo(() => {
    if (!data || definition.scale === "categorical") return null;
    const values = data.features
      .map((feature) => Number((feature.properties as Record<string, unknown>)?.[metric] ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    return { breaks: computeBreaks(values, 5), count: values.length, total: data.features.length };
  }, [data, metric, definition.scale]);

  const visibleMetrics = compact ? MAP_METRICS.slice(0, 5) : MAP_METRICS;

  return (
    <div className={cn("relative", className)}>
      <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2.5">
        <Layers className="size-3.5 shrink-0 text-[var(--fg-subtle)]" aria-hidden />
        {visibleMetrics.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setMetric(item.key)}
            title={item.description}
            className={cn(
              "rounded-[var(--radius-xs)] px-2 py-1 text-[11.5px] font-medium transition-colors",
              metric === item.key
                ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                : "text-[var(--fg-muted)] hover:bg-[var(--bg-inset)] hover:text-[var(--fg)]",
            )}
          >
            {item.shortLabel}
          </button>
        ))}
        {!compact ? (
          <span className="ml-auto text-[11px] text-[var(--fg-subtle)]">{definition.description}</span>
        ) : null}
      </div>

      <div className="relative" style={{ height }}>
        {error ? (
          <div className="flex size-full items-center justify-center px-6 text-center">
            <div>
              <p className="text-[13.5px] font-medium">Não foi possível carregar o mapa</p>
              <p className="mt-1 text-[12px] text-[var(--fg-muted)]">{error}</p>
            </div>
          </div>
        ) : (
          <StateMap
            metric={metric}
            data={data}
            onHover={setHovered}
            highlightSlugs={highlightSlugs}
          />
        )}

        {legend ? (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-[var(--radius-md)] border bg-[var(--bg-overlay)] px-3 py-2 backdrop-blur-sm">
            <p className="eyebrow mb-1.5">{definition.shortLabel}</p>
            <div className="flex items-center gap-1">
              {CHOROPLETH_STOPS.light.map((_, index) => (
                <span
                  key={index}
                  className="h-2.5 w-7 first:rounded-l-sm last:rounded-r-sm dark:hidden"
                  style={{ backgroundColor: CHOROPLETH_STOPS.light[index] }}
                />
              ))}
              {CHOROPLETH_STOPS.dark.map((_, index) => (
                <span
                  key={`d-${index}`}
                  className="hidden h-2.5 w-7 first:rounded-l-sm last:rounded-r-sm dark:block"
                  style={{ backgroundColor: CHOROPLETH_STOPS.dark[index] }}
                />
              ))}
            </div>
            <div className="mt-1 flex justify-between gap-3 font-mono text-[9.5px] tabular-nums text-[var(--fg-subtle)]">
              <span>menor</span>
              <span>maior</span>
            </div>
            <p className="mt-1 text-[10px] text-[var(--fg-subtle)]">
              {legend.count} de {legend.total} municípios com série · quintis
            </p>
          </div>
        ) : null}

        {hovered ? <HoverCard properties={hovered} metric={metric} /> : null}
      </div>
    </div>
  );
}

/** Cartão de contexto no hover: retrato imediato da cidade sob o cursor. */
function HoverCard({ properties, metric }: { properties: MapFeatureProperties; metric: MapMetricKey }) {
  const rows: Array<{ label: string; value: string }> = [
    { label: "População", value: MAP_METRIC_BY_KEY.get("populacao")!.format(properties.populacao) },
    { label: "PIB", value: MAP_METRIC_BY_KEY.get("pib")!.format(properties.pib) },
    { label: "PIB per capita", value: MAP_METRIC_BY_KEY.get("pibPerCapita")!.format(properties.pibPerCapita) },
    { label: "Setor principal", value: properties.setor ?? "—" },
  ];

  return (
    <div className="pointer-events-none absolute right-3 top-3 w-[min(20rem,calc(100%-1.5rem))] rounded-[var(--radius-md)] border bg-[var(--bg-overlay)] p-3.5 shadow-[var(--shadow-pop)] backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold leading-tight">{properties.name}</p>
          <p className="mt-0.5 truncate text-[11px] text-[var(--fg-subtle)]">
            {properties.meso} · {formatNumber(properties.area ?? 0, 0)} km²
          </p>
        </div>
        {properties.isDemo ? <DemoBadge compact /> : null}
      </div>

      <dl className="mt-2.5 space-y-1">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-[11.5px] text-[var(--fg-muted)]">{row.label}</dt>
            <dd className="tnum truncate text-[12px] font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      {properties.ultimoMovimento ? (
        <div className="mt-2.5 border-t pt-2">
          <p className="eyebrow mb-1">Último movimento</p>
          <p className="line-clamp-2 text-[11.5px] leading-snug">{properties.ultimoMovimento}</p>
        </div>
      ) : null}

      <div className="mt-2.5 flex items-center gap-2 border-t pt-2">
        {properties.sinais > 0 ? (
          <Badge tone="signal" mono>
            {properties.sinais} no Radar
          </Badge>
        ) : null}
        <span className="ml-auto text-[10.5px] text-[var(--fg-subtle)]">clique para abrir</span>
      </div>
    </div>
  );
}

/** Versão estática usada no perfil da cidade e nos vizinhos. */
export function MiniMapLink({ slug, name }: { slug: string; name: string }) {
  return (
    <Link
      href={`/mapa?municipio=${slug}`}
      className="text-[12.5px] font-medium text-[var(--accent)] hover:underline"
    >
      Ver {name} no mapa
    </Link>
  );
}
