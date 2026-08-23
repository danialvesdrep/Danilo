/** Contratos da camada de ingestão. */

export type JobResult = {
  itemsRead: number;
  itemsWritten: number;
  itemsSkipped: number;
  issues: Array<{ severity: "INFO" | "AVISO" | "ERRO"; code: string; message: string; context?: unknown }>;
  stats?: Record<string, unknown>;
};

export type JobContext = {
  /** Quando a ingestão externa está desligada, o job roda só o que é local. */
  externalEnabled: boolean;
  now: Date;
  log: (message: string) => void;
};

export type JobCadence = "HORARIA" | "DIARIA" | "SEMANAL" | "MENSAL" | "SOB_DEMANDA";

export type Job = {
  key: string;
  name: string;
  description: string;
  cadence: JobCadence;
  /** Slug da fonte associada, quando houver. */
  sourceSlug?: string;
  /** Depende de rede externa? */
  requiresNetwork: boolean;
  run: (context: JobContext) => Promise<JobResult>;
};

export const emptyResult = (): JobResult => ({
  itemsRead: 0,
  itemsWritten: 0,
  itemsSkipped: 0,
  issues: [],
});
