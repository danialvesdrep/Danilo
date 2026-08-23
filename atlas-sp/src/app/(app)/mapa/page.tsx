import type { Metadata } from "next";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { StateMapPanel } from "@/components/map/state-map-panel";

export const metadata: Metadata = {
  title: "Mapa do Estado de São Paulo",
  description:
    "Mapa temático dos 645 municípios paulistas: PIB, população, densidade, emprego, arrecadação, investimentos e atividade no Radar.",
};

export default function MapPage() {
  return (
    <>
      <PageHeader
        eyebrow="Território"
        title="Mapa do Estado"
        description="Os 645 municípios paulistas sobre a malha do IBGE. Troque a métrica para reler o Estado por outro recorte; passe o cursor para o retrato de cada cidade e clique para abrir o perfil."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Mapa" }]}
      />

      <Card className="overflow-hidden">
        <StateMapPanel height={680} initialMetric="pib" />
      </Card>

      <Card className="mt-6">
        <CardHeader
          eyebrow="Como ler"
          title="Sobre este mapa"
          description="Escolhas de representação que afetam a leitura."
        />
        <CardBody className="grid gap-5 text-[12.5px] leading-relaxed text-[var(--fg-muted)] md:grid-cols-3">
          <div>
            <p className="mb-1 font-medium text-[var(--fg)]">Cores por quintil</p>
            <p>
              As faixas de cor seguem a distribuição real dos dados, não intervalos fixos. Cada
              degrau contém aproximadamente o mesmo número de municípios, o que evita que poucos
              valores extremos achatem o resto do Estado em uma cor só.
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium text-[var(--fg)]">Municípios sem série</p>
            <p>
              Aparecem no tom mais claro, sem cor de dado. Ausência de cor significa ausência de
              dado carregado — não valor baixo.
            </p>
          </div>
          <div>
            <p className="mb-1 font-medium text-[var(--fg)]">Geometria</p>
            <p>
              Malha Municipal Digital do IBGE, simplificada pelo Atlas SP para leitura em escala
              estadual. Ao abrir uma cidade, a geometria em resolução completa é carregada sob
              demanda.
            </p>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
