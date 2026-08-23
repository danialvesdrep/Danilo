import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { getSectorMomentum } from "@/server/queries/state";
import { formatNumber } from "@/lib/format";

export const metadata: Metadata = {
  title: "Setores econômicos",
  description:
    "Os setores da economia paulista: presença nos 645 municípios, difusão de alta e queda e as cidades onde cada setor pesa mais.",
};

export const revalidate = 900;

export default async function SectorsPage() {
  const momentum = await getSectorMomentum();
  const byMacro = new Map<string, typeof momentum.all>();
  for (const sector of momentum.all) {
    const list = byMacro.get(sector!.macroSector) ?? [];
    list.push(sector);
    byMacro.set(sector!.macroSector, list);
  }

  const MACRO_LABEL: Record<string, string> = {
    INDUSTRIA: "Indústria",
    SERVICOS: "Serviços",
    COMERCIO: "Comércio",
    AGROPECUARIA: "Agropecuária",
    PUBLICO: "Setor público",
  };

  return (
    <>
      <PageHeader
        eyebrow="Economia"
        title="Setores"
        description="Cada setor visto por onde ele existe: em quantos municípios está presente, onde avança e onde recua."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Setores" }]}
      />

      <div className="space-y-6">
        {[...byMacro.entries()].map(([macro, sectors]) => (
          <Card key={macro}>
            <CardHeader eyebrow="Grande atividade" title={MACRO_LABEL[macro] ?? macro} />
            <div className="grid gap-px bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-3">
              {sectors.map((sector) => (
                <Link
                  key={sector!.slug}
                  href={`/setores/${sector!.slug}`}
                  className="bg-[var(--bg-raised)] px-4 py-3.5 transition-colors hover:bg-[var(--bg-inset)]"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="size-2.5 shrink-0 rounded-sm"
                      style={{ backgroundColor: sector!.color ?? "var(--accent)" }}
                      aria-hidden
                    />
                    <span className="text-[13.5px] font-medium">{sector!.name}</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-3 text-[11.5px] text-[var(--fg-muted)]">
                    <span className="tnum">{sector!.total} municípios</span>
                    <span className="tnum text-rise">↑ {sector!.rising}</span>
                    <span className="tnum text-fall">↓ {sector!.falling}</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-[var(--bg-inset)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, Math.abs(sector!.diffusion))}%`,
                        backgroundColor: sector!.diffusion >= 0 ? "var(--rise)" : "var(--fall)",
                      }}
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[var(--fg-subtle)]">
                    Difusão {sector!.diffusion > 0 ? "+" : ""}
                    {formatNumber(sector!.diffusion, 0)}
                  </p>
                </Link>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}
