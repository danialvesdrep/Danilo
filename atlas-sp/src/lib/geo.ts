/**
 * Utilitários geométricos usados na construção do dataset municipal e no mapa.
 * Todas as medidas são aproximações esféricas — a metodologia é exposta na
 * interface junto do dado, nunca apresentada como medição oficial.
 */

export type Position = [number, number];
export type Ring = Position[];
export type PolygonCoords = Ring[];
export type MultiPolygonCoords = PolygonCoords[];

export type Geometry =
  | { type: "Polygon"; coordinates: PolygonCoords }
  | { type: "MultiPolygon"; coordinates: MultiPolygonCoords };

export const EARTH_RADIUS_KM = 6371.0088;

const rad = (deg: number) => (deg * Math.PI) / 180;

/** Lista de anéis de uma geometria, independente de Polygon ou MultiPolygon. */
export function ringsOf(geometry: Geometry): Ring[] {
  return geometry.type === "Polygon"
    ? geometry.coordinates
    : geometry.coordinates.flat();
}

/** Polígonos externos (anel 0 de cada polígono) e seus buracos. */
export function polygonsOf(geometry: Geometry): PolygonCoords[] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

/** Distância haversine em km. */
export function haversineKm(a: Position, b: Position): number {
  const dLat = rad(b[1] - a[1]);
  const dLon = rad(b[0] - a[0]);
  const lat1 = rad(a[1]);
  const lat2 = rad(b[1]);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Área geodésica de um anel, em km², pelo método do excesso esférico
 * (fórmula de Chamberlain & Duquette). Sinal indica a orientação.
 */
function ringAreaKm2(ring: Ring): number {
  if (ring.length < 3) return 0;
  let total = 0;
  for (let i = 0; i < ring.length; i++) {
    const p1 = ring[i];
    const p2 = ring[(i + 1) % ring.length];
    total += rad(p2[0] - p1[0]) * (2 + Math.sin(rad(p1[1])) + Math.sin(rad(p2[1])));
  }
  return (total * EARTH_RADIUS_KM * EARTH_RADIUS_KM) / 2;
}

/** Área total da geometria em km², descontando buracos. */
export function areaKm2(geometry: Geometry): number {
  let total = 0;
  for (const polygon of polygonsOf(geometry)) {
    polygon.forEach((ring, index) => {
      const area = Math.abs(ringAreaKm2(ring));
      total += index === 0 ? area : -area;
    });
  }
  return Math.abs(total);
}

/** Bounding box [minLon, minLat, maxLon, maxLat]. */
export function bboxOf(geometry: Geometry): [number, number, number, number] {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;
  for (const ring of ringsOf(geometry)) {
    for (const [lon, lat] of ring) {
      if (lon < minLon) minLon = lon;
      if (lat < minLat) minLat = lat;
      if (lon > maxLon) maxLon = lon;
      if (lat > maxLat) maxLat = lat;
    }
  }
  return [minLon, minLat, maxLon, maxLat];
}

/** Centroide ponderado por área dos anéis externos. */
export function centroidOf(geometry: Geometry): Position {
  let cxSum = 0;
  let cySum = 0;
  let areaSum = 0;
  for (const polygon of polygonsOf(geometry)) {
    const ring = polygon[0];
    if (!ring || ring.length < 3) continue;
    let twiceArea = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x0, y0] = ring[i];
      const [x1, y1] = ring[i + 1];
      const cross = x0 * y1 - x1 * y0;
      twiceArea += cross;
      cx += (x0 + x1) * cross;
      cy += (y0 + y1) * cross;
    }
    if (twiceArea === 0) continue;
    const area = twiceArea / 2;
    cxSum += (cx / (3 * twiceArea)) * Math.abs(area);
    cySum += (cy / (3 * twiceArea)) * Math.abs(area);
    areaSum += Math.abs(area);
  }
  if (areaSum === 0) {
    const box = bboxOf(geometry);
    return [(box[0] + box[2]) / 2, (box[1] + box[3]) / 2];
  }
  return [cxSum / areaSum, cySum / areaSum];
}

function perpendicularDistance(point: Position, start: Position, end: Position): number {
  const [x, y] = point;
  const [x1, y1] = start;
  const [x2, y2] = end;
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) return Math.hypot(x - x1, y - y1);
  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clamped = Math.max(0, Math.min(1, t));
  return Math.hypot(x - (x1 + clamped * dx), y - (y1 + clamped * dy));
}

/** Simplificação Douglas-Peucker (tolerância em graus). */
export function simplifyRing(ring: Ring, tolerance: number): Ring {
  if (ring.length <= 4) return ring;
  const keep = new Uint8Array(ring.length);
  keep[0] = 1;
  keep[ring.length - 1] = 1;
  const stack: Array<[number, number]> = [[0, ring.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const dist = perpendicularDistance(ring[i], ring[first], ring[last]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (index !== -1 && maxDist > tolerance) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  const out: Ring = [];
  for (let i = 0; i < ring.length; i++) if (keep[i]) out.push(ring[i]);
  // Um anel precisa de ao menos 4 posições (fechado) para ser válido em GeoJSON.
  if (out.length < 4) return ring;
  if (out[0][0] !== out[out.length - 1][0] || out[0][1] !== out[out.length - 1][1]) {
    out.push(out[0]);
  }
  return out;
}

/** Simplifica uma geometria inteira, descartando anéis degenerados. */
export function simplifyGeometry(geometry: Geometry, tolerance: number): Geometry {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: simplifyPolygon(geometry.coordinates, tolerance) };
  }
  const polygons = geometry.coordinates
    .map((polygon) => simplifyPolygon(polygon, tolerance))
    .filter((polygon) => polygon.length > 0);
  return { type: "MultiPolygon", coordinates: polygons.length ? polygons : geometry.coordinates };
}

function simplifyPolygon(polygon: PolygonCoords, tolerance: number): PolygonCoords {
  const rings = polygon
    .map((ring) => simplifyRing(ring, tolerance))
    .filter((ring) => ring.length >= 4);
  return rings;
}

/** Arredonda coordenadas para reduzir payload sem perda visual perceptível. */
export function roundGeometry(geometry: Geometry, decimals = 5): Geometry {
  const factor = 10 ** decimals;
  const round = (ring: Ring): Ring =>
    ring.map(([lon, lat]) => [
      Math.round(lon * factor) / factor,
      Math.round(lat * factor) / factor,
    ]);
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(round) };
  }
  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map((polygon) => polygon.map(round)),
  };
}

/** Ponto dentro de polígono (ray casting), usado para hit-test no mapa. */
export function pointInGeometry(point: Position, geometry: Geometry): boolean {
  for (const polygon of polygonsOf(geometry)) {
    if (!polygon.length) continue;
    if (pointInRing(point, polygon[0])) {
      const inHole = polygon.slice(1).some((hole) => pointInRing(point, hole));
      if (!inHole) return true;
    }
  }
  return false;
}

function pointInRing(point: Position, ring: Ring): boolean {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
