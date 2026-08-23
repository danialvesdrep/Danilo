import Link from "next/link";
import { AtlasMark } from "./logo";

const GROUPS = [
  {
    title: "Explorar",
    links: [
      { href: "/radar", label: "Radar" },
      { href: "/mapa", label: "Mapa do Estado" },
      { href: "/cidades", label: "645 municípios" },
      { href: "/regioes", label: "Regiões" },
      { href: "/comparar", label: "Comparar cidades" },
    ],
  },
  {
    title: "Dados",
    links: [
      { href: "/economia", label: "Economia" },
      { href: "/setores", label: "Setores" },
      { href: "/indicadores", label: "Indicadores" },
      { href: "/fontes", label: "Fontes e metodologia" },
      { href: "/qualidade", label: "Qualidade dos dados" },
    ],
  },
  {
    title: "Produto",
    links: [
      { href: "/planos", label: "Planos" },
      { href: "/ia", label: "Atlas AI" },
      { href: "/alertas", label: "Alertas" },
      { href: "/metodologia", label: "Metodologia dos índices" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacidade", label: "Política de Privacidade" },
      { href: "/termos", label: "Termos de Uso" },
      { href: "/cookies", label: "Política de Cookies" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t bg-[var(--bg-subtle)]">
      <div className="mx-auto max-w-[1600px] px-4 py-10 lg:px-6">
        <div className="grid gap-8 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <AtlasMark className="size-7" />
              <span className="text-[15px] font-semibold tracking-[-0.02em]">
                Atlas<span className="text-[var(--accent)]">SP</span>
              </span>
            </div>
            <p className="mt-3 max-w-xs text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
              Inteligência territorial, econômica e política sobre os 645 municípios do Estado de
              São Paulo. Cada dado exibido carrega a sua fonte.
            </p>
          </div>

          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="eyebrow">{group.title}</p>
              <ul className="mt-3 space-y-1.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-[12.5px] text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t pt-5 text-[11.5px] text-[var(--fg-subtle)] sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} Atlas SP. Os índices da plataforma são proprietários e não
            constituem indicadores oficiais.
          </p>
          <p>
            Dados de fontes públicas — IBGE, SEADE, Tesouro Nacional, MTE, TSE e demais órgãos
            citados em cada indicador.
          </p>
        </div>
      </div>
    </footer>
  );
}
