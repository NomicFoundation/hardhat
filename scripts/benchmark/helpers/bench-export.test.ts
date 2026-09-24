import { after, describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import {
  buildExport,
  ensureExportPathWritable,
  summarize,
} from "./bench-export.ts";
import { PeakRssMethod } from "./peak-rss.ts";
import type { MeasuredRun } from "./runner.ts";

const COMMAND = "npx hardhat compile";
const WARMUP_RUNS = 1;

const run = (
  wallSeconds: number,
  user: number,
  system: number,
  peakRssMb?: number,
): MeasuredRun => ({ wallSeconds, user, system, peakRssMb });

const exportedWith = (
  measured: MeasuredRun[],
  peakRssMethod: PeakRssMethod | undefined,
) =>
  JSON.parse(
    buildExport(COMMAND, WARMUP_RUNS, summarize(measured), peakRssMethod),
  );

const exported = (measured: MeasuredRun[]) =>
  exportedWith(measured, PeakRssMethod.GnuTime);

const THREE_RUNS = [
  run(2, 1, 0.25, 100),
  run(4, 2, 0.5, 120),
  run(9, 6, 1.5, 200),
];

describe("summarize", () => {
  it("sums user and system per run into the cpu totals", () => {
    assert.deepEqual(summarize(THREE_RUNS).cpu.times, [1.25, 2.5, 7.5]);
  });

  it("keeps per-run peaks with an undefined hole and no statistics when a run lacks a peak", () => {
    assert.deepEqual(
      summarize([run(2, 1, 0.5, 100), run(4, 1, 0.5)]).peakRssMb,
      {
        perRun: [100, undefined],
        stats: undefined,
      },
    );
  });
});

describe("buildExport", () => {
  it("exports the command and the run counts", () => {
    const { command, warmupRuns, measuredRuns } = exported(THREE_RUNS);

    assert.deepEqual(
      { command, warmupRuns, measuredRuns },
      { command: COMMAND, warmupRuns: WARMUP_RUNS, measuredRuns: 3 },
    );
  });

  it("exports wallSeconds statistics in run order, with an n-1 stddev", () => {
    assert.deepEqual(exported(THREE_RUNS).wallSeconds, {
      times: [2, 4, 9],
      mean: 5,
      stddev: Math.sqrt(13),
      min: 2,
      max: 9,
      median: 4,
    });
  });

  it("exports cpuSeconds over per-run totals, with user and system nested", () => {
    assert.deepEqual(exported(THREE_RUNS).cpuSeconds, {
      times: [1.25, 2.5, 7.5],
      mean: 3.75,
      stddev: Math.sqrt(10.9375),
      min: 1.25,
      max: 7.5,
      median: 2.5,
      user: {
        times: [1, 2, 6],
        mean: 3,
        stddev: Math.sqrt(7),
        min: 1,
        max: 6,
        median: 2,
      },
      system: {
        times: [0.25, 0.5, 1.5],
        mean: 0.75,
        stddev: Math.sqrt(0.4375),
        min: 0.25,
        max: 1.5,
        median: 0.5,
      },
    });
  });

  it("exports peakRssMb statistics tagged with the method's CLI spelling", () => {
    assert.deepEqual(
      exportedWith(THREE_RUNS, PeakRssMethod.Sampler).peakRssMb,
      {
        method: "sampler",
        times: [100, 120, 200],
        mean: 140,
        stddev: Math.sqrt(2800),
        min: 100,
        max: 200,
        median: 120,
      },
    );
  });

  it("exports stddev null for every measure of a single run", () => {
    const single = exported([run(2, 1, 0.5, 100)]);

    assert.deepEqual(
      [
        single.wallSeconds.stddev,
        single.cpuSeconds.stddev,
        single.cpuSeconds.user.stddev,
        single.cpuSeconds.system.stddev,
        single.peakRssMb.stddev,
      ],
      [null, null, null, null, null],
    );
  });

  it("exports peakRssMb null when no method was in use", () => {
    assert.equal(
      exportedWith([run(2, 1, 0.5, 100)], undefined).peakRssMb,
      null,
    );
  });

  it("exports per-run peaks with a null hole and null statistics when a run lacks a peak", () => {
    assert.deepEqual(
      exported([run(2, 1, 0.5, 100), run(4, 1, 0.5), run(6, 1, 0.5, 120)])
        .peakRssMb,
      {
        method: "gnu-time",
        times: [100, null, 120],
        mean: null,
        stddev: null,
        min: null,
        max: null,
        median: null,
      },
    );
  });
});

describe("ensureExportPathWritable", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "bench-export-test-"));
  after(() => rmSync(dir, { recursive: true, force: true }));

  it("leaves an existing report intact", () => {
    const file = path.join(dir, "existing.json");
    writeFileSync(file, "previous report");

    ensureExportPathWritable(file);

    assert.equal(readFileSync(file, "utf8"), "previous report");
  });

  it("creates a missing file", () => {
    const file = path.join(dir, "new.json");

    ensureExportPathWritable(file);

    assert.ok(existsSync(file));
  });

  it("throws for a path in a missing directory", () => {
    assert.throws(
      () => ensureExportPathWritable(path.join(dir, "missing", "x.json")),
      { code: "ENOENT" },
    );
  });
});
