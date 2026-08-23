import Link from "next/link";
import { AtlasMark } from "@/components/shell/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid-backdrop flex min-h-[calc(100dvh-3.5rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <AtlasMark className="size-8" />
          <span className="text-[17px] font-semibold tracking-[-0.02em]">
            Atlas<span className="text-[var(--accent)]">SP</span>
          </span>
        </Link>
        {children}
      </div>
    </div>
  );
}
