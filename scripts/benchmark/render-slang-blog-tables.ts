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
  --baseline <path> Report of an earlier full run; cells the report lacks are
                    taken from it and marked †
  --baseline-url <url>  Link to the run that produced --baseline

EXAMPLE
  node scripts/benchmark/render-slang-blog-tables.ts --report slang-regression-report.json
`;

const FORGE = "forge-1.7.1";
const SOLX = "solx-0.1.8";
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
// solc, solx, slang, forge, per pipeline.
const NOTES: Record<"via-IR" | "legacy", Record<string, string>> = {
  "via-IR": {
    "1inch-swap-vm-solx|slang": "does not compile",
    "1inch-swap-vm-solx|solx": "does not compile",
    [`${OZ}|forge`]: "incompatible",
  },
  legacy: {
    [`${OZ}|forge`]: "incompatible",
  },
};

// Additional reasons in the tables that include the Solidity tests.
const TEST_NOTES: Record<"via-IR" | "legacy", Record<string, string>> = {
  "via-IR": {
    "aave-v4-solx|solc": "tests do not compile",
    "aave-v4-solx|forge": "tests do not compile",
    "aave-v4-solx|slang": "not run (EIP-712 cheatcodes)",
    "lidofinance-core-solx|slang": "tests do not compile",
  },
  legacy: {
    "aave-v4-solx|slang": "not run (EIP-712 cheatcodes)",
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
  solx?: CellResult;
  slang?: CellResult;
  forge?: CellResult;
  notes: { solc?: string; solx?: string; slang?: string; forge?: string };
  // Rows that sum into the headline: OpenZeppelin once, as the entire repo.
  inTotal: boolean;
}

// Marks a value measured in the baseline run rather than this one.
function mark(...results: Array<CellResult | undefined>): string {
  return results.some((r) => r?.fromBaseline === true) ? "†" : "";
}

function wallText(r: CellResult | undefined, note: string | undefined): string {
  if (r !== undefined) {
    return `${r.wall.toFixed(1)}s${mark(r)}`;
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
    fromBaseline: a.fromBaseline === true || b.fromBaseline === true,
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
    const note = (column: string) =>
      (tests ? TEST_NOTES[pipeline][`${id}|${column}`] : undefined) ??
      NOTES[pipeline][`${id}|${column}`];
    rows.push({
      repo,
      solc: pick(cells, `solc${suffix}`),
      solx: pick(cells, `${SOLX}${suffix}`),
      slang: pick(cells, "slang"),
      forge: id === OZ ? undefined : pick(cells, `${FORGE}${suffix}`),
      notes: {
        solc: note("solc"),
        solx: note("solx"),
        slang: note("slang"),
        forge: note("forge"),
      },
      inTotal: true,
    });
    if (id === OZ) {
      rows.push({
        repo: OZ_SUBSET,
        solc: pick(cells, `solc${suffix} parity`),
        solx: pick(cells, `${SOLX}${suffix} parity`),
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

function renderTable(rows: Row[], title: string, solx: boolean): string[] {
  const both = rows.filter(
    (r) => r.inTotal && r.solc !== undefined && r.slang !== undefined,
  );
  const solcTotal = both.reduce((t, r) => t + r.solc!.wall, 0);
  const slangTotal = both.reduce((t, r) => t + r.slang!.wall, 0);

  const lines = [`### ${title}`, ""];
  if (rows.length === 0) {
    lines.push("No repo in this report.", "");
    return lines;
  }
  lines.push(
    both.length === 0
      ? "No repo has both a solc and a slang number in this report."
      : `Building all ${both.length} repos one after another takes solc ` +
          `${solcTotal.toFixed(0)}s in total, and it takes slang ` +
          `${slangTotal.toFixed(0)}s. **A ${(solcTotal / slangTotal).toFixed(1)}x ` +
          "overall improvement.**",
    "",
    solx
      ? `| Repo | Hardhat solc | Hardhat ${SOLX} | Hardhat slang | vs Hardhat solc | vs ${SOLX} | forge solc | vs forge solc |`
      : "| Repo | Hardhat solc | Hardhat slang | Improvement vs Hardhat solc | forge solc | Improvement vs forge solc |",
    `|${" --- |".repeat(solx ? 8 : 6)}`,
  );
  for (const r of rows) {
    const vs = (base: CellResult | undefined) =>
      base === undefined || r.slang === undefined
        ? "-"
        : `${speedup(base, r.slang)}${mark(base, r.slang)}`;
    const cols = solx
      ? [
          wallText(r.solc, r.notes.solc),
          wallText(r.solx, r.notes.solx),
          wallText(r.slang, r.notes.slang),
          vs(r.solc),
          vs(r.solx),
          wallText(r.forge, r.notes.forge),
          vs(r.forge),
        ]
      : [
          wallText(r.solc, r.notes.solc),
          wallText(r.slang, r.notes.slang),
          vs(r.solc),
          wallText(r.forge, r.notes.forge),
          vs(r.forge),
        ];
    lines.push(`| ${r.repo} | ${cols.join(" | ")} |`);
  }
  lines.push("");
  return lines;
}

export function renderSlangBlogTables(
  entries: BenchmarkEntry[],
  opts: { baseline?: BenchmarkEntry[]; baselineUrl?: string } = {},
): string {
  const { report } = parseReport(entries, opts.baseline);
  const borrowed = [...report.values()].some((cells) =>
    [...cells.values()].some((r) => r.fromBaseline === true),
  );
  const lines: string[] = [
    'Wall-clock seconds, mean over each cell\'s runs; "parity" means the ' +
      "difference is within the two cells' run-to-run spread.",
    "",
  ];
  if (borrowed) {
    lines.push(
      `† measured in ${
        opts.baselineUrl === undefined
          ? "the baseline run"
          : `[the baseline run](${opts.baselineUrl})`
      }, not this one.`,
      "",
    );
  }

  lines.push(...renderBlogSections(report));
  return lines.join("\n");
}

// The post's four tables; `solx` adds Hardhat solx 0.1.8 and slang's speedup
// over it.
export function renderBlogSections(
  report: SlangReport,
  opts: { solx?: boolean } = {},
): string[] {
  const lines: string[] = [];
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
    lines.push(
      ...renderTable(
        buildRows(report, pipeline, tests),
        title,
        opts.solx === true,
      ),
    );
  }
  return lines;
}

function main(): void {
  const getArg = (flag: string): string | undefined => {
    const i = process.argv.indexOf(flag);
    return i !== -1 && i + 1 < process.argv.length
      ? process.argv[i + 1]
      : undefined;
  };
  const reportPath = getArg("--report");
  if (reportPath === undefined) {
    console.log(USAGE);
    process.exit(1);
  }
  const read = (p: string) =>
    JSON.parse(readFileSync(p, "utf8")) as BenchmarkEntry[];
  const baselinePath = getArg("--baseline");
  process.stdout.write(
    renderSlangBlogTables(read(reportPath), {
      baseline: baselinePath === undefined ? undefined : read(baselinePath),
      baselineUrl: getArg("--baseline-url"),
    }),
  );
}

if (import.meta.main) {
  main();
}
