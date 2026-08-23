import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { AuthForm, Field } from "@/components/auth/form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Acesse sua conta do Atlas SP.",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <Card>
      <CardBody>
        <h1 className="headline text-[22px]">Entrar</h1>
        <p className="mt-1.5 text-[13px] text-[var(--fg-muted)]">
          Acompanhe as cidades que importam para você.
        </p>

        <Suspense>
          <AuthForm action="/api/auth/login" submitLabel="Entrar" className="mt-6">
            <Field label="E-mail" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" />
            <Field label="Senha" name="password" type="password" autoComplete="current-password" />
          </AuthForm>
        </Suspense>

        <div className="mt-5 flex items-center justify-between text-[12.5px]">
          <Link href="/recuperar-senha" className="text-[var(--fg-muted)] hover:text-[var(--fg)]">
            Esqueci minha senha
          </Link>
          <Link href="/cadastro" className="font-medium text-[var(--accent)] hover:underline">
            Criar conta
          </Link>
        </div>
      </CardBody>
    </Card>
  );
}
