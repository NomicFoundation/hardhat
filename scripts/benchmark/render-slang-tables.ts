import { readFileSync } from "node:fs";

import type { BenchmarkEntry } from "./helpers/entries.ts";
import {
  parseReport,
  speedup,
  type CellResult,
  type SlangReport,
} from "./helpers/slang-report.ts";

const USAGE = `
scripts/benchmark/render-slang-tables.ts — Render the slang benchmark report as markdown

DESCRIPTION
  Reads a bench:regression report (the file slang-regression-benchmark.yml
  produces) and prints markdown to stdout: summaries of slang's speedup per
  scenario against solc and the pinned solx, for cold compile and for the
  Solidity test suite over a warm build, then one table per scenario with
  every cell (wall / total CPU / peak RSS). Entries the report parser can't
  place go to an "other entries" table rather than being dropped.

  The output embeds the ${"<!-- slang-bench-tables -->"} marker so CI can
  upsert it as a single sticky PR comment.

OPTIONS
  --report <path>    Required. Report JSON to render
  --run-url <url>    Link to the producing workflow run
  --head-sha <sha>   Commit the run measured
  --status <status>  Producing job status; anything but "success" adds a
                     partial-results warning
  --baseline <path>  Report of an earlier full run; cells this report lacks
                     are taken from it and marked †
  --baseline-url <url>  Link to the run that produced --baseline

EXAMPLE
  node scripts/benchmark/render-slang-tables.ts --report slang-regression-report.json
`;

export const COMMENT_MARKER = "<!-- slang-bench-tables -->";

const SLANG = "slang";

// The kinds of cell summarised, by name prefix, in the order shown.
const KINDS = [
  { prefix: "cold compile ", title: "Cold compile" },
  { prefix: "warm test ", title: "Solidity tests over a warm build" },
] as const;

// The cells slang is compared against in the summaries, by cell name after
// the kind's prefix.
const BASELINES = [
  "solc",
  "solc via-ir",
  "solx-0.1.8",
  "solx-0.1.8 via-ir",
] as const;

// Cells that legitimately have no number, keyed "<kind prefix><scenario>|<cell>"
// with the cell name after the prefix.
export const CELL_NOTES: Record<string, string> = {
  "cold compile 1inch-swap-vm-solx|solc": "n/a³",
  "cold compile 1inch-swap-vm-solx|solx-0.1.8": "n/a³",
  "cold compile lidofinance-core-solx|solc": "n/a³",
  "cold compile lidofinance-core-solx|solx-0.1.8": "n/a³",
  "cold compile lidofinance-vaults-solx|solc": "n/a³",
  "cold compile lidofinance-vaults-solx|solx-0.1.8": "n/a³",
  "cold compile 1inch-swap-vm-solx|slang": "✗ does not compile¹",
  "cold compile 1inch-swap-vm-solx|solx-0.1.8 via-ir": "✗ does not compile¹",
  "cold compile lidofinance-vaults-solx|solc via-ir upgrade":
    "✗ does not compile²",
  "warm test lidofinance-core-solx|solc": "n/a³",
  "warm test lidofinance-core-solx|solx-0.1.8": "n/a³",
  "warm test lidofinance-core-solx|slang": "✗ tests do not compile⁴",
  "warm test aave-v4-solx|slang": "not run⁵",
  "warm test aave-v4-solx|solc via-ir": "✗ tests do not compile⁶",
};

const FOOTNOTES = [
  "¹ LLVM cannot stackify SwapVM's recursive `runLoop`: it reports a " +
    "stackification failure for a recursive function with stack-too-deep " +
    "errors, under slang and solx alike. The repo is via-IR only, so solc " +
    "via-IR is its only number.",
  "² lido's contracts/upgrade hits a Yul stack-too-deep in solc from 0.8.26 " +
    "on, at every optimizer setting; slang compiles it.",
  "³ The repo builds via-IR only (its sources don't compile on the legacy " +
    "pipeline), so it has no legacy cells.",
  "⁴ slang rejects lido-core's test sources: a storage fixed-size array of " +
    "structs does not bind to an attached library function's `memory` " +
    "parameter (NomicFoundation/slang#2251); solc accepts it.",
  "⁵ 149 of aave's 1559 tests use the `vm.eip712HashStruct` / " +
    "`vm.eip712HashType` cheatcodes, whose type table Hardhat builds from the " +
    "solc AST; a slang build info has none, so those tests fail. The cell " +
    "is left out until slang's output carries struct definitions.",
  "⁶ solc via-IR cannot compile aave's Foundry test sources (a Yul " +
    "stack-too-deep in its vendored assembly), so the suite cannot run.",
];

function seconds(n: number | undefined): string {
  return n === undefined ? "—" : n.toFixed(1);
}

// Marks a value measured in the baseline run rather than this one.
function mark(...results: Array<CellResult | undefined>): string {
  return results.some((r) => r?.fromBaseline === true) ? "†" : "";
}

function cellRow(
  label: string,
  r: CellResult,
  slang: CellResult | undefined,
): string {
  const vs =
    slang === undefined || slang === r
      ? ""
      : `${speedup(r, slang)}${mark(r, slang)}`;
  return `| ${label} | ${seconds(r.wall)}${mark(r)} | ${seconds(r.cpu)} | ${
    r.peakRssMb === undefined ? "—" : r.peakRssMb.toFixed(0)
  } | ${r.runs} | ${vs} |`;
}

// The slang cell a cell is compared with: the same kind over the same
// sources (OZ's forge-scope "parity" set, lido-vaults' "upgrade" tree).
function slangCounterpart(label: string, prefix: string): string | undefined {
  const cell = label.slice(prefix.length);
  if (cell.startsWith(SLANG)) {
    return undefined;
  }
  const scope = / (parity|upgrade)$/.exec(cell)?.[0] ?? "";
  return prefix + SLANG + scope;
}

function summaryTable(
  report: SlangReport,
  prefix: string,
  title: string,
): string[] {
  const ids = [...report.keys()]
    .filter((id) =>
      [...report.get(id)!.keys()].some((label) => label.startsWith(prefix)),
    )
    .sort();
  if (ids.length === 0) {
    return [];
  }

  const lines = [
    `### ${title}`,
    "",
    `| scenario | slang wall s | ${BASELINES.map((b) => `vs ${b}`).join(" | ")} |`,
    `|---|---|${BASELINES.map(() => "---").join("|")}|`,
  ];
  for (const id of ids) {
    const cells = report.get(id)!;
    const note = (cell: string) => CELL_NOTES[`${prefix}${id}|${cell}`];
    const slang = cells.get(prefix + SLANG);
    const vs = BASELINES.map((b) => {
      const base = cells.get(prefix + b);
      if (base === undefined) {
        return note(b) ?? "—";
      }
      return slang === undefined
        ? "—"
        : `${speedup(base, slang)}${mark(base, slang)}`;
    });
    const slangText =
      slang === undefined
        ? (note(SLANG) ?? "—")
        : `${seconds(slang.wall)}${mark(slang)}`;
    lines.push(`| ${id} | ${slangText} | ${vs.join(" | ")} |`);
  }
  lines.push("");
  return lines;
}

export function renderSlangTables(
  entries: BenchmarkEntry[],
  opts: {
    runUrl?: string;
    headSha?: string;
    status?: string;
    baseline?: BenchmarkEntry[];
    baselineUrl?: string;
  } = {},
): string {
  const { report, unparsed } = parseReport(entries, opts.baseline);

  const lines: string[] = [COMMENT_MARKER, "## slang benchmarks", ""];
  if (opts.status !== undefined && opts.status !== "success") {
    lines.push(
      "> [!WARNING]",
      `> Benchmark job status: ${opts.status} — results may be partial.`,
      "",
    );
  }
  const provenance = [
    opts.runUrl === undefined
      ? undefined
      : `generated from [this run](${opts.runUrl})`,
    opts.headSha === undefined ? undefined : `at ${opts.headSha.slice(0, 9)}`,
  ]
    .filter(Boolean)
    .join(" ");
  lines.push(
    "slang has a single pipeline, so its one cell is compared against both " +
      "of solc's and solx's. Speedup = baseline wall / slang wall; " +
      `"parity" means within run-to-run noise${
        provenance === "" ? "" : `; ${provenance}`
      }.`,
    "",
  );

  for (const { prefix, title } of KINDS) {
    lines.push(...summaryTable(report, prefix, title));
  }

  for (const id of [...report.keys()].sort()) {
    const cells = report.get(id)!;
    const runs = [...cells.values()][0]?.runs;
    lines.push(
      `### ${id}${runs === undefined ? "" : ` <sub>(${runs} run${runs === 1 ? "" : "s"}/cell)</sub>`}`,
      "",
      "| cell | wall s | CPU s | peak RSS MB | runs | slang speedup |",
      "|---|---|---|---|---|---|",
    );
    const kindOf = (label: string) =>
      KINDS.findIndex((k) => label.startsWith(k.prefix));
    const labels = [...cells.keys()].sort(
      (a, b) => kindOf(a) - kindOf(b) || a.localeCompare(b),
    );
    for (const label of labels) {
      const kind = KINDS[kindOf(label)];
      const counterpart =
        kind === undefined ? undefined : slangCounterpart(label, kind.prefix);
      const slang =
        counterpart === undefined ? undefined : cells.get(counterpart);
      lines.push(cellRow(label, cells.get(label)!, slang));
    }
    for (const [key, note] of Object.entries(CELL_NOTES)) {
      const kind = KINDS.find((k) => key.startsWith(k.prefix + id + "|"));
      if (kind === undefined) {
        continue;
      }
      const cell = key.slice(kind.prefix.length + id.length + 1);
      if (!cells.has(kind.prefix + cell)) {
        lines.push(`| ${kind.prefix}${cell} | ${note} | | | | |`);
      }
    }
    lines.push("");
  }

  lines.push(...FOOTNOTES.map((f) => `${f}\n`));
  const borrowed = [...report.values()].some((cells) =>
    [...cells.values()].some((r) => r.fromBaseline === true),
  );
  if (borrowed) {
    lines.push(
      `† measured in ${
        opts.baselineUrl === undefined
          ? "the baseline run"
          : `[the baseline run](${opts.baselineUrl})`
      }, not this one.\n`,
    );
  }

  if (unparsed.length > 0) {
    lines.push(
      "<details><summary>Other entries</summary>",
      "",
      "| entry | value |",
      "|---|---|",
      ...unparsed.map((e) => `| ${e.name} | ${e.value} ${e.unit} |`),
      "",
      "</details>",
      "",
    );
  }

  return lines.join("\n");
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
    renderSlangTables(read(reportPath), {
      runUrl: getArg("--run-url"),
      headSha: getArg("--head-sha"),
      status: getArg("--status"),
      baseline: baselinePath === undefined ? undefined : read(baselinePath),
      baselineUrl: getArg("--baseline-url"),
    }),
  );
}

if (import.meta.main) {
  main();
}
