import { Suspense } from "react";
import type { Metadata } from "next";
import { Card, CardBody } from "@/components/ui/card";
import { AuthForm, Field } from "@/components/auth/form";

export const metadata: Metadata = {
  title: "Redefinir senha",
  robots: { index: false, follow: false },
};

type Search = Promise<{ token?: string }>;

export default async function ResetPage({ searchParams }: { searchParams: Search }) {
  const { token } = await searchParams;

  return (
    <Card>
      <CardBody>
        <h1 className="headline text-[22px]">Definir nova senha</h1>
        <p className="mt-1.5 text-[13px] text-[var(--fg-muted)]">
          Escolha uma senha nova para a sua conta.
        </p>

        <Suspense>
          <AuthForm action="/api/auth/redefinir" submitLabel="Salvar nova senha" className="mt-6">
            <input type="hidden" name="token" value={token ?? ""} />
            <Field
              label="Nova senha"
              name="password"
              type="password"
              autoComplete="new-password"
              hint="Mínimo de 10 caracteres, com letras e números."
            />
          </AuthForm>
        </Suspense>
      </CardBody>
    </Card>
  );
}
