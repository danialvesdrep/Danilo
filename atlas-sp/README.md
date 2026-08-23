# Atlas SP

Plataforma de inteligência territorial, econômica e política sobre os **645 municípios do Estado
de São Paulo**. Cada dado exibido carrega a sua fonte. Cada índice proprietário aparece com a sua
metodologia. Toda vez que a plataforma interpreta os dados, ela diz onde termina o fato e onde
começa a leitura.

## O que faz

- **Radar** — camada de inteligência que ordena por relevância os movimentos detectados no Estado.
  O score é um índice proprietário composto por cinco eixos, cada um exposto na interface.
- **Perfil municipal** — 15 abas por cidade (visão geral, economia, setores, governança, câmara,
  radar, notícias, indicadores, empresas, investimentos, linha do tempo, mapa, documentos,
  vizinhos, Atlas AI). Cada aba tem endereço próprio e é indexável.
- **Mapa temático** — malha oficial do IBGE dos 645 municípios, colorida por PIB, população,
  emprego, arrecadação, setor predominante ou atividade no Radar, com quebras por quintil.
- **Grafo de entidades** — cidades, pessoas, empresas, setores, notícias, investimentos e sinais
  ligados por relações tipadas. É o que permite que uma notícia nunca termine na notícia.
- **Atlas AI** — camada de resposta ancorada em evidência: recupera fatos do grafo, separa
  interpretação e hipóteses, cita cada afirmação e diz explicitamente quando não há dados
  suficientes. Provedor agnóstico (Anthropic, OpenAI-compatíveis ou provedor local).
- **Comparador** — até quatro cidades lado a lado, nos mesmos indicadores e no mesmo período.
- **Alertas** — monitoramento por cidade, pessoa, empresa, setor ou assunto, com score mínimo.
- **Assinaturas** — planos Free, Pro e Enterprise, com limites por recurso e adaptadores prontos
  para Stripe e Mercado Pago. Nenhuma cobrança é simulada.
- **Painel administrativo** — fontes, jobs, qualidade dos dados, aliases ambíguos e usuários.

## Arquitetura

- **Next.js 15 + React 19** (App Router, streaming em Suspense, server components).
- **TypeScript** com verificação estrita e `noUncheckedIndexedAccess` desligado por decisão.
- **Tailwind CSS 4** e um sistema de design próprio (tokens semânticos, fontes auto-hospedadas,
  suporte a modo claro e escuro).
- **Prisma + PostgreSQL 14+**, com extensões `unaccent` e `pg_trgm` para busca sem acento e
  tolerância tipográfica.
- **MapLibre GL** com fonte GeoJSON própria — sem tiles externos por padrão.
- **Recharts** para os gráficos.
- **JWT + sessão em banco** para autenticação; senhas em bcrypt com custo 12.
- **Camada de IA agnóstica** (`grounded-local` como padrão sem chaves; Anthropic e OpenAI trocáveis
  por variável de ambiente).
- **Ingestão desacoplada**: cada fonte é um `Job` com contrato próprio. `INGESTION_ENABLED` separa
  o mundo local do mundo com rede.

Layout do repositório:

```
prisma/         → schema, migrações e seed (modular por domínio)
data/           → dataset municipal gerado a partir da malha oficial do IBGE
scripts/        → build do dataset, execução de pipeline, utilitários
src/app/        → rotas do App Router (grupos (app) e (auth))
src/components/ → UI, radar, mapa, AI, gráficos, city, alerts
src/lib/        → utilidades puras (formatação, slug, geometria, tokens)
src/server/     → camada de servidor (auth, db, queries, radar, ai, pipeline, entities, graph)
tests/          → testes unitários (Vitest)
```

## Modelo de dados

Núcleo:

- `Municipality` (645), `Region`, `MunicipalityGeometry`, `MunicipalityNeighbor`, `RegionMembership`.
- `Indicator`, `DataPoint`, `DataSource` — nenhuma observação existe sem fonte.
- `EconomicSector`, `MunicipalitySector`, `Company`, `Investment`.
- `Person`, `Mandate`, `PoliticalParty`, `MunicipalGovernment`, `GovernmentDepartment`, `Council`,
  `CouncilMember`, `CouncilProject`.
- `NewsSource`, `NewsArticle`, `ArticleMunicipality/Sector/Company/Person`.
- `RadarSignal`, `RadarSignalSource`, `TimelineEvent`, `Document`.
- `EntityAlias`, `Relationship` — o grafo de entidades.
- `ProprietaryIndex`, `IndexComponent`, `IndexScore`.
- `AIAnalysis`, `AIConversation`, `AIMessage`.
- `User`, `Session`, `Plan`, `Subscription`, `Alert`, `SavedMunicipality`, `AnalyticsEvent`,
  `AuditLog`, `IngestionRun`, `IngestionIssue`, `DataQualityCheck`, `SiteSetting`.

## Dados reais × demonstração

Este ambiente não tem saída para as APIs oficiais (IBGE, SEADE, Novo CAGED, Tesouro, TSE, ...),
por política de rede da execução. Enquanto essas ingestões não estão conectadas:

- **É real e vem de fonte oficial:** os 645 municípios (código IBGE, mesorregião, microrregião,
  regiões metropolitanas por lei), a malha municipal, adjacências (derivadas da própria malha),
  área calculada por geometria esférica, coordenadas de sede e DDD, partidos com registro no TSE
  e o catálogo completo de fontes/indicadores/setores.
- **É demonstração:** todas as séries econômicas, as pessoas, as empresas, as notícias e os
  sinais do Radar. Cada um desses registros tem `isDemo: true` no banco, aparece com o rótulo
  `demonstração` na interface e é ignorável pela IA de forma auditável.

Quando `INGESTION_ENABLED=true` e as APIs externas estiverem alcançáveis, os jobs de ingestão
começam a gravar séries oficiais que substituem as de demonstração.

## Como começar

```bash
# 1. Dependências
npm install

# 2. Variáveis de ambiente
cp .env.example .env
# Edite DATABASE_URL e AUTH_SECRET (openssl rand -base64 48).

# 3. Banco de dados (Postgres 14+)
npm run db:migrate       # aplica migrações
npm run data:build       # constrói o dataset municipal a partir da malha do IBGE
npm run db:seed          # popula fontes, indicadores, território, setores, demo e índices

# 4. Executar
npm run dev              # desenvolvimento em http://localhost:3000

# 5. Testes
npm test
```

Contas criadas pelo seed (só em desenvolvimento):

- `admin@atlassp.local` / `atlas-admin-2026` — papel ADMIN.
- `demo@atlassp.local` / `atlas-demo-2026` — usuário do plano Free.

## Variáveis de ambiente

Todas estão descritas em `.env.example`, agrupadas por área. Pontos-chave:

- `DATABASE_URL` — Postgres 14+.
- `AUTH_SECRET` — 48+ bytes aleatórios.
- `INGESTION_ENABLED` — `true` para os adaptadores fazerem chamadas externas.
- `AI_PROVIDER` — `grounded-local` (padrão, sem rede), `anthropic` ou `openai`.
- `BILLING_PROVIDER` — `none`, `stripe` ou `mercadopago`. Sem provedor a interface deixa isso
  explícito para o usuário; nada é simulado.
- `NEXT_PUBLIC_MAPBOX_TOKEN` — opcional. Sem token o mapa usa o estilo vetorial próprio.
- `CRON_SECRET` — protege `POST /api/cron/[job]`.

## Jobs e ingestão

```bash
npm run pipeline -- --list                       # lista os jobs
npm run pipeline -- radar-recomputar-scores      # rodar um job específico
npm run pipeline -- all                          # rodar tudo
```

Endpoints de cron correspondentes: `POST /api/cron/<chave>` com header
`Authorization: Bearer $CRON_SECRET`. Agendamento sugerido:

| Job                        | Cadência                | Depende de rede |
|----------------------------|-------------------------|-----------------|
| `ibge-sidra`               | Mensal                  | Sim             |
| `news-ingestion`           | Horária                 | Sim             |
| `radar-recomputar-scores`  | Horária                 | Não             |
| `alertas-disparar`         | Horária                 | Não             |
| `indices-proprietarios`    | Diária                  | Não             |
| `qualidade-dados`          | Horária                 | Não             |

## Deploy

O projeto foi construído para Vercel, mas roda em qualquer runtime Node ≥ 20 com Postgres.

1. Provisione Postgres 14+ e rode `npm run db:deploy` (aplica migrações sem tocar em dados) e, na
   primeira vez, `npm run db:seed`.
2. Configure as variáveis de ambiente no provedor (as chaves de IA e de pagamento são opcionais;
   sem elas o produto funciona no modo padrão descrito acima).
3. Configure os cron jobs. Em Vercel Cron, a configuração recomendada está em `vercel.json`.
4. Faça o deploy do Next.

O worker do MapLibre é servido como asset estático em `public/vendor/maplibre/`; o script
`scripts/copy-map-worker.mjs` roda automaticamente antes do build e do dev.

## Contrato editorial (não negociável)

- Nenhum número exibido sem fonte.
- Nenhum dado inventado. "Dados não disponíveis" é uma resposta legítima.
- Índices proprietários são declarados como proprietários, com metodologia aberta.
- Perfis de pessoas contêm apenas informação pública de natureza institucional.
- Notícias entram como título, resumo próprio e link. Nunca reproduzimos o texto integral.
- Dados de demonstração aparecem sempre rotulados.

## Licença

Uso interno enquanto o produto está sob construção.
