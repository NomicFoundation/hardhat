import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  readHyperfineResult,
  toCpuEntry,
  toEntry,
  type BenchmarkEntry,
} from "./helpers/stats.ts";

const USAGE = `
scripts/benchmark/replay-standard-json.ts — Time raw solx over dumped inputs

DESCRIPTION
  Replays dumped standard-JSON inputs (bench:dump-standard-json output)
  directly against the solx binary with hyperfine — no Hardhat in the loop —
  and appends the timings to --report. The delta between a scenario's
  "raw replay solx" entry and its "cold compile solx" cell is Hardhat's own
  overhead (process startup, build system, artifact writing), tracked over
  time on the same machine.

  Each dump is validated before timing: the standard-JSON protocol reports
  compilation failure inside the JSON with exit code 0, so hyperfine alone
  would silently time failing compiles.

OPTIONS
  --dumps <dir>        Required. bench:dump-standard-json output directory
  --report <path>      Required. Existing report JSON to append entries to
  --dump <rel-path>    Required, repeatable. Dump to replay, relative to
                       --dumps (e.g. uniswap-v4-core-solx/solx-legacy-dwarf.json).
                       Kept an explicit subset: replaying every dump would
                       roughly double the benchmark's compile work.
  --solx <path>        solx binary (default: newest solx-v* in the
                       hardhat-nodejs compiler cache, where the hardhat-solx
                       plugin downloads it)
  --solx-version <v>   Resolve the binary for exactly this version from the
                       compiler cache instead of the newest one. CI passes the
                       plugin's shipped version (SOLIDITY_TO_SOLX_VERSION_MAP)
                       so binaries accumulating in a persistent runner cache
                       can't silently unpair the replays from their
                       "cold compile solx" cells.
  --runs <n>           hyperfine runs (default: 2, matching the timed cells)

EXAMPLE
  pnpm bench:replay-standard-json --dumps solx-standard-json \\
    --report solx-regression-report.json \\
    --dump ens-verifiable-factory-solx/solx-legacy-dwarf.json
`;

// Entry names mirror the timed cells ("cold compile solx", "cold compile
// solx via-ir", ...) so each replay pairs with its Hardhat-driven cell.
const VARIANT_LABELS: Record<string, string> = {
  "solx-legacy-dwarf.json": "raw replay solx",
  "solx-via-ir-dwarf.json": "raw replay solx via-ir",
  "solx-legacy-no-dwarf.json": "raw replay solx no-dwarf",
  "solx-via-ir-no-dwarf.json": "raw replay solx via-ir no-dwarf",
};

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 && i + 1 < process.argv.length
    ? process.argv[i + 1]
    : undefined;
}

function getArgOccurrences(flag: string): string[] {
  const values: string[] = [];
  for (let i = 0; i < process.argv.length - 1; i++) {
    if (process.argv[i] === flag) {
      values.push(process.argv[i + 1]);
    }
  }
  return values;
}

/**
 * A solx the hardhat-solx plugin has downloaded — the exact `version` when
 * given, the newest cached one otherwise (fine locally, where the cache holds
 * whatever the plugin just used).
 */
function findSolxBinary(version: string | undefined): string {
  const cacheDir = path.join(
    os.homedir(),
    ".cache",
    "hardhat-nodejs",
    "compilers-v3",
  );
  let versionDir: string;
  if (version !== undefined) {
    versionDir = path.join(cacheDir, `solx-v${version}`);
  } else {
    const versions = readdirSync(cacheDir)
      .filter((name) => name.startsWith("solx-v"))
      .sort();
    const newest = versions.at(-1);
    if (newest === undefined) {
      throw new Error(`No solx-v* directory under ${cacheDir}`);
    }
    versionDir = path.join(cacheDir, newest);
  }
  const binary = readdirSync(versionDir).find((name) =>
    name.startsWith("solx-"),
  );
  if (binary === undefined) {
    throw new Error(`No solx binary under ${versionDir}`);
  }
  return path.join(versionDir, binary);
}

function validate(solxPath: string, dumpPath: string): void {
  const stdout = execFileSync(solxPath, ["--standard-json", dumpPath], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 1024,
  });
  const output = JSON.parse(stdout);
  const errors = (output.errors ?? []).filter(
    (e: { severity?: string }) => e.severity === "error",
  );
  if (errors.length > 0) {
    throw new Error(
      `${dumpPath} does not compile clean:\n` +
        errors
          .map((e: { formattedMessage?: string }) => e.formattedMessage ?? "")
          .join("\n"),
    );
  }
  if (Object.keys(output.contracts ?? {}).length === 0) {
    throw new Error(`${dumpPath} produced no contracts`);
  }
}

function main(): void {
  const dumpsDir = getArg("--dumps");
  const reportPath = getArg("--report");
  const dumps = getArgOccurrences("--dump");

  if (
    dumpsDir === undefined ||
    reportPath === undefined ||
    dumps.length === 0
  ) {
    console.log(USAGE);
    process.exit(1);
  }

  const solxPath = getArg("--solx") ?? findSolxBinary(getArg("--solx-version"));
  const runs = getArg("--runs") ?? "2";
  console.log(`Replaying with ${solxPath}`);

  const entries: BenchmarkEntry[] = [];

  for (const relPath of dumps) {
    const scenarioId = path.dirname(relPath);
    const label = VARIANT_LABELS[path.basename(relPath)];
    if (label === undefined) {
      throw new Error(
        `Unknown dump variant "${path.basename(relPath)}" — add it to VARIANT_LABELS`,
      );
    }
    const dumpPath = path.join(dumpsDir, relPath);

    // Doubles as cache warmup for the timed runs below.
    validate(solxPath, dumpPath);

    const exportPath = path.join(
      os.tmpdir(),
      `replay-${scenarioId}-${path.basename(relPath)}`,
    );
    execFileSync("hyperfine", [
      "--runs",
      runs,
      "--export-json",
      exportPath,
      `${solxPath} --standard-json ${dumpPath} > /dev/null`,
    ]);

    const result = readHyperfineResult(exportPath);
    entries.push(toEntry(scenarioId, label, result));
    entries.push(toCpuEntry(scenarioId, label, result));
  }

  const report = JSON.parse(readFileSync(reportPath, "utf8"));
  report.push(...entries);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Appended ${entries.length} replay entries to ${reportPath}`);
}

main();
