import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight, Building2, Radar as RadarIcon, Sparkles, Map, ChartLine,
  Landmark, Puzzle, Newspaper, ShieldCheck,
} from "lucide-react";
import { GlobalSearch } from "@/components/shell/global-search";
import { StateMapPanel } from "@/components/map/state-map-panel";
import { getCurrentUser } from "@/server/auth/session";
import { getRadarSummary } from "@/server/queries/radar";
import { formatNumber } from "@/lib/format";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: SITE.tagline,
  description: SITE.description,
  alternates: { canonical: "/" },
};

export const revalidate = 600;

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const summary = await getRadarSummary();

  return (
    <>
      <section className="grid-backdrop border-b">
        <div className="mx-auto max-w-[1200px] px-4 py-16 lg:px-6 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <p className="eyebrow">Estado de São Paulo · 645 municípios</p>
            <h1 className="headline mt-3 text-[clamp(2rem,5vw,3.6rem)]">
              Entenda São Paulo antes de todo mundo.
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed text-[var(--fg-muted)]">
              Inteligência territorial, econômica e política para acompanhar as cidades do Estado em
              um só lugar — com o dado, o contexto e a fonte lado a lado.
            </p>

            <div className="mx-auto mt-8 max-w-xl">
              <GlobalSearch size="lg" placeholder="Pesquise uma cidade, pessoa, empresa ou setor..." />
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 text-[14px] font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110"
              >
                Explorar a plataforma
                <ArrowUpRight className="size-3.5" aria-hidden />
              </Link>
              <Link
                href="/cadastro"
                className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-5 text-[14px] font-medium transition-colors hover:bg-[var(--bg-inset)]"
              >
                Começar agora
              </Link>
            </div>

            <dl className="mx-auto mt-12 grid max-w-2xl grid-cols-2 gap-6 sm:grid-cols-4">
              {[
                { label: "Municípios", value: formatNumber(645) },
                { label: "Movimentos em 24 h", value: formatNumber(summary.last24h) },
                { label: "Em 7 dias", value: formatNumber(summary.last7d) },
                { label: "Alta prioridade", value: formatNumber(summary.highPriority) },
              ].map((stat) => (
                <div key={stat.label}>
                  <dd className="metric-value text-[24px] font-semibold leading-none tracking-[-0.02em]">
                    {stat.value}
                  </dd>
                  <dt className="mt-1.5 text-[11.5px] uppercase tracking-[0.05em] text-[var(--fg-subtle)]">
                    {stat.label}
                  </dt>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 py-14 lg:px-6">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <p className="eyebrow">Como o Atlas SP funciona</p>
          <h2 className="headline mt-2 text-[28px]">
            Dados → contexto → inteligência
          </h2>
          <p className="mt-3 text-[13.5px] leading-relaxed text-[var(--fg-muted)]">
            Não é um portal de notícias, não é um dashboard genérico. É um sistema integrado que liga
            cada dado ao seu município, ao seu setor, à sua fonte e ao seu histórico.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: RadarIcon, title: "Radar", body: "Movimentos relevantes detectados nos 645 municípios, ordenados por um índice proprietário — o que merece atenção, com o porquê ao lado." },
            { icon: Sparkles, title: "Atlas AI", body: "Camada de inteligência sobre o acervo da plataforma. Separa fatos, interpretação e hipóteses e cita a fonte de cada afirmação." },
            { icon: Map, title: "Mapa temático", body: "Os 645 municípios em uma malha só. Troque a métrica para reler o Estado por outro recorte, do PIB à densidade demográfica." },
            { icon: ChartLine, title: "Economia municipal", body: "PIB, valor adicionado, emprego, empresas, finanças públicas e a composição setorial de cada cidade — a economia local em profundidade." },
            { icon: Landmark, title: "Política municipal", body: "Prefeitura, secretarias, Câmara e proposições em um lugar só. Descrição factual, sem opinião sobre desempenho." },
            { icon: Puzzle, title: "Grafo de entidades", body: "Cidades, pessoas, empresas, setores e movimentos ligados uns aos outros. Uma notícia nunca termina na notícia — leva ao contexto." },
            { icon: Newspaper, title: "Notícias com contexto", body: "Título, resumo próprio e link. Nunca reproduzimos o texto integral; conectamos cada matéria à cidade, ao setor e ao que veio antes." },
            { icon: Building2, title: "Comparar cidades", body: "Até quatro municípios lado a lado, nos mesmos indicadores e no mesmo período de referência." },
            { icon: ShieldCheck, title: "Fonte ao lado do dado", body: "Nenhum número aparece sem origem. Cada indicador carrega fonte, período, metodologia e link para o original." },
          ].map((feature) => (
            <article
              key={feature.title}
              className="rounded-[var(--radius-lg)] border bg-[var(--bg-raised)] p-5 transition-colors hover:border-[var(--border-strong)]"
            >
              <feature.icon className="size-4 text-[var(--accent)]" aria-hidden />
              <h3 className="mt-3 text-[15px] font-semibold">{feature.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--fg-muted)]">
                {feature.body}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[1400px] px-4 pb-14 lg:px-6">
        <div className="rounded-[var(--radius-lg)] border bg-[var(--bg-raised)] p-4">
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <div>
              <p className="eyebrow">Estado de São Paulo</p>
              <h2 className="headline text-[20px]">Os 645 municípios em um mapa só</h2>
            </div>
            <Link
              href="/mapa"
              className="text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              Abrir mapa completo
            </Link>
          </div>
          <StateMapPanel height={480} initialMetric="pib" compact />
        </div>
      </section>

      <section className="border-t bg-[var(--bg-subtle)]">
        <div className="mx-auto flex max-w-[1000px] flex-col items-center px-4 py-14 text-center lg:px-6">
          <p className="eyebrow">Contrato com o leitor</p>
          <h2 className="headline mt-2 max-w-2xl text-[28px]">
            Dado, contexto e origem — sempre juntos.
          </h2>
          <p className="mt-4 max-w-2xl text-[13.5px] leading-relaxed text-[var(--fg-muted)]">
            Não inventamos números. Onde não existe série municipal, dizemos isso. Onde uma
            informação depende de ingestão ainda não conectada, a plataforma sinaliza. Onde o dado
            é sintético, ele carrega o rótulo{" "}
            <span className="font-mono text-[12px] uppercase tracking-[0.06em] text-[var(--signal)]">
              demonstração
            </span>{" "}
            e não pode ser confundido com informação real.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/planos"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] bg-[var(--accent)] px-5 text-[14px] font-medium text-[var(--accent-fg)] hover:brightness-110"
            >
              Ver planos
            </Link>
            <Link
              href="/metodologia"
              className="inline-flex h-11 items-center rounded-[var(--radius-sm)] border border-[var(--border-strong)] px-5 text-[14px] font-medium hover:bg-[var(--bg-inset)]"
            >
              Metodologia
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
