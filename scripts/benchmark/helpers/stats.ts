/**
 * Statistical summary of a series of benchmark timings, in seconds. Shaped to
 * match the per-result object hyperfine exports, so both the hyperfine path and
 * the in-process steps path in regression.ts can feed the same `toEntry`.
 */
export interface BenchmarkStats {
  mean: number;
  stddev: number;
  min: number;
  max: number;
  median: number;
  times: number[];
}

/**
 * Compute mean, sample standard deviation (n-1, matching hyperfine), min, max
 * and median from a non-empty list of timings. `times` is returned in its
 * original (execution) order, like hyperfine.
 */
export function computeStats(times: number[]): BenchmarkStats {
  const n = times.length;

  if (n === 0) {
    throw new Error("computeStats requires at least one sample");
  }

  const mean = times.reduce((sum, t) => sum + t, 0) / n;

  const stddev =
    n > 1
      ? Math.sqrt(times.reduce((sum, t) => sum + (t - mean) ** 2, 0) / (n - 1))
      : 0;

  const sorted = [...times].sort((a, b) => a - b);
  const median =
    n % 2 === 1 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  return {
    mean,
    stddev,
    min: sorted[0],
    max: sorted[n - 1],
    median,
    times,
  };
}
