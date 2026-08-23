import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../../src/server/auth/password";

/**
 * Planos. Preços em centavos e configuráveis pelo painel administrativo.
 * Nenhuma cobrança é simulada: sem provedor configurado, a assinatura fica
 * como NAO_CONFIGURADO e o checkout explica o que falta ligar.
 */
export const PLANS = [
  {
    tier: "FREE" as const,
    name: "Free",
    description:
      "Explore os 645 municípios, o mapa e o Radar público. Ideal para conhecer a plataforma.",
    priceMonthly: 0,
    priceYearly: 0,
    trialDays: 0,
    displayOrder: 0,
    features: [
      "Perfil completo dos 645 municípios",
      "Mapa temático do Estado",
      "Radar com os movimentos do dia",
      "Busca global com resolução de entidades",
      "3 cidades salvas",
    ],
    limits: {
      savedMunicipalities: 3,
      alerts: 1,
      aiQuestionsPerDay: 5,
      comparisonSlots: 2,
      radarHistoryDays: 7,
      exports: 0,
      apiAccess: false,
    },
  },
  {
    tier: "PRO" as const,
    name: "Pro",
    description:
      "Para quem acompanha o Estado todos os dias: Radar completo, alertas, comparações e Atlas AI sem fila.",
    priceMonthly: 14900,
    priceYearly: 149000,
    trialDays: 14,
    displayOrder: 1,
    features: [
      "Tudo do Free",
      "Radar completo, com histórico e justificativa de score",
      "Alertas por cidade, pessoa, empresa, setor ou assunto",
      "Comparação de até 4 municípios",
      "Atlas AI com citações e rastreabilidade",
      "Séries históricas e exportação em CSV",
      "50 cidades salvas",
    ],
    limits: {
      savedMunicipalities: 50,
      alerts: 25,
      aiQuestionsPerDay: 100,
      comparisonSlots: 4,
      radarHistoryDays: 365,
      exports: 200,
      apiAccess: false,
    },
  },
  {
    tier: "ENTERPRISE" as const,
    name: "Enterprise",
    description:
      "Para equipes: acesso via API, múltiplos usuários, painéis compartilhados e integrações sob medida.",
    priceMonthly: null,
    priceYearly: null,
    trialDays: 0,
    displayOrder: 2,
    features: [
      "Tudo do Pro",
      "Acesso via API ao grafo de entidades",
      "Usuários ilimitados e painéis compartilhados",
      "Alertas por webhook",
      "Fontes privadas e integrações sob medida",
      "Suporte dedicado",
    ],
    limits: {
      savedMunicipalities: -1,
      alerts: -1,
      aiQuestionsPerDay: -1,
      comparisonSlots: 4,
      radarHistoryDays: -1,
      exports: -1,
      apiAccess: true,
    },
  },
];

export async function seedPlans(prisma: PrismaClient) {
  for (const plan of PLANS) {
    const payload = {
      name: plan.name,
      description: plan.description,
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      trialDays: plan.trialDays,
      displayOrder: plan.displayOrder,
      features: plan.features,
      limits: plan.limits,
    };
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: payload,
      create: { tier: plan.tier, ...payload },
    });
  }
  return prisma.plan.count();
}

/**
 * Contas de avaliação do modo DEMO. As senhas vêm de variáveis de ambiente
 * quando definidas; caso contrário usa-se um valor conhecido e documentado,
 * apropriado apenas para ambiente local.
 */
export async function seedUsers(prisma: PrismaClient) {
  const freePlan = await prisma.plan.findUniqueOrThrow({ where: { tier: "FREE" } });
  const proPlan = await prisma.plan.findUniqueOrThrow({ where: { tier: "PRO" } });

  const accounts = [
    {
      email: process.env.SEED_ADMIN_EMAIL ?? "admin@atlassp.local",
      password: process.env.SEED_ADMIN_PASSWORD ?? "atlas-admin-2026",
      name: "Administração Atlas SP",
      role: "ADMIN" as const,
      plan: proPlan,
    },
    {
      email: process.env.SEED_DEMO_EMAIL ?? "demo@atlassp.local",
      password: process.env.SEED_DEMO_PASSWORD ?? "atlas-demo-2026",
      name: "Conta de demonstração",
      role: "USER" as const,
      plan: freePlan,
    },
  ];

  for (const account of accounts) {
    const passwordHash = await hashPassword(account.password);
    const user = await prisma.user.upsert({
      where: { email: account.email },
      update: { name: account.name, role: account.role },
      create: {
        email: account.email,
        name: account.name,
        role: account.role,
        passwordHash,
        emailVerified: new Date(),
      },
    });
    await prisma.subscription.upsert({
      where: { userId: user.id },
      update: { planId: account.plan.id },
      create: {
        userId: user.id,
        planId: account.plan.id,
        status: "ACTIVE",
        provider: "none",
      },
    });
  }
  return accounts.map((account) => account.email);
}
