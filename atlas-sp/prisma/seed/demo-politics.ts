import type { PrismaClient } from "@prisma/client";
import { createRng } from "./rng";
import { slugify } from "../../src/lib/slug";

/**
 * Camada política de DEMONSTRAÇÃO.
 *
 * Os partidos são reais (registro público no TSE). As pessoas, mandatos,
 * secretarias e projetos são fictícios: sem acesso às fontes oficiais (TSE,
 * portais das prefeituras e câmaras) não há como afirmar quem ocupa cada
 * cargo. Todos os registros criados aqui têm `isDemo: true` e aparecem na
 * interface com o rótulo DEMONSTRAÇÃO, junto do aviso de que a informação
 * real depende da ingestão oficial.
 */

/** Partidos com registro no TSE (siglas e números são informação pública). */
const PARTIES = [
  { acronym: "PT", name: "Partido dos Trabalhadores", number: 13, color: "#c0392b" },
  { acronym: "PSDB", name: "Partido da Social Democracia Brasileira", number: 45, color: "#1f6fb2" },
  { acronym: "MDB", name: "Movimento Democrático Brasileiro", number: 15, color: "#2e7d32" },
  { acronym: "PSD", name: "Partido Social Democrático", number: 55, color: "#f39c12" },
  { acronym: "REPUBLICANOS", name: "Republicanos", number: 10, color: "#1565c0" },
  { acronym: "PP", name: "Progressistas", number: 11, color: "#0d47a1" },
  { acronym: "UNIAO", name: "União Brasil", number: 44, color: "#1976d2" },
  { acronym: "PL", name: "Partido Liberal", number: 22, color: "#283593" },
  { acronym: "PSB", name: "Partido Socialista Brasileiro", number: 40, color: "#c62828" },
  { acronym: "PODE", name: "Podemos", number: 20, color: "#00838f" },
  { acronym: "PDT", name: "Partido Democrático Trabalhista", number: 12, color: "#d32f2f" },
  { acronym: "AVANTE", name: "Avante", number: 70, color: "#ef6c00" },
  { acronym: "SOLIDARIEDADE", name: "Solidariedade", number: 77, color: "#f57f17" },
  { acronym: "CIDADANIA", name: "Cidadania", number: 23, color: "#ec407a" },
  { acronym: "PSOL", name: "Partido Socialismo e Liberdade", number: 50, color: "#8e24aa" },
  { acronym: "PV", name: "Partido Verde", number: 43, color: "#2e7d32" },
  { acronym: "PCdoB", name: "Partido Comunista do Brasil", number: 65, color: "#b71c1c" },
  { acronym: "NOVO", name: "Partido Novo", number: 30, color: "#ff6f00" },
  { acronym: "REDE", name: "Rede Sustentabilidade", number: 18, color: "#00695c" },
  { acronym: "PRD", name: "Partido Renovação Democrática", number: 25, color: "#4527a0" },
];

const FIRST_NAMES = [
  "Ana", "Carlos", "Marina", "Roberto", "Beatriz", "Eduardo", "Helena", "Paulo",
  "Cristina", "Fernando", "Luciana", "Ricardo", "Patrícia", "André", "Silvia",
  "Marcelo", "Renata", "Gustavo", "Adriana", "Rogério", "Vanessa", "Alexandre",
  "Cláudia", "Sérgio", "Fabiana", "Leandro", "Simone", "Rafael", "Tatiana",
  "Wagner", "Priscila", "Otávio", "Débora", "Maurício", "Camila", "Élcio",
];
const SURNAMES = [
  "Almeida", "Barbosa", "Cardoso", "Duarte", "Esteves", "Ferreira", "Gonçalves",
  "Henriques", "Ibrahim", "Junqueira", "Klein", "Lombardi", "Machado", "Nogueira",
  "Oliveira", "Pacheco", "Queiroz", "Rezende", "Salgado", "Tavares", "Uchôa",
  "Vasconcelos", "Watanabe", "Xavier", "Yamada", "Zanetti", "Bertoni", "Camargo",
  "Delfino", "Estrela", "Fonseca", "Guimarães", "Bianchi", "Moretti", "Peçanha",
];

const DEPARTMENTS = [
  { name: "Secretaria de Fazenda", area: "Finanças públicas" },
  { name: "Secretaria de Desenvolvimento Econômico", area: "Economia" },
  { name: "Secretaria de Obras e Infraestrutura", area: "Infraestrutura" },
  { name: "Secretaria de Saúde", area: "Saúde" },
  { name: "Secretaria de Educação", area: "Educação" },
  { name: "Secretaria de Mobilidade Urbana", area: "Mobilidade" },
  { name: "Secretaria de Meio Ambiente", area: "Meio ambiente" },
  { name: "Secretaria de Planejamento Urbano", area: "Planejamento" },
  { name: "Secretaria de Assistência Social", area: "Assistência social" },
  { name: "Secretaria de Cultura e Turismo", area: "Cultura e turismo" },
];

const PROJECT_THEMES = [
  { theme: "Mobilidade", titles: ["Programa municipal de ciclovias", "Reestruturação do transporte coletivo", "Plano de acessibilidade viária"] },
  { theme: "Desenvolvimento econômico", titles: ["Incentivo fiscal para novas indústrias", "Programa de apoio ao pequeno empreendedor", "Zona de desenvolvimento tecnológico"] },
  { theme: "Meio ambiente", titles: ["Política municipal de resíduos sólidos", "Programa de arborização urbana", "Plano de recuperação de nascentes"] },
  { theme: "Saúde", titles: ["Ampliação da rede de atenção básica", "Programa municipal de saúde mental", "Plano de enfrentamento de arboviroses"] },
  { theme: "Educação", titles: ["Expansão de vagas em creches", "Programa de educação em tempo integral", "Plano municipal de formação docente"] },
  { theme: "Habitação", titles: ["Programa de regularização fundiária", "Plano habitacional de interesse social", "Requalificação de áreas centrais"] },
  { theme: "Transparência", titles: ["Portal municipal de dados abertos", "Regulamento do orçamento participativo", "Política de integridade da administração"] },
];

/** Número de vereadores por faixa populacional — limites do art. 29, IV da Constituição. */
function councilSeats(population: number): number {
  if (population <= 15_000) return 9;
  if (population <= 30_000) return 11;
  if (population <= 50_000) return 13;
  if (population <= 80_000) return 15;
  if (population <= 120_000) return 17;
  if (population <= 160_000) return 19;
  if (population <= 300_000) return 21;
  if (population <= 450_000) return 23;
  if (population <= 600_000) return 25;
  if (population <= 750_000) return 27;
  if (population <= 900_000) return 29;
  if (population <= 1_050_000) return 31;
  if (population <= 1_200_000) return 33;
  if (population <= 1_350_000) return 35;
  if (population <= 1_500_000) return 37;
  if (population <= 1_800_000) return 39;
  if (population <= 2_400_000) return 41;
  if (population <= 3_000_000) return 43;
  if (population <= 4_000_000) return 45;
  if (population <= 5_000_000) return 47;
  if (population <= 6_000_000) return 49;
  if (population <= 7_000_000) return 51;
  if (population <= 8_000_000) return 53;
  return 55;
}

export async function seedParties(prisma: PrismaClient) {
  for (const party of PARTIES) {
    await prisma.politicalParty.upsert({
      where: { acronym: party.acronym },
      update: { name: party.name, tseNumber: party.number, color: party.color },
      create: {
        slug: slugify(party.acronym),
        acronym: party.acronym,
        name: party.name,
        tseNumber: party.number,
        color: party.color,
      },
    });
  }
  return prisma.politicalParty.count();
}

export async function seedDemoPolitics(
  prisma: PrismaClient,
  populationByMunicipality: Map<string, number>,
) {
  const parties = await prisma.politicalParty.findMany();
  const municipalities = await prisma.municipality.findMany({
    select: { id: true, name: true, slug: true, ibgeCode: true },
  });

  const mandateStart = new Date(Date.UTC(2025, 0, 1));
  const mandateEnd = new Date(Date.UTC(2028, 11, 31));

  const people: Array<{
    slug: string; name: string; partyId: string; biography: string; isDemo: boolean;
  }> = [];
  const mandates: Array<Record<string, unknown>> = [];
  const councils: Array<Record<string, unknown>> = [];
  const councilMembers: Array<Record<string, unknown>> = [];
  const governments: Array<Record<string, unknown>> = [];
  const departments: Array<Record<string, unknown>> = [];
  const projects: Array<Record<string, unknown>> = [];

  const nameFor = (rand: ReturnType<typeof createRng>) =>
    `${rand.pick(FIRST_NAMES)} ${rand.pick(SURNAMES)}`;

  for (const municipality of municipalities) {
    const rand = createRng(`politica:${municipality.ibgeCode}`);
    const population = populationByMunicipality.get(municipality.id) ?? 20_000;
    const seats = councilSeats(population);

    // Prefeito e vice
    const mayorParty = rand.pick(parties);
    const viceParty = rand.chance(0.6) ? rand.pick(parties) : mayorParty;
    const mayorName = nameFor(rand);
    const viceName = nameFor(rand);
    const mayorSlug = `${slugify(mayorName)}-${municipality.slug}`;
    const viceSlug = `${slugify(viceName)}-vice-${municipality.slug}`;

    people.push({
      slug: mayorSlug,
      name: mayorName,
      partyId: mayorParty.id,
      biography: `Registro de DEMONSTRAÇÃO. A composição real do Executivo de ${municipality.name} depende da ingestão dos dados do TSE e do portal oficial da prefeitura.`,
      isDemo: true,
    });
    people.push({
      slug: viceSlug,
      name: viceName,
      partyId: viceParty.id,
      biography: `Registro de DEMONSTRAÇÃO. A composição real do Executivo de ${municipality.name} depende da ingestão dos dados do TSE.`,
      isDemo: true,
    });
    mandates.push(
      { personSlug: mayorSlug, municipalityId: municipality.id, office: "PREFEITO", partyId: mayorParty.id },
      { personSlug: viceSlug, municipalityId: municipality.id, office: "VICE_PREFEITO", partyId: viceParty.id },
    );

    governments.push({
      municipalityId: municipality.id,
      websiteUrl: null,
      transparencyUrl: null,
      officialGazetteUrl: null,
    });

    // Secretarias: as maiores cidades têm estrutura mais ampla.
    const departmentCount = population > 300_000 ? 10 : population > 80_000 ? 7 : 5;
    for (const department of DEPARTMENTS.slice(0, departmentCount)) {
      departments.push({
        municipalityId: municipality.id,
        name: department.name,
        area: department.area,
        headName: nameFor(rand),
        isDemo: true,
      });
    }

    // Câmara
    councils.push({ municipalityId: municipality.id, seats, legislature: "2025–2028" });
    const presidentIndex = rand.int(0, seats - 1);
    for (let seat = 0; seat < seats; seat++) {
      const party = rand.pick(parties);
      const name = nameFor(rand);
      const slug = `${slugify(name)}-vereador-${municipality.slug}-${seat + 1}`;
      people.push({
        slug,
        name,
        partyId: party.id,
        biography: `Registro de DEMONSTRAÇÃO. A composição real da Câmara de ${municipality.name} depende da ingestão dos dados do TSE e do portal da Casa.`,
        isDemo: true,
      });
      councilMembers.push({
        municipalityId: municipality.id,
        personSlug: slug,
        partyId: party.id,
        role: seat === presidentIndex ? "Presidente" : null,
        committees: rand.sample(
          ["Constituição e Justiça", "Finanças e Orçamento", "Obras e Serviços", "Saúde", "Educação", "Meio Ambiente"],
          rand.int(1, 3),
        ),
        isDemo: true,
      });
    }

    // Projetos em tramitação
    const projectCount = population > 200_000 ? 8 : population > 50_000 ? 5 : 3;
    const usedCodes = new Set<string>();
    for (let i = 0; i < projectCount; i++) {
      const theme = rand.pick(PROJECT_THEMES);
      const number = rand.int(1, 320);
      const year = rand.pick([2025, 2026]);
      const code = `PL ${number}/${year}`;
      if (usedCodes.has(code)) continue;
      usedCodes.add(code);
      const presentedAt = new Date(Date.UTC(year, rand.int(0, 11), rand.int(1, 28)));
      const status = rand.pick(["APRESENTADO", "EM_COMISSAO", "APROVADO", "REJEITADO", "SANCIONADO"] as const);
      projects.push({
        municipalityId: municipality.id,
        code,
        title: rand.pick(theme.titles),
        summary: `Proposição de DEMONSTRAÇÃO usada para exercitar a aba Câmara. O acompanhamento real depende da ingestão do sistema legislativo de ${municipality.name}.`,
        theme: theme.theme,
        status,
        presentedAt,
        decidedAt: status === "APRESENTADO" || status === "EM_COMISSAO" ? null : new Date(presentedAt.getTime() + rand.int(20, 220) * 86_400_000),
        isDemo: true,
      });
    }
  }

  // ── Gravação ──────────────────────────────────────────────────
  await prisma.person.deleteMany({ where: { isDemo: true } });
  for (let i = 0; i < people.length; i += 3000) {
    await prisma.person.createMany({ data: people.slice(i, i + 3000), skipDuplicates: true });
  }
  const personIdBySlug = new Map(
    (await prisma.person.findMany({ select: { id: true, slug: true } })).map((person) => [
      person.slug,
      person.id,
    ]),
  );

  await prisma.mandate.deleteMany({ where: { isDemo: true } });
  const mandateRows = mandates.map((mandate) => ({
    personId: personIdBySlug.get(mandate.personSlug as string)!,
    municipalityId: mandate.municipalityId as string,
    office: mandate.office as never,
    partyId: mandate.partyId as string,
    startDate: mandateStart,
    endDate: mandateEnd,
    isCurrent: true,
    isDemo: true,
  }));
  for (let i = 0; i < mandateRows.length; i += 3000) {
    await prisma.mandate.createMany({ data: mandateRows.slice(i, i + 3000), skipDuplicates: true });
  }

  await prisma.municipalGovernment.deleteMany({});
  for (let i = 0; i < governments.length; i += 3000) {
    await prisma.municipalGovernment.createMany({ data: governments.slice(i, i + 3000) as never, skipDuplicates: true });
  }
  await prisma.governmentDepartment.createMany({
    data: departments.map((department) => ({
      governmentId: department.municipalityId as string,
      name: department.name as string,
      area: department.area as string,
      headName: department.headName as string,
      isDemo: true,
    })),
    skipDuplicates: true,
  });

  await prisma.council.deleteMany({});
  for (let i = 0; i < councils.length; i += 3000) {
    await prisma.council.createMany({ data: councils.slice(i, i + 3000) as never, skipDuplicates: true });
  }

  const memberRows = councilMembers.map((member) => ({
    councilId: member.municipalityId as string,
    personId: personIdBySlug.get(member.personSlug as string)!,
    partyId: member.partyId as string,
    role: member.role as string | null,
    committees: member.committees as string[],
    startDate: mandateStart,
    endDate: mandateEnd,
    isCurrent: true,
    isDemo: true,
  }));
  for (let i = 0; i < memberRows.length; i += 3000) {
    await prisma.councilMember.createMany({
      data: memberRows.slice(i, i + 3000),
      skipDuplicates: true,
    });
  }

  const projectRows = projects.map((project) => ({
    councilId: project.municipalityId as string,
    code: project.code as string,
    title: project.title as string,
    summary: project.summary as string,
    theme: project.theme as string,
    status: project.status as never,
    presentedAt: project.presentedAt as Date,
    decidedAt: project.decidedAt as Date | null,
    isDemo: true,
  }));
  for (let i = 0; i < projectRows.length; i += 3000) {
    await prisma.councilProject.createMany({ data: projectRows.slice(i, i + 3000), skipDuplicates: true });
  }

  // Arestas do grafo: pessoa → município (GOVERNA / REPRESENTA)
  await prisma.relationship.deleteMany({ where: { fromType: "PESSOA" } });
  const edges = [
    ...mandateRows.map((mandate) => ({
      fromType: "PESSOA" as const,
      fromId: mandate.personId,
      toType: "MUNICIPIO" as const,
      toId: mandate.municipalityId,
      kind: "GOVERNA" as const,
      weight: mandate.office === "PREFEITO" ? 1 : 0.7,
      origin: "mandato",
    })),
    ...memberRows.map((member) => ({
      fromType: "PESSOA" as const,
      fromId: member.personId,
      toType: "MUNICIPIO" as const,
      toId: member.councilId,
      kind: "REPRESENTA" as const,
      weight: 0.5,
      origin: "camara",
    })),
  ];
  for (let i = 0; i < edges.length; i += 3000) {
    await prisma.relationship.createMany({ data: edges.slice(i, i + 3000), skipDuplicates: true });
  }

  // Aliases de pessoas para a busca e a resolução de entidades
  await prisma.entityAlias.deleteMany({ where: { entityType: "PESSOA" } });
  const allPeople = await prisma.person.findMany({ select: { id: true, name: true } });
  const { normalizeKey } = await import("../../src/lib/slug");
  const aliasRows = allPeople.map((person) => ({
    entityType: "PESSOA" as const,
    normalizedKey: normalizeKey(person.name),
    alias: person.name,
    weight: 0.8,
    personId: person.id,
  }));
  for (let i = 0; i < aliasRows.length; i += 3000) {
    await prisma.entityAlias.createMany({ data: aliasRows.slice(i, i + 3000), skipDuplicates: true });
  }

  return {
    people: people.length,
    mandates: mandateRows.length,
    councilMembers: memberRows.length,
    projects: projectRows.length,
  };
}
