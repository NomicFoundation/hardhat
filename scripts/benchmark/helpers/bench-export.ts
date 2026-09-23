import { computeStats, mean, type TimingStats } from "./stats.ts";
import type { MeasuredRun } from "./runner.ts";

/** The wall-clock and CPU aggregates shared by the report and the export. */
export interface RunSummary {
  wall: TimingStats;
  userMean: number;
  systemMean: number;
}

export function summarize(measured: MeasuredRun[]): RunSummary {
  return {
    wall: computeStats(measured.map((r) => r.wallSeconds)),
    userMean: mean(measured.map((r) => r.user)),
    systemMean: mean(measured.map((r) => r.system)),
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
  { wall, userMean, systemMean }: RunSummary,
): string {
  return JSON.stringify(
    {
      results: [
        {
          command,
          mean: wall.mean,
          stddev: measured.length > 1 ? wall.stddev : null,
          median: wall.median,
          user: userMean,
          system: systemMean,
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
