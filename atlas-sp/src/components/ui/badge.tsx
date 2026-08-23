import { cn } from "@/lib/cn";

const TONES = {
  neutral: "bg-[var(--bg-inset)] text-[var(--fg-muted)] border-[var(--border)]",
  accent: "bg-[var(--accent-subtle)] text-[var(--accent)] border-[var(--accent-border)]",
  signal: "bg-[var(--signal-subtle)] text-[var(--signal)] border-[var(--signal-border)]",
  rise: "bg-[color-mix(in_srgb,var(--rise)_12%,transparent)] text-[var(--rise)] border-[color-mix(in_srgb,var(--rise)_28%,transparent)]",
  fall: "bg-[color-mix(in_srgb,var(--fall)_12%,transparent)] text-[var(--fall)] border-[color-mix(in_srgb,var(--fall)_28%,transparent)]",
  outline: "bg-transparent text-[var(--fg-muted)] border-[var(--border-strong)]",
} as const;

export type BadgeTone = keyof typeof TONES;

export function Badge({
  children,
  tone = "neutral",
  className,
  mono = false,
  title,
}: {
  children: React.ReactNode;
  tone?: BadgeTone;
  className?: string;
  mono?: boolean;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-[var(--radius-xs)] border px-1.5 py-0.5 text-[11px] font-medium leading-none whitespace-nowrap",
        mono && "font-mono tracking-[0.04em]",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
