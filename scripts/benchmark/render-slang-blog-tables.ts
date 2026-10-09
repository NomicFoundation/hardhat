import { readFileSync } from "node:fs";

import type { BenchmarkEntry } from "./helpers/entries.ts";
import {
  parseReport,
  speedup,
  type CellResult,
  type SlangReport,
} from "./helpers/slang-report.ts";

const USAGE = `
scripts/benchmark/render-slang-blog-tables.ts — Render the slang benchmark
report in the blog post's table shape

DESCRIPTION
  Reads a bench:regression report and prints, per pipeline (via-IR, legacy),
  a cold-compile table and a compile-plus-Solidity-tests table: one row per
  repo with Hardhat solc, Hardhat slang and forge solc wall-clock seconds and
  slang's speedup over each, sorted by the speedup over Hardhat solc, under
  a headline that sums every repo both compilers build. slang has a single
  pipeline, so its numbers appear in both pipelines' tables.

  A test table row is the measured "cold test" cell where the scenario has
  one, else cold compile plus "warm test". Every cell without a number says
  why.

OPTIONS
  --report <path>   Required. Report JSON to render

EXAMPLE
  node scripts/benchmark/render-slang-blog-tables.ts --report slang-regression-report.json
`;

const FORGE = "forge-1.7.1";
const OZ = "openzeppelin-contracts-0.34";

// Report scenario id -> repo name as the post prints it.
const REPOS: Record<string, string> = {
  "graph-horizon-solx": "graph-horizon",
  "solady-solx": "Solady",
  "uniswap-v4-core-solx": "Uniswap v4",
  [OZ]: "openzeppelin-contracts (entire repo)",
  "lidofinance-vaults-solx": "lido-vaults",
  "aave-v4-solx": "Aave v4",
  "1inch-aqua-solx": "1inch-aqua",
  "ens-verifiable-factory-solx": "ens-verifiable-factory",
  "lidofinance-core-solx": "lido-core",
  "1inch-swap-vm-solx": "1inch-swap-vm",
};
const OZ_SUBSET = "openzeppelin-contracts (forge-compatible subset)";

// Why a cell has no number, keyed "<scenario>|<column>" with column one of
// solc, slang, forge; "*" matches every scenario. Checked per pipeline.
const NOTES: Record<"via-IR" | "legacy", Record<string, string>> = {
  "via-IR": {
    "1inch-swap-vm-solx|slang": "does not compile",
    [`${OZ}|forge`]: "incompatible",
  },
  legacy: {
    [`${OZ}|forge`]: "incompatible",
  },
};

// Repos without a legacy pipeline; they are left out of the legacy tables.
const VIA_IR_ONLY = new Set([
  "1inch-swap-vm-solx",
  "lidofinance-core-solx",
  "lidofinance-vaults-solx",
]);

type Pipeline = "via-IR" | "legacy";

interface Row {
  repo: string;
  solc?: CellResult;
  slang?: CellResult;
  forge?: CellResult;
  notes: { solc?: string; slang?: string; forge?: string };
  // Rows that sum into the headline: OpenZeppelin once, as the entire repo.
  inTotal: boolean;
}

function wallText(r: CellResult | undefined, note: string | undefined): string {
  if (r !== undefined) {
    return `${r.wall.toFixed(1)}s`;
  }
  return note ?? "not measured";
}

function sum(a?: CellResult, b?: CellResult): CellResult | undefined {
  if (a === undefined || b === undefined) {
    return undefined;
  }
  return {
    wall: a.wall + b.wall,
    wallStddev: a.wallStddev + b.wallStddev,
    runs: Math.min(a.runs, b.runs),
  };
}

// The measured "cold test" cell, else cold compile plus "warm test".
function withTests(
  cells: Map<string, CellResult>,
  compiler: string,
): CellResult | undefined {
  return (
    cells.get(`cold test ${compiler}`) ??
    sum(
      cells.get(`cold compile ${compiler}`),
      cells.get(`warm test ${compiler}`),
    )
  );
}

function buildRows(
  report: SlangReport,
  pipeline: Pipeline,
  tests: boolean,
): Row[] {
  const suffix = pipeline === "via-IR" ? " via-ir" : "";
  const pick = (cells: Map<string, CellResult>, compiler: string) =>
    tests ? withTests(cells, compiler) : cells.get(`cold compile ${compiler}`);

  const rows: Row[] = [];
  for (const [id, repo] of Object.entries(REPOS)) {
    const cells = report.get(id);
    if (cells === undefined || (pipeline === "legacy" && VIA_IR_ONLY.has(id))) {
      continue;
    }
    const note = (column: string) => NOTES[pipeline][`${id}|${column}`];
    rows.push({
      repo,
      solc: pick(cells, `solc${suffix}`),
      slang: pick(cells, "slang"),
      forge: id === OZ ? undefined : pick(cells, `${FORGE}${suffix}`),
      notes: { solc: note("solc"), slang: note("slang"), forge: note("forge") },
      inTotal: true,
    });
    if (id === OZ) {
      rows.push({
        repo: OZ_SUBSET,
        solc: pick(cells, `solc${suffix} parity`),
        slang: pick(cells, "slang parity"),
        forge: pick(cells, `${FORGE}${suffix}`),
        notes: {},
        inTotal: false,
      });
    }
  }

  const ratio = (r: Row) =>
    r.solc !== undefined && r.slang !== undefined
      ? r.solc.wall / r.slang.wall
      : -Infinity;
  return rows.sort((a, b) => ratio(b) - ratio(a));
}

function renderTable(rows: Row[], title: string): string[] {
  const both = rows.filter(
    (r) => r.inTotal && r.solc !== undefined && r.slang !== undefined,
  );
  const solcTotal = both.reduce((t, r) => t + r.solc!.wall, 0);
  const slangTotal = both.reduce((t, r) => t + r.slang!.wall, 0);

  const lines = [`### ${title}`, ""];
  if (both.length === 0) {
    lines.push(
      "No repo has both a solc and a slang number in this report.",
      "",
    );
    return lines;
  }
  lines.push(
    `Building all ${both.length} repos one after another takes solc ` +
      `${solcTotal.toFixed(0)}s in total, and it takes slang ` +
      `${slangTotal.toFixed(0)}s. **A ${(solcTotal / slangTotal).toFixed(1)}x ` +
      "overall improvement.**",
    "",
    "| Repo | Hardhat solc | Hardhat slang | Improvement vs Hardhat solc | forge solc | Improvement vs forge solc |",
    "| --- | --- | --- | --- | --- | --- |",
  );
  for (const r of rows) {
    const vs = (base: CellResult | undefined) =>
      base === undefined || r.slang === undefined
        ? "-"
        : speedup(base, r.slang);
    lines.push(
      `| ${r.repo} | ${wallText(r.solc, r.notes.solc)} | ${wallText(
        r.slang,
        r.notes.slang,
      )} | ${vs(r.solc)} | ${wallText(r.forge, r.notes.forge)} | ${vs(
        r.forge,
      )} |`,
    );
  }
  lines.push("");
  return lines;
}

export function renderSlangBlogTables(entries: BenchmarkEntry[]): string {
  const { report } = parseReport(entries);
  const lines: string[] = [
    'Wall-clock seconds, mean over each cell\'s runs; "parity" means the ' +
      "difference is within the two cells' run-to-run spread.",
    "",
  ];

  const sections: Array<[Pipeline, boolean, string]> = [
    ["via-IR", false, "slang vs solc --via-ir compilation"],
    [
      "legacy",
      false,
      "slang vs solc in legacy mode (without --via-ir) compilation",
    ],
    ["via-IR", true, "slang vs solc --via-ir including Solidity tests"],
    [
      "legacy",
      true,
      "slang vs solc in legacy mode (without --via-ir) including Solidity tests",
    ],
  ];
  for (const [pipeline, tests, title] of sections) {
    lines.push(...renderTable(buildRows(report, pipeline, tests), title));
  }
  return lines.join("\n");
}

function main(): void {
  const i = process.argv.indexOf("--report");
  const reportPath = i === -1 ? undefined : process.argv[i + 1];
  if (reportPath === undefined) {
    console.log(USAGE);
    process.exit(1);
  }
  const entries = JSON.parse(
    readFileSync(reportPath, "utf8"),
  ) as BenchmarkEntry[];
  process.stdout.write(renderSlangBlogTables(entries));
}

if (import.meta.main) {
  main();
}
