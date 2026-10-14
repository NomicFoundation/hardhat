import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import { DEFAULT_CLONE_DIR } from "../end-to-end/helpers/args.ts";
import {
  loadScenario,
  normalizeScenarioPath,
} from "../end-to-end/helpers/directory.ts";

const USAGE = `
scripts/benchmark/gas-compare.ts — solc-vs-solx execution-gas comparison

DESCRIPTION
  Runs the scenario's tests twice with Hardhat's native gas report
  (\`--gas-stats-json\`) — once with solc (default profile) and once with solx
  (--build-profile solx) — over the same test subset, then compares the two
  reports. Appends aggregate gas metrics (total deployment + total call gas, per
  compiler) to --report as customSmallerIsBetter entries, and prints a per-method
  solc-vs-solx diff (markdown) to stdout.

  Repo-agnostic: it only depends on the native GasStatsJson format, so it works
  for any Hardhat 3 scenario. Only --tests is scenario-specific.

OPTIONS
  --scenario <path>    Required. Scenario folder/file (same as bench:regression)
  --report <path>      Required. Existing report JSON to append entries to
  --tests <paths>      Space-separated test files to run (default: the whole
                       mocha suite — usually too slow; pass a subset)
  --e2e-clone-dir <p>  Override clone dir (default: $E2E_CLONE_DIR or ${DEFAULT_CLONE_DIR})

EXAMPLE
  pnpm bench:gas-compare --scenario ./end-to-end/openzeppelin-contracts-0.34 \\
    --report solx-regression-report.json \\
    --tests "test/token/ERC20/ERC20.test.js test/access/AccessControl.test.js"
`;

interface GasEntry {
  avg: number;
  count: number;
}
interface ContractGas {
  contractName: string;
  deployment: GasEntry | null;
  functions: Record<string, GasEntry> | null;
}
type GasReport = { contracts: Record<string, ContractGas> };

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

function runTests(
  workingDir: string,
  buildProfileFlag: string[],
  subset: string[],
  outPath: string,
): void {
  // argv array (no shell): test paths with spaces / shell metacharacters are
  // passed verbatim rather than interpreted.
  const argv = [
    "hardhat",
    "test",
    "mocha",
    ...subset,
    ...buildProfileFlag,
    "--gas-stats-json",
    outPath,
  ];
  console.error(`[gas] $ npx ${argv.join(" ")}`);
  try {
    // Route the test runner's stdout to our stderr (fd 2): our own stdout is
    // the markdown channel the workflow pipes into the step summary, so the
    // mocha output must not land there.
    execFileSync("npx", argv, { cwd: workingDir, stdio: ["ignore", 2, 2] });
  } catch {
    // Tests may fail under the experimental solx compiler; the gas report is
    // still written for whatever ran, and the comparison intersects both sides.
    console.error(
      "[gas] test run exited non-zero (continuing with the report)",
    );
  }
  if (!existsSync(outPath)) {
    throw new Error(`No gas report produced at ${outPath}`);
  }
}

interface Row {
  label: string;
  kind: "deploy" | "call";
  solc: number;
  solx: number;
}

/** Comparison rows over the contracts/functions present in BOTH reports. */
function buildRows(solc: GasReport, solx: GasReport): Row[] {
  const rows: Row[] = [];
  for (const [key, cs] of Object.entries(solc.contracts)) {
    const cx = solx.contracts[key];
    if (cx === undefined) {
      continue;
    }
    if (cs.deployment !== null && cx.deployment !== null) {
      rows.push({
        label: `${cs.contractName} [deploy]`,
        kind: "deploy",
        solc: cs.deployment.avg,
        solx: cx.deployment.avg,
      });
    }
    for (const [sig, fs] of Object.entries(cs.functions ?? {})) {
      const fx = cx.functions?.[sig];
      if (fx === undefined) {
        continue;
      }
      rows.push({
        label: `${cs.contractName}.${sig}`,
        kind: "call",
        solc: fs.avg,
        solx: fx.avg,
      });
    }
  }
  return rows;
}

function entry(name: string, gas: number): BenchmarkEntry {
  return { name, unit: "gas", value: Math.round(gas), range: "± 0", extra: "" };
}

function pct(solc: number, solx: number): string {
  if (solc === 0) {
    return "—";
  }
  return `${(((solx - solc) / solc) * 100).toFixed(2)}%`;
}

function markdown(scenarioId: string, rows: Row[]): string {
  const calls = rows.filter((r) => r.kind === "call");
  const cheaper = calls.filter((r) => r.solx < r.solc).length;
  const costlier = calls.filter((r) => r.solx > r.solc).length;
  const movers = [...calls]
    .sort((a, b) => Math.abs(b.solx - b.solc) - Math.abs(a.solx - a.solc))
    .slice(0, 15);

  const lines = [
    `## Gas: solx vs solc — ${scenarioId}`,
    "",
    `Compared ${calls.length} methods and ${rows.length - calls.length} deployments. ` +
      `solx cheaper on **${cheaper}**, costlier on **${costlier}** (avg gas).`,
    "",
    "Top movers (by absolute avg-gas change):",
    "",
    "| method | solc | solx | Δ% |",
    "|---|--:|--:|--:|",
    ...movers.map(
      (r) => `| ${r.label} | ${r.solc} | ${r.solx} | ${pct(r.solc, r.solx)} |`,
    ),
  ];
  return lines.join("\n");
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
  const subset = (getArg("--tests") ?? "").split(/\s+/).filter(Boolean);

  const solcPath = path.join(workingDir, "solc.gas.json");
  const solxPath = path.join(workingDir, "solx.gas.json");
  runTests(workingDir, [], subset, solcPath);
  runTests(workingDir, ["--build-profile", "solx"], subset, solxPath);

  const solc: GasReport = JSON.parse(readFileSync(solcPath, "utf-8"));
  const solx: GasReport = JSON.parse(readFileSync(solxPath, "utf-8"));
  const rows = buildRows(solc, solx);

  const sum = (kind: Row["kind"], pick: (r: Row) => number) =>
    rows.filter((r) => r.kind === kind).reduce((a, r) => a + pick(r), 0);

  // Aggregates are the SUM OF PER-METHOD AVERAGES (count-agnostic), not
  // frequency-weighted totals: this compares compiler output per operation
  // without skewing by how often the test suite happens to call each one.
  const entries: BenchmarkEntry[] = [
    entry(
      `${id} / deployment gas (sum of avgs) solc`,
      sum("deploy", (r) => r.solc),
    ),
    entry(
      `${id} / deployment gas (sum of avgs) solx`,
      sum("deploy", (r) => r.solx),
    ),
    entry(
      `${id} / call gas (sum of avgs) solc`,
      sum("call", (r) => r.solc),
    ),
    entry(
      `${id} / call gas (sum of avgs) solx`,
      sum("call", (r) => r.solx),
    ),
  ];

  const report = JSON.parse(readFileSync(reportPath, "utf-8"));
  report.push(...entries);
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.error(`[gas] appended ${entries.length} entries to ${reportPath}`);

  console.log(markdown(id, rows));
}

main();
