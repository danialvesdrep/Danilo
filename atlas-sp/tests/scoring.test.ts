import { describe, expect, it } from "vitest";
import { SCORE_WEIGHTS, scoreBand, scoreSignal } from "@/server/radar/scoring";

describe("scoring do Radar", () => {
  it("os pesos somam 1", () => {
    const total = Object.values(SCORE_WEIGHTS).reduce((sum, weight) => sum + weight, 0);
    expect(total).toBeCloseTo(1, 6);
  });

  it("um investimento grande, recente e em cidade grande fica no topo", () => {
    const result = scoreSignal({
      category: "INVESTIMENTO",
      population: 8_000_000,
      gdp: 700_000_000_000,
      amountBRL: 2_000_000_000,
      jobs: 1500,
      sourceCount: 3,
      daysAgo: 1,
      sectorShare: 22,
      momentum: 0.5,
    });
    expect(result.score).toBeGreaterThan(70);
    expect(scoreBand(result.score).tone).not.toBe("baixo");
  });

  it("um sinal antigo em cidade pequena, sem valor, fica baixo", () => {
    const result = scoreSignal({
      category: "SERVICOS",
      population: 8_000,
      gdp: 200_000_000,
      amountBRL: null,
      jobs: null,
      sourceCount: 1,
      daysAgo: 40,
      sectorShare: 3,
      momentum: 0,
    });
    expect(result.score).toBeLessThan(50);
  });

  it("cada componente aparece em scoreRationale", () => {
    const result = scoreSignal({
      category: "INDUSTRIA",
      population: 500_000,
      gdp: 40_000_000_000,
      amountBRL: 500_000_000,
      jobs: 300,
      sourceCount: 2,
      daysAgo: 5,
      sectorShare: 18,
      momentum: 0.2,
    });
    expect(result.scoreRationale.components).toHaveLength(5);
  });
});
