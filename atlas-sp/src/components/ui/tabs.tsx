"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Abas navegáveis por URL: cada aba do perfil municipal é um endereço próprio,
 * indexável e compartilhável — requisito de SEO e de fluxo de navegação.
 */
export function LinkTabs({
  tabs,
  activeKey,
  className,
  paramName,
}: {
  tabs: Array<{ key: string; label: string; href: string; count?: number }>;
  activeKey: string;
  className?: string;
  paramName?: string;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const hrefFor = (tab: { key: string; href: string }) => {
    if (!paramName) return tab.href;
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, tab.key);
    return `${pathname}?${params.toString()}`;
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      className={cn(
        "flex gap-0.5 overflow-x-auto border-b [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className,
      )}
    >
      {tabs.map((tab) => {
        const active = tab.key === activeKey;
        return (
          <Link
            key={tab.key}
            href={hrefFor(tab)}
            role="tab"
            aria-selected={active}
            scroll={false}
            className={cn(
              "relative shrink-0 px-3 py-2.5 text-[13px] font-medium transition-colors",
              active
                ? "text-[var(--fg)]"
                : "text-[var(--fg-muted)] hover:text-[var(--fg)]",
            )}
          >
            {tab.label}
            {typeof tab.count === "number" ? (
              <span className="ml-1.5 tnum text-[11px] text-[var(--fg-subtle)]">{tab.count}</span>
            ) : null}
            {active ? (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--accent)]" />
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
