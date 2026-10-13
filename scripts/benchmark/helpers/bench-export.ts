import { closeSync, openSync } from "node:fs";

import { computeStats, type TimingStats } from "./stats.ts";
import type { MeasuredRun } from "./runner.ts";
import { PEAK_RSS_METHOD_NAMES, type PeakRssMethod } from "./peak-rss.ts";

interface PeakRssSummary {
  /** One entry per run in run order, undefined for a run without a peak. */
  perRun: (number | undefined)[];
  /** Undefined when any run lacks a peak. */
  stats: TimingStats | undefined;
}

/**
 * Fail on an export path that cannot be written before the benchmark runs
 * for minutes. An existing report stays intact until the final write
 * replaces it.
 */
export function ensureExportPathWritable(exportPath: string): void {
  closeSync(openSync(exportPath, "a"));
}

/** The statistics of every measure, shared by the report and the export. */
export interface RunSummary {
  wall: TimingStats;
  /** Per-run total CPU time, user plus system. */
  cpu: TimingStats;
  user: TimingStats;
  system: TimingStats;
  peakRssMb: PeakRssSummary;
}

function summarizePeakRss(measured: MeasuredRun[]): PeakRssSummary {
  const perRun = measured.map((r) => r.peakRssMb);
  const peaks = perRun.filter((peak) => peak !== undefined);

  return {
    perRun,
    stats: peaks.length === perRun.length ? computeStats(peaks) : undefined,
  };
}

export function summarize(measured: MeasuredRun[]): RunSummary {
  return {
    wall: computeStats(measured.map((r) => r.wallSeconds)),
    cpu: computeStats(measured.map((r) => r.user + r.system)),
    user: computeStats(measured.map((r) => r.user)),
    system: computeStats(measured.map((r) => r.system)),
    peakRssMb: summarizePeakRss(measured),
  };
}

/**
 * The peak-RSS statistics with the method's CLI spelling. Undefined when no
 * method was in use or any run lacks a peak.
 */
export function reportablePeakRss(
  { peakRssMb }: RunSummary,
  peakRssMethod: PeakRssMethod | undefined,
): { method: string; stats: TimingStats } | undefined {
  return peakRssMethod !== undefined && peakRssMb.stats !== undefined
    ? { method: PEAK_RSS_METHOD_NAMES[peakRssMethod], stats: peakRssMb.stats }
    : undefined;
}

interface ExportedStatistics {
  mean: number | null;
  stddev: number | null;
  min: number | null;
  max: number | null;
  median: number | null;
}

const NO_STATISTICS: ExportedStatistics = {
  mean: null,
  stddev: null,
  min: null,
  max: null,
  median: null,
};

// A single sample has no spread, so its stddev exports as null rather than 0.
function toExportedStatistics(stats: TimingStats): ExportedStatistics {
  return {
    mean: stats.mean,
    stddev: stats.times.length > 1 ? stats.stddev : null,
    min: stats.min,
    max: stats.max,
    median: stats.median,
  };
}

function toExportedStats(
  stats: TimingStats,
): { times: number[] } & ExportedStatistics {
  return { times: stats.times, ...toExportedStatistics(stats) };
}

function toExportedPeakRss(
  { perRun, stats }: PeakRssSummary,
  peakRssMethod: PeakRssMethod | undefined,
) {
  if (peakRssMethod === undefined) {
    return null;
  }

  return {
    method: PEAK_RSS_METHOD_NAMES[peakRssMethod],
    times: perRun.map((peak) => peak ?? null),
    ...(stats !== undefined ? toExportedStatistics(stats) : NO_STATISTICS),
  };
}

/**
 * Render the export: one statistics object per measure, with `times` in run
 * order. `peakRssMb` is null when no method was in use. Its `times` holds
 * null for a run that lacks a peak. Any such null makes every peak-RSS
 * statistic null.
 */
export function buildExport(
  command: string,
  warmupRuns: number,
  summary: RunSummary,
  peakRssMethod: PeakRssMethod | undefined,
): string {
  const { wall, cpu, user, system, peakRssMb } = summary;

  return JSON.stringify(
    {
      command,
      warmupRuns,
      measuredRuns: wall.times.length,
      wallSeconds: toExportedStats(wall),
      cpuSeconds: {
        ...toExportedStats(cpu),
        user: toExportedStats(user),
        system: toExportedStats(system),
      },
      peakRssMb: toExportedPeakRss(peakRssMb, peakRssMethod),
    },
    null,
    2,
  );
}
