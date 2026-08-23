/**
 * Seed do Atlas SP.
 *
 * Ordem: fontes → indicadores → território (real) → setores → planos →
 * economia (demonstração) → política (demonstração) → sinais (demonstração) →
 * índices proprietários → verificações de qualidade.
 *
 * O que é real: os 645 municípios, códigos IBGE, mesorregiões, microrregiões,
 * malha territorial, área calculada, adjacências, regiões metropolitanas,
 * partidos e o catálogo de fontes e indicadores.
 * O que é demonstração: toda série econômica, as pessoas, as empresas, as
 * notícias e os sinais do Radar — gravados com `isDemo: true`.
 */
import { PrismaClient } from "@prisma/client";
import { seedSources } from "./seed/sources";
import { seedIndicators } from "./seed/indicators";
import { seedTerritory } from "./seed/territory";
import { seedSectors } from "./seed/sectors";
import { seedPlans, seedUsers } from "./seed/plans";
import { seedDemoEconomy, seedAreaIndicator } from "./seed/demo-economy";
import { seedParties, seedDemoPolitics } from "./seed/demo-politics";
import { seedDemoSignals } from "./seed/demo-signals";
import { seedIndices, computeIndexScores } from "./seed/indices";
import { runQualityChecks, persistQualityChecks } from "./seed/quality";

const prisma = new PrismaClient();

const step = async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
  const started = Date.now();
  process.stdout.write(`  ${label.padEnd(38)}`);
  const result = await fn();
  const summary =
    typeof result === "number"
      ? String(result)
      : typeof result === "object" && result !== null && !(result instanceof Map)
        ? Object.entries(result as Record<string, unknown>)
            .filter(([, value]) => typeof value === "number" || typeof value === "string")
            .map(([key, value]) => `${key}=${value}`)
            .join(" ")
        : "ok";
  console.log(`${summary.padEnd(46)} ${((Date.now() - started) / 1000).toFixed(1)}s`);
  return result;
};

async function main() {
  console.log("\nAtlas SP — seed\n");

  await step("Fontes de dados", () => seedSources(prisma));
  await step("Indicadores", () => seedIndicators(prisma));
  await step("Território (645 municípios)", () => seedTerritory(prisma));
  await step("Setores econômicos", () => seedSectors(prisma));
  await step("Área territorial (IBGE)", () => seedAreaIndicator(prisma));
  await step("Planos", () => seedPlans(prisma));
  await step("Partidos", () => seedParties(prisma));

  const economy = await step("Economia (demonstração)", () => seedDemoEconomy(prisma));

  const populationByMunicipality = new Map(
    [...economy.profiles.entries()].map(([id, profile]) => [id, profile.population]),
  );
  await step("Política (demonstração)", () => seedDemoPolitics(prisma, populationByMunicipality));
  await step("Radar e notícias (demonstração)", () => seedDemoSignals(prisma, economy.profiles));

  await step("Índices proprietários", () => seedIndices(prisma));
  await step("Cálculo dos índices", () => computeIndexScores(prisma));

  const quality = await step("Qualidade dos dados", async () => {
    const results = await runQualityChecks(prisma);
    await persistQualityChecks(prisma, results);
    return results.length;
  });

  const accounts = await step("Contas de acesso", () => seedUsers(prisma));

  console.log(`\n  ${quality} verificações de qualidade registradas.`);
  console.log(`  Contas criadas: ${accounts.join(", ")}\n`);
}

main()
  .catch((error) => {
    console.error("\nFalha no seed:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
