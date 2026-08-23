import type { PrismaClient } from "@prisma/client";

/**
 * Verificações de qualidade de dados. Rodam no seed e como job, e alimentam o
 * painel administrativo "Qualidade dos Dados". Cada verificação é uma consulta
 * real ao banco — nada aqui é declarativo.
 */
export type QualityResult = {
  key: string;
  name: string;
  description: string;
  status: "OK" | "ATENCAO" | "FALHA";
  detail: string;
  metric?: number;
  threshold?: number;
};

export async function runQualityChecks(prisma: PrismaClient): Promise<QualityResult[]> {
  const results: QualityResult[] = [];

  // 1. Cobertura do cadastro municipal
  const municipalities = await prisma.municipality.count();
  results.push({
    key: "cobertura-municipios",
    name: "Cobertura dos municípios paulistas",
    description: "O cadastro precisa conter exatamente os 645 municípios do Estado de São Paulo.",
    status: municipalities === 645 ? "OK" : "FALHA",
    detail: `${municipalities} municípios cadastrados de 645 esperados.`,
    metric: municipalities,
    threshold: 645,
  });

  // 2. Geometria disponível
  const withGeometry = await prisma.municipalityGeometry.count();
  results.push({
    key: "cobertura-geometria",
    name: "Cobertura da malha territorial",
    description: "Todo município precisa ter geometria para aparecer no mapa.",
    status: withGeometry === municipalities ? "OK" : "FALHA",
    detail: `${withGeometry} de ${municipalities} municípios com geometria carregada.`,
    metric: withGeometry,
    threshold: municipalities,
  });

  // 3. Vizinhança
  const isolated = await prisma.municipality.count({ where: { neighborsFrom: { none: {} } } });
  results.push({
    key: "vizinhanca",
    name: "Adjacências calculadas",
    description:
      "Municípios sem vizinho indicam falha na malha. Ilhabela é ilha e não tem fronteira terrestre — é a única exceção legítima.",
    status: isolated <= 1 ? "OK" : "ATENCAO",
    detail: `${isolated} município(s) sem vizinho terrestre.`,
    metric: isolated,
    threshold: 1,
  });

  // 4. Proveniência: nenhum dado sem fonte
  const orphanPoints = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "DataPoint" dp
    LEFT JOIN "DataSource" ds ON ds.id = dp."sourceId"
    WHERE ds.id IS NULL`;
  const orphans = Number(orphanPoints[0]?.count ?? 0);
  results.push({
    key: "proveniencia",
    name: "Proveniência dos dados",
    description: "Nenhuma observação pode existir sem fonte associada.",
    status: orphans === 0 ? "OK" : "FALHA",
    detail: `${orphans} observação(ões) sem fonte.`,
    metric: orphans,
    threshold: 0,
  });

  // 5. Proporção de dados de demonstração
  const totalPoints = await prisma.dataPoint.count();
  const demoPoints = await prisma.dataPoint.count({ where: { isDemo: true } });
  const demoShare = totalPoints ? (demoPoints / totalPoints) * 100 : 0;
  results.push({
    key: "share-demonstracao",
    name: "Participação de dados de demonstração",
    description:
      "Enquanto as ingestões oficiais não estiverem conectadas, a maior parte das séries é de demonstração. Todas aparecem rotuladas na interface.",
    status: demoShare > 50 ? "ATENCAO" : "OK",
    detail: `${demoShare.toFixed(1)}% das observações são de demonstração (${demoPoints} de ${totalPoints}).`,
    metric: Number(demoShare.toFixed(2)),
    threshold: 50,
  });

  // 6. Atualidade das séries
  const latest = await prisma.dataPoint.aggregate({
    where: { isDemo: false },
    _max: { referenceEnd: true },
  });
  const latestDate = latest._max.referenceEnd;
  const ageDays = latestDate ? Math.floor((Date.now() - latestDate.getTime()) / 86_400_000) : null;
  results.push({
    key: "atualidade-series",
    name: "Atualidade das séries oficiais",
    description: "Idade da observação oficial mais recente carregada.",
    status: ageDays === null ? "ATENCAO" : ageDays > 400 ? "ATENCAO" : "OK",
    detail: latestDate
      ? `Observação oficial mais recente: ${latestDate.toISOString().slice(0, 10)} (${ageDays} dias).`
      : "Nenhuma observação de fonte oficial carregada.",
    metric: ageDays ?? undefined,
    threshold: 400,
  });

  // 7. Fontes sem ingestão conectada
  const sources = await prisma.dataSource.findMany({
    where: { active: true, isDemo: false },
    select: { slug: true, lastSyncAt: true },
  });
  const neverSynced = sources.filter((source) => !source.lastSyncAt);
  results.push({
    key: "fontes-pendentes",
    name: "Fontes aguardando ingestão",
    description:
      "Fontes catalogadas cuja ingestão ainda não executou. Os dados correspondentes aparecem como 'em integração'.",
    status: neverSynced.length === 0 ? "OK" : "ATENCAO",
    detail: `${neverSynced.length} de ${sources.length} fontes oficiais ainda não sincronizaram.`,
    metric: neverSynced.length,
    threshold: 0,
  });

  // 8. Sinais do Radar sem fonte
  const signalsWithoutSource = await prisma.radarSignal.count({ where: { sources: { none: {} } } });
  results.push({
    key: "radar-sem-fonte",
    name: "Sinais do Radar sem evidência",
    description: "Todo sinal precisa apontar para ao menos uma fonte que o sustente.",
    status: signalsWithoutSource === 0 ? "OK" : "FALHA",
    detail: `${signalsWithoutSource} sinal(is) sem fonte associada.`,
    metric: signalsWithoutSource,
    threshold: 0,
  });

  // 9. Entidades não resolvidas
  const articlesWithoutMunicipality = await prisma.newsArticle.count({
    where: { municipalities: { none: {} } },
  });
  results.push({
    key: "entidades-nao-resolvidas",
    name: "Notícias sem município resolvido",
    description: "Matérias que a resolução de entidades não conseguiu ancorar em um município.",
    status: articlesWithoutMunicipality === 0 ? "OK" : "ATENCAO",
    detail: `${articlesWithoutMunicipality} matéria(s) sem município identificado.`,
    metric: articlesWithoutMunicipality,
    threshold: 0,
  });

  // 10. Duplicidade de aliases ambíguos
  const ambiguous = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM (
      SELECT "normalizedKey" FROM "EntityAlias"
      WHERE "entityType" = 'MUNICIPIO'
      GROUP BY "normalizedKey" HAVING COUNT(DISTINCT "municipalityId") > 1
    ) t`;
  const ambiguousCount = Number(ambiguous[0]?.count ?? 0);
  results.push({
    key: "aliases-ambiguos",
    name: "Aliases ambíguos de municípios",
    description:
      "Chaves normalizadas que apontam para mais de um município exigem contexto adicional na resolução.",
    status: ambiguousCount === 0 ? "OK" : "ATENCAO",
    detail: `${ambiguousCount} chave(s) ambígua(s) — a resolução exige contexto regional nesses casos.`,
    metric: ambiguousCount,
    threshold: 0,
  });

  return results;
}

export async function persistQualityChecks(prisma: PrismaClient, results: QualityResult[]) {
  for (const result of results) {
    await prisma.dataQualityCheck.upsert({
      where: { key: result.key },
      update: {
        name: result.name,
        description: result.description,
        status: result.status,
        detail: result.detail,
        metric: result.metric ?? null,
        threshold: result.threshold ?? null,
        lastRunAt: new Date(),
      },
      create: {
        key: result.key,
        name: result.name,
        description: result.description,
        status: result.status,
        detail: result.detail,
        metric: result.metric ?? null,
        threshold: result.threshold ?? null,
        lastRunAt: new Date(),
      },
    });
  }
  return results.length;
}
