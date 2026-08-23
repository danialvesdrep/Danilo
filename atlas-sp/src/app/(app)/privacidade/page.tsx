import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como o Atlas SP trata dados pessoais, em conformidade com a LGPD.",
};

const SECTIONS: Array<{ title: string; body: React.ReactNode }> = [
  {
    title: "1. Quem somos",
    body: (
      <p>
        O <strong>Atlas SP</strong> é uma plataforma de inteligência territorial, econômica e política
        sobre os 645 municípios do Estado de São Paulo. Esta política descreve como tratamos dados
        pessoais e observa os princípios da <strong>Lei Geral de Proteção de Dados</strong>{" "}
        (Lei 13.709/2018).
      </p>
    ),
  },
  {
    title: "2. Dados que coletamos",
    body: (
      <ul>
        <li><strong>Cadastro:</strong> nome e e-mail informados pelo próprio usuário.</li>
        <li><strong>Uso da plataforma:</strong> cidades salvas, alertas configurados, preferências de
          exibição e histórico de perguntas feitas ao Atlas AI.</li>
        <li><strong>Sessão e segurança:</strong> hash da sessão, hash de agente e um hash do endereço
          IP — o IP em claro não é armazenado.</li>
        <li><strong>Analytics:</strong> eventos de navegação agregados para melhorar o produto,
          sem identificação individual quando o usuário não estiver autenticado.</li>
      </ul>
    ),
  },
  {
    title: "3. Dados que não coletamos",
    body: (
      <p>
        Não coletamos endereço, telefone, documento, geolocalização precisa, dados sensíveis
        (origem racial, saúde, religião, orientação sexual, etc.) nem qualquer categoria de dado
        pessoal desnecessária para o funcionamento do serviço.
      </p>
    ),
  },
  {
    title: "4. Pessoas públicas retratadas na plataforma",
    body: (
      <p>
        As páginas de pessoa incluem apenas informação pública de natureza institucional — cargo,
        mandato, filiação partidária, atividade legislativa e perfis oficiais em redes sociais. Não
        exibimos endereço, contato privado ou avaliação de conduta. Pedidos de correção ou remoção
        podem ser dirigidos ao Encarregado (DPO) pelo e-mail{" "}
        <a href="mailto:dpo@atlassp.com.br">dpo@atlassp.com.br</a>.
      </p>
    ),
  },
  {
    title: "5. Bases legais",
    body: (
      <ul>
        <li><strong>Execução de contrato</strong> (art. 7º, V): cadastro, autenticação e prestação do serviço.</li>
        <li><strong>Legítimo interesse</strong> (art. 7º, IX): analytics agregado, prevenção a fraudes e segurança.</li>
        <li><strong>Cumprimento de obrigação legal</strong> (art. 7º, II): logs de auditoria.</li>
        <li><strong>Consentimento</strong> (art. 7º, I): cookies não essenciais, quando aplicável.</li>
      </ul>
    ),
  },
  {
    title: "6. Compartilhamento",
    body: (
      <p>
        Não vendemos dados pessoais. Compartilhamos apenas com operadores necessários ao serviço —
        hospedagem, envio de e-mail transacional e provedor de pagamento — que atuam sob contrato de
        tratamento de dados e apenas para as finalidades descritas.
      </p>
    ),
  },
  {
    title: "7. Retenção",
    body: (
      <p>
        Mantemos os dados enquanto a conta estiver ativa. Após a exclusão da conta, os dados são
        removidos em até 30 dias, exceto quando a retenção for exigida por lei (por exemplo, logs de
        auditoria por 6 meses e faturas por 5 anos).
      </p>
    ),
  },
  {
    title: "8. Seus direitos",
    body: (
      <p>
        Você pode confirmar a existência do tratamento, acessar, corrigir, anonimizar, portar,
        eliminar seus dados, revogar consentimento e se opor ao tratamento. Basta escrever para{" "}
        <a href="mailto:dpo@atlassp.com.br">dpo@atlassp.com.br</a>. Respondemos em até 15 dias.
      </p>
    ),
  },
  {
    title: "9. Encarregado (DPO)",
    body: (
      <p>
        <strong>E-mail:</strong> dpo@atlassp.com.br. Você também pode acionar a Autoridade Nacional
        de Proteção de Dados diretamente pelo site <a href="https://www.gov.br/anpd/" target="_blank" rel="noopener noreferrer">gov.br/anpd</a>.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Política de Privacidade"
        description="Como o Atlas SP trata dados pessoais, em conformidade com a LGPD."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Privacidade" }]}
      />
      <Card>
        <CardBody className="space-y-6">
          <p className="text-[12px] font-mono uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
            Última revisão: janeiro de 2026
          </p>
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-[15px] font-semibold">{section.title}</h2>
              <div className="mt-2 space-y-2 text-[13.5px] leading-relaxed text-[var(--fg-muted)] [&_a]:text-[var(--accent)] [&_a]:underline [&_strong]:font-semibold [&_strong]:text-[var(--fg)] [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1">
                {section.body}
              </div>
            </section>
          ))}
        </CardBody>
      </Card>
    </>
  );
}
