import { readFileSync } from "node:fs";

/**
 * Wall-clock statistics computed from a series of per-run timings, in seconds.
 */
export interface TimingStats {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  median: number;
  times: number[];
}

/**
 * Statistical summary of a benchmark command, in seconds — the shared shape
 * feeding `toEntry`, produced by both regression.ts paths: the hyperfine export
 * and the in-process steps path. `user`/`system` are mean CPU times: hyperfine
 * exports only the means, so the steps path aggregates its per-run samples to
 * match.
 */
export interface BenchmarkStats extends TimingStats {
  user: number;
  system: number;
}

export function mean(values: number[]): number {
  if (values.length === 0) {
    throw new Error("mean requires at least one sample");
  }

  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Compute mean, sample standard deviation (n-1, matching hyperfine), min, max
 * and median from a non-empty list of timings. `times` is returned in its
 * original (execution) order, like hyperfine.
 */
export function computeStats(times: number[]): TimingStats {
  const n = times.length;

  if (n === 0) {
    throw new Error("computeStats requires at least one sample");
  }

  const avg = mean(times);

  const stddev =
    n > 1
      ? Math.sqrt(times.reduce((sum, t) => sum + (t - avg) ** 2, 0) / (n - 1))
      : 0;

  const sorted = [...times].sort((a, b) => a - b);
  const median =
    n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  return {
    mean: avg,
    stddev,
    min: sorted[0],
    max: sorted[n - 1],
    median,
    times,
  };
}

/**
 * One benchmark datapoint in github-action-benchmark's customSmallerIsBetter
 * format.
 */
export interface BenchmarkEntry {
  name: string;
  unit: string;
  value: number;
  range: string;
  extra: string;
}

// hyperfine's per-result object matches BenchmarkStats, including the mean
// `user`/`system` CPU time.
export function readHyperfineResult(exportPath: string): BenchmarkStats {
  const raw = JSON.parse(readFileSync(exportPath, "utf-8")) as {
    results: BenchmarkStats[];
  };

  if (!Array.isArray(raw.results) || raw.results.length === 0) {
    throw new Error(`Hyperfine export at ${exportPath} has no results`);
  }

  return raw.results[0];
}

export function toEntry(
  scenarioId: string,
  phaseLabel: string,
  result: BenchmarkStats,
): BenchmarkEntry {
  return {
    name: `${scenarioId} / ${phaseLabel}`,
    unit: "s",
    value: result.mean,
    range: `± ${result.stddev}`,
    extra: JSON.stringify({
      times: result.times,
      min: result.min,
      max: result.max,
      median: result.median,
      mean: result.mean,
    }),
  };
}

export function toCpuEntry(
  scenarioId: string,
  phaseLabel: string,
  result: BenchmarkStats,
  // hyperfine exports only mean user/system (no per-run CPU samples), so its
  // entries carry no spread.
  cpuStddev: number = 0,
): BenchmarkEntry {
  return {
    name: `${scenarioId} / ${phaseLabel} (cpu)`,
    unit: "s",
    value: result.user + result.system,
    range: `± ${cpuStddev}`,
    extra: JSON.stringify({ user: result.user, system: result.system }),
  };
}
