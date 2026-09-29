import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAllArgValues,
  parseEnvPairs,
  parseMode,
  parseSampleRate,
} from "./args.ts";

describe("getAllArgValues", () => {
  it("collects every occurrence in order", () => {
    assert.deepEqual(
      getAllArgValues(
        ["--scenario", "a", "--mode", "js", "--scenario", "b"],
        "--scenario",
      ),
      ["a", "b"],
    );
  });

  it("returns an empty array when absent", () => {
    assert.deepEqual(getAllArgValues(["--mode", "js"], "--scenario"), []);
  });
});

describe("parseEnvPairs", () => {
  it("parses KEY=VALUE pairs, allowing = in values", () => {
    assert.deepEqual(parseEnvPairs(["A=1", "B=x=y"]), { A: "1", B: "x=y" });
  });

  it("rejects pairs without a key", () => {
    assert.throws(() => parseEnvPairs(["=nope"]), /KEY=VALUE/);
  });
});

describe("parseMode", () => {
  it("defaults to both", () => {
    assert.equal(parseMode(undefined), "both");
  });

  it("rejects unknown modes", () => {
    assert.throws(() => parseMode("perf"), /--mode must be one of/);
  });
});

describe("parseSampleRate", () => {
  it("defaults to 999 Hz", () => {
    assert.equal(parseSampleRate(undefined), 999);
  });

  it("rejects non-integers", () => {
    assert.throws(() => parseSampleRate("99.5"), /--sample-rate/);
  });

  it("accepts the bounds", () => {
    assert.equal(parseSampleRate("1"), 1);
    assert.equal(parseSampleRate("100000"), 100_000);
  });

  it("rejects values outside the bounds", () => {
    assert.throws(() => parseSampleRate("0"), /--sample-rate/);
    assert.throws(() => parseSampleRate("100001"), /--sample-rate/);
  });
});
