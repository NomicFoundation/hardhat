import { computeStats, mean, type TimingStats } from "./stats.ts";
import { logWarning } from "./log.ts";
import type { MeasuredRun } from "./runner.ts";

/**
 * One benchmark-action/github-action-benchmark entry in the
 * customSmallerIsBetter format. `extra` is a JSON string; the dashboard
 * requires numeric top-level `min`/`max`/`median`/`mean` in it to render a
 * chart.
 */
export interface BenchmarkEntry {
  name: string;
  unit: string;
  value: number;
  range: string;
  extra: string;
}

/**
 * Aggregate the measured runs of one benchmark name into its report entries:
 * wall-clock, "(cpu)" and, when every run has a peak reading, "(peak RSS)".
 */
export function measuredRunsToEntries(
  scenarioId: string,
  label: string,
  runs: MeasuredRun[],
): BenchmarkEntry[] {
  const peaks: number[] = [];

  for (const run of runs) {
    if (run.peakRssMb !== undefined) {
      peaks.push(run.peakRssMb);
    }
  }

  if (peaks.length > 0 && peaks.length !== runs.length) {
    logWarning(
      `${scenarioId} / ${label}: peak RSS missing for ` +
        `${runs.length - peaks.length} of ${runs.length} runs — ` +
        `skipping the (peak RSS) entry`,
    );
  }

  return [
    ...toEntries(
      scenarioId,
      label,
      computeStats(runs.map((r) => r.wallSeconds)),
      peaks.length === runs.length ? peaks : undefined,
    ),
    toCpuEntry(
      scenarioId,
      label,
      runs.map((r) => r.user),
      runs.map((r) => r.system),
    ),
  ];
}

/**
 * One benchmark produces a timing entry and, when peak RSS was captured, a
 * separate memory entry (its own MB series, independently charted + alerted).
 * `peakRssMb` holds one peak per run; the tracked value is the highest peak.
 * The per-run distribution goes in the entry's `extra`, and the timing
 * entry's `extra` embeds the peak as `peakRssMb`.
 */
export function toEntries(
  scenarioId: string,
  phaseLabel: string,
  wall: TimingStats,
  peakRssMb: number[] | undefined,
): BenchmarkEntry[] {
  const rss =
    peakRssMb !== undefined && peakRssMb.length > 0
      ? computeStats(peakRssMb)
      : undefined;

  const timeEntry: BenchmarkEntry = {
    name: `${scenarioId} / ${phaseLabel}`,
    unit: "s",
    value: wall.mean,
    range: `± ${wall.stddev}`,
    extra: JSON.stringify({
      times: wall.times,
      min: wall.min,
      max: wall.max,
      median: wall.median,
      mean: wall.mean,
      ...(rss !== undefined ? { peakRssMb: rss.max } : {}),
    }),
  };

  if (rss === undefined) {
    return [timeEntry];
  }

  const memEntry: BenchmarkEntry = {
    name: `${scenarioId} / ${phaseLabel} (peak RSS)`,
    unit: "MB",
    // Peak RSS is a max within each run; across runs we track the highest peak
    // and expose the spread (mean/stddev/…) in `extra`.
    value: rss.max,
    range: `± ${rss.stddev}`,
    extra: JSON.stringify({
      times: rss.times,
      min: rss.min,
      max: rss.max,
      median: rss.median,
      mean: rss.mean,
      stddev: rss.stddev,
    }),
  };

  return [timeEntry, memEntry];
}

/**
 * The CPU entry: its tracked value is the mean total CPU time (user+system)
 * over the per-run totals, with the mean user/system split in `extra`.
 */
export function toCpuEntry(
  scenarioId: string,
  phaseLabel: string,
  user: number[],
  system: number[],
): BenchmarkEntry {
  const totals = computeStats(user.map((u, i) => u + system[i]));

  return {
    name: `${scenarioId} / ${phaseLabel} (cpu)`,
    unit: "s",
    value: totals.mean,
    range: `± ${totals.stddev}`,
    extra: JSON.stringify({ user: mean(user), system: mean(system) }),
  };
}
