import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { AtlasChat } from "@/components/ai/chat";
import type { MunicipalityDetail } from "@/server/queries/municipality";

export function AiTab({ municipality }: { municipality: MunicipalityDetail }) {
  const suggestions = [
    `Como está a economia de ${municipality.name}?`,
    `Quais setores mais empregam em ${municipality.name}?`,
    `O que mudou na economia de ${municipality.name}?`,
    `Quais foram os principais acontecimentos políticos em ${municipality.name} nos últimos 30 dias?`,
    `Quais cidades vizinhas de ${municipality.name} podem ser afetadas por um investimento industrial?`,
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          eyebrow="Atlas AI"
          title={`Pergunte sobre ${municipality.name}`}
          description="A IA responde apenas com o que está no banco de conhecimento da plataforma, separando fatos, interpretação e hipóteses, e citando cada evidência."
        />
        <CardBody>
          <AtlasChat municipalityId={municipality.id} suggestions={suggestions} />
        </CardBody>
      </Card>
    </div>
  );
}
