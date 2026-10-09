import type { BenchmarkEntry } from "./entries.ts";

/** One measured cell of a bench:regression report, in seconds and MB. */
export interface CellResult {
  wall: number;
  /** Sample stddev of the wall-clock runs; 0 for a single run. */
  wallStddev: number;
  runs: number;
  cpu?: number;
  peakRssMb?: number;
  /** Taken from the baseline report because the run didn't measure it. */
  fromBaseline?: boolean;
}

/** scenario id -> cell label (e.g. "cold compile slang") -> result */
export type SlangReport = Map<string, Map<string, CellResult>>;

const ENTRY_NAME =
  /^(?<scenario>.+?) \/ (?<cell>.+?)(?: \((?<kind>cpu|peak RSS)\))?$/;

/**
 * Groups a report's entries by scenario and cell. Entries whose name doesn't
 * have the "<scenario> / <cell>" shape are returned separately so a renderer
 * can still show them.
 *
 * A cell the report lacks is taken from `baseline` when that has it, marked
 * `fromBaseline`: a quick run measures only a few cells and borrows the rest
 * from the last full run.
 */
export function parseReport(
  entries: BenchmarkEntry[],
  baseline: BenchmarkEntry[] = [],
): {
  report: SlangReport;
  unparsed: BenchmarkEntry[];
} {
  const own = groupEntries(entries);
  const base = groupEntries(baseline);
  for (const [scenario, cells] of base.report) {
    const ownCells = own.report.get(scenario) ?? new Map<string, CellResult>();
    own.report.set(scenario, ownCells);
    for (const [cell, result] of cells) {
      if (!ownCells.has(cell)) {
        ownCells.set(cell, { ...result, fromBaseline: true });
      }
    }
  }
  return own;
}

function groupEntries(entries: BenchmarkEntry[]): {
  report: SlangReport;
  unparsed: BenchmarkEntry[];
} {
  const report: SlangReport = new Map();
  const unparsed: BenchmarkEntry[] = [];
  const partial = new Map<string, Partial<CellResult>>();

  for (const entry of entries) {
    const m = ENTRY_NAME.exec(entry.name);
    if (m === null) {
      unparsed.push(entry);
      continue;
    }
    const { scenario, cell, kind } = m.groups!;
    const key = `${scenario}\u0000${cell}`;
    const result = partial.get(key) ?? {};
    partial.set(key, result);

    if (kind === "cpu") {
      result.cpu = entry.value;
    } else if (kind === "peak RSS") {
      result.peakRssMb = entry.value;
    } else {
      const extra = JSON.parse(entry.extra) as { times?: number[] };
      result.wall = entry.value;
      result.wallStddev = Number(/± ([\d.]+)/.exec(entry.range)?.[1] ?? 0);
      result.runs = extra.times?.length ?? 1;
    }
  }

  for (const [key, result] of partial) {
    const [scenario, cell] = key.split("\u0000");
    // A cpu or peak-RSS entry without its wall-clock entry has nothing to
    // anchor it; it can't occur in a report the harness wrote.
    if (result.wall === undefined) {
      continue;
    }
    const cells = report.get(scenario) ?? new Map<string, CellResult>();
    report.set(scenario, cells);
    cells.set(cell, result as CellResult);
  }

  return { report, unparsed };
}

/**
 * How many times faster `subject` is than `baseline` on wall-clock, or
 * "parity" when the difference is within run-to-run noise: the two cells'
 * stddevs added, and at least `floorSeconds` so single-run cells don't call
 * a few milliseconds of jitter a speedup.
 */
export function speedup(
  baseline: CellResult,
  subject: CellResult,
  floorSeconds = 0.1,
): string {
  const noise = Math.max(
    baseline.wallStddev + subject.wallStddev,
    floorSeconds,
  );
  if (Math.abs(baseline.wall - subject.wall) <= noise) {
    return "parity";
  }
  return `${(baseline.wall / subject.wall).toFixed(1)}x`;
}
