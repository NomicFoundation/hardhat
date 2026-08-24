import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  cpuProfFlags,
  injectBunCpuProfFlags,
  mergeNodeOptions,
  sampleRateToIntervalUs,
} from "./js-prof.ts";

describe("sampleRateToIntervalUs", () => {
  it("converts Hz to a microsecond interval", () => {
    assert.equal(sampleRateToIntervalUs(999), 1001);
    assert.equal(sampleRateToIntervalUs(10_000), 100);
  });

  it("never goes below 1 microsecond", () => {
    assert.equal(sampleRateToIntervalUs(10_000_000), 1);
  });
});

describe("mergeNodeOptions", () => {
  it("returns the additions when nothing is set", () => {
    assert.equal(mergeNodeOptions(undefined, "--cpu-prof"), "--cpu-prof");
    assert.equal(mergeNodeOptions("", "--cpu-prof"), "--cpu-prof");
  });

  it("appends to an existing value", () => {
    assert.equal(
      mergeNodeOptions("--max-old-space-size=4096", "--cpu-prof"),
      "--max-old-space-size=4096 --cpu-prof",
    );
  });
});

describe("injectBunCpuProfFlags", () => {
  it("returns undefined for node commands", () => {
    assert.equal(
      injectBunCpuProfFlags("npx hardhat test", "/out", 999),
      undefined,
    );
  });

  it("injects flags after bun", () => {
    assert.equal(
      injectBunCpuProfFlags("bun run test", "/out", 1000),
      'bun --cpu-prof --cpu-prof-interval=1000 --cpu-prof-dir="/out" run test',
    );
  });

  it("rewrites bunx to bun x with flags", () => {
    assert.equal(
      injectBunCpuProfFlags("bunx vitest run", "/out", 1000),
      'bun --cpu-prof --cpu-prof-interval=1000 --cpu-prof-dir="/out" x vitest run',
    );
  });

  it("does not match bun as a substring", () => {
    assert.equal(
      injectBunCpuProfFlags("bundle exec rake", "/out", 999),
      undefined,
    );
  });
});

describe("cpuProfFlags", () => {
  it("derives the interval from the sample rate", () => {
    assert.deepEqual(cpuProfFlags("/tmp/prof", 999), [
      "--cpu-prof",
      "--cpu-prof-interval=1001",
      '--cpu-prof-dir="/tmp/prof"',
    ]);
  });
});
