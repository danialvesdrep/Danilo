import { NextResponse } from "next/server";
import { prisma, toNumber } from "@/server/db/prisma";

/**
 * Malha municipal em GeoJSON, com os agregados usados pelo mapa temático.
 *
 * Servimos a geometria simplificada por padrão (≈560 KB para o Estado inteiro)
 * e a resolução completa apenas quando um município específico é pedido — é o
 * que permite carregar o mapa progressivamente em vez de despejar tudo.
 */

export const revalidate = 3600;

type Feature = {
  type: "Feature";
  id: number;
  properties: Record<string, unknown>;
  geometry: unknown;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("municipio");
  const detailed = searchParams.get("detalhado") === "1";

  try {
    if (slug) {
      const municipality = await prisma.municipality.findUnique({
        where: { slug },
        select: {
          id: true, ibgeCode: true, name: true, slug: true, bbox: true,
          geometry: { select: { geometry: true, simplified: true, source: true } },
        },
      });
      if (!municipality?.geometry) {
        return NextResponse.json({ error: "Município não encontrado" }, { status: 404 });
      }
      return NextResponse.json({
        type: "FeatureCollection",
        source: municipality.geometry.source,
        bbox: municipality.bbox,
        features: [
          {
            type: "Feature",
            id: Number(municipality.ibgeCode),
            properties: { name: municipality.name, slug: municipality.slug, ibgeCode: municipality.ibgeCode },
            geometry: detailed ? municipality.geometry.geometry : municipality.geometry.simplified,
          },
        ],
      });
    }

    // Uma única consulta agrega geometria e indicadores: o mapa do Estado
    // inteiro não pode custar centenas de idas ao banco.
    const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
      WITH latest AS (
        SELECT dp."municipalityId", i.slug, dp."normalizedValue", dp."isDemo",
               ROW_NUMBER() OVER (
                 PARTITION BY dp."municipalityId", i.slug ORDER BY dp."referenceStart" DESC
               ) AS rn
        FROM "DataPoint" dp
        JOIN "Indicator" i ON i.id = dp."indicatorId"
        WHERE i.slug IN ('populacao','pib','pib-per-capita','emprego-formal','densidade-demografica','receita-municipal')
      ),
      pivot AS (
        SELECT "municipalityId",
          MAX(CASE WHEN slug='populacao' THEN "normalizedValue" END) AS populacao,
          MAX(CASE WHEN slug='pib' THEN "normalizedValue" END) AS pib,
          MAX(CASE WHEN slug='pib-per-capita' THEN "normalizedValue" END) AS pib_per_capita,
          MAX(CASE WHEN slug='emprego-formal' THEN "normalizedValue" END) AS emprego,
          MAX(CASE WHEN slug='densidade-demografica' THEN "normalizedValue" END) AS densidade,
          MAX(CASE WHEN slug='receita-municipal' THEN "normalizedValue" END) AS receita,
          BOOL_OR("isDemo") AS is_demo
        FROM latest WHERE rn = 1 GROUP BY "municipalityId"
      ),
      setor AS (
        SELECT DISTINCT ON (ms."municipalityId") ms."municipalityId", s.name, s.color, s."macroSector"
        FROM "MunicipalitySector" ms JOIN "EconomicSector" s ON s.id = ms."sectorId"
        ORDER BY ms."municipalityId", ms."sharePct" DESC
      ),
      radar AS (
        SELECT "municipalityId", COUNT(*)::int AS total, COALESCE(MAX(score),0)::int AS max_score
        FROM "RadarSignal"
        WHERE status='PUBLICADO' AND "occurredAt" >= NOW() - INTERVAL '90 days'
        GROUP BY "municipalityId"
      ),
      ultimo_sinal AS (
        SELECT DISTINCT ON ("municipalityId") "municipalityId", headline, slug, score
        FROM "RadarSignal" WHERE status='PUBLICADO'
        ORDER BY "municipalityId", "occurredAt" DESC
      ),
      investimentos AS (
        SELECT "municipalityId", COALESCE(SUM("amountBRL"),0) AS total
        FROM "Investment" WHERE "announcedAt" >= NOW() - INTERVAL '365 days'
        GROUP BY "municipalityId"
      )
      SELECT m."ibgeCode", m.name, m.slug, m."mesoName", m."areaKm2",
             m.latitude, m.longitude, g.simplified,
             p.populacao, p.pib, p.pib_per_capita, p.emprego, p.densidade, p.receita,
             COALESCE(p.is_demo,false) AS is_demo,
             st.name AS setor, st.color AS setor_cor, st."macroSector" AS macro,
             COALESCE(r.total,0) AS sinais, COALESCE(r.max_score,0) AS max_score,
             us.headline AS ultimo_movimento, us.slug AS ultimo_slug,
             COALESCE(inv.total,0) AS investimentos
      FROM "Municipality" m
      JOIN "MunicipalityGeometry" g ON g."municipalityId" = m.id
      LEFT JOIN pivot p ON p."municipalityId" = m.id
      LEFT JOIN setor st ON st."municipalityId" = m.id
      LEFT JOIN radar r ON r."municipalityId" = m.id
      LEFT JOIN ultimo_sinal us ON us."municipalityId" = m.id
      LEFT JOIN investimentos inv ON inv."municipalityId" = m.id`;

    const features: Feature[] = rows.map((row) => ({
      type: "Feature",
      id: Number(row.ibgeCode),
      properties: {
        ibgeCode: row.ibgeCode,
        name: row.name,
        slug: row.slug,
        meso: row.mesoName,
        area: row.areaKm2 === null ? null : Number(row.areaKm2),
        populacao: toNumber(row.populacao),
        pib: toNumber(row.pib),
        pibPerCapita: toNumber(row.pib_per_capita),
        emprego: toNumber(row.emprego),
        densidade: toNumber(row.densidade),
        receita: toNumber(row.receita),
        investimentos: toNumber(row.investimentos),
        setor: row.setor,
        setorCor: row.setor_cor,
        macro: row.macro,
        sinais: Number(row.sinais ?? 0),
        maxScore: Number(row.max_score ?? 0),
        ultimoMovimento: row.ultimo_movimento,
        ultimoSlug: row.ultimo_slug,
        isDemo: Boolean(row.is_demo),
      },
      geometry: row.simplified,
    }));

    return NextResponse.json(
      {
        type: "FeatureCollection",
        source: "IBGE — Malha Municipal Digital (geometria simplificada pelo Atlas SP)",
        features,
      },
      { headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" } },
    );
  } catch (error) {
    console.error("[geo] falha ao montar a malha:", error);
    return NextResponse.json({ error: "Falha ao carregar a malha municipal." }, { status: 500 });
  }
}
