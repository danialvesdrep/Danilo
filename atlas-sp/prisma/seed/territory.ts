import fs from "node:fs";
import path from "node:path";
import type { PrismaClient } from "@prisma/client";
import { normalizeKey, slugify } from "../../src/lib/slug";

type MunicipalityRecord = {
  ibgeCode: string;
  name: string;
  slug: string;
  uf: string;
  ufCode: string;
  latitude: number;
  longitude: number;
  centroid: [number, number];
  areaKm2: number;
  bbox: [number, number, number, number];
  ddd: string | null;
  isCapital: boolean;
  mesoCode: string;
  mesoName: string;
  microCode: string;
  microName: string;
};

type NeighborRecord = {
  from: string;
  to: string;
  sharedVertices: number;
  centroidKm: number;
  borderKm: number;
};

const DATA_DIR = path.resolve(process.cwd(), "data");

const readJson = <T>(file: string): T =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as T;

/**
 * Regiões metropolitanas instituídas por lei complementar estadual.
 * Só entram no seed as composições que podem ser afirmadas com segurança;
 * as demais permanecem ausentes em vez de serem preenchidas por aproximação.
 * A composição é validada contra o cadastro: um nome que não exista aborta o seed.
 */
const METRO_REGIONS: Array<{ slug: string; name: string; law: string; members: string[] }> = [
  {
    slug: "rm-sao-paulo",
    name: "Região Metropolitana de São Paulo",
    law: "Lei Complementar Estadual nº 1.139/2011",
    members: [
      "São Paulo", "Arujá", "Barueri", "Biritiba Mirim", "Caieiras", "Cajamar",
      "Carapicuíba", "Cotia", "Diadema", "Embu das Artes", "Embu-Guaçu",
      "Ferraz de Vasconcelos", "Francisco Morato", "Franco da Rocha", "Guararema",
      "Guarulhos", "Itapecerica da Serra", "Itapevi", "Itaquaquecetuba", "Jandira",
      "Juquitiba", "Mairiporã", "Mauá", "Mogi das Cruzes", "Osasco",
      "Pirapora do Bom Jesus", "Poá", "Ribeirão Pires", "Rio Grande da Serra",
      "Salesópolis", "Santa Isabel", "Santana de Parnaíba", "Santo André",
      "São Bernardo do Campo", "São Caetano do Sul", "São Lourenço da Serra",
      "Suzano", "Taboão da Serra", "Vargem Grande Paulista",
    ],
  },
  {
    slug: "rm-baixada-santista",
    name: "Região Metropolitana da Baixada Santista",
    law: "Lei Complementar Estadual nº 815/1996",
    members: [
      "Bertioga", "Cubatão", "Guarujá", "Itanhaém", "Mongaguá", "Peruíbe",
      "Praia Grande", "Santos", "São Vicente",
    ],
  },
  {
    slug: "rm-campinas",
    name: "Região Metropolitana de Campinas",
    law: "Lei Complementar Estadual nº 870/2000",
    members: [
      "Americana", "Artur Nogueira", "Campinas", "Cosmópolis", "Engenheiro Coelho",
      "Holambra", "Hortolândia", "Indaiatuba", "Itatiba", "Jaguariúna", "Monte Mor",
      "Morungaba", "Nova Odessa", "Paulínia", "Pedreira", "Santa Bárbara d'Oeste",
      "Santo Antônio de Posse", "Sumaré", "Valinhos", "Vinhedo",
    ],
  },
];

/**
 * Municípios cujo nome coincide com uma palavra comum do português. Um texto
 * que diga "panorama econômico" ou "salto de produtividade" não está falando
 * das cidades de Panorama ou Salto — por isso esses aliases recebem peso baixo
 * e só são aceitos quando há contexto adicional.
 */
const NOMES_AMBIGUOS = new Set([
  "panorama", "salto", "socorro", "serrana", "colina", "pontal", "guara",
  "areias", "paraiso", "quadra", "restinga", "sales", "vargem", "estiva",
  "lavinia", "meridiano", "general salgado", "torre de pedra", "mira estrela",
  "monte alto", "nova aliança", "boa esperanca do sul", "bom sucesso de itarare",
  "capela do alto", "santa cruz", "santa rosa", "sao pedro", "sao jose",
  "sao joao", "sao paulo", "bela vista", "santo antonio",
]);

/** Variações de escrita que a resolução de entidades deve reconhecer. */
function municipalityAliases(name: string): Array<{ alias: string; weight: number }> {
  const aliases: Array<{ alias: string; weight: number }> = [
    { alias: name, weight: 1 },
    { alias: `${name}/SP`, weight: 1 },
    { alias: `${name} - SP`, weight: 1 },
    { alias: `${name} (SP)`, weight: 1 },
    { alias: `Município de ${name}`, weight: 1 },
    { alias: `Cidade de ${name}`, weight: 1 },
    { alias: `Prefeitura de ${name}`, weight: 0.9 },
  ];
  // Nomes muito curtos ou compostos por termos comuns geram falso positivo:
  // reduzimos o peso para que a resolução exija contexto adicional.
  const key = normalizeKey(name);
  const tokens = key.split(" ");
  const generic = ["santa", "santo", "sao", "nova", "novo", "bom", "boa", "porto", "campo"];

  // Abaixo de 0,55 a menção em texto livre é descartada; a busca direta, que
  // usa limiar menor, continua encontrando a cidade normalmente.
  if (NOMES_AMBIGUOS.has(key)) {
    // "São Paulo" é ambíguo com o estado, mas é a cidade mais mencionada do
    // país: mantemos peso utilizável e deixamos o desempate para o contexto.
    const factor = key === "sao paulo" ? 0.72 : 0.45;
    return aliases.map((entry) => ({ ...entry, weight: entry.weight * factor }));
  }
  if (tokens.length === 1 && name.length <= 5) {
    return aliases.map((entry) => ({ ...entry, weight: entry.weight * 0.55 }));
  }
  if (tokens.length <= 2 && generic.includes(tokens[0])) {
    return aliases.map((entry) => ({ ...entry, weight: entry.weight * 0.8 }));
  }
  return aliases;
}

export async function seedTerritory(prisma: PrismaClient) {
  const municipalities = readJson<MunicipalityRecord[]>("sp-municipalities.json");
  const neighbors = readJson<NeighborRecord[]>("sp-neighbors.json");
  const geometry = readJson<Record<string, unknown>>("sp-geometry.json");
  const simplified = readJson<Record<string, unknown>>("sp-geometry-simplified.json");

  if (municipalities.length !== 645) {
    throw new Error(`Cadastro incompleto: ${municipalities.length} municípios (esperados 645)`);
  }

  // ── Estado ────────────────────────────────────────────────────
  const state = await prisma.region.upsert({
    where: { slug: "sao-paulo" },
    update: {},
    create: {
      slug: "sao-paulo",
      name: "São Paulo",
      kind: "ESTADO",
      ibgeCode: "35",
      summary:
        "Estado de São Paulo — 645 municípios, 15 mesorregiões e 63 microrregiões segundo a divisão territorial do IBGE.",
    },
  });

  // ── Mesorregiões e microrregiões (divisão oficial do IBGE) ────
  const mesoByCode = new Map<string, string>();
  for (const record of municipalities) {
    if (mesoByCode.has(record.mesoCode)) continue;
    const region = await prisma.region.upsert({
      where: { kind_ibgeCode: { kind: "MESORREGIAO", ibgeCode: record.mesoCode } },
      update: { name: record.mesoName, parentId: state.id },
      create: {
        slug: `meso-${slugify(record.mesoName)}`,
        name: record.mesoName,
        kind: "MESORREGIAO",
        ibgeCode: record.mesoCode,
        parentId: state.id,
      },
    });
    mesoByCode.set(record.mesoCode, region.id);
  }

  const microByCode = new Map<string, string>();
  for (const record of municipalities) {
    if (microByCode.has(record.microCode)) continue;
    const region = await prisma.region.upsert({
      where: { kind_ibgeCode: { kind: "MICRORREGIAO", ibgeCode: record.microCode } },
      update: { name: record.microName, parentId: mesoByCode.get(record.mesoCode)! },
      create: {
        slug: `micro-${slugify(record.microName)}-${record.microCode}`,
        name: record.microName,
        kind: "MICRORREGIAO",
        ibgeCode: record.microCode,
        parentId: mesoByCode.get(record.mesoCode)!,
      },
    });
    microByCode.set(record.microCode, region.id);
  }

  // ── Municípios ────────────────────────────────────────────────
  const idByCode = new Map<string, string>();
  for (const record of municipalities) {
    const payload = {
      name: record.name,
      slug: record.slug,
      uf: record.uf,
      ufCode: record.ufCode,
      latitude: record.latitude,
      longitude: record.longitude,
      areaKm2: record.areaKm2,
      ddd: record.ddd,
      isCapital: record.isCapital,
      mesoCode: record.mesoCode,
      mesoName: record.mesoName,
      microCode: record.microCode,
      microName: record.microName,
      bbox: record.bbox,
    };
    const municipality = await prisma.municipality.upsert({
      where: { ibgeCode: record.ibgeCode },
      update: payload,
      create: { ibgeCode: record.ibgeCode, ...payload },
    });
    idByCode.set(record.ibgeCode, municipality.id);
  }

  // ── Geometria ─────────────────────────────────────────────────
  for (const record of municipalities) {
    const municipalityId = idByCode.get(record.ibgeCode)!;
    const payload = {
      geometry: geometry[record.ibgeCode] as never,
      simplified: simplified[record.ibgeCode] as never,
      source: "IBGE — Malha Municipal Digital",
    };
    await prisma.municipalityGeometry.upsert({
      where: { municipalityId },
      update: payload,
      create: { municipalityId, ...payload },
    });
  }

  // ── Pertencimento regional ────────────────────────────────────
  await prisma.regionMembership.deleteMany({});
  const memberships: Array<{ regionId: string; municipalityId: string }> = [];
  for (const record of municipalities) {
    const municipalityId = idByCode.get(record.ibgeCode)!;
    memberships.push({ regionId: state.id, municipalityId });
    memberships.push({ regionId: mesoByCode.get(record.mesoCode)!, municipalityId });
    memberships.push({ regionId: microByCode.get(record.microCode)!, municipalityId });
  }

  // ── Regiões metropolitanas ────────────────────────────────────
  const byName = new Map(municipalities.map((record) => [normalizeKey(record.name), record]));
  for (const metro of METRO_REGIONS) {
    const resolved = metro.members.map((name) => {
      const record = byName.get(normalizeKey(name));
      if (!record) {
        throw new Error(
          `Composição de ${metro.name}: município "${name}" não existe no cadastro de SP`,
        );
      }
      return record;
    });
    const region = await prisma.region.upsert({
      where: { slug: metro.slug },
      update: { name: metro.name, parentId: state.id, summary: metro.law },
      create: {
        slug: metro.slug,
        name: metro.name,
        kind: "REGIAO_METROPOLITANA",
        parentId: state.id,
        summary: `Composição instituída pela ${metro.law}. ${resolved.length} municípios.`,
      },
    });
    for (const record of resolved) {
      memberships.push({ regionId: region.id, municipalityId: idByCode.get(record.ibgeCode)! });
    }
  }

  await prisma.regionMembership.createMany({ data: memberships, skipDuplicates: true });

  // ── Vizinhança ────────────────────────────────────────────────
  await prisma.municipalityNeighbor.deleteMany({});
  const edges = neighbors.flatMap((edge) => {
    const fromId = idByCode.get(edge.from);
    const toId = idByCode.get(edge.to);
    if (!fromId || !toId) return [];
    // Guardamos a aresta nos dois sentidos: a consulta por vizinhos é sempre direta.
    return [
      { fromId, toId, borderKm: edge.borderKm, centroidKm: edge.centroidKm },
      { fromId: toId, toId: fromId, borderKm: edge.borderKm, centroidKm: edge.centroidKm },
    ];
  });
  for (let i = 0; i < edges.length; i += 2000) {
    await prisma.municipalityNeighbor.createMany({
      data: edges.slice(i, i + 2000),
      skipDuplicates: true,
    });
  }

  // ── Aliases para resolução de entidades ───────────────────────
  await prisma.entityAlias.deleteMany({ where: { entityType: "MUNICIPIO" } });
  const aliasRows = municipalities.flatMap((record) =>
    municipalityAliases(record.name).map((entry) => ({
      entityType: "MUNICIPIO" as const,
      normalizedKey: normalizeKey(entry.alias),
      alias: entry.alias,
      weight: entry.weight,
      municipalityId: idByCode.get(record.ibgeCode)!,
    })),
  );
  const uniqueAliases = new Map<string, (typeof aliasRows)[number]>();
  for (const row of aliasRows) {
    uniqueAliases.set(`${row.normalizedKey}|${row.municipalityId}`, row);
  }
  const aliasList = [...uniqueAliases.values()];
  for (let i = 0; i < aliasList.length; i += 2000) {
    await prisma.entityAlias.createMany({ data: aliasList.slice(i, i + 2000), skipDuplicates: true });
  }

  // ── Arestas do grafo de entidades ─────────────────────────────
  await prisma.relationship.deleteMany({
    where: { kind: { in: ["VIZINHO_DE", "PERTENCE_A"] } },
  });
  const relationships = [
    ...edges.map((edge) => ({
      fromType: "MUNICIPIO" as const,
      fromId: edge.fromId,
      toType: "MUNICIPIO" as const,
      toId: edge.toId,
      kind: "VIZINHO_DE" as const,
      // Fronteiras mais extensas indicam vínculo territorial mais forte.
      weight: Math.min(1, edge.borderKm / 60),
      origin: "malha-ibge",
      metadata: { borderKm: edge.borderKm, centroidKm: edge.centroidKm },
    })),
    ...memberships.map((membership) => ({
      fromType: "MUNICIPIO" as const,
      fromId: membership.municipalityId,
      toType: "REGIAO" as const,
      toId: membership.regionId,
      kind: "PERTENCE_A" as const,
      weight: 1,
      origin: "divisao-territorial",
      metadata: undefined,
    })),
  ];
  for (let i = 0; i < relationships.length; i += 2000) {
    await prisma.relationship.createMany({
      data: relationships.slice(i, i + 2000) as never,
      skipDuplicates: true,
    });
  }

  return {
    municipalities: municipalities.length,
    regions: await prisma.region.count(),
    neighborEdges: edges.length,
    aliases: aliasList.length,
  };
}
