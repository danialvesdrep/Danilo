import Link from "next/link";
import { Bookmark, MapPin, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/shell/page-header";
import { SaveCityButton } from "./save-button";
import { getIndicatorMap, getNeighbors } from "@/server/queries/municipality";
import { formatNumber } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

/** Cabeçalho do perfil: identidade territorial e atalhos imediatos. */
export async function CityHeader({ municipality }: { municipality: MunicipalityDetail }) {
  const [indicators, neighbors] = await Promise.all([
    getIndicatorMap(municipality.id),
    getNeighbors(municipality.id),
  ]);
  const population = indicators.get("populacao");
  const metro = municipality.regionMemberships.find(
    (membership) => membership.region.kind === "REGIAO_METROPOLITANA",
  );

  return (
    <header className="mb-5">
      <Breadcrumbs
        items={[
          { label: "Atlas SP", href: "/dashboard" },
          { label: "Cidades", href: "/cidades" },
          { label: municipality.mesoName ?? "Região", href: "/regioes" },
          { label: municipality.name },
        ]}
        className="mb-3"
      />

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="headline text-[clamp(1.75rem,4vw,2.6rem)]">
            {municipality.name}
            <span className="ml-2 align-middle font-sans text-[0.42em] font-medium uppercase tracking-[0.14em] text-[var(--fg-subtle)]">
              São Paulo
            </span>
          </h1>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-[var(--fg-muted)]">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3" aria-hidden />
              {municipality.microName} · {municipality.mesoName}
            </span>
            {population?.value ? (
              <span className="inline-flex items-center gap-1.5">
                <Users className="size-3" aria-hidden />
                <span className="tnum">{formatNumber(population.value)}</span> habitantes
                {population.isDemo ? (
                  <span className="font-mono text-[9px] uppercase text-[var(--signal)]">demo</span>
                ) : null}
              </span>
            ) : null}
            {municipality.areaKm2 ? (
              <span className="tnum">{formatNumber(municipality.areaKm2, 1)} km²</span>
            ) : null}
            <span className="font-mono text-[11px]" title="Código IBGE">
              IBGE {municipality.ibgeCode}
            </span>
            {municipality.ddd ? <span className="font-mono text-[11px]">DDD {municipality.ddd}</span> : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {metro ? (
              <Link href={`/regiao/${metro.region.slug}`}>
                <Badge tone="accent">{metro.region.name}</Badge>
              </Link>
            ) : null}
            {municipality.isCapital ? <Badge tone="signal">Capital do Estado</Badge> : null}
            <Badge tone="outline">
              {neighbors.length} município{neighbors.length === 1 ? "" : "s"} limítrofe
              {neighbors.length === 1 ? "" : "s"}
            </Badge>
            {municipality._count.radarSignals > 0 ? (
              <Link href={`/cidade/${municipality.slug}?aba=radar`}>
                <Badge tone="signal">{municipality._count.radarSignals} no Radar</Badge>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SaveCityButton municipalityId={municipality.id} name={municipality.name} />
          <Link
            href={`/comparar?cidades=${municipality.slug}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-[var(--radius-sm)] border px-3 text-[13px] font-medium transition-colors hover:bg-[var(--bg-inset)]"
          >
            Comparar
          </Link>
        </div>
      </div>

      {neighbors.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t pt-3">
          <span className="eyebrow mr-1">Faz divisa com</span>
          {neighbors.slice(0, 10).map((entry) => (
            <Link
              key={entry.municipality.slug}
              href={`/cidade/${entry.municipality.slug}`}
              className="rounded-[var(--radius-xs)] px-1.5 py-0.5 text-[11.5px] text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-inset)] hover:text-[var(--fg)]"
              title={`${entry.borderKm?.toFixed(0) ?? "—"} km de fronteira`}
            >
              {entry.municipality.name}
            </Link>
          ))}
          {neighbors.length > 10 ? (
            <Link
              href={`/cidade/${municipality.slug}?aba=vizinhos`}
              className="text-[11.5px] font-medium text-[var(--accent)] hover:underline"
            >
              +{neighbors.length - 10}
            </Link>
          ) : null}
        </div>
      ) : (
        <p className="mt-4 border-t pt-3 text-[12px] text-[var(--fg-muted)]">
          Não faz fronteira terrestre com nenhum outro município.
        </p>
      )}
    </header>
  );
}
