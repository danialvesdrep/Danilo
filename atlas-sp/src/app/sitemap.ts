import type { MetadataRoute } from "next";
import { prisma } from "@/server/db/prisma";
import { SITE } from "@/lib/site";

export const revalidate = 21600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [municipalities, sectors, indicators, regions] = await Promise.all([
    prisma.municipality.findMany({ select: { slug: true, updatedAt: true } }),
    prisma.economicSector.findMany({ select: { slug: true } }),
    prisma.indicator.findMany({ where: { active: true }, select: { slug: true } }),
    prisma.region.findMany({
      where: { kind: { in: ["MESORREGIAO", "REGIAO_METROPOLITANA"] } },
      select: { slug: true },
    }),
  ]);

  const url = (path: string) => `${SITE.url}${path}`;
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: url("/"), lastModified: now, priority: 1 },
    { url: url("/dashboard"), lastModified: now, priority: 0.9 },
    { url: url("/radar"), lastModified: now, priority: 0.9, changeFrequency: "hourly" },
    { url: url("/mapa"), lastModified: now, priority: 0.8 },
    { url: url("/cidades"), lastModified: now, priority: 0.8 },
    { url: url("/economia"), lastModified: now, priority: 0.8 },
    { url: url("/setores"), lastModified: now, priority: 0.7 },
    { url: url("/noticias"), lastModified: now, priority: 0.7, changeFrequency: "daily" },
    { url: url("/indicadores"), lastModified: now, priority: 0.6 },
    { url: url("/comparar"), lastModified: now, priority: 0.6 },
    { url: url("/ia"), lastModified: now, priority: 0.5 },
    { url: url("/planos"), lastModified: now, priority: 0.5 },
    { url: url("/metodologia"), lastModified: now, priority: 0.5 },
    { url: url("/fontes"), lastModified: now, priority: 0.4 },
    { url: url("/qualidade"), lastModified: now, priority: 0.3 },
  ];

  const municipalityUrls = municipalities.map((municipality) => ({
    url: url(`/cidade/${municipality.slug}`),
    lastModified: municipality.updatedAt,
    priority: 0.7,
    changeFrequency: "daily" as const,
  }));

  const sectorUrls = sectors.map((sector) => ({
    url: url(`/setores/${sector.slug}`),
    lastModified: now,
    priority: 0.55,
  }));

  const indicatorUrls = indicators.map((indicator) => ({
    url: url(`/indicadores/${indicator.slug}`),
    lastModified: now,
    priority: 0.5,
  }));

  const regionUrls = regions.map((region) => ({
    url: url(`/regiao/${region.slug}`),
    lastModified: now,
    priority: 0.5,
  }));

  return [...staticRoutes, ...municipalityUrls, ...sectorUrls, ...indicatorUrls, ...regionUrls];
}
