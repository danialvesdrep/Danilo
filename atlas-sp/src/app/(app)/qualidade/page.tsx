import type { Metadata } from "next";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/shell/page-header";
import { getDataQuality } from "@/server/queries/state";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Qualidade dos dados",
  description: "Verificações que o Atlas SP roda continuamente sobre o próprio banco.",
};

export const revalidate = 300;

const TONE = { OK: "rise", ATENCAO: "signal", FALHA: "fall" } as const;

export default async function QualityPage() {
  const checks = await getDataQuality();
  return (
    <>
      <PageHeader
        eyebrow="Transparência"
        title="Qualidade dos dados"
        description="A plataforma se audita: cobertura da malha, proveniência das observações, atualidade das séries, resolução de entidades e integridade do Radar."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Qualidade" }]}
      />

      <Card>
        <CardHeader eyebrow="Verificações" title={`${checks.length} verificações registradas`} />
        <ul>
          {checks.map((check) => (
            <li key={check.key} className="border-b px-5 py-4 last:border-b-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONE[check.status as keyof typeof TONE] ?? "neutral"}>
                  {check.status.toLowerCase()}
                </Badge>
                <span className="text-[14px] font-medium">{check.name}</span>
              </div>
              <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                {check.description}
              </p>
              <p className="mt-1 text-[12px] text-[var(--fg)]">{check.detail}</p>
              <p className="mt-1 text-[11px] text-[var(--fg-subtle)]">
                {check.lastRunAt ? `Última execução em ${formatDateTime(check.lastRunAt)}` : "Sem execução registrada"}
              </p>
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
