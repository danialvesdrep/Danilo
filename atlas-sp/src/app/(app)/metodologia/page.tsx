import type { Metadata } from "next";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { INDICES, INDEX_DISCLAIMER } from "@/lib/indices";
import { SCORE_METHODOLOGY, SCORE_WEIGHTS } from "@/server/radar/scoring";

export const metadata: Metadata = {
  title: "Metodologia",
  description: "Como o Atlas SP calcula seus índices proprietários, o score do Radar e os agregados estaduais.",
};

export default function MethodologyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Metodologia"
        title="Como o Atlas SP calcula o que calcula"
        description="Todo cálculo próprio da plataforma é declarado, ponderado por regras auditáveis e apresentado como índice — nunca como indicador oficial."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Metodologia" }]}
      />

      <Card className="mb-6">
        <CardHeader eyebrow="Contrato" title="O que a plataforma faz — e o que não faz" />
        <CardBody className="grid gap-5 md:grid-cols-3 text-[13px] leading-relaxed">
          <div>
            <p className="font-medium">Não inventamos números.</p>
            <p className="mt-1 text-[var(--fg-muted)]">
              Cada valor mostrado vem acompanhado da fonte, do período de referência e da
              metodologia da fonte. Onde não existe série, a interface diz isso.
            </p>
          </div>
          <div>
            <p className="font-medium">Índices são proprietários.</p>
            <p className="mt-1 text-[var(--fg-muted)]">
              Momentum econômico, momento político, atenção editorial e o score do Radar são construções
              do Atlas SP a partir dos dados disponíveis. Não são estatísticas oficiais e cada um mostra
              como foi composto.
            </p>
          </div>
          <div>
            <p className="font-medium">Fato, interpretação e hipótese são separados.</p>
            <p className="mt-1 text-[var(--fg-muted)]">
              Onde a plataforma interpreta os dados — panorama municipal, "por que isso importa?", respostas
              da IA — a redação distingue explicitamente o que a fonte sustenta do que é leitura derivada.
            </p>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-6">
        <CardHeader
          eyebrow="Radar"
          title="Como o score é montado"
          description="Índice proprietário composto por cinco eixos, ponderados para ordenar a atenção do usuário."
        />
        <CardBody>
          <p className="whitespace-pre-line text-[13px] leading-relaxed text-[var(--fg-muted)]">
            {SCORE_METHODOLOGY}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-5">
            {Object.entries(SCORE_WEIGHTS).map(([key, weight]) => (
              <div key={key} className="rounded-[var(--radius-sm)] border px-3 py-2">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.06em] text-[var(--fg-subtle)]">
                  {key}
                </p>
                <p className="tnum mt-1 text-[16px] font-semibold">{Math.round(weight * 100)}%</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      <div className="space-y-6">
        {INDICES.map((index) => (
          <Card key={index.slug} id={index.slug} className="scroll-mt-20">
            <CardHeader eyebrow="Índice proprietário" title={index.name} description={index.description} />
            <CardBody className="space-y-4">
              <p className="text-[13px] leading-relaxed">{index.methodology}</p>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {index.components.map((component) => (
                  <div key={component.signalKey} className="rounded-[var(--radius-sm)] border px-3 py-2">
                    <p className="text-[12px] font-medium">{component.label}</p>
                    <p className="tnum mt-1 text-[15px] font-semibold">
                      {Math.round(component.weight * 100)}%
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 rounded-[var(--radius-md)] border border-dashed px-3 py-2.5">
                <Badge tone="signal">disclaimer</Badge>
                <p className="text-[11.5px] leading-relaxed text-[var(--fg-muted)]">{INDEX_DISCLAIMER}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </>
  );
}
