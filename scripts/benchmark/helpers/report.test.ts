import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { summarize } from "./bench-export.ts";
import { PeakRssMethod } from "./peak-rss.ts";
import { formatRun, runCounter, summaryTable } from "./report.ts";
import type { MeasuredRun } from "./runner.ts";

const run = (
  wallSeconds: number,
  user: number,
  system: number,
  peakRssMb?: number,
): MeasuredRun => ({ wallSeconds, user, system, peakRssMb });

const TWO_RUNS = [run(1.5, 1, 0.25, 100), run(2.5, 2, 0.75, 120)];
const ONE_RUN = [run(1.5, 1, 0.25, 100)];

describe("formatRun", () => {
  it("prints wall time, total CPU time and peak RSS", () => {
    assert.equal(
      formatRun(run(0.975, 0.8, 0.501, 151)),
      "0.975 s, cpu 1.301 s, peak RSS 151 MB",
    );
  });

  it("omits peak RSS when the run has none", () => {
    assert.equal(formatRun(run(0.975, 0.8, 0.501)), "0.975 s, cpu 1.301 s");
  });
});

describe("runCounter", () => {
  it("pads the one-based index to the width of the total", () => {
    assert.equal(runCounter(0, 10), " 1/10");
  });
});

describe("summaryTable", () => {
  it("renders one row per measure with mean ± σ and min … max columns", () => {
    assert.deepEqual(
      summaryTable(summarize(TWO_RUNS), 1, PeakRssMethod.GnuTime),
      [
        "  2 runs (1 warm-up)    mean ± σ             min … max",
        "  wall time             2.000 s ± 0.707 s    1.500 s … 2.500 s",
        "  cpu time              2.000 s ± 1.061 s    1.250 s … 2.750 s",
        "    user                1.500 s ± 0.707 s    1.000 s … 2.000 s",
        "    system              0.500 s ± 0.354 s    0.250 s … 0.750 s",
        "  peak RSS (gnu-time)   110.0 MB ± 14.1 MB   100 MB … 120 MB",
      ],
    );
  });

  it("renders a single run as a value column only", () => {
    assert.deepEqual(
      summaryTable(summarize(ONE_RUN), 0, PeakRssMethod.Sampler),
      [
        "  1 run",
        "  wall time            1.500 s",
        "  cpu time             1.250 s",
        "    user               1.000 s",
        "    system             0.250 s",
        "  peak RSS (sampler)   100 MB",
      ],
    );
  });

  it("names the warm-up runs only when there are some", () => {
    const header = (warmupRuns: number) =>
      summaryTable(summarize(ONE_RUN), warmupRuns, undefined)[0];

    assert.deepEqual(
      [header(0), header(2)],
      ["  1 run", "  1 run (2 warm-up)"],
    );
  });

  it("omits the peak RSS row when no method was in use", () => {
    const lines = summaryTable(summarize(ONE_RUN), 0, undefined);

    assert.equal(lines.length, 5);
    assert.ok(lines.every((line) => !line.includes("peak RSS")));
  });

  it("omits the peak RSS row when a run lacks a peak", () => {
    const lines = summaryTable(
      summarize([run(1.5, 1, 0.25, 100), run(2.5, 2, 0.75)]),
      0,
      PeakRssMethod.GnuTime,
    );

    assert.equal(lines.length, 5);
    assert.ok(lines.every((line) => !line.includes("peak RSS")));
  });
});
