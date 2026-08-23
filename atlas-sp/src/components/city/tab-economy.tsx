import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Metric, ShareBar, NoMunicipalSeries } from "@/components/data/metric";
import { DemoNotice } from "@/components/data/provenance";
import { SeriesChart } from "@/components/charts/series";
import { EmptyState } from "@/components/ui/empty";
import { getIndicators, getMacroComposition } from "@/server/queries/municipality";
import { formatCurrencyScaled, formatPercent } from "@/lib/format";
import type { MunicipalityDetail } from "@/server/queries/municipality";

const PANELS: Array<{ title: string; eyebrow: string; slugs: string[]; description: string }> = [
  {
    eyebrow: "Produto",
    title: "PIB e valor adicionado",
    slugs: ["pib", "pib-per-capita", "vab-industria", "vab-servicos", "vab-agropecuaria", "vab-administracao"],
    description: "Produto municipal a preços correntes e a decomposição por atividade econômica.",
  },
  {
    eyebrow: "Trabalho e renda",
    title: "Emprego formal",
    slugs: ["emprego-formal", "saldo-empregos", "salario-medio"],
    description: "Estoque de vínculos, saldo do período e remuneração média.",
  },
  {
    eyebrow: "Empresas",
    title: "Tecido empresarial",
    slugs: ["empresas-ativas", "abertura-empresas"],
    description: "Estabelecimentos ativos e movimento líquido de abertura.",
  },
  {
    eyebrow: "Finanças públicas",
    title: "Receita, despesa e investimento",
    slugs: ["receita-municipal", "despesa-municipal", "investimento-publico"],
    description: "Execução orçamentária declarada pela prefeitura.",
  },
  {
    eyebrow: "Comércio exterior",
    title: "Exportações",
    slugs: ["exportacoes"],
    description: "Valor exportado pelo município de origem da mercadoria.",
  },
];

/** Painel econômico completo do município, com séries históricas. */
export async function EconomyTab({ municipality }: { municipality: MunicipalityDetail }) {
  const [indicators, macro] = await Promise.all([
    getIndicators(municipality.id),
    getMacroComposition(municipality.id),
  ]);
  const bySlug = new Map(indicators.map((indicator) => [indicator.slug, indicator]));
  const anyDemo = indicators.some((indicator) => indicator.isDemo);
  const gdp = bySlug.get("pib");
  const employment = bySlug.get("emprego-formal");

  return (
    <div className="space-y-6">
      {anyDemo ? <DemoNotice /> : null}

      {macro.available ? (
        <Card>
          <CardHeader
            eyebrow="Perfil econômico"
            title={`A economia de ${municipality.name}`}
            description={`Valor adicionado bruto total de ${formatCurrencyScaled(macro.total)}${
              macro.referenceLabel ? ` em ${macro.referenceLabel}` : ""
            }, distribuído entre as grandes atividades.`}
          />
          <CardBody>
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
              <div className="grid gap-5 sm:grid-cols-3 lg:grid-cols-1">
                <Metric
                  label="PIB"
                  value={gdp?.value ?? null}
                  unit="BRL"
                  size="lg"
                  delta={gdp?.deltaPct}
                  deltaLabel="a/a"
                  referenceLabel={gdp?.referenceLabel}
                  provenance={gdp?.provenance}
                  isDemo={gdp?.isDemo}
                />
                <Metric
                  label="PIB per capita"
                  value={bySlug.get("pib-per-capita")?.value ?? null}
                  unit="BRL_UNIT"
                  size="lg"
                  delta={bySlug.get("pib-per-capita")?.deltaPct}
                  referenceLabel={bySlug.get("pib-per-capita")?.referenceLabel}
                  provenance={bySlug.get("pib-per-capita")?.provenance}
                  isDemo={bySlug.get("pib-per-capita")?.isDemo}
                />
                <Metric
                  label="Empregos formais"
                  value={employment?.value ?? null}
                  unit="vinculos"
                  size="lg"
                  delta={employment?.deltaPct}
                  referenceLabel={employment?.referenceLabel}
                  provenance={employment?.provenance}
                  isDemo={employment?.isDemo}
                />
              </div>

              <div>
                <p className="eyebrow mb-3">Composição do valor adicionado</p>
                <ShareBar
                  height={12}
                  items={macro.parts.map((part) => ({
                    label: part.label,
                    value: part.sharePct,
                    color: part.color,
                  }))}
                />
                <ul className="mt-4 space-y-3">
                  {macro.parts.map((part) => (
                    <li key={part.key}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="flex items-center gap-2 text-[13px]">
                          <span
                            className="size-2 rounded-sm"
                            style={{ backgroundColor: part.color }}
                            aria-hidden
                          />
                          {part.label}
                        </span>
                        <span className="flex items-baseline gap-2">
                          <span className="tnum text-[12px] text-[var(--fg-muted)]">
                            {formatCurrencyScaled(part.value)}
                          </span>
                          <span className="tnum w-14 text-right text-[13px] font-semibold">
                            {formatPercent(part.sharePct, 1)}
                          </span>
                        </span>
                      </div>
                      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--bg-inset)]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${part.sharePct}%`, backgroundColor: part.color }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {gdp && gdp.history.length > 1 ? (
          <Card>
            <CardHeader eyebrow="Série histórica" title="PIB municipal" dense />
            <CardBody dense>
              <SeriesChart data={gdp.history} unit="BRL" height={200} />
            </CardBody>
          </Card>
        ) : null}
        {employment && employment.history.length > 1 ? (
          <Card>
            <CardHeader eyebrow="Série histórica" title="Empregos formais" dense />
            <CardBody dense>
              <SeriesChart data={employment.history} unit="vinculos" height={200} type="line" />
            </CardBody>
          </Card>
        ) : null}
      </div>

      {PANELS.map((panel) => {
        const rows = panel.slugs.map((slug) => bySlug.get(slug)).filter(Boolean);
        if (!rows.length) return null;
        const missing = rows.filter((row) => row!.value === null);
        const present = rows.filter((row) => row!.value !== null);

        return (
          <Card key={panel.title}>
            <CardHeader eyebrow={panel.eyebrow} title={panel.title} description={panel.description} />
            {present.length ? (
              <CardBody className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {present.map((row) => (
                  <div key={row!.slug}>
                    <Metric
                      label={row!.shortName}
                      value={row!.value}
                      unit={row!.unit}
                      precision={row!.precision}
                      delta={row!.deltaPct}
                      deltaLabel="a/a"
                      referenceLabel={row!.referenceLabel}
                      provenance={row!.provenance}
                      isDemo={row!.isDemo}
                    />
                    {row!.history.length > 2 ? (
                      <div className="mt-2">
                        <SeriesChart
                          data={row!.history}
                          unit={row!.unit}
                          precision={row!.precision}
                          height={64}
                          type="area"
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </CardBody>
            ) : (
              <EmptyState
                title="Dados não disponíveis"
                description="Nenhuma série deste bloco foi ingerida para o município."
              />
            )}
            {missing.length ? (
              <div className="border-t px-5 py-3">
                <p className="text-[11.5px] text-[var(--fg-subtle)]">
                  Sem série carregada: {missing.map((row) => row!.shortName).join(", ")}.
                </p>
              </div>
            ) : null}
          </Card>
        );
      })}

      <Card>
        <CardHeader
          eyebrow="Cobertura"
          title="Preços e conjuntura"
          description="Indicadores que não existem no recorte municipal aparecem com o contexto disponível, sempre identificado."
        />
        <CardBody className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {indicators
            .filter((indicator) => !indicator.municipalLevel)
            .map((indicator) => (
              <NoMunicipalSeries
                key={indicator.slug}
                indicator={indicator.name}
                contextScope="recorte estadual"
              />
            ))}
        </CardBody>
      </Card>
    </div>
  );
}
