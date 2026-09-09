import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeStats, type TimingStats } from "./stats.ts";
import { measuredRunsToEntries, toCpuEntry, toEntries } from "./entries.ts";
import { PeakRssMethod } from "./peak-rss.ts";
import type { MeasuredRun } from "./runner.ts";

// The fixture's mean and median must differ, or a confusion of the two
// passes unnoticed.
const EXPECTED_TIMES = [9.2, 9.4, 9.9];
const WALL = computeStats(EXPECTED_TIMES);

// The dashboard's statsOf() renders a chart only when the parsed `extra` has
// these four numeric fields at the top level.
function assertChartable(
  extra: Record<string, unknown>,
  expected: TimingStats,
): void {
  for (const field of ["min", "max", "median", "mean"] as const) {
    assert.equal(extra[field], expected[field], `extra.${field}`);
  }
}

describe("toEntries", () => {
  it("emits a timing entry with per-run samples and statistics", () => {
    const [time] = toEntries("scenario", "cold compile", WALL, undefined);

    assert.equal(time.name, "scenario / cold compile");
    assert.equal(time.unit, "s");
    assert.equal(time.value, WALL.mean);
    assert.equal(time.range, `± ${WALL.stddev}`);

    const extra = JSON.parse(time.extra);
    assert.deepEqual(extra.times, EXPECTED_TIMES);
    assertChartable(extra, WALL);
  });

  it("emits no memory entry without peaks", () => {
    assert.equal(toEntries("s", "x", WALL, undefined).length, 1);
    assert.equal(toEntries("s", "x", WALL, []).length, 1);
  });

  it("emits a memory entry tracking the mean per-run peak", () => {
    const peaks = [301, 315, 311];
    const [, mem] = toEntries("scenario", "test", WALL, peaks);

    assert.equal(mem.name, "scenario / test (peak RSS)");
    assert.equal(mem.unit, "MB");
    assert.equal(mem.value, 309);

    const stats = computeStats(peaks);
    assert.equal(mem.range, `± ${stats.stddev}`);

    const extra = JSON.parse(mem.extra);
    assert.deepEqual(extra.times, peaks);
    assertChartable(extra, stats);
    assert.equal(extra.stddev, stats.stddev);
  });

  it("reports zero spread for a single run", () => {
    const [, mem] = toEntries("s", "x", computeStats([1.0]), [512]);

    assert.equal(mem.range, "± 0");
    assert.deepEqual(JSON.parse(mem.extra).times, [512]);
  });
});

describe("measuredRunsToEntries", () => {
  const run = (wallSeconds: number, peakRssMb?: number): MeasuredRun => ({
    wallSeconds,
    user: wallSeconds / 2,
    system: wallSeconds / 4,
    peakRssMb,
  });

  it("emits time, memory and cpu entries when every run has a peak", () => {
    const entries = measuredRunsToEntries(
      "s",
      "x",
      [run(1, 100), run(2, 200)],
      PeakRssMethod.GnuTime,
    );

    assert.deepEqual(
      entries.map((e) => e.name),
      ["s / x", "s / x (peak RSS)", "s / x (cpu)"],
    );
    assert.equal(entries[1].value, 150);
  });

  it("emits only time and cpu entries when no method measured memory", () => {
    const entries = measuredRunsToEntries(
      "s",
      "x",
      [run(1), run(2)],
      undefined,
    );

    assert.deepEqual(
      entries.map((e) => e.name),
      ["s / x", "s / x (cpu)"],
    );
  });

  it("drops the memory entry when any run lacks a peak", () => {
    for (const runs of [
      [run(1), run(2)],
      [run(1, 100), run(2)],
    ]) {
      const entries = measuredRunsToEntries(
        "s",
        "x",
        runs,
        PeakRssMethod.Sampler,
      );

      assert.deepEqual(
        entries.map((e) => e.name),
        ["s / x", "s / x (cpu)"],
      );
    }
  });
});

describe("toCpuEntry", () => {
  const USER = [1.0, 1.2];
  const SYSTEM = [0.4, 0.6];
  // Derived by hand, so a change to how totals are paired fails the tests.
  const TOTALS = computeStats([1.0 + 0.4, 1.2 + 0.6]);

  it("tracks the mean of per-run totals with their spread", () => {
    const entry = toCpuEntry("scenario", "test", USER, SYSTEM);

    assert.equal(entry.name, "scenario / test (cpu)");
    assert.equal(entry.unit, "s");
    assert.equal(entry.value, TOTALS.mean);
    assert.equal(entry.range, `± ${TOTALS.stddev}`);
  });

  it("renders on the dashboard: per-run totals and statistics in extra", () => {
    const extra = JSON.parse(toCpuEntry("s", "x", USER, SYSTEM).extra);

    assert.deepEqual(extra.times, TOTALS.times);
    assertChartable(extra, TOTALS);
  });

  it("carries the user/system split as per-run stats sub-objects", () => {
    const extra = JSON.parse(toCpuEntry("s", "x", USER, SYSTEM).extra);

    assert.deepEqual(extra.user, {
      times: [1.0, 1.2],
      min: 1.0,
      max: 1.2,
      median: 1.1,
      mean: 1.1,
    });
    assert.deepEqual(extra.system, {
      times: [0.4, 0.6],
      min: 0.4,
      max: 0.6,
      median: 0.5,
      mean: 0.5,
    });
  });
});
