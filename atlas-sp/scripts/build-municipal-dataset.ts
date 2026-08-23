/**
 * Constrói o dataset municipal de referência do Atlas SP.
 *
 * Fontes (ambas derivadas da base oficial do IBGE, empacotadas em npm para que
 * a construção seja reprodutível sem depender de rede em tempo de deploy):
 *  - `ibge-cidades-com-poligonos` → malha municipal (polígonos), códigos IBGE,
 *    meso e microrregiões.
 *  - `municipios-brasil` → coordenadas da sede, DDD, código da Receita Federal.
 *
 * Saídas em `data/`:
 *  - sp-municipalities.json  → cadastro dos 645 municípios (sem geometria)
 *  - sp-geometry.json        → geometria por código IBGE (resolução da malha)
 *  - sp-geometry-simplified.json → geometria simplificada para o mapa estadual
 *  - sp-neighbors.json       → adjacências derivadas de vértices compartilhados
 *
 * Nada aqui é estimado: o que não vem das fontes não é inventado.
 */
import fs from "node:fs";
import path from "node:path";
import {
  areaKm2,
  bboxOf,
  centroidOf,
  haversineKm,
  ringsOf,
  roundGeometry,
  simplifyGeometry,
  type Geometry,
  type Position,
} from "../src/lib/geo";
import { municipalitySlug } from "../src/lib/slug";

type PolygonRecord = {
  ufSigla: string;
  mesorregiaoCodigo: string;
  mesorregiaoNome: string;
  microrregiaoCodigo: string;
  microrregiaoNome: string;
  municipioCodigo: string;
  municipioNome: string;
  poligono: Geometry;
};

type SeatRecord = {
  codigoIbge: number;
  nome: string;
  uf: string;
  latitude: number;
  longitude: number;
  capital: boolean;
  ddd: number;
};

export type MunicipalityRecord = {
  ibgeCode: string;
  name: string;
  slug: string;
  uf: string;
  ufCode: string;
  latitude: number;
  longitude: number;
  centroid: Position;
  areaKm2: number;
  bbox: [number, number, number, number];
  ddd: string | null;
  isCapital: boolean;
  mesoCode: string;
  mesoName: string;
  microCode: string;
  microName: string;
};

const DATA_DIR = path.resolve(process.cwd(), "data");
/** ~0,004° ≈ 400 m: preserva a silhueta do município no mapa estadual. */
const SIMPLIFY_TOLERANCE = 0.004;
const VERTEX_PRECISION = 6;

function loadPolygons(): PolygonRecord[] {
  const raw = require("ibge-cidades-com-poligonos/municipios-poligonos.json") as PolygonRecord[];
  return raw.filter((row) => row.ufSigla === "SP");
}

function loadSeats(): Map<string, SeatRecord> {
  // O pacote expõe ESM/CJS; lemos o bundle CJS para evitar interop.
  const mod = require("municipios-brasil/dados") as { municipios: SeatRecord[] };
  const list = (mod.municipios ?? []).filter((row) => row.uf === "SP");
  return new Map(list.map((row) => [String(row.codigoIbge), row]));
}

function vertexKey(position: Position): string {
  return `${position[0].toFixed(VERTEX_PRECISION)},${position[1].toFixed(VERTEX_PRECISION)}`;
}

/**
 * Adjacência derivada da própria malha: municípios limítrofes compartilham
 * vértices idênticos na malha do IBGE. Contamos vértices comuns como proxy
 * da extensão da fronteira e descartamos toques de vértice único.
 */
function buildNeighbors(
  records: MunicipalityRecord[],
  geometries: Map<string, Geometry>,
): Array<{ from: string; to: string; sharedVertices: number; centroidKm: number; borderKm: number }> {
  const vertexOwners = new Map<string, Set<string>>();
  for (const record of records) {
    const geometry = geometries.get(record.ibgeCode)!;
    const seen = new Set<string>();
    for (const ring of ringsOf(geometry)) {
      for (const position of ring) {
        const key = vertexKey(position as Position);
        if (seen.has(key)) continue;
        seen.add(key);
        let owners = vertexOwners.get(key);
        if (!owners) {
          owners = new Set();
          vertexOwners.set(key, owners);
        }
        owners.add(record.ibgeCode);
      }
    }
  }

  const shared = new Map<string, { count: number; points: Position[] }>();
  for (const [key, owners] of vertexOwners) {
    if (owners.size < 2) continue;
    const list = [...owners].sort();
    const [lon, lat] = key.split(",").map(Number);
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const pairKey = `${list[i]}|${list[j]}`;
        let entry = shared.get(pairKey);
        if (!entry) {
          entry = { count: 0, points: [] };
          shared.set(pairKey, entry);
        }
        entry.count += 1;
        entry.points.push([lon, lat]);
      }
    }
  }

  const byCode = new Map(records.map((record) => [record.ibgeCode, record]));
  const edges: Array<{
    from: string;
    to: string;
    sharedVertices: number;
    centroidKm: number;
    borderKm: number;
  }> = [];

  for (const [pairKey, entry] of shared) {
    // Um único vértice em comum é encontro de esquina, não fronteira.
    if (entry.count < 2) continue;
    const [from, to] = pairKey.split("|");
    const a = byCode.get(from)!;
    const b = byCode.get(to)!;
    // Extensão da fronteira aproximada pela envoltória dos vértices comuns.
    const points = entry.points;
    let borderKm = 0;
    const sorted = [...points].sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    for (let i = 1; i < sorted.length; i++) borderKm += haversineKm(sorted[i - 1], sorted[i]);
    edges.push({
      from,
      to,
      sharedVertices: entry.count,
      centroidKm: Number(haversineKm(a.centroid, b.centroid).toFixed(2)),
      borderKm: Number(borderKm.toFixed(2)),
    });
  }
  return edges;
}

function main() {
  const polygons = loadPolygons();
  const seats = loadSeats();
  if (polygons.length !== 645) {
    throw new Error(`Esperados 645 municípios de SP, encontrados ${polygons.length}`);
  }

  const geometries = new Map<string, Geometry>();
  const simplified = new Map<string, Geometry>();
  const records: MunicipalityRecord[] = [];
  const missingSeat: string[] = [];

  for (const row of polygons) {
    const geometry = roundGeometry(row.poligono, 5);
    const centroid = centroidOf(geometry);
    const seat = seats.get(row.municipioCodigo);
    if (!seat) missingSeat.push(row.municipioNome);

    geometries.set(row.municipioCodigo, geometry);
    simplified.set(row.municipioCodigo, simplifyGeometry(geometry, SIMPLIFY_TOLERANCE));

    records.push({
      ibgeCode: row.municipioCodigo,
      name: row.municipioNome,
      slug: municipalitySlug(row.municipioNome),
      uf: "SP",
      ufCode: "35",
      // Preferimos a coordenada da sede municipal; sem ela, o centroide da malha.
      latitude: seat ? seat.latitude : Number(centroid[1].toFixed(6)),
      longitude: seat ? seat.longitude : Number(centroid[0].toFixed(6)),
      centroid: [Number(centroid[0].toFixed(6)), Number(centroid[1].toFixed(6))],
      areaKm2: Number(areaKm2(geometry).toFixed(2)),
      bbox: bboxOf(geometry).map((value) => Number(value.toFixed(5))) as [
        number,
        number,
        number,
        number,
      ],
      ddd: seat ? String(seat.ddd) : null,
      isCapital: seat?.capital ?? false,
      mesoCode: `35${row.mesorregiaoCodigo}`,
      mesoName: row.mesorregiaoNome,
      microCode: `35${row.microrregiaoCodigo}`,
      microName: row.microrregiaoNome,
    });
  }

  records.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const neighbors = buildNeighbors(records, geometries);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const write = (file: string, payload: unknown) => {
    const target = path.join(DATA_DIR, file);
    fs.writeFileSync(target, JSON.stringify(payload));
    const kb = (fs.statSync(target).size / 1024).toFixed(0);
    console.log(`  ${file.padEnd(30)} ${kb.padStart(6)} KB`);
  };

  console.log(`Municípios de SP processados: ${records.length}`);
  write("sp-municipalities.json", records);
  write("sp-geometry.json", Object.fromEntries(geometries));
  write("sp-geometry-simplified.json", Object.fromEntries(simplified));
  write("sp-neighbors.json", neighbors);

  const isolated = records.filter(
    (record) => !neighbors.some((edge) => edge.from === record.ibgeCode || edge.to === record.ibgeCode),
  );
  console.log(`Adjacências: ${neighbors.length}`);
  console.log(
    `Vizinhos por município: média ${(
      (neighbors.length * 2) / records.length
    ).toFixed(1)}, sem vizinho ${isolated.length}${
      isolated.length ? ` (${isolated.map((r) => r.name).join(", ")})` : ""
    }`,
  );
  if (missingSeat.length) {
    console.log(`Sem coordenada de sede (usado centroide da malha): ${missingSeat.length}`);
  }
}

main();
