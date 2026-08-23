import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Regras de uso do Atlas SP e limites do serviço.",
};

const SECTIONS = [
  {
    title: "1. Objeto",
    body: "O Atlas SP fornece acesso a uma plataforma de inteligência territorial sobre os 645 municípios de São Paulo, incluindo dashboards, indicadores, mapas, Radar de movimentos, agregação de notícias e a camada Atlas AI. O serviço é oferecido no estado em que se encontra, com aprimoramentos contínuos.",
  },
  {
    title: "2. Conta e credenciais",
    body: "O usuário é responsável pela segurança de sua senha e por toda atividade realizada na conta. Compartilhamento de credenciais entre pessoas em plano individual não é permitido — para uso por equipe, o plano Enterprise oferece múltiplos usuários.",
  },
  {
    title: "3. Uso permitido",
    body: "É permitido consultar, exportar e utilizar os dados apresentados para análise, pesquisa, jornalismo e uso profissional, respeitados os limites do plano contratado e citando o Atlas SP quando for o caso. É vedado usar a plataforma para redistribuir massivamente o acervo, treinar modelos de terceiros sem autorização por escrito ou tentar contornar limites técnicos de acesso.",
  },
  {
    title: "4. Índices proprietários",
    body: "Os índices e scores calculados pela plataforma (Radar Score, Economic Momentum, Investment Momentum, Employment Momentum, Political Activity e News Momentum) são construções do Atlas SP a partir dos dados disponíveis e não constituem indicadores oficiais. Não devem ser citados como medida oficial de conjuntura ou desempenho.",
  },
  {
    title: "5. Fontes externas",
    body: "Onde a plataforma exibe dados de terceiros, cabem os termos e a licença da fonte original, indicados junto ao dado. O Atlas SP não responde pelo conteúdo integral de fontes externas linkadas.",
  },
  {
    title: "6. Assinatura, upgrade e cancelamento",
    body: "As assinaturas Pro têm faturamento mensal ou anual e podem ser canceladas a qualquer momento pelo próprio usuário. O acesso permanece disponível até o fim do período já pago. Upgrades passam a valer imediatamente com pró-rata; downgrades passam a valer no ciclo seguinte.",
  },
  {
    title: "7. Limitação de responsabilidade",
    body: "As decisões tomadas com base nas informações da plataforma são de responsabilidade exclusiva do usuário. O Atlas SP se compromete com a qualidade dos dados e a transparência da proveniência, mas não é responsável por perdas decorrentes de decisões baseadas em índices proprietários ou análises da IA.",
  },
  {
    title: "8. Suspensão",
    body: "Contas envolvidas em tentativas de fraude, uso abusivo, redistribuição massiva ou contorno de limites técnicos podem ser suspensas sem aviso prévio. Reembolsos proporcionais são analisados caso a caso.",
  },
  {
    title: "9. Foro",
    body: "Estes termos são regidos pelas leis do Brasil. Fica eleito o foro da Comarca da Capital do Estado de São Paulo para dirimir controvérsias.",
  },
];

export default function TermsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Termos de Uso"
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Termos" }]}
      />
      <Card>
        <CardBody className="space-y-5">
          <p className="text-[12px] font-mono uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
            Última revisão: janeiro de 2026
          </p>
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-[15px] font-semibold">{section.title}</h2>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[var(--fg-muted)]">{section.body}</p>
            </section>
          ))}
        </CardBody>
      </Card>
    </>
  );
}
