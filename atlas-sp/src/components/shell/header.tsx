"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X, User2, LogOut, Shield, Bell, Bookmark } from "lucide-react";
import { cn } from "@/lib/cn";
import { GlobalSearch } from "./global-search";
import { ThemeToggle } from "./theme";
import { AtlasMark } from "./logo";
import type { SessionUser } from "@/server/auth/session";

const NAV = [
  { href: "/radar", label: "Radar" },
  { href: "/mapa", label: "Mapa" },
  { href: "/cidades", label: "Cidades" },
  { href: "/economia", label: "Economia" },
  { href: "/setores", label: "Setores" },
  { href: "/politica", label: "Política" },
  { href: "/noticias", label: "Notícias" },
  { href: "/indicadores", label: "Indicadores" },
  { href: "/comparar", label: "Comparar" },
  { href: "/ia", label: "Atlas AI" },
];

export function Header({ user }: { user: SessionUser | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-50 border-b bg-[var(--bg-overlay)] backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center gap-3 px-4 lg:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="Atlas SP — início">
          <AtlasMark className="size-7" />
          <span className="hidden text-[15px] font-semibold tracking-[-0.02em] sm:block">
            Atlas<span className="text-[var(--accent)]">SP</span>
          </span>
        </Link>

        <nav className="hidden min-w-0 flex-1 items-center gap-0.5 xl:flex" aria-label="Principal">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] font-medium transition-colors",
                isActive(item.href)
                  ? "bg-[var(--bg-inset)] text-[var(--fg)]"
                  : "text-[var(--fg-muted)] hover:bg-[var(--bg-inset)] hover:text-[var(--fg)]",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 xl:max-w-md xl:flex-none">
          <GlobalSearch className="w-full min-w-0 xl:w-80" placeholder="Pesquisar..." />

          <ThemeToggle className="hidden sm:inline-flex" />

          {user ? (
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((value) => !value)}
                onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
                aria-label="Conta"
                aria-expanded={menuOpen}
                className="flex size-8 items-center justify-center rounded-full border bg-[var(--bg-raised)] text-[12px] font-semibold uppercase transition-colors hover:bg-[var(--bg-inset)]"
              >
                {(user.name ?? user.email).slice(0, 2)}
              </button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-50 mt-1.5 w-60 rounded-[var(--radius-md)] border bg-[var(--bg-raised)] py-1 shadow-[var(--shadow-pop)]">
                  <div className="border-b px-3 pb-2 pt-1.5">
                    <p className="truncate text-[13px] font-medium">{user.name ?? "Conta"}</p>
                    <p className="truncate text-[11.5px] text-[var(--fg-muted)]">{user.email}</p>
                    <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-[var(--accent)]">
                      Plano {user.planName}
                    </p>
                  </div>
                  <MenuLink href="/minha-visao" icon={Bookmark}>Minha visão</MenuLink>
                  <MenuLink href="/alertas" icon={Bell}>Alertas</MenuLink>
                  <MenuLink href="/configuracoes" icon={User2}>Configurações</MenuLink>
                  <MenuLink href="/assinatura" icon={Shield}>Assinatura</MenuLink>
                  {user.role === "ADMIN" ? (
                    <MenuLink href="/admin" icon={Shield}>Administração</MenuLink>
                  ) : null}
                  <form action="/api/auth/logout" method="post" className="border-t pt-1">
                    <button
                      type="submit"
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-inset)] hover:text-[var(--fg)]"
                    >
                      <LogOut className="size-3.5" aria-hidden />
                      Sair
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              <Link
                href="/entrar"
                className="rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[13px] font-medium text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
              >
                Entrar
              </Link>
              <Link
                href="/cadastro"
                className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent-fg)] transition-[filter] hover:brightness-110"
              >
                Começar
              </Link>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            className="shrink-0 rounded-[var(--radius-sm)] p-1.5 text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-inset)] xl:hidden"
          >
            {mobileOpen ? <X className="size-4.5" aria-hidden /> : <Menu className="size-4.5" aria-hidden />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t bg-[var(--bg-raised)] xl:hidden">
          <nav className="mx-auto grid max-w-[1600px] grid-cols-2 gap-0.5 p-3 sm:grid-cols-3">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-[var(--radius-sm)] px-3 py-2.5 text-[13.5px] font-medium transition-colors",
                  isActive(item.href)
                    ? "bg-[var(--bg-inset)] text-[var(--fg)]"
                    : "text-[var(--fg-muted)] hover:bg-[var(--bg-inset)]",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between border-t px-4 py-3">
            <ThemeToggle />
            {!user ? (
              <div className="flex gap-2">
                <Link href="/entrar" className="text-[13px] font-medium text-[var(--fg-muted)]">
                  Entrar
                </Link>
                <Link
                  href="/cadastro"
                  className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-3 py-1.5 text-[13px] font-medium text-[var(--accent-fg)]"
                >
                  Começar
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </header>
  );
}

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-[var(--fg-muted)] transition-colors hover:bg-[var(--bg-inset)] hover:text-[var(--fg)]"
    >
      <Icon className="size-3.5" aria-hidden />
      {children}
    </Link>
  );
}
