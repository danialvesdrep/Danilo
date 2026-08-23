/**
 * CLI: `npm run pipeline -- radar-recomputar-scores`
 *
 * Executa um job pelo nome — útil no desenvolvimento local e em runners
 * agendados externamente (Cron do Vercel, GitHub Actions, k8s CronJob).
 */
import "dotenv/config";
import { findJob, JOBS } from "@/server/pipeline/registry";
import { runJob } from "@/server/pipeline/runner";

async function main() {
  const argument = process.argv[2];

  if (!argument || argument === "--list") {
    console.log("\nJobs disponíveis:\n");
    for (const job of JOBS) {
      console.log(
        `  ${job.key.padEnd(28)} ${job.cadence.padEnd(10)} ${
          job.requiresNetwork ? "rede " : "local"
        }  ${job.name}`,
      );
    }
    console.log("\n  Uso: npm run pipeline -- <chave>\n");
    return;
  }

  if (argument === "all") {
    for (const job of JOBS) {
      const started = Date.now();
      const result = await runJob(job);
      console.log(
        `  ${job.key.padEnd(28)} lido=${result.itemsRead} gravado=${result.itemsWritten} pulado=${result.itemsSkipped} problemas=${result.issues.length}  ${((Date.now() - started) / 1000).toFixed(1)}s`,
      );
    }
    return;
  }

  const job = findJob(argument);
  if (!job) throw new Error(`Job não encontrado: ${argument}`);
  console.log(`Executando ${job.key}...`);
  const result = await runJob(job);
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = await import("@/server/db/prisma");
    await prisma.$disconnect();
  });
