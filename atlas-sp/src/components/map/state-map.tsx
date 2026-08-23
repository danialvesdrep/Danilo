"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as maplibregl from "maplibre-gl";
import type { Map as MapLibreMap, MapGeoJSONFeature } from "maplibre-gl";
import type { Feature, FeatureCollection } from "geojson";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/cn";
import { CHOROPLETH_STOPS, MAP_METRIC_BY_KEY, NO_DATA_COLOR, computeBreaks, type MapMetricKey } from "./metrics";

/**
 * Mapa do Estado em MapLibre.
 *
 * Renderizamos a malha municipal como fonte GeoJSON própria, sem tiles de base:
 * além de funcionar sem chave de API e sem tráfego externo, o resultado é mais
 * limpo — o dado é o mapa. Com NEXT_PUBLIC_MAP_STYLE_URL definido, um estilo
 * base (Mapbox ou compatível) é usado no lugar.
 */

export type MapFeatureProperties = {
  ibgeCode: string;
  name: string;
  slug: string;
  meso: string | null;
  area: number | null;
  populacao: number | null;
  pib: number | null;
  pibPerCapita: number | null;
  emprego: number | null;
  densidade: number | null;
  receita: number | null;
  investimentos: number | null;
  setor: string | null;
  setorCor: string | null;
  macro: string | null;
  sinais: number;
  maxScore: number;
  ultimoMovimento: string | null;
  ultimoSlug: string | null;
  isDemo: boolean;
};

/** Enquadramento do Estado de São Paulo. */
const SP_BOUNDS: [[number, number], [number, number]] = [
  [-53.2, -25.4],
  [-44.1, -19.7],
];

export function StateMap({
  metric,
  data,
  onHover,
  onSelect,
  highlightSlugs,
  className,
  interactive = true,
  showLabels = true,
}: {
  metric: MapMetricKey;
  data: FeatureCollection | null;
  onHover?: (properties: MapFeatureProperties | null) => void;
  onSelect?: (properties: MapFeatureProperties) => void;
  highlightSlugs?: string[];
  className?: string;
  interactive?: boolean;
  showLabels?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const hoveredRef = useRef<string | number | null>(null);
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const update = () => setIsDark(document.documentElement.classList.contains("dark"));
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // Cor por município: quebras por quantil recalculadas a cada métrica.
  const paint = useMemo(() => {
    if (!data) return null;
    const theme = isDark ? "dark" : "light";
    const stops = CHOROPLETH_STOPS[theme];
    const noData = NO_DATA_COLOR[theme];
    const definition = MAP_METRIC_BY_KEY.get(metric);

    if (definition?.scale === "categorical") {
      // Cor definida pelo próprio setor, para leitura imediata do mosaico.
      return {
        expression: ["coalesce", ["get", "setorCor"], noData] as unknown as maplibregl.ExpressionSpecification,
        breaks: [] as number[],
        stops,
        noData,
      };
    }

    const values = data.features
      .map((feature: Feature) => Number((feature.properties as Record<string, unknown>)?.[metric] ?? 0))
      .filter((value) => Number.isFinite(value) && value > 0);
    const breaks = computeBreaks(values, stops.length);

    const expression: unknown[] = ["case", ["<=", ["coalesce", ["get", metric], 0], 0], noData, ["step", ["get", metric], stops[0]]];
    const step = expression[3] as unknown[];
    breaks.forEach((value: number, index: number) => {
      step.push(value, stops[Math.min(index + 1, stops.length - 1)]);
    });

    return { expression: expression as unknown as maplibregl.ExpressionSpecification, breaks, stops, noData };
  }, [data, metric, isDark]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // O worker é servido como ativo estático (ver scripts/copy-map-worker.mjs):
    // a resolução automática de URL não sobrevive ao empacotamento do Next e o
    // mapa carregaria em branco, sem erro visível.
    maplibregl.setWorkerUrl("/vendor/maplibre/maplibre-gl-worker.mjs");

    const styleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const style: maplibregl.StyleSpecification | string =
      styleUrl && token
        ? `${styleUrl}?access_token=${token}`
        : styleUrl
          ? styleUrl
          : {
              version: 8,
              // Sem tiles: o fundo é o papel da aplicação.
              sources: {},
              layers: [
                {
                  id: "fundo",
                  type: "background",
                  paint: { "background-color": "transparent" },
                },
              ],
              // Sem `glyphs`: o mapa não desenha texto. Os rótulos das maiores
              // cidades entram como marcadores HTML, o que mantém a tipografia
              // do produto e dispensa baixar fontes PBF.
            };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: style as never,
      bounds: SP_BOUNDS,
      fitBoundsOptions: { padding: 24 },
      attributionControl: false,
      dragRotate: false,
      touchPitch: false,
      interactive,
      maxZoom: 12,
      minZoom: 4,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    map.addControl(
      new maplibregl.AttributionControl({
        compact: true,
        customAttribution: "Malha municipal: IBGE",
      }),
      "bottom-right",
    );
    map.touchZoomRotate.disableRotation();

    map.on("load", () => {
      mapRef.current = map;
      setReady(true);
    });

    // Erros de estilo do MapLibre são silenciosos por padrão; sem isso, uma
    // expressão inválida deixa o mapa em branco sem nenhuma pista.
    map.on("error", (event) => {
      console.error("[mapa]", event.error?.message ?? event);
    });

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __atlasMap?: MapLibreMap }).__atlasMap = map;
    }

    return () => {
      map.remove();
      mapRef.current = null;
      setReady(false);
    };
  }, [interactive]);

  // Carrega a malha e registra as camadas assim que o mapa e os dados existem.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !data || !paint) return;

    if (!map.getSource("municipios")) {
      // O `id` numérico já vem no topo de cada feature (código IBGE), que é o que
      // o MapLibre usa para feature-state — `promoteId` aqui só atrapalharia.
      map.addSource("municipios", { type: "geojson", data });

      map.addLayer({
        id: "municipios-preenchimento",
        type: "fill",
        source: "municipios",
        paint: {
          "fill-color": paint.expression,
          "fill-opacity": [
            "case",
            ["boolean", ["feature-state", "hover"], false], 0.95,
            ["boolean", ["feature-state", "highlight"], false], 0.98,
            0.86,
          ],
        },
      });

      map.addLayer({
        id: "municipios-contorno",
        type: "line",
        source: "municipios",
        paint: {
          "line-color": isDark ? "#0d0c0b" : "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.25, 9, 0.9],
          "line-opacity": 0.7,
        },
      });

      map.addLayer({
        id: "municipios-selecao",
        type: "line",
        source: "municipios",
        paint: {
          "line-color": isDark ? "#e3a95f" : "#8f5817",
          "line-width": [
            "case",
            ["boolean", ["feature-state", "hover"], false], 2,
            ["boolean", ["feature-state", "highlight"], false], 2.4,
            0,
          ],
        },
      });
    } else {
      (map.getSource("municipios") as maplibregl.GeoJSONSource).setData(data);
    }

    map.setPaintProperty("municipios-preenchimento", "fill-color", paint.expression);
    map.setPaintProperty("municipios-contorno", "line-color", isDark ? "#0d0c0b" : "#ffffff");
    map.setPaintProperty(
      "municipios-selecao",
      "line-color",
      isDark ? "#e3a95f" : "#8f5817",
    );
  }, [ready, data, paint, isDark]);

  // Interação: hover destaca e informa; clique abre o perfil da cidade.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !interactive) return;

    const setHover = (id: string | number | null) => {
      if (hoveredRef.current !== null) {
        map.setFeatureState({ source: "municipios", id: hoveredRef.current }, { hover: false });
      }
      hoveredRef.current = id;
      if (id !== null) {
        map.setFeatureState({ source: "municipios", id }, { hover: true });
      }
    };

    const onMove = (event: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const feature = event.features?.[0];
      if (!feature) return;
      map.getCanvas().style.cursor = "pointer";
      setHover(feature.id ?? null);
      onHover?.(feature.properties as unknown as MapFeatureProperties);
    };

    const onLeave = () => {
      map.getCanvas().style.cursor = "";
      setHover(null);
      onHover?.(null);
    };

    const onClick = (event: maplibregl.MapMouseEvent & { features?: MapGeoJSONFeature[] }) => {
      const feature = event.features?.[0];
      if (!feature) return;
      const properties = feature.properties as unknown as MapFeatureProperties;
      if (onSelect) onSelect(properties);
      else router.push(`/cidade/${properties.slug}`);
    };

    map.on("mousemove", "municipios-preenchimento", onMove);
    map.on("mouseleave", "municipios-preenchimento", onLeave);
    map.on("click", "municipios-preenchimento", onClick);

    return () => {
      map.off("mousemove", "municipios-preenchimento", onMove);
      map.off("mouseleave", "municipios-preenchimento", onLeave);
      map.off("click", "municipios-preenchimento", onClick);
    };
  }, [ready, interactive, onHover, onSelect, router]);

  // Rótulos das maiores cidades como marcadores HTML: preservam a tipografia
  // do produto e dispensam baixar fontes PBF. A colisão é resolvida em espaço
  // de tela a cada movimento — sem isso a região metropolitana vira um borrão.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !data || !showLabels) return;

    const candidates = [...data.features]
      .filter((feature) => Number((feature.properties as Record<string, unknown>)?.populacao ?? 0) > 0)
      .sort(
        (a, b) =>
          Number((b.properties as Record<string, unknown>).populacao) -
          Number((a.properties as Record<string, unknown>).populacao),
      )
      .slice(0, 45)
      .map((feature) => ({
        name: String((feature.properties as Record<string, unknown>).name),
        center: centroidOfFeature(feature),
      }));

    const entries = candidates.map((candidate) => {
      const element = document.createElement("span");
      element.textContent = candidate.name;
      element.className =
        "pointer-events-none select-none whitespace-nowrap text-[10.5px] font-medium tracking-[-0.01em]";
      element.style.color = "var(--fg)";
      element.style.textShadow = "0 0 3px var(--bg), 0 0 3px var(--bg), 0 0 6px var(--bg)";
      // Começam ocultos: só aparecem depois de passar pelo teste de colisão.
      element.style.opacity = "0";
      const marker = new maplibregl.Marker({ element, anchor: "center" })
        .setLngLat(candidate.center)
        .addTo(map);
      return { marker, element, box: { w: 0, h: 0 } };
    });

    const relayout = () => {
      const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
      for (const entry of entries) {
        // A caixa real só é mensurável depois do primeiro layout; medimos uma
        // vez, com o elemento momentaneamente visível.
        if (!entry.box.w) {
          entry.element.style.opacity = "1";
          const rect = entry.element.getBoundingClientRect();
          entry.box = { w: rect.width, h: rect.height };
          entry.element.style.opacity = "0";
        }
        if (!entry.box.w) continue;

        const point = map.project(entry.marker.getLngLat());
        // Folga maior na vertical: rótulos empilhados incomodam mais do que
        // rótulos lado a lado.
        const width = entry.box.w + 16;
        const height = entry.box.h + 12;
        const collides = placed.some(
          (other) =>
            Math.abs(other.x - point.x) < (other.w + width) / 2 &&
            Math.abs(other.y - point.y) < (other.h + height) / 2,
        );
        entry.element.style.opacity = collides ? "0" : "1";
        if (!collides) placed.push({ x: point.x, y: point.y, w: width, h: height });
      }
    };

    // Espera o próximo quadro para que a tipografia já esteja aplicada.
    const frame = requestAnimationFrame(relayout);
    map.on("move", relayout);
    map.on("zoom", relayout);

    return () => {
      cancelAnimationFrame(frame);
      map.off("move", relayout);
      map.off("zoom", relayout);
      entries.forEach((entry) => entry.marker.remove());
    };
  }, [ready, data, showLabels]);

  // Destaque externo (comparador, vizinhos, resultado de busca).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !data) return;
    const wanted = new Set(highlightSlugs ?? []);
    for (const feature of data.features) {
      const slug = feature.properties?.slug as string | undefined;
      if (!slug || feature.id === undefined) continue;
      map.setFeatureState(
        { source: "municipios", id: feature.id as number },
        { highlight: wanted.has(slug) },
      );
    }
  }, [ready, data, highlightSlugs]);

  return <div ref={containerRef} className={cn("size-full", className)} aria-label="Mapa do Estado de São Paulo" />;
}

/** Centro aproximado de uma feature, para posicionar o rótulo. */
function centroidOfFeature(feature: Feature): [number, number] {
  const geometry = feature.geometry;
  const rings: number[][][] =
    geometry.type === "Polygon"
      ? (geometry.coordinates as number[][][])
      : geometry.type === "MultiPolygon"
        ? (geometry.coordinates as number[][][][]).flat()
        : [];
  let lonSum = 0;
  let latSum = 0;
  let count = 0;
  for (const ring of rings) {
    for (const position of ring) {
      lonSum += position[0];
      latSum += position[1];
      count += 1;
    }
  }
  return count ? [lonSum / count, latSum / count] : [-48.5, -22.5];
}

export { SP_BOUNDS };
