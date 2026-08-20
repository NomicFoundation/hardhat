// cSpell:ignore outpt -- a deliberate misspelling testing flag validation
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  getAllArgValues,
  parseEnvPairs,
  parseMode,
  parsePositionalArgs,
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

describe("parsePositionalArgs", () => {
  it("collects tokens that are neither flags nor flag values", () => {
    assert.deepEqual(
      parsePositionalArgs(
        ["render", "/run-dir", "--title", "cpu profile"],
        ["--title"],
      ),
      ["render", "/run-dir"],
    );
  });

  it("excludes the value following a value flag", () => {
    assert.deepEqual(
      parsePositionalArgs(["--output", "out.svg", "fold"], ["--output"]),
      ["fold"],
    );
  });

  it("treats a boolean flag's neighbor as positional, not its value", () => {
    assert.deepEqual(
      parsePositionalArgs(["--dry-run", "stray"], [], ["--dry-run"]),
      ["stray"],
    );
  });

  it("returns an empty array for flag-only args", () => {
    assert.deepEqual(
      parsePositionalArgs(
        ["--title", "x", "--dry-run"],
        ["--title"],
        ["--dry-run"],
      ),
      [],
    );
  });

  it("rejects unknown flags", () => {
    assert.throws(
      () => parsePositionalArgs(["--outpt", "x"], ["--output"]),
      /unknown option: --outpt/,
    );
  });

  it("rejects a flag missing its value", () => {
    assert.throws(
      () => parsePositionalArgs(["--output"], ["--output"]),
      /--output requires a value/,
    );
  });

  it("rejects a flag whose value looks like a flag", () => {
    assert.throws(
      () =>
        parsePositionalArgs(
          ["--output", "--title", "x"],
          ["--output", "--title"],
        ),
      /--output requires a value/,
    );
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
