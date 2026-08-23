/**
 * O MapLibre roda a análise das fontes em um Web Worker. Quando empacotado pelo
 * Next, a resolução automática da URL desse worker falha e o mapa fica em branco
 * silenciosamente. A solução estável é servir os arquivos do worker como ativos
 * estáticos e apontar `setWorkerUrl` para eles.
 *
 * Roda antes do build e do dev.
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const distDir = path.dirname(require.resolve("maplibre-gl/dist/maplibre-gl-worker.mjs"));
const targetDir = path.resolve(process.cwd(), "public/vendor/maplibre");

await mkdir(targetDir, { recursive: true });

const files = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];
for (const file of files) {
  await copyFile(path.join(distDir, file), path.join(targetDir, file));
}

// Registra a versão copiada para que uma atualização do pacote seja percebida.
const { version } = JSON.parse(await readFile(require.resolve("maplibre-gl/package.json"), "utf8"));
await writeFile(path.join(targetDir, "VERSION"), `${version}\n`);

console.log(`maplibre worker ${version} copiado para public/vendor/maplibre`);
