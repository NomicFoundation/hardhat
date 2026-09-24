import { computeStats, type TimingStats } from "./stats.ts";
import type { MeasuredRun } from "./runner.ts";

/** The wall-clock and CPU statistics shared by the report and the export. */
export interface RunSummary {
  wall: TimingStats;
  user: TimingStats;
  system: TimingStats;
}

export function summarize(measured: MeasuredRun[]): RunSummary {
  return {
    wall: computeStats(measured.map((r) => r.wallSeconds)),
    user: computeStats(measured.map((r) => r.user)),
    system: computeStats(measured.map((r) => r.system)),
  };
}

/**
 * Render the report in the shape of hyperfine's --export-json results
 * ({ results: [{ command, mean, stddev, median, user, system, min, max,
 * times }] }), which consumers of the pre-runner exports still expect.
 * Like hyperfine, a single run exports stddev null. Unlike hyperfine, the
 * exit_codes array is omitted. `peakRssMb` extends each result: run i's
 * largest-single-process peak, null when unmeasured.
 */
export function buildExport(
  command: string,
  measured: MeasuredRun[],
  { wall, user, system }: RunSummary,
): string {
  return JSON.stringify(
    {
      results: [
        {
          command,
          mean: wall.mean,
          stddev: measured.length > 1 ? wall.stddev : null,
          median: wall.median,
          user: user.mean,
          system: system.mean,
          min: wall.min,
          max: wall.max,
          times: wall.times,
          peakRssMb: measured.map((r) => r.peakRssMb ?? null),
        },
      ],
    },
    null,
    2,
  );
}
