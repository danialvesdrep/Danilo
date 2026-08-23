import "server-only";
import type { Job } from "./types";
import { ibgeJob } from "./adapters/ibge";
import { newsJob } from "./adapters/news";
import { scoreRefreshJob, alertsDispatchJob } from "./adapters/radar";
import { computeIndexScores } from "../../../prisma/seed/indices";
import { runQualityChecks, persistQualityChecks } from "../../../prisma/seed/quality";
import { prisma } from "@/server/db/prisma";
import { emptyResult } from "./types";

/** Recomputa os índices proprietários a partir do estado atual do banco. */
const indicesJob: Job = {
  key: "indices-proprietarios",
  name: "Recalcular índices proprietários",
  description: "Reprocessa Economic Momentum e demais índices com os dados mais recentes.",
  cadence: "DIARIA",
  requiresNetwork: false,
  async run() {
    const result = emptyResult();
    result.itemsWritten = await computeIndexScores(prisma);
    return result;
  },
};

const qualityJob: Job = {
  key: "qualidade-dados",
  name: "Verificações de qualidade",
  description: "Roda o painel de qualidade e persiste o resultado.",
  cadence: "HORARIA",
  requiresNetwork: false,
  async run() {
    const result = emptyResult();
    const checks = await runQualityChecks(prisma);
    await persistQualityChecks(prisma, checks);
    result.itemsWritten = checks.length;
    return result;
  },
};

export const JOBS: Job[] = [
  ibgeJob,
  newsJob,
  scoreRefreshJob,
  alertsDispatchJob,
  indicesJob,
  qualityJob,
];

export function findJob(key: string) {
  return JOBS.find((job) => job.key === key);
}
