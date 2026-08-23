import type { Metadata } from "next";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { AtlasChat } from "@/components/ai/chat";
import { SAMPLE_QUESTIONS } from "@/server/ai/atlas-ai";

export const metadata: Metadata = {
  title: "Atlas AI",
  description:
    "Camada de inteligência contextual sobre o acervo do Atlas SP: pergunte sobre economia, política, setores, investimentos e relações territoriais entre os 645 municípios.",
};

type Search = Promise<{ q?: string }>;

export default async function AiPage({ searchParams }: { searchParams: Search }) {
  const { q } = await searchParams;

  return (
    <>
      <PageHeader
        eyebrow="Camada de inteligência"
        title="Atlas AI"
        description="Não é um assistente genérico. O Atlas AI consulta o grafo de entidades da plataforma — cidades, setores, empresas, indicadores, investimentos e movimentos — e responde separando fatos, interpretação e hipóteses, com a fonte de cada afirmação."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Atlas AI" }]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card>
          <CardBody>
            <AtlasChat suggestions={SAMPLE_QUESTIONS} initialQuestion={q} />
          </CardBody>
        </Card>

        <aside className="space-y-6">
          <Card>
            <CardHeader eyebrow="Contrato" title="Como o Atlas AI responde" dense />
            <CardBody dense>
              <ul className="space-y-3 text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                <li>
                  <strong className="font-semibold text-[var(--fg)]">Só o que está no acervo.</strong>{" "}
                  A resposta é construída a partir das evidências recuperadas do banco. O modelo
                  organiza e redige; ele não pode acrescentar fato algum.
                </li>
                <li>
                  <strong className="font-semibold text-[var(--fg)]">Fato, interpretação e hipótese
                  são separados.</strong>{" "}
                  Você sempre sabe o que é dado observável, o que é leitura derivada e o que é
                  possibilidade não confirmada.
                </li>
                <li>
                  <strong className="font-semibold text-[var(--fg)]">Toda afirmação factual tem
                  fonte.</strong>{" "}
                  Cada fato carrega o número da citação correspondente, com órgão, período de
                  referência e link quando existe.
                </li>
                <li>
                  <strong className="font-semibold text-[var(--fg)]">Sem evidência, sem resposta.</strong>{" "}
                  Quando os dados não bastam, a resposta é exatamente essa — nunca uma estimativa
                  apresentada como conclusão.
                </li>
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader eyebrow="Arquitetura" title="Agnóstica de provedor" dense />
            <CardBody dense>
              <p className="text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
                A camada de IA tem uma interface própria e três adaptadores: Anthropic, provedores
                compatíveis com a API da OpenAI e um provedor local ancorado nas evidências, que
                não faz chamada externa. Trocar de modelo é trocar uma variável de ambiente — o
                produto não fica preso a nenhum fornecedor. Se o provedor remoto falhar, a resposta
                cai automaticamente para o provedor local em vez de quebrar.
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </>
  );
}
