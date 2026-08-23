"use client";

import { useMemo, useState, useDeferredValue } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Search } from "lucide-react";
import { cn } from "@/lib/cn";
import { DemoBadge } from "@/components/data/provenance";
import { formatCompact, formatCurrencyScaled, formatNumber } from "@/lib/format";
import { normalizeKey } from "@/lib/slug";
import type { MunicipalityListItem } from "@/server/queries/state";

type SortKey = "name" | "population" | "gdp" | "gdpPerCapita" | "employment" | "signalCount" | "areaKm2";

const COLUMNS: Array<{ key: SortKey; label: string; numeric: boolean; format?: (value: number | null) => string }> = [
  { key: "name", label: "Município", numeric: false },
  { key: "population", label: "População", numeric: true, format: (v) => (v === null ? "—" : formatNumber(v)) },
  { key: "gdp", label: "PIB", numeric: true, format: (v) => formatCurrencyScaled(v) },
  { key: "gdpPerCapita", label: "PIB per capita", numeric: true, format: (v) => (v === null ? "—" : `R$ ${formatCompact(v)}`) },
  { key: "employment", label: "Empregos", numeric: true, format: (v) => (v === null ? "—" : formatNumber(v)) },
  { key: "areaKm2", label: "Área", numeric: true, format: (v) => (v === null ? "—" : `${formatNumber(v, 0)} km²`) },
  { key: "signalCount", label: "Radar", numeric: true, format: (v) => (v ? formatNumber(v) : "—") },
];

const PAGE_SIZE = 60;

/**
 * Tabela dos 645 municípios. Ordenação e filtro no cliente: o conjunto é
 * pequeno o bastante para caber na memória e grande o bastante para que uma ida
 * ao servidor a cada clique fosse perceptível.
 */
export function CityTable({
  municipalities,
  regions,
}: {
  municipalities: MunicipalityListItem[];
  regions: Array<{ name: string; kind: string }>;
}) {
  const [query, setQuery] = useState("");
  const [meso, setMeso] = useState<string>("todas");
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: "gdp", desc: true });
  const [visible, setVisible] = useState(PAGE_SIZE);
  const deferredQuery = useDeferredValue(query);

  const mesoOptions = useMemo(
    () => [...new Set(municipalities.map((m) => m.mesoName).filter(Boolean))].sort() as string[],
    [municipalities],
  );

  const filtered = useMemo(() => {
    const key = normalizeKey(deferredQuery);
    const rows = municipalities.filter((municipality) => {
      if (meso !== "todas" && municipality.mesoName !== meso) return false;
      if (!key) return true;
      return normalizeKey(municipality.name).includes(key);
    });
    const factor = sort.desc ? -1 : 1;
    return [...rows].sort((a, b) => {
      if (sort.key === "name") return factor * a.name.localeCompare(b.name, "pt-BR");
      const left = (a[sort.key] as number | null) ?? -Infinity;
      const right = (b[sort.key] as number | null) ?? -Infinity;
      return factor * (left - right);
    });
  }, [municipalities, deferredQuery, meso, sort]);

  const toggleSort = (key: SortKey) =>
    setSort((current) => ({ key, desc: current.key === key ? !current.desc : key !== "name" }));

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 border-b px-5 py-3">
        <div className="relative min-w-[13rem] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--fg-subtle)]" aria-hidden />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setVisible(PAGE_SIZE);
            }}
            placeholder="Filtrar município..."
            className="h-8 w-full rounded-[var(--radius-sm)] border bg-[var(--bg-raised)] pl-8 pr-2 text-[13px] outline-none focus:border-[var(--accent-border)]"
          />
        </div>
        <select
          value={meso}
          onChange={(event) => {
            setMeso(event.target.value);
            setVisible(PAGE_SIZE);
          }}
          className="h-8 rounded-[var(--radius-sm)] border bg-[var(--bg-raised)] px-2 text-[13px] outline-none focus:border-[var(--accent-border)]"
        >
          <option value="todas">Todas as mesorregiões</option>
          {mesoOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
        <span className="tnum text-[12px] text-[var(--fg-muted)]">
          {formatNumber(filtered.length)} de {formatNumber(municipalities.length)}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left">
          <thead className="sticky top-14 z-10 bg-[var(--bg-raised)]">
            <tr className="border-b">
              {COLUMNS.map((column) => (
                <th
                  key={column.key}
                  className={cn("px-4 py-2", column.numeric && "text-right")}
                >
                  <button
                    type="button"
                    onClick={() => toggleSort(column.key)}
                    className={cn(
                      "inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.05em] transition-colors",
                      sort.key === column.key ? "text-[var(--fg)]" : "text-[var(--fg-subtle)] hover:text-[var(--fg-muted)]",
                    )}
                  >
                    {column.label}
                    {sort.key === column.key ? (
                      sort.desc ? <ArrowDown className="size-3" aria-hidden /> : <ArrowUp className="size-3" aria-hidden />
                    ) : null}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, visible).map((municipality) => (
              <tr key={municipality.id} className="border-b transition-colors last:border-b-0 hover:bg-[var(--bg-inset)]">
                <td className="px-4 py-2">
                  <Link href={`/cidade/${municipality.slug}`} className="text-[13px] font-medium hover:text-[var(--accent)]">
                    {municipality.name}
                  </Link>
                  <span className="ml-2 text-[11px] text-[var(--fg-subtle)]">{municipality.mesoName}</span>
                  {municipality.isDemo ? <DemoBadge compact className="ml-1.5" /> : null}
                  {municipality.topSector ? (
                    <span className="ml-2 inline-flex items-center gap-1 text-[11px] text-[var(--fg-muted)]">
                      <span
                        className="size-1.5 rounded-full"
                        style={{ backgroundColor: municipality.topSectorColor ?? "var(--accent)" }}
                        aria-hidden
                      />
                      {municipality.topSector}
                    </span>
                  ) : null}
                </td>
                {COLUMNS.slice(1).map((column) => (
                  <td key={column.key} className="tnum px-4 py-2 text-right text-[12.5px]">
                    {column.format!((municipality[column.key] as number | null) ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {visible < filtered.length ? (
        <div className="border-t px-5 py-3 text-center">
          <button
            type="button"
            onClick={() => setVisible((value) => value + PAGE_SIZE)}
            className="text-[12.5px] font-medium text-[var(--accent)] hover:underline"
          >
            Mostrar mais {Math.min(PAGE_SIZE, filtered.length - visible)} municípios
          </button>
        </div>
      ) : null}
    </>
  );
}
