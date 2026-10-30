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
  /**
   * The run that measured it: recorded by merge-baseline-report.ts for a
   * baseline cell, or the run being rendered when parseReport is given it.
   */
  run?: string;
}

/** scenario id -> cell label (e.g. "cold compile slang") -> result */
export type SlangReport = Map<string, Map<string, CellResult>>;

const ENTRY_NAME =
  /^(?<scenario>.+?) \/ (?<cell>.+?)(?: \((?<kind>cpu|peak RSS)\))?$/;

/**
 * The "<scenario> / <cell>" an entry belongs to, shared by its wall, cpu and
 * peak RSS entries; an entry of another shape is its own cell.
 */
export function cellKey(name: string): string {
  const m = ENTRY_NAME.exec(name);
  return m === null ? name : `${m.groups!.scenario} / ${m.groups!.cell}`;
}

/**
 * Groups a report's entries by scenario and cell. Entries whose name doesn't
 * have the "<scenario> / <cell>" shape are returned separately so a renderer
 * can still show them.
 *
 * A cell the report lacks is taken from `baseline` when that has it, marked
 * `fromBaseline`: a quick run measures only a few cells and borrows the rest
 * from the runs that last measured them. Every baseline cell must name that
 * run. `run` is the URL of the run that wrote `entries`; its cells name it.
 */
export function parseReport(
  entries: BenchmarkEntry[],
  baseline: BenchmarkEntry[] = [],
  run?: string,
): {
  report: SlangReport;
  unparsed: BenchmarkEntry[];
} {
  const own = groupEntries(entries);
  if (run !== undefined) {
    for (const cells of own.report.values()) {
      for (const result of cells.values()) {
        result.run ??= run;
      }
    }
  }
  const base = groupEntries(baseline);
  for (const [scenario, cells] of base.report) {
    const ownCells = own.report.get(scenario) ?? new Map<string, CellResult>();
    own.report.set(scenario, ownCells);
    for (const [cell, result] of cells) {
      if (!ownCells.has(cell)) {
        if (result.run === undefined) {
          throw new Error(
            `Baseline cell "${scenario} / ${cell}" names no run; write the baseline with merge-baseline-report.ts`,
          );
        }
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
      const extra = JSON.parse(entry.extra) as {
        times?: number[];
        run?: string;
      };
      result.wall = entry.value;
      result.wallStddev = Number(/± ([\d.]+)/.exec(entry.range)?.[1] ?? 0);
      result.runs = extra.times?.length ?? 1;
      if (extra.run !== undefined) {
        result.run = extra.run;
      }
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
 * The reference-link label of a run, its URL's last path segment (the run
 * id): a mark links `[†][<label>]`, so the URL is written once per table set
 * rather than once per value.
 */
export function runLabel(run: string): string {
  return run.replace(/\/+$/, "").split("/").at(-1) ?? run;
}

/**
 * The run behind a value derived from `results`: † and the first borrowed
 * cell's run when any is borrowed, else ‡ and the run being rendered; empty
 * when no cell names a run.
 */
export function runMark(...results: Array<CellResult | undefined>): string {
  const borrowed = results.find((r) => r?.fromBaseline === true);
  if (borrowed !== undefined) {
    return `[†][${runLabel(borrowed.run!)}]`;
  }
  const own = results.find((r) => r?.run !== undefined);
  return own === undefined ? "" : `[‡][${runLabel(own.run!)}]`;
}

/**
 * The ‡ and † footnotes for the runs `report`'s cells name, followed by the
 * link definitions their labels need; empty when no cell names a run.
 */
export function runFootnotes(report: SlangReport): string[] {
  const own = new Set<string>();
  const borrowed = new Set<string>();
  for (const cells of report.values()) {
    for (const result of cells.values()) {
      if (result.run !== undefined) {
        (result.fromBaseline === true ? borrowed : own).add(result.run);
      }
    }
  }
  const labels = (runs: Set<string>) =>
    [...runs]
      .sort()
      .map((r) => `[${runLabel(r)}]`)
      .join(", ");
  const lines: string[] = [];
  if (own.size > 0) {
    lines.push(`‡ measured in this run: ${labels(own)}.`, "");
  }
  if (borrowed.size > 0) {
    lines.push(
      "† taken from the baseline, not measured in this run; each † links the " +
        `run that measured it: ${labels(borrowed)}.`,
      "",
    );
  }
  const all = [...new Set([...own, ...borrowed])].sort();
  if (all.length > 0) {
    lines.push(...all.map((r) => `[${runLabel(r)}]: ${r}`), "");
  }
  return lines;
}

/**
 * How many times faster `subject` is than `baseline` on wall-clock, or
 * "parity" when the difference is within run-to-run noise: the two cells'
 * standard deviations added, and at least `floorSeconds` so single-run cells
 * don't call a few milliseconds of jitter a speedup.
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
