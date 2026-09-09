import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeStats } from "./stats.ts";
import { measuredRunsToEntries, toCpuEntry, toEntries } from "./entries.ts";
import type { MeasuredRun } from "./runner.ts";

const WALL = computeStats([9.2, 9.4, 9.3]);

// The dashboard's statsOf() renders a chart only when the parsed `extra` has
// these four numeric fields at the top level.
function assertChartable(extra: Record<string, unknown>): void {
  for (const field of ["min", "max", "median", "mean"]) {
    assert.equal(typeof extra[field], "number", `extra.${field}`);
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
    assert.deepEqual(extra.times, [9.2, 9.4, 9.3]);
    assertChartable(extra);
    assert.equal(extra.peakRssMb, undefined);
  });

  it("emits no memory entry without peaks", () => {
    assert.equal(toEntries("s", "x", WALL, undefined).length, 1);
    assert.equal(toEntries("s", "x", WALL, []).length, 1);
  });

  it("emits a memory entry tracking the highest per-run peak", () => {
    const peaks = [301, 315, 308];
    const [time, mem] = toEntries("scenario", "test", WALL, peaks);

    assert.equal(JSON.parse(time.extra).peakRssMb, 315);

    assert.equal(mem.name, "scenario / test (peak RSS)");
    assert.equal(mem.unit, "MB");
    assert.equal(mem.value, 315);

    const stats = computeStats(peaks);
    assert.equal(mem.range, `± ${stats.stddev}`);

    const extra = JSON.parse(mem.extra);
    assert.deepEqual(extra.times, peaks);
    assertChartable(extra);
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
    const entries = measuredRunsToEntries("s", "x", [run(1, 100), run(2, 200)]);

    assert.deepEqual(
      entries.map((e) => e.name),
      ["s / x", "s / x (peak RSS)", "s / x (cpu)"],
    );
    assert.equal(entries[1].value, 200);
  });

  it("drops the memory entry when any run lacks a peak", () => {
    for (const runs of [
      [run(1), run(2)],
      [run(1, 100), run(2)],
    ]) {
      const entries = measuredRunsToEntries("s", "x", runs);

      assert.deepEqual(
        entries.map((e) => e.name),
        ["s / x", "s / x (cpu)"],
      );
      assert.equal(JSON.parse(entries[0].extra).peakRssMb, undefined);
    }
  });
});

describe("toCpuEntry", () => {
  it("tracks the mean of per-run totals with their spread", () => {
    const user = [1.0, 1.2];
    const system = [0.4, 0.6];
    const entry = toCpuEntry("scenario", "test", user, system);

    assert.equal(entry.name, "scenario / test (cpu)");
    assert.equal(entry.unit, "s");

    const totals = computeStats([1.0 + 0.4, 1.2 + 0.6]);
    assert.equal(entry.value, totals.mean);
    assert.equal(entry.range, `± ${totals.stddev}`);
  });

  it("carries the mean user/system split in extra", () => {
    const extra = JSON.parse(
      toCpuEntry("s", "x", [1.0, 1.2], [0.4, 0.6]).extra,
    );

    assert.deepEqual(extra, { user: 1.1, system: 0.5 });
  });
});
