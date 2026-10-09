import { readFileSync } from "node:fs";

import type { BenchmarkEntry } from "./helpers/entries.ts";
import {
  parseReport,
  speedup,
  type CellResult,
} from "./helpers/slang-report.ts";

const USAGE = `
scripts/benchmark/render-slang-tables.ts — Render the slang benchmark report as markdown

DESCRIPTION
  Reads a bench:regression report (the file slang-regression-benchmark.yml
  produces) and prints markdown to stdout: a summary of slang's cold-compile
  speedup per scenario against solc and the pinned solx, then one table per
  scenario with every cold-compile cell (wall / total CPU / peak RSS). Cells
  of other kinds (warm compile, tests) go to an "other entries" table rather
  than being dropped.

  The output embeds the ${"<!-- slang-bench-tables -->"} marker so CI can
  upsert it as a single sticky PR comment.

OPTIONS
  --report <path>    Required. Report JSON to render
  --run-url <url>    Link to the producing workflow run
  --head-sha <sha>   Commit the run measured
  --status <status>  Producing job status; anything but "success" adds a
                     partial-results warning

EXAMPLE
  node scripts/benchmark/render-slang-tables.ts --report slang-regression-report.json
`;

export const COMMENT_MARKER = "<!-- slang-bench-tables -->";

const COLD = "cold compile ";
const SLANG = "slang";

// The cells slang is compared against in the summary, by cell name after
// "cold compile ".
const BASELINES = [
  "solc",
  "solc via-ir",
  "solx-0.1.8",
  "solx-0.1.8 via-ir",
] as const;

// Cells that legitimately have no number: the failure is the datum.
// Keyed "<scenario>|<cell>" with the cell name after "cold compile ".
export const CELL_NOTES: Record<string, string> = {
  "1inch-swap-vm-solx|solc": "n/a³",
  "1inch-swap-vm-solx|solx-0.1.8": "n/a³",
  "lidofinance-core-solx|solc": "n/a³",
  "lidofinance-core-solx|solx-0.1.8": "n/a³",
  "lidofinance-vaults-solx|solc": "n/a³",
  "lidofinance-vaults-solx|solx-0.1.8": "n/a³",
  "1inch-swap-vm-solx|slang": "✗ does not compile¹",
  "1inch-swap-vm-solx|solx-0.1.8 via-ir": "✗ does not compile¹",
  "lidofinance-vaults-solx|solc via-ir upgrade": "✗ does not compile²",
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
];

function seconds(n: number | undefined): string {
  return n === undefined ? "—" : n.toFixed(1);
}

function cellRow(name: string, r: CellResult, slang?: CellResult): string {
  const vs = slang === undefined || name === SLANG ? "" : speedup(r, slang);
  return `| ${name} | ${seconds(r.wall)} | ${seconds(r.cpu)} | ${
    r.peakRssMb === undefined ? "—" : r.peakRssMb.toFixed(0)
  } | ${r.runs} | ${vs} |`;
}

export function renderSlangTables(
  entries: BenchmarkEntry[],
  opts: { runUrl?: string; headSha?: string; status?: string } = {},
): string {
  const { report, unparsed } = parseReport(entries);
  const other: string[] = unparsed.map(
    (e) => `| ${e.name} | ${e.value} ${e.unit} |`,
  );

  const lines: string[] = [COMMENT_MARKER, "## slang compile benchmarks", ""];
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
    "Cold compile. slang has a single pipeline, so its one cell is compared " +
      "against both of solc's and solx's. Speedup = baseline wall / slang " +
      `wall; "parity" means within run-to-run noise${
        provenance === "" ? "" : `; ${provenance}`
      }.`,
    "",
  );

  const scenarioIds = [...report.keys()].sort();

  lines.push(
    `| scenario | slang wall s | ${BASELINES.map((b) => `vs ${b}`).join(" | ")} |`,
    `|---|---|${BASELINES.map(() => "---").join("|")}|`,
  );
  for (const id of scenarioIds) {
    const cells = report.get(id)!;
    const slang = cells.get(COLD + SLANG);
    const vs = BASELINES.map((b) => {
      const base = cells.get(COLD + b);
      const note = CELL_NOTES[`${id}|${b}`];
      if (base === undefined) {
        return note ?? "—";
      }
      return slang === undefined ? "—" : speedup(base, slang);
    });
    const slangText =
      slang === undefined
        ? (CELL_NOTES[`${id}|${SLANG}`] ?? "—")
        : seconds(slang.wall);
    lines.push(`| ${id} | ${slangText} | ${vs.join(" | ")} |`);
  }
  lines.push("");

  for (const id of scenarioIds) {
    const cells = report.get(id)!;
    const slang = cells.get(COLD + SLANG);
    const cold = [...cells.entries()]
      .filter(([label]) => label.startsWith(COLD))
      .map(([label, r]) => [label.slice(COLD.length), r] as const)
      .sort(([a], [b]) => a.localeCompare(b));
    const runs = cold[0]?.[1].runs;

    lines.push(
      `### ${id}${runs === undefined ? "" : ` <sub>(${runs} run${runs === 1 ? "" : "s"}/cell)</sub>`}`,
      "",
      "| cold compile | wall s | CPU s | peak RSS MB | runs | slang speedup |",
      "|---|---|---|---|---|---|",
    );
    for (const [name, r] of cold) {
      lines.push(cellRow(name, r, slang));
    }
    for (const [key, note] of Object.entries(CELL_NOTES)) {
      const [noteId, name] = key.split("|");
      if (noteId === id && !cells.has(COLD + name)) {
        lines.push(`| ${name} | ${note} | | | | |`);
      }
    }
    lines.push("");

    for (const [label, r] of cells) {
      if (!label.startsWith(COLD)) {
        other.push(`| ${id} / ${label} | ${seconds(r.wall)} s |`);
      }
    }
  }

  lines.push(...FOOTNOTES.map((f) => `${f}\n`));

  if (other.length > 0) {
    lines.push(
      "<details><summary>Other entries</summary>",
      "",
      "| entry | value |",
      "|---|---|",
      ...other,
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

  const entries = JSON.parse(
    readFileSync(reportPath, "utf8"),
  ) as BenchmarkEntry[];
  process.stdout.write(
    renderSlangTables(entries, {
      runUrl: getArg("--run-url"),
      headSha: getArg("--head-sha"),
      status: getArg("--status"),
    }),
  );
}

if (import.meta.main) {
  main();
}
