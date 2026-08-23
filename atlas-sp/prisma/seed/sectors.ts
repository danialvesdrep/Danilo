import type { PrismaClient } from "@prisma/client";

/**
 * Setores econômicos do Atlas SP. O agrupamento macro segue as atividades do
 * PIB municipal do IBGE, de modo que o "DNA econômico" da cidade possa ser
 * derivado do valor adicionado bruto sem reclassificação arbitrária.
 */
export const SECTORS = [
  { slug: "tecnologia", name: "Tecnologia", macroSector: "SERVICOS", cnaeSection: "J", color: "#5b8def", order: 10,
    description: "Software, serviços de TI, data centers e telecomunicações." },
  { slug: "industria-geral", name: "Indústria de transformação", macroSector: "INDUSTRIA", cnaeSection: "C", color: "#c98a3b", order: 20,
    description: "Transformação industrial em sentido amplo, quando não há detalhamento setorial." },
  { slug: "automotivo", name: "Automotivo", macroSector: "INDUSTRIA", cnaeSection: "C", color: "#b45f4d", order: 30,
    description: "Montadoras, autopeças e cadeia de mobilidade." },
  { slug: "aeroespacial", name: "Aeroespacial e defesa", macroSector: "INDUSTRIA", cnaeSection: "C", color: "#4b6b8a", order: 40,
    description: "Aeronáutica, espacial, defesa e seus fornecedores." },
  { slug: "quimica", name: "Química e petroquímica", macroSector: "INDUSTRIA", cnaeSection: "C", color: "#7a6ba8", order: 50,
    description: "Química básica, petroquímica, fertilizantes e refino." },
  { slug: "farmaceutica", name: "Farmacêutica", macroSector: "INDUSTRIA", cnaeSection: "C", color: "#3f8f7f", order: 60,
    description: "Medicamentos, insumos farmacêuticos e produtos para saúde." },
  { slug: "alimentos-bebidas", name: "Alimentos e bebidas", macroSector: "INDUSTRIA", cnaeSection: "C", color: "#8a9a4b", order: 70,
    description: "Processamento de alimentos, bebidas e derivados do agronegócio." },
  { slug: "papel-celulose", name: "Papel e celulose", macroSector: "INDUSTRIA", cnaeSection: "C", color: "#6f8f6a", order: 80,
    description: "Celulose, papel, embalagens e florestas plantadas." },
  { slug: "textil", name: "Têxtil e vestuário", macroSector: "INDUSTRIA", cnaeSection: "C", color: "#a86b8a", order: 90,
    description: "Fiação, tecelagem, confecção e calçados." },
  { slug: "metalurgia", name: "Metalurgia e siderurgia", macroSector: "INDUSTRIA", cnaeSection: "C", color: "#7c7f86", order: 100,
    description: "Siderurgia, metalurgia e produtos de metal." },
  { slug: "mineracao", name: "Mineração", macroSector: "INDUSTRIA", cnaeSection: "B", color: "#8b7355", order: 110,
    description: "Extração mineral e beneficiamento primário." },
  { slug: "energia", name: "Energia", macroSector: "INDUSTRIA", cnaeSection: "D", color: "#c9a33b", order: 120,
    description: "Geração, transmissão e distribuição de energia, incluindo renováveis." },
  { slug: "construcao", name: "Construção", macroSector: "INDUSTRIA", cnaeSection: "F", color: "#a3794b", order: 130,
    description: "Construção civil, obras de infraestrutura e incorporação." },
  { slug: "agronegocio", name: "Agronegócio", macroSector: "AGROPECUARIA", cnaeSection: "A", color: "#6f9e4b", order: 140,
    description: "Produção agrícola, pecuária, sucroenergético e serviços agrícolas." },
  { slug: "logistica", name: "Logística e transporte", macroSector: "SERVICOS", cnaeSection: "H", color: "#4f8fa8", order: 150,
    description: "Transporte de carga, armazenagem, centros de distribuição e rodovias." },
  { slug: "portos", name: "Portos e comércio exterior", macroSector: "SERVICOS", cnaeSection: "H", color: "#3f7f9e", order: 160,
    description: "Movimentação portuária, terminais e cadeia de comércio exterior." },
  { slug: "comercio", name: "Comércio", macroSector: "COMERCIO", cnaeSection: "G", color: "#c97f5b", order: 170,
    description: "Comércio atacadista e varejista." },
  { slug: "servicos-empresariais", name: "Serviços empresariais", macroSector: "SERVICOS", cnaeSection: "M", color: "#6b7fa8", order: 180,
    description: "Consultoria, engenharia, jurídico, contábil e serviços profissionais." },
  { slug: "financeiro", name: "Serviços financeiros", macroSector: "SERVICOS", cnaeSection: "K", color: "#4b8f6f", order: 190,
    description: "Bancos, meios de pagamento, seguros e mercado de capitais." },
  { slug: "imobiliario", name: "Imobiliário", macroSector: "SERVICOS", cnaeSection: "L", color: "#a88f5b", order: 200,
    description: "Incorporação, locação e serviços imobiliários." },
  { slug: "saude", name: "Saúde", macroSector: "SERVICOS", cnaeSection: "Q", color: "#c95b6b", order: 210,
    description: "Hospitais, clínicas, diagnóstico e complexo econômico da saúde." },
  { slug: "educacao", name: "Educação", macroSector: "SERVICOS", cnaeSection: "P", color: "#5b7fc9", order: 220,
    description: "Educação básica, superior e profissional." },
  { slug: "turismo", name: "Turismo e hotelaria", macroSector: "SERVICOS", cnaeSection: "I", color: "#c9935b", order: 230,
    description: "Hospedagem, alimentação fora do lar, eventos e turismo receptivo." },
  { slug: "administracao-publica", name: "Administração pública", macroSector: "PUBLICO", cnaeSection: "O", color: "#8a8f9e", order: 240,
    description: "Administração, defesa, educação e saúde públicas e seguridade social." },
  { slug: "meio-ambiente", name: "Meio ambiente e saneamento", macroSector: "SERVICOS", cnaeSection: "E", color: "#4b9e8f", order: 250,
    description: "Água, esgoto, resíduos e serviços ambientais." },
] as const;

export async function seedSectors(prisma: PrismaClient) {
  for (const sector of SECTORS) {
    const payload = {
      name: sector.name,
      macroSector: sector.macroSector,
      cnaeSection: sector.cnaeSection,
      description: sector.description,
      color: sector.color,
      displayOrder: sector.order,
    };
    await prisma.economicSector.upsert({
      where: { slug: sector.slug },
      update: payload,
      create: { slug: sector.slug, ...payload },
    });
  }
  return prisma.economicSector.count();
}
