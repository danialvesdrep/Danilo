/** Formatação pt-BR centralizada — a interface nunca formata números na mão. */

const numberFormat = new Intl.NumberFormat("pt-BR");
const compactFormat = new Intl.NumberFormat("pt-BR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatNumber(value: number | null | undefined, precision = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

export function formatCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return compactFormat.format(value);
}

/** Reais em escala legível: R$ 1,2 bi / R$ 340 mi / R$ 45 mil. */
export function formatCurrencyScaled(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e9) return `R$ ${formatNumber(value / 1e9, 1)} bi`;
  if (abs >= 1e6) return `R$ ${formatNumber(value / 1e6, 1)} mi`;
  if (abs >= 1e3) return `R$ ${formatNumber(value / 1e3, 0)} mil`;
  return `R$ ${formatNumber(value, 0)}`;
}

export function formatCurrency(value: number | null | undefined, precision = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
}

/** Centavos → moeda, usado pelos planos. */
export function formatCents(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "Sob consulta";
  return formatCurrency(cents / 100, cents % 100 === 0 ? 0 : 2);
}

export function formatPercent(value: number | null | undefined, precision = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${formatNumber(value, precision)}%`;
}

export function formatDelta(value: number | null | undefined, precision = 1): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value, precision)}%`;
}

export function formatUnit(
  value: number | null | undefined,
  unit: string,
  precision = 0,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  switch (unit) {
    case "BRL":
      return formatCurrencyScaled(value);
    case "BRL_UNIT":
      return formatCurrency(value, precision);
    case "%":
      return formatPercent(value, precision);
    case "pessoas":
    case "unidades":
    case "vinculos":
    case "empresas":
      return formatNumber(value, 0);
    case "km2":
      return `${formatNumber(value, precision)} km²`;
    case "hab/km2":
      return `${formatNumber(value, precision)} hab/km²`;
    case "anos":
      return `${formatNumber(value, precision)} anos`;
    case "indice":
      return formatNumber(value, 3);
    default:
      return `${formatNumber(value, precision)}${unit ? ` ${unit}` : ""}`;
  }
}

const dateFormat = new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" });
const dateTimeFormat = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return dateFormat.format(typeof value === "string" ? new Date(value) : value);
}

export function formatDateTime(value: Date | string | null | undefined): string {
  if (!value) return "—";
  return dateTimeFormat.format(typeof value === "string" ? new Date(value) : value);
}

/** "há 3 horas", "há 2 dias" — usado no Radar e no feed Agora. */
export function formatRelative(value: Date | string | null | undefined, now = new Date()): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  const diffMs = now.getTime() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
  const months = Math.round(days / 30);
  if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
  const years = Math.round(months / 12);
  return `há ${years} ${years === 1 ? "ano" : "anos"}`;
}

export const formatList = (items: string[]): string =>
  new Intl.ListFormat("pt-BR", { style: "long", type: "conjunction" }).format(items);
