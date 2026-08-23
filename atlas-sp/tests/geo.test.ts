import { describe, expect, it } from "vitest";
import { areaKm2, bboxOf, centroidOf, haversineKm, simplifyRing } from "@/lib/geo";

describe("geometria", () => {
  it("calcula área do polígono unitário em graus (~120 000 km² próximo do equador)", () => {
    const polygon = {
      type: "Polygon" as const,
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    };
    const area = areaKm2(polygon);
    // 1° por 1° ≈ 111 × 111 × cos(0,5°) ≈ 12 300 km². Um erro maior indicaria bug.
    expect(area).toBeGreaterThan(12_200);
    expect(area).toBeLessThan(12_400);
  });

  it("centroide do quadrado é o centro", () => {
    const centroid = centroidOf({
      type: "Polygon",
      coordinates: [[[0, 0], [2, 0], [2, 2], [0, 2], [0, 0]]],
    });
    expect(centroid[0]).toBeCloseTo(1, 6);
    expect(centroid[1]).toBeCloseTo(1, 6);
  });

  it("bbox cobre todos os vértices", () => {
    const bbox = bboxOf({
      type: "MultiPolygon",
      coordinates: [
        [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]],
        [[[3, 3], [5, 3], [5, 5], [3, 5], [3, 3]]],
      ],
    });
    expect(bbox).toEqual([-1, -1, 5, 5]);
  });

  it("Haversine reproduz distâncias conhecidas", () => {
    // São Paulo → Campinas ≈ 93 km em linha reta.
    const distance = haversineKm([-46.633, -23.55], [-47.066, -22.905]);
    expect(distance).toBeGreaterThan(75);
    expect(distance).toBeLessThan(95);
  });

  it("simplificação preserva a topologia do anel", () => {
    const ring: Array<[number, number]> = Array.from({ length: 40 }, (_, i) => [
      Math.cos((i / 40) * Math.PI * 2),
      Math.sin((i / 40) * Math.PI * 2),
    ]);
    ring.push(ring[0]);
    const simplified = simplifyRing(ring, 0.05);
    expect(simplified.length).toBeLessThan(ring.length);
    expect(simplified.length).toBeGreaterThan(6);
    expect(simplified[0]).toEqual(simplified[simplified.length - 1]);
  });
});
