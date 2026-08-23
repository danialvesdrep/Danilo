import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

export function Breadcrumbs({
  items,
  className,
}: {
  items: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <nav aria-label="Trilha de navegação" className={cn("flex flex-wrap items-center gap-1", className)}>
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1">
          {index > 0 ? (
            <ChevronRight className="size-3 text-[var(--fg-subtle)]" aria-hidden />
          ) : null}
          {item.href ? (
            <Link
              href={item.href}
              className="text-[11.5px] text-[var(--fg-muted)] transition-colors hover:text-[var(--fg)]"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-[11.5px] text-[var(--fg-subtle)]">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
  breadcrumbs,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
  className?: string;
}) {
  return (
    <div className={cn("mb-6", className)}>
      {breadcrumbs ? <Breadcrumbs items={breadcrumbs} className="mb-2.5" /> : null}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow mb-1.5">{eyebrow}</p> : null}
          <h1 className="headline text-[clamp(1.5rem,3vw,2.15rem)]">{title}</h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[var(--fg-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
    </div>
  );
}
