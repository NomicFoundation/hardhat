import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildExport, summarize } from "./bench-export.ts";
import type { MeasuredRun } from "./runner.ts";

const run = (
  wallSeconds: number,
  user: number,
  system: number,
  peakRssMb?: number,
): MeasuredRun => ({ wallSeconds, user, system, peakRssMb });

const exported = (measured: MeasuredRun[]) =>
  JSON.parse(buildExport("npx hardhat compile", measured, summarize(measured)))
    .results[0];

describe("summarize", () => {
  it("keeps full statistics for user and system CPU, not just means", () => {
    const { user, system } = summarize([run(2, 1, 0.25), run(4, 3, 0.75)]);

    assert.deepEqual(
      { times: user.times, min: user.min, max: user.max, mean: user.mean },
      { times: [1, 3], min: 1, max: 3, mean: 2 },
    );
    assert.deepEqual(
      { times: system.times, mean: system.mean },
      { times: [0.25, 0.75], mean: 0.5 },
    );
  });
});

describe("buildExport", () => {
  it("exports hyperfine's result fields plus per-run peakRssMb", () => {
    // Distinct per-run CPU values, so a single run's value cannot pass as
    // the mean.
    assert.deepEqual(exported([run(2, 1, 0.25, 100), run(4, 3, 0.75, 120)]), {
      command: "npx hardhat compile",
      mean: 3,
      // n-1 stddev of [2, 4], derived by hand
      stddev: Math.SQRT2,
      median: 3,
      user: 2,
      system: 0.5,
      min: 2,
      max: 4,
      times: [2, 4],
      peakRssMb: [100, 120],
    });
  });

  it("exports stddev null for a single run, like hyperfine", () => {
    assert.equal(exported([run(2, 1, 0.5, 100)]).stddev, null);
  });

  it("exports null for a run without a peak", () => {
    assert.deepEqual(
      exported([run(2, 1, 0.5, 100), run(4, 1, 0.5)]).peakRssMb,
      [100, null],
    );
  });
});
