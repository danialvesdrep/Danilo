import "server-only";
import type { PlanTier } from "@prisma/client";

/**
 * Camada de cobrança.
 *
 * Nenhuma cobrança é simulada. Sem provedor configurado, o checkout devolve um
 * estado explícito de "não configurado" — a interface diz o que falta ligar em
 * vez de fingir um fluxo de pagamento que não existe.
 *
 * A interface é a mesma para Stripe e Mercado Pago; adicionar um terceiro
 * provedor é implementar `BillingProvider` e registrá-lo em `createBilling`.
 */

export type CheckoutRequest = {
  userId: string;
  email: string;
  planTier: PlanTier;
  interval: "monthly" | "yearly";
  successUrl: string;
  cancelUrl: string;
};

export type CheckoutResult =
  | { status: "redirect"; url: string; providerSessionId: string }
  | { status: "nao_configurado"; provider: string; missing: string[]; message: string }
  | { status: "erro"; message: string };

export type PortalResult =
  | { status: "redirect"; url: string }
  | { status: "nao_configurado"; message: string }
  | { status: "erro"; message: string };

export type WebhookEvent = {
  type: string;
  providerCustomerId?: string;
  providerSubId?: string;
  status?: "ACTIVE" | "PAST_DUE" | "CANCELED" | "TRIALING" | "INCOMPLETE";
  currentPeriodEnd?: Date;
  planTier?: PlanTier;
};

export interface BillingProvider {
  readonly name: string;
  readonly configured: boolean;
  createCheckout(request: CheckoutRequest): Promise<CheckoutResult>;
  createPortalSession(customerId: string, returnUrl: string): Promise<PortalResult>;
  /** Verifica a assinatura do webhook e traduz o evento para o formato interno. */
  parseWebhook(rawBody: string, signature: string | null): Promise<WebhookEvent | null>;
}

/** Provedor inativo: estado honesto quando nada foi configurado. */
class UnconfiguredProvider implements BillingProvider {
  readonly name = "none";
  readonly configured = false;

  constructor(private readonly missing: string[] = ["BILLING_PROVIDER"]) {}

  async createCheckout(): Promise<CheckoutResult> {
    return {
      status: "nao_configurado",
      provider: this.name,
      missing: this.missing,
      message:
        "A cobrança ainda não está conectada neste ambiente. A arquitetura de assinatura está pronta — faltam apenas as credenciais do provedor de pagamento.",
    };
  }

  async createPortalSession(): Promise<PortalResult> {
    return {
      status: "nao_configurado",
      message: "Gestão de assinatura indisponível: nenhum provedor de pagamento configurado.",
    };
  }

  async parseWebhook(): Promise<WebhookEvent | null> {
    return null;
  }
}

class StripeProvider implements BillingProvider {
  readonly name = "stripe";
  readonly configured = true;

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string | undefined,
  ) {}

  private async call(path: string, body: URLSearchParams) {
    const response = await fetch(`https://api.stripe.com/v1/${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.secretKey}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body,
    });
    if (!response.ok) {
      const detail = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new Error(detail.error?.message ?? `Stripe respondeu ${response.status}`);
    }
    return response.json() as Promise<Record<string, unknown>>;
  }

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const { prisma } = await import("@/server/db/prisma");
    const plan = await prisma.plan.findUnique({ where: { tier: request.planTier } });
    const priceId =
      request.interval === "yearly" ? plan?.stripePriceIdYearly : plan?.stripePriceIdMonthly;

    if (!priceId) {
      return {
        status: "nao_configurado",
        provider: this.name,
        missing: [`Plan.stripePriceId${request.interval === "yearly" ? "Yearly" : "Monthly"}`],
        message:
          "O plano ainda não tem preço cadastrado no Stripe. Cadastre o price ID no painel administrativo.",
      };
    }

    try {
      const body = new URLSearchParams({
        mode: "subscription",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        customer_email: request.email,
        client_reference_id: request.userId,
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        locale: "pt-BR",
      });
      if (plan?.trialDays) {
        body.set("subscription_data[trial_period_days]", String(plan.trialDays));
      }
      const session = await this.call("checkout/sessions", body);
      return {
        status: "redirect",
        url: session.url as string,
        providerSessionId: session.id as string,
      };
    } catch (error) {
      return { status: "erro", message: (error as Error).message };
    }
  }

  async createPortalSession(customerId: string, returnUrl: string): Promise<PortalResult> {
    try {
      const session = await this.call(
        "billing_portal/sessions",
        new URLSearchParams({ customer: customerId, return_url: returnUrl }),
      );
      return { status: "redirect", url: session.url as string };
    } catch (error) {
      return { status: "erro", message: (error as Error).message };
    }
  }

  async parseWebhook(rawBody: string, signature: string | null): Promise<WebhookEvent | null> {
    if (!this.webhookSecret || !signature) return null;
    // Verificação da assinatura conforme o esquema t=timestamp,v1=hmac.
    const { createHmac, timingSafeEqual } = await import("node:crypto");
    const parts = Object.fromEntries(
      signature.split(",").map((piece) => piece.split("=") as [string, string]),
    );
    if (!parts.t || !parts.v1) return null;
    const expected = createHmac("sha256", this.webhookSecret)
      .update(`${parts.t}.${rawBody}`)
      .digest("hex");
    const received = Buffer.from(parts.v1);
    const computed = Buffer.from(expected);
    if (received.length !== computed.length || !timingSafeEqual(received, computed)) return null;

    const event = JSON.parse(rawBody) as {
      type: string;
      data: { object: Record<string, unknown> };
    };
    const object = event.data.object;
    const statusMap: Record<string, WebhookEvent["status"]> = {
      active: "ACTIVE",
      trialing: "TRIALING",
      past_due: "PAST_DUE",
      canceled: "CANCELED",
      incomplete: "INCOMPLETE",
    };

    return {
      type: event.type,
      providerCustomerId: object.customer as string | undefined,
      providerSubId: (object.subscription as string | undefined) ?? (object.id as string | undefined),
      status: statusMap[object.status as string],
      currentPeriodEnd: object.current_period_end
        ? new Date((object.current_period_end as number) * 1000)
        : undefined,
    };
  }
}

class MercadoPagoProvider implements BillingProvider {
  readonly name = "mercadopago";
  readonly configured = true;

  constructor(private readonly accessToken: string, private readonly webhookSecret?: string) {}

  async createCheckout(request: CheckoutRequest): Promise<CheckoutResult> {
    const { prisma } = await import("@/server/db/prisma");
    const plan = await prisma.plan.findUnique({ where: { tier: request.planTier } });
    if (!plan?.mercadoPagoPlanId) {
      return {
        status: "nao_configurado",
        provider: this.name,
        missing: ["Plan.mercadoPagoPlanId"],
        message:
          "O plano ainda não tem identificador de assinatura no Mercado Pago. Cadastre-o no painel administrativo.",
      };
    }
    try {
      const response = await fetch("https://api.mercadopago.com/preapproval", {
        method: "POST",
        headers: {
          authorization: `Bearer ${this.accessToken}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          preapproval_plan_id: plan.mercadoPagoPlanId,
          payer_email: request.email,
          external_reference: request.userId,
          back_url: request.successUrl,
        }),
      });
      if (!response.ok) throw new Error(`Mercado Pago respondeu ${response.status}`);
      const data = (await response.json()) as { init_point?: string; id?: string };
      if (!data.init_point) throw new Error("Mercado Pago não devolveu URL de checkout.");
      return { status: "redirect", url: data.init_point, providerSessionId: data.id ?? "" };
    } catch (error) {
      return { status: "erro", message: (error as Error).message };
    }
  }

  async createPortalSession(): Promise<PortalResult> {
    return {
      status: "nao_configurado",
      message:
        "O Mercado Pago não oferece portal de autoatendimento equivalente; a gestão é feita pelo suporte.",
    };
  }

  async parseWebhook(rawBody: string, signature: string | null): Promise<WebhookEvent | null> {
    if (this.webhookSecret && signature !== this.webhookSecret) return null;
    const event = JSON.parse(rawBody) as { type?: string; data?: { id?: string } };
    if (!event.type) return null;
    return { type: event.type, providerSubId: event.data?.id };
  }
}

export function createBilling(): BillingProvider {
  const provider = (process.env.BILLING_PROVIDER ?? "none").toLowerCase();
  if (provider === "stripe") {
    if (!process.env.STRIPE_SECRET_KEY) return new UnconfiguredProvider(["STRIPE_SECRET_KEY"]);
    return new StripeProvider(process.env.STRIPE_SECRET_KEY, process.env.STRIPE_WEBHOOK_SECRET);
  }
  if (provider === "mercadopago") {
    if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
      return new UnconfiguredProvider(["MERCADOPAGO_ACCESS_TOKEN"]);
    }
    return new MercadoPagoProvider(
      process.env.MERCADOPAGO_ACCESS_TOKEN,
      process.env.MERCADOPAGO_WEBHOOK_SECRET,
    );
  }
  return new UnconfiguredProvider();
}
