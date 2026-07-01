import { execSync } from "node:child_process";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import { DEFAULT_CLONE_DIR } from "../end-to-end/helpers/args.ts";
import {
  loadScenario,
  normalizeScenarioPath,
} from "../end-to-end/helpers/directory.ts";

const USAGE = `
scripts/benchmark/bytecode-size.ts — Append bytecode-size metrics to a report

DESCRIPTION
  Compiles each profile of an already-initialized scenario and records the total
  deployed and creation bytecode size (in bytes) per profile, appending them as
  github-action-benchmark customSmallerIsBetter entries to --report. Bytecode
  size is deterministic and needs no execution, so this is a cheap measurement
  pass run after the timing benchmark; it reuses the scenario working directory
  that bench:regression already cloned and installed.

OPTIONS
  --scenario <path>      Required. Scenario folder/file (same as bench:regression)
  --report <path>        Required. Existing report JSON to append entries to
  --e2e-clone-dir <p>    Override clone dir (default: $E2E_CLONE_DIR or ${DEFAULT_CLONE_DIR})

EXAMPLE
  pnpm bench:bytecode-size --scenario ./end-to-end/openzeppelin-contracts-0.34 \\
    --report solx-regression-report.json
`;

// {solc, solx} x {legacy, viaIR}, matching the scenario's benchmark profiles.
const PROFILES: ReadonlyArray<{ label: string; flags: string[] }> = [
  { label: "solc legacy", flags: [] },
  { label: "solc via-ir", flags: ["--build-profile", "solc-via-ir"] },
  { label: "solx legacy", flags: ["--build-profile", "solx"] },
  { label: "solx via-ir", flags: ["--build-profile", "solx-via-ir"] },
];

interface BenchmarkEntry {
  name: string;
  unit: string;
  value: number;
  range: string;
  extra: string;
}

function getArg(flag: string): string | undefined {
  const i = process.argv.indexOf(flag);
  return i !== -1 && i + 1 < process.argv.length
    ? process.argv[i + 1]
    : undefined;
}

/** Bytes in a solc bytecode `object` (hex without `0x`); 0 for empty/missing. */
function hexBytes(object: unknown): number {
  if (typeof object !== "string" || object.length === 0) {
    return 0;
  }
  const hex = object.startsWith("0x") ? object.slice(2) : object;
  return Math.floor(hex.length / 2);
}

/**
 * Sum deployed and creation bytecode over every contract in the build-info
 * output(s). Run right after `clean` + a single-profile `compile`, so the only
 * build-info present belongs to that profile.
 */
function sumBytecode(workingDir: string): {
  deployed: number;
  creation: number;
} {
  const dir = path.join(workingDir, "artifacts", "build-info");
  const outputs = readdirSync(dir).filter((f) => f.endsWith(".output.json"));

  let deployed = 0;
  let creation = 0;

  for (const file of outputs) {
    const parsed = JSON.parse(readFileSync(path.join(dir, file), "utf-8"));
    const contracts = parsed.output?.contracts ?? parsed.contracts ?? {};

    for (const bySource of Object.values(contracts)) {
      for (const contract of Object.values(
        bySource as Record<
          string,
          { evm?: Record<string, { object?: string }> }
        >,
      )) {
        deployed += hexBytes(contract.evm?.deployedBytecode?.object);
        creation += hexBytes(contract.evm?.bytecode?.object);
      }
    }
  }

  return { deployed, creation };
}

function entry(
  scenarioId: string,
  label: string,
  bytes: number,
): BenchmarkEntry {
  return {
    name: `${scenarioId} / ${label}`,
    unit: "bytes",
    value: bytes,
    range: "± 0",
    extra: "",
  };
}

function main(): void {
  const scenarioPath = getArg("--scenario");
  const reportPath = getArg("--report");

  if (scenarioPath === undefined || reportPath === undefined) {
    console.log(USAGE);
    process.exit(
      scenarioPath === undefined && reportPath === undefined ? 0 : 1,
    );
  }

  const cloneDir =
    getArg("--e2e-clone-dir") ?? process.env.E2E_CLONE_DIR ?? DEFAULT_CLONE_DIR;
  const { id, workingDir } = loadScenario(
    cloneDir,
    normalizeScenarioPath(scenarioPath),
  );

  const entries: BenchmarkEntry[] = [];

  for (const { label, flags } of PROFILES) {
    execSync("npx hardhat clean", { cwd: workingDir, stdio: "ignore" });
    execSync(["npx", "hardhat", "compile", ...flags].join(" "), {
      cwd: workingDir,
      stdio: "ignore",
    });

    const { deployed, creation } = sumBytecode(workingDir);
    entries.push(entry(id, `deployed bytecode ${label}`, deployed));
    entries.push(entry(id, `creation bytecode ${label}`, creation));
    console.log(`${label}: deployed ${deployed} B, creation ${creation} B`);
  }

  const report = JSON.parse(readFileSync(reportPath, "utf-8"));
  report.push(...entries);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`Appended ${entries.length} size entries to ${reportPath}`);
}

main();
