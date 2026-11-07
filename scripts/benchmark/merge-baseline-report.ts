import { readFileSync, writeFileSync } from "node:fs";

import type { BenchmarkEntry } from "./helpers/entries.ts";
import { cellKey } from "./helpers/slang-report.ts";

const USAGE = `
scripts/benchmark/merge-baseline-report.ts — Fold a run's cells into the slang baseline

DESCRIPTION
  Writes --baseline with every cell --report measured replaced by the
  report's numbers, cells the baseline lacks added at the end, and every
  other cell kept. A cell's wall, cpu and peak RSS entries are replaced
  together. Each cell taken from --report records --run-url in its wall
  entry's extra ("run"), which the renderers link from the † they put on
  borrowed cells.

  Any run can refresh the baseline this way: a full dispatch, or one
  filtered to a compiler (e.g. "cold compile forge-*solar") that refreshes
  only those cells.

OPTIONS
  --baseline <path>  Required. The committed baseline report
  --report <path>    Required. The run's bench:regression report
  --run-url <url>    Required. The run that produced --report
  --out <path>       Required. Where to write the merged baseline

EXAMPLE
  node scripts/benchmark/merge-baseline-report.ts \\
    --baseline scripts/benchmark/slang-baseline-report.json \\
    --report slang-regression-report.json \\
    --run-url https://github.com/NomicFoundation/hardhat/actions/runs/1 \\
    --out slang-baseline-report.merged.json
`;

export interface MergeResult {
  entries: BenchmarkEntry[];
  replaced: number;
  added: number;
  kept: number;
}

export function mergeBaselineReport(
  baseline: BenchmarkEntry[],
  report: BenchmarkEntry[],
  runUrl: string,
): MergeResult {
  const reportCells = new Map<string, BenchmarkEntry[]>();
  for (const entry of report) {
    const key = cellKey(entry.name);
    const cell = reportCells.get(key) ?? [];
    reportCells.set(key, cell);
    cell.push(stampRun(entry, key, runUrl));
  }

  const entries: BenchmarkEntry[] = [];
  const emitted = new Set<string>();
  const keptCells = new Set<string>();
  for (const entry of baseline) {
    const key = cellKey(entry.name);
    const replacement = reportCells.get(key);
    if (replacement === undefined) {
      entries.push(entry);
      keptCells.add(key);
    } else if (!emitted.has(key)) {
      // In the baseline's position, so a refresh diffs cell by cell.
      entries.push(...replacement);
      emitted.add(key);
    }
  }

  let added = 0;
  for (const [key, cell] of reportCells) {
    if (!emitted.has(key)) {
      entries.push(...cell);
      added++;
    }
  }

  return {
    entries,
    replaced: emitted.size,
    added,
    kept: keptCells.size,
  };
}

// The run is recorded on the wall entry, the one a cell is anchored on.
function stampRun(
  entry: BenchmarkEntry,
  key: string,
  runUrl: string,
): BenchmarkEntry {
  if (entry.name !== key) {
    return entry;
  }
  const extra: unknown = JSON.parse(entry.extra);
  if (typeof extra !== "object" || extra === null || Array.isArray(extra)) {
    throw new Error(
      `${entry.name}: extra is not a JSON object: ${entry.extra}`,
    );
  }
  return { ...entry, extra: JSON.stringify({ ...extra, run: runUrl }) };
}

function main(): void {
  const getArg = (flag: string): string | undefined => {
    const i = process.argv.indexOf(flag);
    return i !== -1 && i + 1 < process.argv.length
      ? process.argv[i + 1]
      : undefined;
  };

  const baselinePath = getArg("--baseline");
  const reportPath = getArg("--report");
  const runUrl = getArg("--run-url");
  const out = getArg("--out");
  if (
    baselinePath === undefined ||
    reportPath === undefined ||
    runUrl === undefined ||
    out === undefined
  ) {
    console.log(USAGE);
    process.exit(1);
  }

  const read = (p: string) =>
    JSON.parse(readFileSync(p, "utf8")) as BenchmarkEntry[];
  const { entries, replaced, added, kept } = mergeBaselineReport(
    read(baselinePath),
    read(reportPath),
    runUrl,
  );
  writeFileSync(out, JSON.stringify(entries, null, 2) + "\n");
  console.log(
    `Merged ${reportPath} into ${baselinePath}: ${replaced} cells replaced, ${added} added, ${kept} kept → ${out}`,
  );
}

if (import.meta.main) {
  main();
}
