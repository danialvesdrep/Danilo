import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardBody } from "@/components/ui/card";
import { AuthForm, Field } from "@/components/auth/form";
import { getCurrentUser } from "@/server/auth/session";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta no Atlas SP e comece a acompanhar os 645 municípios paulistas.",
  robots: { index: false, follow: false },
};

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/dashboard");

  return (
    <Card>
      <CardBody>
        <h1 className="headline text-[22px]">Criar conta</h1>
        <p className="mt-1.5 text-[13px] text-[var(--fg-muted)]">
          O plano Free dá acesso ao perfil dos 645 municípios, ao mapa e ao Radar do dia.
        </p>

        <Suspense>
          <AuthForm action="/api/auth/cadastro" submitLabel="Criar conta" className="mt-6">
            <Field label="Nome" name="name" autoComplete="name" placeholder="Como devemos chamar você" />
            <Field label="E-mail" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" />
            <Field
              label="Senha"
              name="password"
              type="password"
              autoComplete="new-password"
              hint="Mínimo de 10 caracteres, com letras e números."
            />
          </AuthForm>
        </Suspense>

        <p className="mt-4 text-[11.5px] leading-relaxed text-[var(--fg-subtle)]">
          Ao criar a conta você concorda com os{" "}
          <Link href="/termos" className="text-[var(--accent)] hover:underline">Termos de Uso</Link> e com
          a{" "}
          <Link href="/privacidade" className="text-[var(--accent)] hover:underline">
            Política de Privacidade
          </Link>
          . Coletamos apenas nome e e-mail.
        </p>

        <p className="mt-5 text-center text-[12.5px] text-[var(--fg-muted)]">
          Já tem conta?{" "}
          <Link href="/entrar" className="font-medium text-[var(--accent)] hover:underline">
            Entrar
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
