import { cn } from "@/lib/cn";
import { CircleDashed, PlugZap } from "lucide-react";

/** "Dados não disponíveis" — estado honesto, nunca tela vazia sem explicação. */
export function EmptyState({
  title = "Dados não disponíveis",
  description,
  action,
  className,
  icon: Icon = CircleDashed,
}: {
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-10 text-center", className)}>
      <Icon className="size-5 text-[var(--fg-subtle)]" aria-hidden />
      <p className="mt-3 text-[13.5px] font-medium">{title}</p>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[12.5px] leading-relaxed text-[var(--fg-muted)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

/** "Fonte ainda não disponível" — a integração está mapeada mas não conectada. */
export function PendingIntegration({
  source,
  what,
  className,
}: {
  source: string;
  what: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-[var(--radius-md)] border border-dashed px-3.5 py-3",
        className,
      )}
    >
      <PlugZap className="mt-0.5 size-4 shrink-0 text-[var(--fg-subtle)]" aria-hidden />
      <div>
        <p className="text-[12.5px] font-medium">Dados em integração</p>
        <p className="mt-1 text-[12px] leading-relaxed text-[var(--fg-muted)]">
          {what} depende da ingestão de <span className="font-medium text-[var(--fg)]">{source}</span>,
          que está mapeada na arquitetura de dados mas ainda não foi conectada neste ambiente.
        </p>
      </div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

/** Carregamento de painel: mantém a densidade da tela final, sem "pulo". */
export function PanelSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-2.5 p-5", className)}>
      <Skeleton className="h-3 w-24" />
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-8 flex-1" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
  );
}
