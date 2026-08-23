import { cn } from "@/lib/cn";

/**
 * Superfície base do produto. Sem sombras pesadas nem gradientes: a separação
 * vem da linha de 1px e da mudança sutil de fundo, como em material impresso.
 */
export function Card({
  className,
  children,
  as: Component = "section",
  interactive = false,
  id,
}: {
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
  interactive?: boolean;
  id?: string;
}) {
  return (
    <Component
      id={id}
      className={cn(
        "rounded-[var(--radius-lg)] border bg-[var(--bg-raised)]",
        interactive &&
          "transition-[border-color,box-shadow] duration-200 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-card)]",
        className,
      )}
      style={{ borderColor: "var(--border)" }}
    >
      {children}
    </Component>
  );
}

export function CardHeader({
  title,
  eyebrow,
  description,
  action,
  className,
  dense = false,
}: {
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  dense?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-4 border-b",
        dense ? "px-4 py-3" : "px-5 py-4",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-1.5">{eyebrow}</div> : null}
        <h2 className="text-[15px] font-semibold leading-tight tracking-[-0.01em]">{title}</h2>
        {description ? (
          <p className="mt-1 text-[13px] leading-relaxed text-[var(--fg-muted)]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({
  className,
  children,
  dense = false,
}: {
  className?: string;
  children: React.ReactNode;
  dense?: boolean;
}) {
  return <div className={cn(dense ? "p-4" : "p-5", className)}>{children}</div>;
}

export function CardFooter({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("flex items-center gap-3 border-t px-5 py-3 text-[13px]", className)}>
      {children}
    </div>
  );
}
