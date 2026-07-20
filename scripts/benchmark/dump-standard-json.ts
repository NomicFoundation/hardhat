import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";

import { DEFAULT_CLONE_DIR } from "../end-to-end/helpers/args.ts";
import {
  loadScenario,
  normalizeScenarioPath,
} from "../end-to-end/helpers/directory.ts";
import { discoverScenarioPathsByTag } from "./helpers/scenarios.ts";
import type { ScenarioDefinition } from "../end-to-end/types.ts";

const USAGE = `
scripts/benchmark/dump-standard-json.ts — Dump the solx standard-JSON input(s)

DESCRIPTION
  Compiles each solx profile of already-initialized scenario(s) with solx's
  SOLX_STANDARD_JSON_DEBUG env var set, capturing the exact standard-JSON input
  solx receives on stdin. The dumped files can be replayed directly against solx
  (solx --standard-json < file) for perf runs without the Hardhat fixture. This
  reuses the scenario working directories that bench:regression already cloned
  and installed, so it runs after the timing benchmark. Dumps are written to a
  per-scenario subdirectory of --out, so multiple scenarios share one artifact
  without collision.

  A manifest.json with provenance (hardhat commit, CI run URL, hardhat-solx
  version, scenario pins, per-file sha256) is written to --out LAST, so its
  presence marks a complete dump set — consumers (the corpus publish step,
  downstream solx benchmarks) must treat a dump directory without it as
  partial.

OPTIONS
  --scenario <path>      Scenario folder/file (same as bench:regression)
  --tag <tag>            Dump every enabled scenario carrying this tag instead
                         (exactly one of --scenario / --tag is required)
  --out <dir>            Output directory for the dumps (default: ./solx-standard-json)
  --e2e-clone-dir <p>    Override clone dir (default: $E2E_CLONE_DIR or ${DEFAULT_CLONE_DIR})

EXAMPLE
  pnpm bench:dump-standard-json --tag solx --out solx-standard-json
`;

interface Variant {
  file: string;
  flags: string[];
  env: NodeJS.ProcessEnv;
}

// Every solx scenario exercises the {legacy, viaIR} pair. viaIR flips
// `settings.viaIR`, so each is a different standard-JSON.
const DWARF_VARIANTS: readonly Variant[] = [
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
];

// The no-DWARF pair strips the debugInfo outputSelection selectors via
// HARDHAT_SOLX_DISABLE_DEBUG_INFO, which only scenarios that install the
// noDwarfBenchmarkPlugin honor — elsewhere the env var is silently ignored
// and would produce misleading duplicates of the DWARF dumps.
const NO_DWARF_VARIANTS: readonly Variant[] = [
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

/**
 * A scenario opts into the no-DWARF dumps by benchmarking no-DWARF cells:
 * declaring them requires the noDwarfBenchmarkPlugin, which is also exactly
 * what makes the no-DWARF dumps meaningful. Derived from scenario.json, so
 * dump variants can never drift from the benchmarked cells. The same
 * derivation applies to --no-tests: a scenario whose benchmarked cells skip
 * test compilation must be dumped without tests too, or the dump captures a
 * different (possibly uncompilable) build than the one being benchmarked.
 */
function variantsFor(definition: ScenarioDefinition): readonly Variant[] {
  const commandsJson = JSON.stringify(definition.benchmark?.commands ?? {});

  const variants = commandsJson.includes("HARDHAT_SOLX_DISABLE_DEBUG_INFO")
    ? [...DWARF_VARIANTS, ...NO_DWARF_VARIANTS]
    : [...DWARF_VARIANTS];

  if (!commandsJson.includes("--no-tests")) {
    return variants;
  }
  return variants.map((variant) => ({
    ...variant,
    flags: [...variant.flags, "--no-tests"],
  }));
}

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 && i + 1 < process.argv.length
    ? process.argv[i + 1]
    : undefined;
}

const REPO_ROOT = path.resolve(import.meta.dirname, "..", "..");

interface ManifestScenario {
  repo: string;
  commit: string;
  files: Record<string, string>;
}

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

// No timestamp on purpose: identical dumps must produce an identical manifest
// (modulo runUrl), so the publish step can skip no-op corpus versions.
function writeManifest(
  outDir: string,
  scenarios: Record<string, ManifestScenario>,
): void {
  const manifest = {
    hardhatCommit: execSync("git rev-parse HEAD", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim(),
    runUrl:
      process.env.GITHUB_RUN_ID !== undefined
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null,
    hardhatSolxVersion: JSON.parse(
      readFileSync(
        path.join(REPO_ROOT, "packages", "hardhat-solx", "package.json"),
        "utf8",
      ),
    ).version,
    scenarios,
  };
  writeFileSync(
    path.join(outDir, "manifest.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

function main(): void {
  const scenarioPath = getArg("--scenario");
  const tag = getArg("--tag");

  if ((scenarioPath === undefined) === (tag === undefined)) {
    console.log(USAGE);
    process.exit(1);
  }

  const scenarioPaths =
    scenarioPath !== undefined
      ? [normalizeScenarioPath(scenarioPath)]
      : discoverScenarioPathsByTag(tag as string);

  if (scenarioPaths.length === 0) {
    throw new Error(`No scenarios found with tag "${tag}"`);
  }

  const outDir = path.resolve(getArg("--out") ?? "./solx-standard-json");
  const cloneDir =
    getArg("--e2e-clone-dir") ?? process.env.E2E_CLONE_DIR ?? DEFAULT_CLONE_DIR;

  let dumped = 0;
  const manifestScenarios: Record<string, ManifestScenario> = {};

  for (const jsonPath of scenarioPaths) {
    const { id, workingDir, definition } = loadScenario(cloneDir, jsonPath);
    const scenarioOutDir = path.join(outDir, id);
    const manifestScenario: ManifestScenario = {
      repo: definition.repo,
      commit: definition.commit,
      files: {},
    };
    manifestScenarios[id] = manifestScenario;

    // solx writes the dump to the exact path in SOLX_STANDARD_JSON_DEBUG
    // without creating parent directories, so make sure the target dir exists.
    mkdirSync(scenarioOutDir, { recursive: true });

    for (const { file, flags, env } of variantsFor(definition)) {
      const dumpPath = path.join(scenarioOutDir, file);
      execSync("npx hardhat clean", { cwd: workingDir, stdio: "ignore" });
      // definition.env carries scenario-level compile requirements (e.g.
      // aave-v4-solx's EVM_DISABLE_MEMORY_SAFE_ASM_CHECK); without it the
      // dump compile fails where the benchmarked cells succeed.
      execSync(["npx", "hardhat", "compile", ...flags].join(" "), {
        cwd: workingDir,
        stdio: "ignore",
        env: {
          ...process.env,
          ...definition.env,
          ...env,
          SOLX_STANDARD_JSON_DEBUG: dumpPath,
        },
      });

      if (!existsSync(dumpPath)) {
        throw new Error(
          `solx did not produce ${dumpPath} — SOLX_STANDARD_JSON_DEBUG may be unsupported by this solx version`,
        );
      }
      console.log(`${id}/${file}: ${statSync(dumpPath).size} B`);
      manifestScenario.files[file] = sha256(dumpPath);
      dumped++;
    }
  }

  writeManifest(outDir, manifestScenarios);

  console.log(
    `Wrote ${dumped} standard-JSON dump(s) for ${scenarioPaths.length} scenario(s) to ${outDir}`,
  );
}

main();
