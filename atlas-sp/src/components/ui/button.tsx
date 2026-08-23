import Link from "next/link";
import { cn } from "@/lib/cn";

const VARIANTS = {
  primary:
    "bg-[var(--accent)] text-[var(--accent-fg)] border-transparent hover:brightness-110 active:brightness-95",
  signal:
    "bg-[var(--signal)] text-[var(--signal-fg)] border-transparent hover:brightness-110 active:brightness-95",
  secondary:
    "bg-[var(--bg-raised)] text-[var(--fg)] border-[var(--border-strong)] hover:bg-[var(--bg-inset)]",
  ghost:
    "bg-transparent text-[var(--fg-muted)] border-transparent hover:bg-[var(--bg-inset)] hover:text-[var(--fg)]",
  link: "bg-transparent border-transparent text-[var(--accent)] hover:underline underline-offset-4 px-0",
  danger:
    "bg-[var(--fall)] text-white border-transparent hover:brightness-110",
} as const;

const SIZES = {
  sm: "h-7 px-2.5 text-[12px] gap-1.5",
  md: "h-9 px-3.5 text-[13px] gap-2",
  lg: "h-11 px-5 text-[14px] gap-2",
} as const;

type BaseProps = {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
  className?: string;
  children: React.ReactNode;
};

const base =
  "inline-flex items-center justify-center rounded-[var(--radius-sm)] border font-medium transition-[background-color,border-color,filter,color] duration-150 disabled:opacity-50 disabled:pointer-events-none";

export function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: BaseProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={cn(base, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({
  variant = "secondary",
  size = "md",
  className,
  children,
  href,
  ...props
}: BaseProps & { href: string } & Omit<React.ComponentProps<typeof Link>, "href" | "className">) {
  return (
    <Link href={href} className={cn(base, VARIANTS[variant], SIZES[size], className)} {...props}>
      {children}
    </Link>
  );
}
