/**
 * Marca do Atlas SP: uma retícula de coordenadas com um ponto de leitura ativo.
 * A ideia é carta náutica/topográfica — território sob observação —, e não o
 * globo ou o gráfico de barras genérico dos dashboards.
 */
export function AtlasMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Atlas SP">
      <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--accent)" />
      <g stroke="var(--accent-fg)" strokeWidth="0.9" opacity="0.32">
        <path d="M8 3v26M16 3v26M24 3v26M3 8h26M3 16h26M3 24h26" />
      </g>
      <circle cx="20" cy="12" r="5.2" fill="none" stroke="var(--accent-fg)" strokeWidth="1.1" opacity="0.5" />
      <circle cx="20" cy="12" r="2.4" fill="var(--signal-fg, #fff)" opacity="0.16" />
      <circle cx="20" cy="12" r="2.2" fill="none" stroke="var(--accent-fg)" strokeWidth="1.3" />
      <circle cx="20" cy="12" r="0.9" fill="var(--accent-fg)" />
      <path
        d="M6 25c3-6 6.5-8.5 10-9"
        fill="none"
        stroke="var(--accent-fg)"
        strokeWidth="1.3"
        strokeLinecap="round"
        opacity="0.75"
      />
    </svg>
  );
}
