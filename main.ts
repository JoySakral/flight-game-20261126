// main.ts — Sky Courier's hand-in program (Node 22, standard library
// only). It copies this repository's game/ and screenshots/ into the
// output directory and writes dossier.json there with the vendored
// make.fun library, so the sealed gate can check the entry and the
// judge can read it. Run it as:
//   MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader MAKEFUN_OUTPUT_DIR stands in for /output; inside
// the grader it defaults to /output. The program writes the same bytes
// on every run: it only copies files and builds the dossier.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function fail(message) {
  console.error(`main.ts: ${message}`);
  process.exit(1);
}

if (!existsSync(join(repoRoot, 'game', 'index.html'))) {
  fail('game/index.html is missing — nothing to hand in.');
}
if (!existsSync(join(repoRoot, 'screenshots'))) {
  fail('screenshots/ is missing — the entry needs 3 or 4 screenshots.');
}

// Count the screenshots first: the gate wants 3 or 4, each a regular
// file, so refuse early with a clear message instead of handing in a
// broken entry.
const shots = readdirSync(join(repoRoot, 'screenshots'))
  .filter((name) => !name.startsWith('.'))
  .filter((name) => statSync(join(repoRoot, 'screenshots', name)).isFile());
if (shots.length < 3 || shots.length > 4) {
  fail(`expected 3 or 4 screenshots, found ${shots.length}.`);
}

// Copy the game and its screenshots into the output directory.
mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });

// Build the dossier with the same limits the gate enforces, so what we
// hand in is exactly what the scorer expects to see.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(`handed in: game/ + ${shots.length} screenshots + dossier.json -> ${outputDir}`);
