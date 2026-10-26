import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
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
scripts/benchmark/dump-standard-json.ts — Dump the solx or slang standard-JSON input(s)

DESCRIPTION
  Compiles each solx profile of already-initialized scenario(s) with solx's
  SOLX_STANDARD_JSON_DEBUG env var set, capturing the exact standard-JSON input
  solx receives on stdin. The dumped files can be replayed directly against solx
  (solx --standard-json < file) for perf runs without the Hardhat fixture.

  With --compiler slang, it compiles the "slang" profile of every scenario
  with a "cold compile slang" cell instead, and takes each slang job's input
  from its build info: a build that splits into several compilation jobs dumps
  one file per job (slang.json, or slang-<build id>.json when there are
  several), where slang's single SLANG_STANDARD_JSON_DEBUG path would keep
  only the last job. This
  reuses the scenario working directories that bench:regression already cloned
  and installed, so it runs after the timing benchmark. Dumps are written to a
  per-scenario subdirectory of --out, so multiple scenarios share one artifact
  without collision.

  A manifest.json with provenance (hardhat commit, CI run URL, plugin
  version, scenario pins, the EVM_* env vars a scenario compiles with,
  per-file sha256) is written to --out LAST, so its
  presence marks a complete dump set — consumers (the corpus publish step,
  downstream solx benchmarks) must treat a dump directory without it as
  partial. Variants a scenario is known not to compile are recorded under
  "skippedVariants" with the reason, so an expected hole is legible as one;
  any other compile failure aborts the run rather than publishing a corpus
  that is quietly short a dump.

OPTIONS
  --scenario <path>      Scenario folder/file (same as bench:regression)
  --tag <tag>            Dump every enabled scenario carrying this tag instead
                         (exactly one of --scenario / --tag is required)
  --compiler <name>      solx (default) or slang
  --out <dir>            Output directory for the dumps (default: ./<compiler>-standard-json)
  --e2e-clone-dir <p>    Override clone dir (default: $E2E_CLONE_DIR or ${DEFAULT_CLONE_DIR})

EXAMPLES
  pnpm bench:dump-standard-json --tag solx --out solx-standard-json
  pnpm bench:dump-standard-json --tag solx --compiler slang --out slang-standard-json
`;

interface Variant {
  file: string;
  flags: string[];
  env: NodeJS.ProcessEnv;
}

// Every solx scenario exercises the {legacy, viaIR} pair. viaIR flips
// `settings.viaIR`, so each is a different standard-JSON. DWARF is always on
// (the shipped config); the no-DWARF twin dumps retired with the no-dwarf
// benchmark cells (numbers recorded on PR #8415).
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

/**
 * Derived from scenario.json so dump variants can never drift from the
 * benchmarked cells: a scenario whose benchmarked cells skip test compilation
 * (--no-tests) must be dumped without tests too, or the dump captures a
 * different (possibly uncompilable) build than the one being benchmarked.
 */
function variantsFor(definition: ScenarioDefinition): readonly Variant[] {
  const commandsJson = JSON.stringify(definition.benchmark?.commands ?? {});

  if (!commandsJson.includes("--no-tests")) {
    return [...DWARF_VARIANTS];
  }
  return DWARF_VARIANTS.map((variant) => ({
    ...variant,
    flags: [...variant.flags, "--no-tests"],
  }));
}

// Variants a scenario is known not to compile, keyed `<scenario>|<file>` and
// mirroring render-solx-tables' CELL_NOTES: lidofinance-core-solx's vaults tree
// is IR-only, so its legacy "solx" profile can never build. Every other
// compile failure is a regression and aborts the run.
const EXPECTED_DUMP_FAILURES: Record<string, string> = {
  "lidofinance-core-solx|solx-legacy-dwarf.json":
    "the vaults tree is IR-only: stack-too-deep in SRLib, plus RefSlotCache's " +
    "struct-array copy to storage, which legacy codegen rejects with an " +
    "UnimplementedFeatureError",
};

// Scenarios that never dump: their solx sources are already covered by
// another scenario's dump, so dumping them would double-count contracts in
// the corpus.
const DUMP_SKIPPED_SCENARIOS: Record<string, string> = {
  "lidofinance-vaults-solx":
    "its solx sources (the vaults tree at 0.8.34) are a subset of " +
    "lidofinance-core-solx's dump",
};

const SLANG_CELL = "cold compile slang";

type Compiler = "solx" | "slang";

const PLUGIN_PACKAGES: Record<Compiler, { key: string; dir: string }> = {
  solx: { key: "hardhatSolxVersion", dir: "hardhat-slang-solx" },
  slang: { key: "hardhatSlangVersion", dir: "hardhat-slang" },
};

interface BuildInfo {
  id: string;
  compilerType?: string;
  input: unknown;
}

// Scenarios configure their own artifacts path (graph-horizon writes to
// build/contracts), so look for every build-info directory in the project.
function findBuildInfoDirs(dir: string): string[] {
  const dirs: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (
      !entry.isDirectory() ||
      entry.name === "node_modules" ||
      entry.name === ".git"
    ) {
      continue;
    }
    const child = path.join(dir, entry.name);
    if (entry.name === "build-info") {
      dirs.push(child);
    } else {
      dirs.push(...findBuildInfoDirs(child));
    }
  }
  return dirs;
}

/**
 * Compiles the scenario's slang cell and writes the input of every slang job
 * the build ran, read back from the build info (whose `input` is the standard
 * JSON slang received). Jobs other compilers ran (solc for sources slang's
 * version doesn't cover) are not dumped. The build-info mtime filter skips
 * build info a project commits (e.g. ignition deployments), which
 * `hardhat clean` leaves in place.
 */
function dumpSlang(
  id: string,
  compileCwd: string,
  definition: ScenarioDefinition,
  scenarioOutDir: string,
  manifestScenario: ManifestScenario,
): number {
  const cell = definition.benchmark?.commands?.[SLANG_CELL];
  const command = cell !== undefined && "command" in cell ? cell.command : "";
  const flags = ["--build-profile", "slang"];
  if (command.includes("--no-tests")) {
    flags.push("--no-tests");
  }

  execSync("npx hardhat clean", {
    cwd: compileCwd,
    stdio: "ignore",
    env: { ...process.env, ...definition.env },
  });
  const startedAt = Date.now();
  try {
    execSync(["npx", "hardhat", "compile", ...flags].join(" "), {
      cwd: compileCwd,
      stdio: "ignore",
      env: { ...process.env, ...definition.env },
    });
  } catch (error) {
    throw new Error(
      `${id}: slang compile failed; its "${SLANG_CELL}" cell would fail too`,
      { cause: error },
    );
  }

  const jobs = findBuildInfoDirs(compileCwd)
    .flatMap((dir) =>
      readdirSync(dir)
        .filter((f) => f.endsWith(".json") && !f.endsWith(".output.json"))
        .map((f) => path.join(dir, f)),
    )
    .filter((f) => statSync(f).mtimeMs >= startedAt)
    .map((f) => JSON.parse(readFileSync(f, "utf8")) as BuildInfo)
    .filter((info) => info.compilerType === "slang")
    .sort((a, b) => a.id.localeCompare(b.id));

  if (jobs.length === 0) {
    throw new Error(`${id}: the slang compile wrote no slang build info`);
  }

  for (const job of jobs) {
    const file =
      jobs.length === 1
        ? "slang.json"
        : `slang-${job.id.split("-").at(-1)?.slice(0, 8)}.json`;
    const dumpPath = path.join(scenarioOutDir, file);
    writeFileSync(dumpPath, JSON.stringify(job.input));
    console.log(`${id}/${file}: ${statSync(dumpPath).size} B`);
    manifestScenario.files[file] = sha256(dumpPath);
  }
  return jobs.length;
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
  // The scenario's EVM_* env vars: compiler switches outside the standard
  // JSON (e.g. EVM_DISABLE_MEMORY_SAFE_ASM_CHECK) a replay needs to compile.
  compilerEnv: Record<string, string>;
  // Declared holes: a variant listed here is one the scenario is known not to
  // compile, so consumers can tell an expected gap from a missing dump.
  skippedVariants: Record<string, string>;
}

function sha256(filePath: string): string {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

// No timestamp on purpose: identical dumps must produce an identical manifest
// (modulo runUrl), so the publish step can skip no-op corpus versions.
function writeManifest(
  outDir: string,
  compiler: Compiler,
  scenarios: Record<string, ManifestScenario>,
): void {
  const plugin = PLUGIN_PACKAGES[compiler];
  const manifest = {
    hardhatCommit: execSync("git rev-parse HEAD", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim(),
    runUrl:
      process.env.GITHUB_RUN_ID !== undefined
        ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
        : null,
    [plugin.key]: JSON.parse(
      readFileSync(
        path.join(REPO_ROOT, "packages", plugin.dir, "package.json"),
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

  const compiler = getArg("--compiler") ?? "solx";
  if (compiler !== "solx" && compiler !== "slang") {
    console.log(USAGE);
    process.exit(1);
  }

  const outDir = path.resolve(getArg("--out") ?? `./${compiler}-standard-json`);
  // Created here, not just per scenario below: the manifest is written even
  // when every selected scenario is dump-skipped.
  mkdirSync(outDir, { recursive: true });
  const cloneDir =
    getArg("--e2e-clone-dir") ?? process.env.E2E_CLONE_DIR ?? DEFAULT_CLONE_DIR;

  let dumped = 0;
  const manifestScenarios: Record<string, ManifestScenario> = {};

  for (const jsonPath of scenarioPaths) {
    const { id, workingDir, definition } = loadScenario(cloneDir, jsonPath);
    if (
      compiler === "slang" &&
      definition.benchmark?.commands?.[SLANG_CELL] === undefined
    ) {
      continue;
    }
    const skipReason = DUMP_SKIPPED_SCENARIOS[id];
    if (skipReason !== undefined) {
      console.log(`${id}: skipped — ${skipReason}`);
      continue;
    }
    // Monorepo scenarios keep their Hardhat project in a subdirectory; the
    // scenario's `workdir` points the direct hardhat invocations below there.
    const compileCwd = path.join(workingDir, definition.workdir ?? ".");
    const scenarioOutDir = path.join(outDir, id);
    const manifestScenario: ManifestScenario = {
      repo: definition.repo,
      commit: definition.commit,
      files: {},
      compilerEnv: Object.fromEntries(
        Object.entries(definition.env ?? {}).filter(([name]) =>
          name.startsWith("EVM_"),
        ),
      ),
      skippedVariants: {},
    };
    manifestScenarios[id] = manifestScenario;

    // solx writes the dump to the exact path in SOLX_STANDARD_JSON_DEBUG
    // without creating parent directories, so make sure the target dir exists.
    mkdirSync(scenarioOutDir, { recursive: true });

    if (compiler === "slang") {
      dumped += dumpSlang(
        id,
        compileCwd,
        definition,
        scenarioOutDir,
        manifestScenario,
      );
      continue;
    }

    for (const { file, flags, env } of variantsFor(definition)) {
      const dumpPath = path.join(scenarioOutDir, file);
      execSync("npx hardhat clean", {
        cwd: compileCwd,
        stdio: "ignore",
        env: { ...process.env, ...definition.env },
      });
      // definition.env carries scenario-level compile requirements (e.g.
      // aave-v4-solx's EVM_DISABLE_MEMORY_SAFE_ASM_CHECK); without it the
      // dump compile fails where the benchmarked cells succeed.
      try {
        execSync(["npx", "hardhat", "compile", ...flags].join(" "), {
          cwd: compileCwd,
          stdio: "ignore",
          env: {
            ...process.env,
            ...definition.env,
            ...env,
            SOLX_STANDARD_JSON_DEBUG: dumpPath,
          },
        });
      } catch (error) {
        const reason = EXPECTED_DUMP_FAILURES[`${id}|${file}`];
        if (reason === undefined) {
          throw new Error(
            `${id}/${file}: compile failed. If this variant is legitimately ` +
              `uncompilable, declare it in EXPECTED_DUMP_FAILURES; otherwise ` +
              `it is a regression, and publishing the corpus without it would ` +
              `hide the hole.`,
            { cause: error },
          );
        }
        // Skipping beats aborting for a known-uncompilable variant: aborting
        // would lose every other scenario's dumps and block the corpus
        // publish. solx dumps the standard JSON before compiling, so a failed
        // compile can still leave a file behind; remove it or the corpus copy
        // would pick up a dump the manifest never lists.
        rmSync(dumpPath, { force: true });
        manifestScenario.skippedVariants[file] = reason;
        console.warn(`${id}/${file}: expected compile failure (${reason})`);
        continue;
      }

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

  writeManifest(outDir, compiler, manifestScenarios);

  console.log(
    `Wrote ${dumped} standard-JSON dump(s) for ${scenarioPaths.length} scenario(s) to ${outDir}`,
  );
}

main();
