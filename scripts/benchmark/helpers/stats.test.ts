import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeStats } from "./stats.ts";

describe("computeStats", () => {
  it("handles a single sample (stddev 0, min=max=median=mean)", () => {
    const s = computeStats([4.2]);
    assert.equal(s.mean, 4.2);
    assert.equal(s.stddev, 0);
    assert.equal(s.min, 4.2);
    assert.equal(s.max, 4.2);
    assert.equal(s.median, 4.2);
    assert.deepEqual(s.times, [4.2]);
  });

  it("computes mean, min and max", () => {
    const s = computeStats([2, 4, 6]);
    assert.equal(s.mean, 4);
    assert.equal(s.min, 2);
    assert.equal(s.max, 6);
  });

  it("uses the sample standard deviation (n-1), matching hyperfine", () => {
    // values 2,4,6: variance (n-1) = ((-2)^2+0+2^2)/2 = 4 → stddev 2
    const s = computeStats([2, 4, 6]);
    assert.equal(s.stddev, 2);
  });

  it("computes the median for an odd count", () => {
    assert.equal(computeStats([5, 1, 3]).median, 3);
  });

  it("computes the median for an even count (average of middles)", () => {
    assert.equal(computeStats([1, 2, 3, 4]).median, 2.5);
  });

  it("preserves the original order of times", () => {
    assert.deepEqual(computeStats([3, 1, 2]).times, [3, 1, 2]);
  });

  it("throws on an empty sample set", () => {
    assert.throws(() => computeStats([]));
  });
});
