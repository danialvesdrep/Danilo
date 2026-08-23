import { describe, expect, it } from "vitest";
import { formatCurrencyScaled, formatDelta, formatUnit, formatCents } from "@/lib/format";

describe("formatação", () => {
  it("escala moeda para bilhão, milhão e mil", () => {
    expect(formatCurrencyScaled(2_400_000_000)).toContain("bi");
    expect(formatCurrencyScaled(3_500_000)).toContain("mi");
    expect(formatCurrencyScaled(45_000)).toContain("mil");
  });

  it("delta ganha sinal explícito", () => {
    expect(formatDelta(2.1)).toContain("+");
    expect(formatDelta(-1.2)).toContain("-");
    expect(formatDelta(null)).toBe("—");
  });

  it("respeita unidades", () => {
    expect(formatUnit(1234, "pessoas", 0)).toBe("1.234");
    expect(formatUnit(0.15, "%", 1)).toBe("0,2%");
    expect(formatUnit(3200, "hab/km2", 0)).toBe("3.200 hab/km²");
  });

  it("converte centavos", () => {
    expect(formatCents(14900)).toContain("149");
    expect(formatCents(null)).toBe("Sob consulta");
  });
});
