import "server-only";
import type { Job, JobResult } from "../types";
import { emptyResult } from "../types";
import { prisma } from "@/server/db/prisma";

/**
 * Adaptador do IBGE (SIDRA).
 *
 * A ingestão está implementada até o ponto em que depende de rede: `fetchSeries`
 * conhece a URL, o formato de resposta e a normalização. Quando a saída de rede
 * estiver liberada e `INGESTION_ENABLED=true`, o job passa a gravar séries reais
 * substituindo as de demonstração. Enquanto isso, ele registra explicitamente
 * que a fonte está pendente — em vez de gravar dado inventado.
 */

type SidraRow = Record<string, string>;

/** Tabelas do SIDRA usadas pelo Atlas SP. */
const SERIES = [
  { indicator: "populacao", table: "6579", variable: "9324", unit: "pessoas" },
  { indicator: "pib", table: "5938", variable: "37", unit: "BRL" },
  { indicator: "pib-per-capita", table: "5938", variable: "593", unit: "BRL_UNIT" },
  { indicator: "vab-industria", table: "5938", variable: "517", unit: "BRL" },
  { indicator: "vab-servicos", table: "5938", variable: "518", unit: "BRL" },
  { indicator: "vab-agropecuaria", table: "5938", variable: "513", unit: "BRL" },
  { indicator: "vab-administracao", table: "5938", variable: "519", unit: "BRL" },
] as const;

/** Monta a URL da API do SIDRA para todos os municípios de SP (`n6/in n3 35`). */
export function sidraUrl(table: string, variable: string, period = "last"): string {
  return `https://apisidra.ibge.gov.br/values/t/${table}/n6/in%20n3%2035/v/${variable}/p/${period}?formato=json`;
}

async function fetchSeries(table: string, variable: string): Promise<SidraRow[]> {
  const response = await fetch(sidraUrl(table, variable), {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`SIDRA respondeu ${response.status}`);
  const rows = (await response.json()) as SidraRow[];
  // A primeira linha do SIDRA é o cabeçalho descritivo, não um dado.
  return rows.slice(1);
}

export const ibgeJob: Job = {
  key: "ibge-sidra",
  name: "IBGE — SIDRA",
  description: "População, PIB e valor adicionado bruto dos 645 municípios paulistas.",
  cadence: "MENSAL",
  sourceSlug: "ibge-sidra-populacao",
  requiresNetwork: true,

  async run(context): Promise<JobResult> {
    const result = emptyResult();
    const source = await prisma.dataSource.findUnique({ where: { slug: "ibge-sidra-populacao" } });
    if (!source) {
      result.issues.push({
        severity: "ERRO",
        code: "fonte-ausente",
        message: "Fonte ibge-sidra-populacao não cadastrada.",
      });
      return result;
    }

    if (!context.externalEnabled) {
      result.issues.push({
        severity: "AVISO",
        code: "ingestao-desligada",
        message:
          "Ingestão externa desligada (INGESTION_ENABLED=false). Nenhuma série oficial foi buscada; as séries de demonstração permanecem em uso e rotuladas como tal.",
      });
      return result;
    }

    const municipalities = await prisma.municipality.findMany({
      select: { id: true, ibgeCode: true },
    });
    const byCode = new Map(municipalities.map((municipality) => [municipality.ibgeCode, municipality.id]));
    const indicators = await prisma.indicator.findMany({
      where: { slug: { in: SERIES.map((entry) => entry.indicator) } },
      select: { id: true, slug: true },
    });
    const indicatorBySlug = new Map(indicators.map((indicator) => [indicator.slug, indicator.id]));

    for (const series of SERIES) {
      try {
        const rows = await fetchSeries(series.table, series.variable);
        result.itemsRead += rows.length;

        const points = rows.flatMap((row) => {
          const code = row["D1C"];
          const period = row["D3C"] ?? row["D2C"];
          const raw = row["V"];
          const municipalityId = byCode.get(code);
          const indicatorId = indicatorBySlug.get(series.indicator);
          const value = Number(raw);

          if (!municipalityId || !indicatorId || !period || !Number.isFinite(value)) {
            result.itemsSkipped += 1;
            return [];
          }
          const year = Number(period.slice(0, 4));
          return [
            {
              sourceId: source.id,
              indicatorId,
              municipalityId,
              rawValue: raw,
              normalizedValue: value,
              unit: series.unit,
              referenceStart: new Date(Date.UTC(year, 0, 1)),
              referenceEnd: new Date(Date.UTC(year, 11, 31)),
              referenceLabel: String(year),
              methodology: `IBGE — SIDRA, tabela ${series.table}, variável ${series.variable}.`,
              confidence: 1,
              isDemo: false,
              status: "PUBLICADO" as const,
            },
          ];
        });

        for (let i = 0; i < points.length; i += 2000) {
          const batch = points.slice(i, i + 2000);
          const written = await prisma.dataPoint.createMany({ data: batch, skipDuplicates: true });
          result.itemsWritten += written.count;
        }
        context.log(`${series.indicator}: ${points.length} observações`);
      } catch (error) {
        result.issues.push({
          severity: "ERRO",
          code: "falha-sidra",
          message: `Falha ao buscar ${series.indicator}: ${(error as Error).message}`,
          context: { table: series.table, variable: series.variable },
        });
      }
    }

    await prisma.dataSource.update({
      where: { id: source.id },
      data: {
        lastSyncAt: new Date(),
        lastSyncOk: result.issues.every((issue) => issue.severity !== "ERRO"),
      },
    });
    return result;
  },
};
