import "server-only";
import { prisma } from "@/server/db/prisma";
import type { Job } from "./types";

/**
 * Execução de um job de ingestão. Registra a corrida no banco, captura erros
 * como IngestionIssue e devolve o resumo.
 */
export async function runJob(job: Job) {
  const externalEnabled = process.env.INGESTION_ENABLED === "true";
  const run = await prisma.ingestionRun.create({
    data: {
      jobKey: job.key,
      sourceId: job.sourceSlug
        ? (await prisma.dataSource.findUnique({ where: { slug: job.sourceSlug } }))?.id
        : undefined,
      status: "EXECUTANDO",
    },
  });

  const log: string[] = [];
  try {
    const result = await job.run({
      externalEnabled,
      now: new Date(),
      log: (message) => log.push(message),
    });

    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: result.issues.some((issue) => issue.severity === "ERRO")
          ? "PARCIAL"
          : "SUCESSO",
        finishedAt: new Date(),
        itemsRead: result.itemsRead,
        itemsWritten: result.itemsWritten,
        itemsSkipped: result.itemsSkipped,
        stats: { log, ...result.stats } as never,
        issues: {
          createMany: {
            data: result.issues.map((issue) => ({
              severity: issue.severity,
              code: issue.code,
              message: issue.message,
              context: (issue.context as never) ?? null,
            })),
          },
        },
      },
    });

    return { runId: run.id, ...result };
  } catch (error) {
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "FALHA",
        finishedAt: new Date(),
        error: (error as Error).message,
      },
    });
    throw error;
  }
}
