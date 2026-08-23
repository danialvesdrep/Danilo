import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/shell/page-header";
import { getCurrentUser } from "@/server/auth/session";
import { prisma } from "@/server/db/prisma";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = {
  title: "Configurações",
  robots: { index: false, follow: false },
};

/** Painel de conta: perfil, sessões ativas, saída. */
export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?proximo=/configuracoes");

  const [saved, alerts, sessions] = await Promise.all([
    prisma.savedMunicipality.count({ where: { userId: user.id } }),
    prisma.alert.count({ where: { userId: user.id, active: true } }),
    prisma.session.findMany({
      where: { userId: user.id },
      orderBy: { lastSeenAt: "desc" },
      select: { id: true, userAgent: true, lastSeenAt: true, expiresAt: true, createdAt: true },
    }),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Conta"
        title="Configurações"
        description="Dados da conta, uso do plano e sessões ativas."
        breadcrumbs={[{ label: "Atlas SP", href: "/dashboard" }, { label: "Configurações" }]}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader eyebrow="Perfil" title="Seus dados" />
          <CardBody className="space-y-3 text-[13px]">
            <div>
              <p className="text-[11.5px] uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Nome</p>
              <p className="mt-0.5 font-medium">{user.name ?? "—"}</p>
            </div>
            <div>
              <p className="text-[11.5px] uppercase tracking-[0.05em] text-[var(--fg-subtle)]">E-mail</p>
              <p className="mt-0.5 font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-[11.5px] uppercase tracking-[0.05em] text-[var(--fg-subtle)]">Plano</p>
              <p className="mt-0.5 font-medium">
                {user.planName}{" "}
                <Link href="/planos" className="ml-2 text-[12px] font-medium text-[var(--accent)] hover:underline">
                  Ver planos
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader eyebrow="Uso" title="Como você tem usado" />
          <CardBody className="grid grid-cols-2 gap-4">
            <div>
              <p className="metric-value text-[22px] font-semibold">{saved}</p>
              <p className="mt-1 text-[11.5px] uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                cidades salvas
              </p>
            </div>
            <div>
              <p className="metric-value text-[22px] font-semibold">{alerts}</p>
              <p className="mt-1 text-[11.5px] uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                alertas ativos
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader eyebrow="Segurança" title="Sessões ativas" description="Cada sessão corresponde a um navegador que entrou nesta conta." />
        <ul>
          {sessions.map((session) => (
            <li key={session.id} className="border-b px-5 py-2.5 last:border-b-0">
              <p className="truncate text-[12.5px] font-medium">{session.userAgent ?? "Navegador desconhecido"}</p>
              <p className="mt-0.5 text-[11.5px] text-[var(--fg-subtle)]">
                Ativo em {formatDateTime(session.lastSeenAt)} · Iniciado em {formatDateTime(session.createdAt)}
              </p>
            </li>
          ))}
        </ul>
        <CardBody className="border-t">
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="inline-flex h-9 items-center rounded-[var(--radius-sm)] border px-3.5 text-[13px] font-medium transition-colors hover:bg-[var(--bg-inset)]"
            >
              Sair de todas as sessões
            </button>
          </form>
        </CardBody>
      </Card>
    </>
  );
}
