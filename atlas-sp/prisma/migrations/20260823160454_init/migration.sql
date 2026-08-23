-- CreateEnum
CREATE TYPE "SourceTier" AS ENUM ('OFICIAL', 'INSTITUCIONAL', 'JORNALISTICA', 'SECUNDARIA', 'DEMONSTRACAO');

-- CreateEnum
CREATE TYPE "DataStatus" AS ENUM ('PUBLICADO', 'EM_INTEGRACAO', 'INDISPONIVEL', 'DEPRECIADO');

-- CreateEnum
CREATE TYPE "IndicatorCategory" AS ENUM ('DEMOGRAFIA', 'ECONOMIA', 'TRABALHO', 'RENDA', 'FINANCAS_PUBLICAS', 'EDUCACAO', 'SAUDE', 'INFRAESTRUTURA', 'SEGURANCA', 'MEIO_AMBIENTE', 'EMPRESAS', 'COMERCIO_EXTERIOR', 'PRECOS', 'POLITICA');

-- CreateEnum
CREATE TYPE "IndicatorAggregation" AS ENUM ('ULTIMO_VALOR', 'SOMA', 'MEDIA', 'TAXA');

-- CreateEnum
CREATE TYPE "RegionKind" AS ENUM ('ESTADO', 'MESORREGIAO', 'MICRORREGIAO', 'REGIAO_METROPOLITANA', 'REGIAO_ADMINISTRATIVA', 'AGLOMERADO_URBANO', 'PERSONALIZADA');

-- CreateEnum
CREATE TYPE "TrendDirection" AS ENUM ('FORTE_ALTA', 'ALTA', 'ESTAVEL', 'QUEDA', 'FORTE_QUEDA', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "InvestmentStatus" AS ENUM ('ANUNCIADO', 'EM_IMPLANTACAO', 'CONCLUIDO', 'SUSPENSO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "OfficeKind" AS ENUM ('PREFEITO', 'VICE_PREFEITO', 'SECRETARIO', 'VEREADOR', 'PRESIDENTE_CAMARA', 'OUTRO');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('APRESENTADO', 'EM_COMISSAO', 'APROVADO', 'REJEITADO', 'ARQUIVADO', 'SANCIONADO');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('SITE', 'INSTAGRAM', 'FACEBOOK', 'X', 'YOUTUBE', 'LINKEDIN', 'TIKTOK');

-- CreateEnum
CREATE TYPE "NewsCategory" AS ENUM ('POLITICA', 'ECONOMIA', 'EMPRESAS', 'INDUSTRIA', 'AGRO', 'INFRAESTRUTURA', 'SAUDE', 'EDUCACAO', 'SEGURANCA', 'JUSTICA', 'MEIO_AMBIENTE', 'TURISMO', 'COMERCIO', 'TECNOLOGIA', 'TRABALHO');

-- CreateEnum
CREATE TYPE "SignalCategory" AS ENUM ('INVESTIMENTO', 'EMPREGO', 'INDUSTRIA', 'COMERCIO', 'SERVICOS', 'AGRONEGOCIO', 'TECNOLOGIA', 'INFRAESTRUTURA', 'OBRAS', 'POLITICA', 'GOVERNO', 'CAMARA', 'EMPRESAS', 'SAUDE', 'EDUCACAO', 'LOGISTICA', 'PORTOS', 'ENERGIA', 'TURISMO', 'MEIO_AMBIENTE', 'JUSTICA', 'REGULACAO', 'CLIMA', 'ARRECADACAO', 'FINANCAS_PUBLICAS');

-- CreateEnum
CREATE TYPE "SignalStatus" AS ENUM ('RASCUNHO', 'PUBLICADO', 'EM_REVISAO', 'ARQUIVADO');

-- CreateEnum
CREATE TYPE "TimelineKind" AS ENUM ('ECONOMIA', 'POLITICA', 'EMPRESA', 'INFRAESTRUTURA', 'INVESTIMENTO', 'ELEICAO', 'INDICADOR', 'NOTICIA', 'RADAR');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('DIARIO_OFICIAL', 'LEI', 'DECRETO', 'CONTRATO', 'EDITAL', 'RELATORIO', 'ATA', 'ORCAMENTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "EntityType" AS ENUM ('MUNICIPIO', 'REGIAO', 'PESSOA', 'EMPRESA', 'SETOR', 'PARTIDO', 'NOTICIA', 'INVESTIMENTO', 'SINAL', 'INDICADOR', 'DOCUMENTO', 'ORGAO');

-- CreateEnum
CREATE TYPE "RelationKind" AS ENUM ('LOCALIZADA_EM', 'ATUA_EM', 'PERTENCE_A', 'VIZINHO_DE', 'MENCIONA', 'INVESTE_EM', 'GOVERNA', 'REPRESENTA', 'EMPREGA', 'IMPACTA', 'DERIVA_DE', 'RELACIONADO_A');

-- CreateEnum
CREATE TYPE "AnalysisKind" AS ENUM ('PANORAMA_MUNICIPAL', 'POR_QUE_IMPORTA', 'CONTEXTO_ECONOMICO', 'COMPARACAO', 'RESPOSTA_PERGUNTA', 'MOMENTO_ECONOMICO');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'EDITOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'INCOMPLETE', 'NAO_CONFIGURADO');

-- CreateEnum
CREATE TYPE "AlertScope" AS ENUM ('MUNICIPIO', 'PESSOA', 'EMPRESA', 'SETOR', 'ASSUNTO', 'INVESTIMENTO');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('EXECUTANDO', 'SUCESSO', 'FALHA', 'PARCIAL');

-- CreateEnum
CREATE TYPE "IssueSeverity" AS ENUM ('INFO', 'AVISO', 'ERRO');

-- CreateTable
CREATE TABLE "DataSource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "tier" "SourceTier" NOT NULL,
    "url" TEXT,
    "apiUrl" TEXT,
    "license" TEXT,
    "description" TEXT,
    "methodology" TEXT,
    "refreshHours" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncOk" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataPoint" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "indicatorId" TEXT,
    "municipalityId" TEXT,
    "regionId" TEXT,
    "sectorId" TEXT,
    "rawValue" TEXT,
    "normalizedValue" DECIMAL(20,6),
    "unit" TEXT,
    "referenceStart" TIMESTAMP(3) NOT NULL,
    "referenceEnd" TIMESTAMP(3) NOT NULL,
    "referenceLabel" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "methodology" TEXT,
    "confidence" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "status" "DataStatus" NOT NULL DEFAULT 'PUBLICADO',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DataPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Indicator" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT NOT NULL,
    "category" "IndicatorCategory" NOT NULL,
    "unit" TEXT NOT NULL,
    "precision" INTEGER NOT NULL DEFAULT 0,
    "higherIsBetter" BOOLEAN,
    "description" TEXT NOT NULL,
    "methodology" TEXT NOT NULL,
    "aggregation" "IndicatorAggregation" NOT NULL DEFAULT 'ULTIMO_VALOR',
    "periodicity" TEXT NOT NULL,
    "municipalLevel" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Indicator_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Region" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "RegionKind" NOT NULL,
    "ibgeCode" TEXT,
    "parentId" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Region_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegionMembership" (
    "id" TEXT NOT NULL,
    "regionId" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,

    CONSTRAINT "RegionMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Municipality" (
    "id" TEXT NOT NULL,
    "ibgeCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "uf" TEXT NOT NULL DEFAULT 'SP',
    "ufCode" TEXT NOT NULL DEFAULT '35',
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "areaKm2" DOUBLE PRECISION,
    "ddd" TEXT,
    "isCapital" BOOLEAN NOT NULL DEFAULT false,
    "mesoCode" TEXT,
    "mesoName" TEXT,
    "microCode" TEXT,
    "microName" TEXT,
    "bbox" DOUBLE PRECISION[],
    "overview" TEXT,
    "websiteUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Municipality_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MunicipalityGeometry" (
    "municipalityId" TEXT NOT NULL,
    "geometry" JSONB NOT NULL,
    "simplified" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MunicipalityGeometry_pkey" PRIMARY KEY ("municipalityId")
);

-- CreateTable
CREATE TABLE "MunicipalityNeighbor" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "borderKm" DOUBLE PRECISION,
    "centroidKm" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MunicipalityNeighbor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EconomicSector" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "macroSector" TEXT NOT NULL,
    "cnaeSection" TEXT,
    "description" TEXT,
    "color" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 100,

    CONSTRAINT "EconomicSector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MunicipalitySector" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,
    "sharePct" DECIMAL(6,3),
    "employmentPct" DECIMAL(6,3),
    "trend" "TrendDirection" NOT NULL DEFAULT 'INDISPONIVEL',
    "relevance" DECIMAL(6,2),
    "rationale" TEXT,
    "referenceLabel" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MunicipalitySector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "cnpjRoot" TEXT,
    "sectorId" TEXT,
    "municipalityId" TEXT,
    "description" TEXT,
    "websiteUrl" TEXT,
    "employeeBand" TEXT,
    "foundedYear" INTEGER,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "companyId" TEXT,
    "sectorId" TEXT,
    "amountBRL" DECIMAL(18,2),
    "jobsAnnounced" INTEGER,
    "status" "InvestmentStatus" NOT NULL DEFAULT 'ANUNCIADO',
    "announcedAt" TIMESTAMP(3) NOT NULL,
    "expectedAt" TIMESTAMP(3),
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Investment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoliticalParty" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "acronym" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tseNumber" INTEGER,
    "color" TEXT,

    CONSTRAINT "PoliticalParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fullName" TEXT,
    "partyId" TEXT,
    "birthYear" INTEGER,
    "biography" TEXT,
    "photoUrl" TEXT,
    "websiteUrl" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Mandate" (
    "id" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "office" "OfficeKind" NOT NULL,
    "officeLabel" TEXT,
    "partyId" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "sourceUrl" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Mandate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MunicipalGovernment" (
    "municipalityId" TEXT NOT NULL,
    "websiteUrl" TEXT,
    "transparencyUrl" TEXT,
    "officialGazetteUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MunicipalGovernment_pkey" PRIMARY KEY ("municipalityId")
);

-- CreateTable
CREATE TABLE "GovernmentDepartment" (
    "id" TEXT NOT NULL,
    "governmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area" TEXT,
    "headName" TEXT,
    "websiteUrl" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GovernmentDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Council" (
    "municipalityId" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "websiteUrl" TEXT,
    "legislature" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Council_pkey" PRIMARY KEY ("municipalityId")
);

-- CreateTable
CREATE TABLE "CouncilMember" (
    "id" TEXT NOT NULL,
    "councilId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,
    "partyId" TEXT,
    "role" TEXT,
    "committees" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT true,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CouncilMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CouncilProject" (
    "id" TEXT NOT NULL,
    "councilId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "theme" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'APRESENTADO',
    "presentedAt" TIMESTAMP(3) NOT NULL,
    "decidedAt" TIMESTAMP(3),
    "sourceUrl" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "CouncilProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SocialProfile" (
    "id" TEXT NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "handle" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "personId" TEXT,
    "companyId" TEXT,

    CONSTRAINT "SocialProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsSource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "homepage" TEXT NOT NULL,
    "feedUrl" TEXT,
    "tier" "SourceTier" NOT NULL DEFAULT 'JORNALISTICA',
    "scope" TEXT NOT NULL DEFAULT 'ESTADUAL',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "dataSourceId" TEXT,
    "lastFetchAt" TIMESTAMP(3),

    CONSTRAINT "NewsSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsArticle" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "category" "NewsCategory" NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "indexedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importance" INTEGER NOT NULL DEFAULT 50,
    "language" TEXT NOT NULL DEFAULT 'pt-BR',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "NewsArticle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleMunicipality" (
    "articleId" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "confidence" DECIMAL(3,2) NOT NULL DEFAULT 1.0,

    CONSTRAINT "ArticleMunicipality_pkey" PRIMARY KEY ("articleId","municipalityId")
);

-- CreateTable
CREATE TABLE "ArticleSector" (
    "articleId" TEXT NOT NULL,
    "sectorId" TEXT NOT NULL,

    CONSTRAINT "ArticleSector_pkey" PRIMARY KEY ("articleId","sectorId")
);

-- CreateTable
CREATE TABLE "ArticleCompany" (
    "articleId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,

    CONSTRAINT "ArticleCompany_pkey" PRIMARY KEY ("articleId","companyId")
);

-- CreateTable
CREATE TABLE "ArticlePerson" (
    "articleId" TEXT NOT NULL,
    "personId" TEXT NOT NULL,

    CONSTRAINT "ArticlePerson_pkey" PRIMARY KEY ("articleId","personId")
);

-- CreateTable
CREATE TABLE "RadarSignal" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "regionId" TEXT,
    "category" "SignalCategory" NOT NULL,
    "sectorId" TEXT,
    "companyId" TEXT,
    "investmentId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "importance" INTEGER NOT NULL,
    "urgency" INTEGER NOT NULL,
    "economicImpact" INTEGER NOT NULL,
    "politicalImpact" INTEGER NOT NULL,
    "regionalImpact" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "scoreRationale" JSONB NOT NULL,
    "status" "SignalStatus" NOT NULL DEFAULT 'PUBLICADO',
    "isDemo" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RadarSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RadarSignalSource" (
    "signalId" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'EVIDENCIA',

    CONSTRAINT "RadarSignalSource_pkey" PRIMARY KEY ("signalId","articleId")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "personId" TEXT,
    "signalId" TEXT,
    "kind" "TimelineKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "sourceUrl" TEXT,
    "importance" INTEGER NOT NULL DEFAULT 50,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "municipalityId" TEXT,
    "sourceId" TEXT,
    "url" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "summary" TEXT,
    "isDemo" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityAlias" (
    "id" TEXT NOT NULL,
    "entityType" "EntityType" NOT NULL,
    "normalizedKey" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "weight" DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    "municipalityId" TEXT,
    "personId" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntityAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Relationship" (
    "id" TEXT NOT NULL,
    "fromType" "EntityType" NOT NULL,
    "fromId" TEXT NOT NULL,
    "toType" "EntityType" NOT NULL,
    "toId" TEXT NOT NULL,
    "kind" "RelationKind" NOT NULL,
    "weight" DECIMAL(5,3) NOT NULL DEFAULT 1.0,
    "origin" TEXT NOT NULL DEFAULT 'derivado',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Relationship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProprietaryIndex" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "methodology" TEXT NOT NULL,
    "disclaimer" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ProprietaryIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexComponent" (
    "id" TEXT NOT NULL,
    "indexId" TEXT NOT NULL,
    "indicatorId" TEXT,
    "signalKey" TEXT,
    "label" TEXT NOT NULL,
    "weight" DECIMAL(5,3) NOT NULL,

    CONSTRAINT "IndexComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexScore" (
    "id" TEXT NOT NULL,
    "indexId" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "value" DECIMAL(6,2) NOT NULL,
    "rank" INTEGER,
    "trend" "TrendDirection" NOT NULL DEFAULT 'INDISPONIVEL',
    "breakdown" JSONB NOT NULL,
    "referenceLabel" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IndexScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIAnalysis" (
    "id" TEXT NOT NULL,
    "kind" "AnalysisKind" NOT NULL,
    "municipalityId" TEXT,
    "signalId" TEXT,
    "question" TEXT,
    "facts" JSONB NOT NULL,
    "interpretation" TEXT,
    "hypotheses" JSONB NOT NULL,
    "citations" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT,
    "promptHash" TEXT,
    "confidence" DECIMAL(3,2) NOT NULL DEFAULT 0.5,
    "insufficientData" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "AIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "title" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "citations" JSONB,
    "facts" JSONB,
    "hypotheses" JSONB,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "emailVerified" TIMESTAMP(3),
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tier" "PlanTier" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priceMonthly" INTEGER,
    "priceYearly" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "trialDays" INTEGER NOT NULL DEFAULT 0,
    "features" JSONB NOT NULL,
    "limits" JSONB NOT NULL,
    "stripePriceIdMonthly" TEXT,
    "stripePriceIdYearly" TEXT,
    "mercadoPagoPlanId" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "provider" TEXT NOT NULL DEFAULT 'none',
    "providerCustomerId" TEXT,
    "providerSubId" TEXT,
    "interval" TEXT NOT NULL DEFAULT 'monthly',
    "currentPeriodEnd" TIMESTAMP(3),
    "trialEndsAt" TIMESTAMP(3),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" "AlertScope" NOT NULL,
    "municipalityId" TEXT,
    "targetId" TEXT,
    "keyword" TEXT,
    "label" TEXT NOT NULL,
    "categories" "SignalCategory"[],
    "minScore" INTEGER NOT NULL DEFAULT 60,
    "channel" TEXT NOT NULL DEFAULT 'in_app',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastTriggeredAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AlertDelivery" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "signalId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "url" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlertDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedMunicipality" (
    "userId" TEXT NOT NULL,
    "municipalityId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedMunicipality_pkey" PRIMARY KEY ("userId","municipalityId")
);

-- CreateTable
CREATE TABLE "IngestionRun" (
    "id" TEXT NOT NULL,
    "jobKey" TEXT NOT NULL,
    "sourceId" TEXT,
    "status" "RunStatus" NOT NULL DEFAULT 'EXECUTANDO',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsRead" INTEGER NOT NULL DEFAULT 0,
    "itemsWritten" INTEGER NOT NULL DEFAULT 0,
    "itemsSkipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "stats" JSONB,

    CONSTRAINT "IngestionRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionIssue" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "severity" "IssueSeverity" NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IngestionIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataQualityCheck" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OK',
    "detail" TEXT,
    "metric" DECIMAL(12,4),
    "threshold" DECIMAL(12,4),
    "lastRunAt" TIMESTAMP(3),

    CONSTRAINT "DataQualityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "anonId" TEXT,
    "name" TEXT NOT NULL,
    "path" TEXT,
    "entityType" "EntityType",
    "entityId" TEXT,
    "properties" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT,
    "detail" JSONB,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_slug_key" ON "DataSource"("slug");

-- CreateIndex
CREATE INDEX "DataSource_tier_active_idx" ON "DataSource"("tier", "active");

-- CreateIndex
CREATE INDEX "DataPoint_municipalityId_indicatorId_referenceStart_idx" ON "DataPoint"("municipalityId", "indicatorId", "referenceStart");

-- CreateIndex
CREATE INDEX "DataPoint_indicatorId_referenceStart_idx" ON "DataPoint"("indicatorId", "referenceStart");

-- CreateIndex
CREATE INDEX "DataPoint_regionId_indicatorId_idx" ON "DataPoint"("regionId", "indicatorId");

-- CreateIndex
CREATE UNIQUE INDEX "DataPoint_indicatorId_municipalityId_referenceLabel_sourceI_key" ON "DataPoint"("indicatorId", "municipalityId", "referenceLabel", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "Indicator_slug_key" ON "Indicator"("slug");

-- CreateIndex
CREATE INDEX "Indicator_category_displayOrder_idx" ON "Indicator"("category", "displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "Region_slug_key" ON "Region"("slug");

-- CreateIndex
CREATE INDEX "Region_kind_idx" ON "Region"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Region_kind_ibgeCode_key" ON "Region"("kind", "ibgeCode");

-- CreateIndex
CREATE INDEX "RegionMembership_municipalityId_idx" ON "RegionMembership"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "RegionMembership_regionId_municipalityId_key" ON "RegionMembership"("regionId", "municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_ibgeCode_key" ON "Municipality"("ibgeCode");

-- CreateIndex
CREATE UNIQUE INDEX "Municipality_slug_key" ON "Municipality"("slug");

-- CreateIndex
CREATE INDEX "Municipality_mesoCode_idx" ON "Municipality"("mesoCode");

-- CreateIndex
CREATE INDEX "Municipality_name_idx" ON "Municipality"("name");

-- CreateIndex
CREATE INDEX "MunicipalityNeighbor_toId_idx" ON "MunicipalityNeighbor"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "MunicipalityNeighbor_fromId_toId_key" ON "MunicipalityNeighbor"("fromId", "toId");

-- CreateIndex
CREATE UNIQUE INDEX "EconomicSector_slug_key" ON "EconomicSector"("slug");

-- CreateIndex
CREATE INDEX "EconomicSector_macroSector_idx" ON "EconomicSector"("macroSector");

-- CreateIndex
CREATE INDEX "MunicipalitySector_sectorId_idx" ON "MunicipalitySector"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "MunicipalitySector_municipalityId_sectorId_key" ON "MunicipalitySector"("municipalityId", "sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_municipalityId_idx" ON "Company"("municipalityId");

-- CreateIndex
CREATE INDEX "Company_sectorId_idx" ON "Company"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Investment_slug_key" ON "Investment"("slug");

-- CreateIndex
CREATE INDEX "Investment_municipalityId_announcedAt_idx" ON "Investment"("municipalityId", "announcedAt");

-- CreateIndex
CREATE INDEX "Investment_sectorId_idx" ON "Investment"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "PoliticalParty_slug_key" ON "PoliticalParty"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "PoliticalParty_acronym_key" ON "PoliticalParty"("acronym");

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE INDEX "Person_name_idx" ON "Person"("name");

-- CreateIndex
CREATE INDEX "Mandate_municipalityId_office_isCurrent_idx" ON "Mandate"("municipalityId", "office", "isCurrent");

-- CreateIndex
CREATE INDEX "Mandate_personId_idx" ON "Mandate"("personId");

-- CreateIndex
CREATE INDEX "GovernmentDepartment_governmentId_idx" ON "GovernmentDepartment"("governmentId");

-- CreateIndex
CREATE INDEX "CouncilMember_personId_idx" ON "CouncilMember"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "CouncilMember_councilId_personId_startDate_key" ON "CouncilMember"("councilId", "personId", "startDate");

-- CreateIndex
CREATE INDEX "CouncilProject_councilId_presentedAt_idx" ON "CouncilProject"("councilId", "presentedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CouncilProject_councilId_code_key" ON "CouncilProject"("councilId", "code");

-- CreateIndex
CREATE INDEX "SocialProfile_personId_idx" ON "SocialProfile"("personId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialProfile_platform_url_key" ON "SocialProfile"("platform", "url");

-- CreateIndex
CREATE UNIQUE INDEX "NewsSource_slug_key" ON "NewsSource"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_slug_key" ON "NewsArticle"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NewsArticle_url_key" ON "NewsArticle"("url");

-- CreateIndex
CREATE INDEX "NewsArticle_publishedAt_idx" ON "NewsArticle"("publishedAt");

-- CreateIndex
CREATE INDEX "NewsArticle_category_publishedAt_idx" ON "NewsArticle"("category", "publishedAt");

-- CreateIndex
CREATE INDEX "ArticleMunicipality_municipalityId_idx" ON "ArticleMunicipality"("municipalityId");

-- CreateIndex
CREATE UNIQUE INDEX "RadarSignal_slug_key" ON "RadarSignal"("slug");

-- CreateIndex
CREATE INDEX "RadarSignal_occurredAt_idx" ON "RadarSignal"("occurredAt");

-- CreateIndex
CREATE INDEX "RadarSignal_municipalityId_occurredAt_idx" ON "RadarSignal"("municipalityId", "occurredAt");

-- CreateIndex
CREATE INDEX "RadarSignal_score_occurredAt_idx" ON "RadarSignal"("score", "occurredAt");

-- CreateIndex
CREATE INDEX "RadarSignal_category_idx" ON "RadarSignal"("category");

-- CreateIndex
CREATE INDEX "TimelineEvent_municipalityId_occurredAt_idx" ON "TimelineEvent"("municipalityId", "occurredAt");

-- CreateIndex
CREATE INDEX "TimelineEvent_kind_idx" ON "TimelineEvent"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Document_slug_key" ON "Document"("slug");

-- CreateIndex
CREATE INDEX "Document_municipalityId_publishedAt_idx" ON "Document"("municipalityId", "publishedAt");

-- CreateIndex
CREATE INDEX "EntityAlias_normalizedKey_idx" ON "EntityAlias"("normalizedKey");

-- CreateIndex
CREATE INDEX "EntityAlias_entityType_normalizedKey_idx" ON "EntityAlias"("entityType", "normalizedKey");

-- CreateIndex
CREATE UNIQUE INDEX "EntityAlias_entityType_normalizedKey_municipalityId_personI_key" ON "EntityAlias"("entityType", "normalizedKey", "municipalityId", "personId", "companyId");

-- CreateIndex
CREATE INDEX "Relationship_fromType_fromId_idx" ON "Relationship"("fromType", "fromId");

-- CreateIndex
CREATE INDEX "Relationship_toType_toId_idx" ON "Relationship"("toType", "toId");

-- CreateIndex
CREATE INDEX "Relationship_kind_idx" ON "Relationship"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Relationship_fromType_fromId_toType_toId_kind_key" ON "Relationship"("fromType", "fromId", "toType", "toId", "kind");

-- CreateIndex
CREATE UNIQUE INDEX "ProprietaryIndex_slug_key" ON "ProprietaryIndex"("slug");

-- CreateIndex
CREATE INDEX "IndexComponent_indexId_idx" ON "IndexComponent"("indexId");

-- CreateIndex
CREATE INDEX "IndexScore_indexId_value_idx" ON "IndexScore"("indexId", "value");

-- CreateIndex
CREATE UNIQUE INDEX "IndexScore_indexId_municipalityId_referenceLabel_key" ON "IndexScore"("indexId", "municipalityId", "referenceLabel");

-- CreateIndex
CREATE INDEX "AIAnalysis_kind_municipalityId_idx" ON "AIAnalysis"("kind", "municipalityId");

-- CreateIndex
CREATE INDEX "AIAnalysis_signalId_idx" ON "AIAnalysis"("signalId");

-- CreateIndex
CREATE INDEX "AIConversation_userId_updatedAt_idx" ON "AIConversation"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "AIMessage_conversationId_createdAt_idx" ON "AIMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tier_key" ON "Plan"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Alert_userId_active_idx" ON "Alert"("userId", "active");

-- CreateIndex
CREATE INDEX "AlertDelivery_alertId_createdAt_idx" ON "AlertDelivery"("alertId", "createdAt");

-- CreateIndex
CREATE INDEX "IngestionRun_jobKey_startedAt_idx" ON "IngestionRun"("jobKey", "startedAt");

-- CreateIndex
CREATE INDEX "IngestionIssue_runId_severity_idx" ON "IngestionIssue"("runId", "severity");

-- CreateIndex
CREATE UNIQUE INDEX "DataQualityCheck_key_key" ON "DataQualityCheck"("key");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_name_createdAt_idx" ON "AnalyticsEvent"("name", "createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_entityType_entityId_idx" ON "AnalyticsEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "DataPoint" ADD CONSTRAINT "DataPoint_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPoint" ADD CONSTRAINT "DataPoint_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPoint" ADD CONSTRAINT "DataPoint_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPoint" ADD CONSTRAINT "DataPoint_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataPoint" ADD CONSTRAINT "DataPoint_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "EconomicSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Region" ADD CONSTRAINT "Region_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionMembership" ADD CONSTRAINT "RegionMembership_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegionMembership" ADD CONSTRAINT "RegionMembership_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalityGeometry" ADD CONSTRAINT "MunicipalityGeometry_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalityNeighbor" ADD CONSTRAINT "MunicipalityNeighbor_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalityNeighbor" ADD CONSTRAINT "MunicipalityNeighbor_toId_fkey" FOREIGN KEY ("toId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalitySector" ADD CONSTRAINT "MunicipalitySector_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalitySector" ADD CONSTRAINT "MunicipalitySector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "EconomicSector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "EconomicSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Investment" ADD CONSTRAINT "Investment_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "EconomicSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Person" ADD CONSTRAINT "Person_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "PoliticalParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Mandate" ADD CONSTRAINT "Mandate_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "PoliticalParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MunicipalGovernment" ADD CONSTRAINT "MunicipalGovernment_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernmentDepartment" ADD CONSTRAINT "GovernmentDepartment_governmentId_fkey" FOREIGN KEY ("governmentId") REFERENCES "MunicipalGovernment"("municipalityId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Council" ADD CONSTRAINT "Council_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilMember" ADD CONSTRAINT "CouncilMember_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council"("municipalityId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilMember" ADD CONSTRAINT "CouncilMember_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilMember" ADD CONSTRAINT "CouncilMember_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "PoliticalParty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CouncilProject" ADD CONSTRAINT "CouncilProject_councilId_fkey" FOREIGN KEY ("councilId") REFERENCES "Council"("municipalityId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialProfile" ADD CONSTRAINT "SocialProfile_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialProfile" ADD CONSTRAINT "SocialProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsSource" ADD CONSTRAINT "NewsSource_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsArticle" ADD CONSTRAINT "NewsArticle_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "NewsSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleMunicipality" ADD CONSTRAINT "ArticleMunicipality_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleMunicipality" ADD CONSTRAINT "ArticleMunicipality_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleSector" ADD CONSTRAINT "ArticleSector_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleSector" ADD CONSTRAINT "ArticleSector_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "EconomicSector"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCompany" ADD CONSTRAINT "ArticleCompany_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleCompany" ADD CONSTRAINT "ArticleCompany_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticlePerson" ADD CONSTRAINT "ArticlePerson_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticlePerson" ADD CONSTRAINT "ArticlePerson_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarSignal" ADD CONSTRAINT "RadarSignal_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarSignal" ADD CONSTRAINT "RadarSignal_regionId_fkey" FOREIGN KEY ("regionId") REFERENCES "Region"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarSignal" ADD CONSTRAINT "RadarSignal_sectorId_fkey" FOREIGN KEY ("sectorId") REFERENCES "EconomicSector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarSignal" ADD CONSTRAINT "RadarSignal_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarSignal" ADD CONSTRAINT "RadarSignal_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "Investment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarSignalSource" ADD CONSTRAINT "RadarSignalSource_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "RadarSignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RadarSignalSource" ADD CONSTRAINT "RadarSignalSource_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "NewsArticle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "RadarSignal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAlias" ADD CONSTRAINT "EntityAlias_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAlias" ADD CONSTRAINT "EntityAlias_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntityAlias" ADD CONSTRAINT "EntityAlias_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexComponent" ADD CONSTRAINT "IndexComponent_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "ProprietaryIndex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexComponent" ADD CONSTRAINT "IndexComponent_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "Indicator"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexScore" ADD CONSTRAINT "IndexScore_indexId_fkey" FOREIGN KEY ("indexId") REFERENCES "ProprietaryIndex"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndexScore" ADD CONSTRAINT "IndexScore_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIAnalysis" ADD CONSTRAINT "AIAnalysis_signalId_fkey" FOREIGN KEY ("signalId") REFERENCES "RadarSignal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIConversation" ADD CONSTRAINT "AIConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIMessage" ADD CONSTRAINT "AIMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "AIConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlertDelivery" ADD CONSTRAINT "AlertDelivery_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMunicipality" ADD CONSTRAINT "SavedMunicipality_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedMunicipality" ADD CONSTRAINT "SavedMunicipality_municipalityId_fkey" FOREIGN KEY ("municipalityId") REFERENCES "Municipality"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionRun" ADD CONSTRAINT "IngestionRun_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IngestionIssue" ADD CONSTRAINT "IngestionIssue_runId_fkey" FOREIGN KEY ("runId") REFERENCES "IngestionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DataQualityCheck" ADD CONSTRAINT "DataQualityCheck_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "DataSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalyticsEvent" ADD CONSTRAINT "AnalyticsEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
