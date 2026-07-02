import { execSync } from "node:child_process";
import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

import { DEFAULT_CLONE_DIR } from "../end-to-end/helpers/args.ts";
import {
  loadScenario,
  normalizeScenarioPath,
} from "../end-to-end/helpers/directory.ts";

const USAGE = `
scripts/benchmark/dump-standard-json.ts — Dump the solx standard-JSON input(s)

DESCRIPTION
  Compiles each solx profile of an already-initialized scenario with solx's
  SOLX_STANDARD_JSON_DEBUG env var set, capturing the exact standard-JSON input
  solx receives on stdin. The dumped files can be replayed directly against solx
  (solx --standard-json < file) for perf runs without the Hardhat fixture. This
  reuses the scenario working directory that bench:regression already cloned and
  installed, so it runs after the timing benchmark.

OPTIONS
  --scenario <path>      Required. Scenario folder/file (same as bench:regression)
  --out <dir>            Output directory for the dumps (default: ./solx-standard-json)
  --e2e-clone-dir <p>    Override clone dir (default: $E2E_CLONE_DIR or ${DEFAULT_CLONE_DIR})

EXAMPLE
  pnpm bench:dump-standard-json --scenario ./end-to-end/openzeppelin-contracts-0.34 \\
    --out solx-standard-json
`;

// The four distinct solx inputs the scenario exercises: {legacy, viaIR} x
// {DWARF on, no-DWARF}. viaIR flips `settings.viaIR`; no-DWARF strips the
// debugInfo outputSelection selectors (via HARDHAT_SOLX_DISABLE_DEBUG_INFO,
// handled by the scenario's noDwarfBenchmarkPlugin), so each is a different
// standard-JSON.
const VARIANTS: ReadonlyArray<{
  file: string;
  flags: string[];
  env: NodeJS.ProcessEnv;
}> = [
  {
    file: "solx-legacy-dwarf.json",
    flags: ["--build-profile", "solx"],
    env: {},
  },
  {
    file: "solx-via-ir-dwarf.json",
    flags: ["--build-profile", "solx-via-ir"],
    env: {},
  },
  {
    file: "solx-legacy-no-dwarf.json",
    flags: ["--build-profile", "solx"],
    env: { HARDHAT_SOLX_DISABLE_DEBUG_INFO: "true" },
  },
  {
    file: "solx-via-ir-no-dwarf.json",
    flags: ["--build-profile", "solx-via-ir"],
    env: { HARDHAT_SOLX_DISABLE_DEBUG_INFO: "true" },
  },
];

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 && i + 1 < process.argv.length
    ? process.argv[i + 1]
    : undefined;
}

function main(): void {
  const scenarioPath = getArg("--scenario");

  if (scenarioPath === undefined) {
    console.log(USAGE);
    process.exit(1);
  }

  const outDir = path.resolve(getArg("--out") ?? "./solx-standard-json");
  const cloneDir =
    getArg("--e2e-clone-dir") ?? process.env.E2E_CLONE_DIR ?? DEFAULT_CLONE_DIR;
  const { workingDir } = loadScenario(
    cloneDir,
    normalizeScenarioPath(scenarioPath),
  );

  // solx writes the dump to the exact path in SOLX_STANDARD_JSON_DEBUG without
  // creating parent directories, so make sure the target dir exists first.
  mkdirSync(outDir, { recursive: true });

  for (const { file, flags, env } of VARIANTS) {
    const dumpPath = path.join(outDir, file);
    execSync("npx hardhat clean", { cwd: workingDir, stdio: "ignore" });
    execSync(["npx", "hardhat", "compile", ...flags].join(" "), {
      cwd: workingDir,
      stdio: "ignore",
      env: { ...process.env, ...env, SOLX_STANDARD_JSON_DEBUG: dumpPath },
    });

    if (!existsSync(dumpPath)) {
      throw new Error(
        `solx did not produce ${dumpPath} — SOLX_STANDARD_JSON_DEBUG may be unsupported by this solx version`,
      );
    }
    console.log(`${file}: ${statSync(dumpPath).size} B`);
  }

  console.log(`Wrote ${VARIANTS.length} standard-JSON dump(s) to ${outDir}`);
}

main();
