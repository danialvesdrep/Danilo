import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";

export const metadata: Metadata = { title: "Política de Cookies" };

const COOKIES = [
  {
    name: "atlas_session",
    purpose: "Autenticação. Guarda o token de sessão assinado.",
    duration: "30 dias (configurável)",
    category: "Essencial",
  },
  {
    name: "atlas-sp-theme",
    purpose: "Preferência de tema (claro, escuro ou sistema).",
    duration: "Persistente",
    category: "Preferência",
  },
];

export default function CookiesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Política de Cookies"
        description="Cookies usados pelo Atlas SP, sua função e a base legal correspondente."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Cookies" }]}
      />
      <Card>
        <CardBody>
          <p className="text-[13.5px] leading-relaxed text-[var(--fg-muted)]">
            Usamos apenas cookies necessários ao funcionamento do produto e uma preferência local
            de tema. Não usamos cookies de rastreamento entre sites ou de publicidade.
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left">
              <thead>
                <tr className="border-b">
                  <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Cookie</th>
                  <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Finalidade</th>
                  <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Duração</th>
                  <th className="px-3 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Categoria</th>
                </tr>
              </thead>
              <tbody>
                {COOKIES.map((cookie) => (
                  <tr key={cookie.name} className="border-b last:border-b-0">
                    <td className="px-3 py-2 font-mono text-[12px]">{cookie.name}</td>
                    <td className="px-3 py-2 text-[12.5px]">{cookie.purpose}</td>
                    <td className="px-3 py-2 text-[12px] text-[var(--fg-muted)]">{cookie.duration}</td>
                    <td className="px-3 py-2 text-[12px] text-[var(--fg-muted)]">{cookie.category}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
