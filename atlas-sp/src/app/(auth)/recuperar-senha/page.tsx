import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { AuthForm, Field } from "@/components/auth/form";

export const metadata: Metadata = {
  title: "Recuperar senha",
  robots: { index: false, follow: false },
};

export default function RecoverPage() {
  return (
    <Card>
      <CardBody>
        <h1 className="headline text-[22px]">Recuperar senha</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--fg-muted)]">
          Informe o e-mail da conta. Se ele existir no Atlas SP, enviaremos um link de redefinição
          válido por uma hora.
        </p>

        <Suspense>
          <AuthForm
            action="/api/auth/recuperar"
            submitLabel="Enviar link"
            className="mt-6"
            successMessage="Se houver uma conta com esse e-mail, o link de redefinição foi gerado. Verifique sua caixa de entrada."
          >
            <Field label="E-mail" name="email" type="email" autoComplete="email" />
          </AuthForm>
        </Suspense>

        <p className="mt-5 text-center text-[12.5px]">
          <Link href="/entrar" className="text-[var(--fg-muted)] hover:text-[var(--fg)]">
            Voltar para o login
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
