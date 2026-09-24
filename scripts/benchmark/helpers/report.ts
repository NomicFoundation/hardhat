import { reportablePeakRss, type RunSummary } from "./bench-export.ts";
import type { PeakRssMethod } from "./peak-rss.ts";
import type { MeasuredRun } from "./runner.ts";
import type { TimingStats } from "./stats.ts";

const INDENT = "  ";
const COLUMN_GAP = "   ";

interface Unit {
  /** Formats a mean or a standard deviation. */
  aggregate: (value: number) => string;
  /** Formats a single run's value. */
  sample: (value: number) => string;
}

function formatSeconds(seconds: number): string {
  return `${seconds.toFixed(3)} s`;
}

const SECONDS: Unit = { aggregate: formatSeconds, sample: formatSeconds };

// Per-run peaks are whole megabytes.
const MEGABYTES: Unit = {
  aggregate: (mb) => `${mb.toFixed(1)} MB`,
  sample: (mb) => `${mb.toFixed(0)} MB`,
};

/**
 * One run's progress line: wall time, total CPU time and, when measured,
 * peak RSS.
 */
export function formatRun(run: MeasuredRun): string {
  return (
    `${SECONDS.sample(run.wallSeconds)}, cpu ${SECONDS.sample(run.user + run.system)}` +
    (run.peakRssMb !== undefined
      ? `, peak RSS ${MEGABYTES.sample(run.peakRssMb)}`
      : "")
  );
}

/** `index + 1` of `total`, padded to the width of `total`. */
export function runCounter(index: number, total: number): string {
  return `${String(index + 1).padStart(String(total).length)}/${total}`;
}

interface Measure {
  label: string;
  stats: TimingStats;
  unit: Unit;
}

function headerLabel(measuredRuns: number, warmupRuns: number): string {
  const runs = `${measuredRuns} ${measuredRuns === 1 ? "run" : "runs"}`;

  return warmupRuns > 0 ? `${runs} (${warmupRuns} warm-up)` : runs;
}

function measures(
  summary: RunSummary,
  peakRssMethod: PeakRssMethod | undefined,
): Measure[] {
  const { wall, cpu, user, system } = summary;
  const peakRss = reportablePeakRss(summary, peakRssMethod);

  return [
    { label: "wall time", stats: wall, unit: SECONDS },
    { label: "cpu time", stats: cpu, unit: SECONDS },
    { label: `${INDENT}user`, stats: user, unit: SECONDS },
    { label: `${INDENT}system`, stats: system, unit: SECONDS },
    ...(peakRss !== undefined
      ? [
          {
            label: `peak RSS (${peakRss.method})`,
            stats: peakRss.stats,
            unit: MEGABYTES,
          },
        ]
      : []),
  ];
}

// A single run has no spread, so it gets only its value column.
function measureCells({ label, stats, unit }: Measure): string[] {
  if (stats.times.length === 1) {
    return [label, unit.sample(stats.mean)];
  }

  return [
    label,
    `${unit.aggregate(stats.mean)} ± ${unit.aggregate(stats.stddev)}`,
    `${unit.sample(stats.min)} … ${unit.sample(stats.max)}`,
  ];
}

function renderTable(rows: string[][]): string[] {
  const columns = Math.max(...rows.map((row) => row.length));
  const widths = Array.from({ length: columns }, (_, column) =>
    Math.max(...rows.map((row) => (row[column] ?? "").length)),
  );

  return rows.map(
    (row) =>
      INDENT +
      row
        .map((cell, column) =>
          column === row.length - 1 ? cell : cell.padEnd(widths[column]),
        )
        .join(COLUMN_GAP),
  );
}

/**
 * The console summary: a header row, then one row per measure. The peak-RSS
 * row is omitted when no method was in use or any run lacks a peak.
 */
export function summaryTable(
  summary: RunSummary,
  warmupRuns: number,
  peakRssMethod: PeakRssMethod | undefined,
): string[] {
  const measuredRuns = summary.wall.times.length;
  const header =
    measuredRuns === 1
      ? [headerLabel(measuredRuns, warmupRuns)]
      : [headerLabel(measuredRuns, warmupRuns), "mean ± σ", "min … max"];

  return renderTable([
    header,
    ...measures(summary, peakRssMethod).map(measureCells),
  ]);
}
