// cSpell:ignore titel -- a deliberate misspelling testing flag validation
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { resolveArgs, Subcommand } from "./flamegraph.ts";

describe("resolveArgs", () => {
  it("returns undefined for empty args and --help", () => {
    assert.equal(resolveArgs([]), undefined);
    assert.equal(resolveArgs(["--help"]), undefined);
    assert.equal(resolveArgs(["render", "/run-dir", "-h"]), undefined);
  });

  it("parses render with its options", () => {
    assert.deepEqual(
      resolveArgs(["render", "/run-dir", "--output", "o.svg", "--title", "t"]),
      {
        subcommand: Subcommand.Render,
        runDir: "/run-dir",
        output: "o.svg",
        title: "t",
      },
    );
  });

  it("parses fold", () => {
    assert.deepEqual(resolveArgs(["fold", "/run-dir"]), {
      subcommand: Subcommand.Fold,
      runDir: "/run-dir",
      output: undefined,
      title: undefined,
    });
  });

  it("rejects a missing subcommand", () => {
    assert.throws(
      () => resolveArgs(["--output", "o.svg"]),
      /missing subcommand/,
    );
  });

  it("rejects unknown subcommands", () => {
    assert.throws(
      () => resolveArgs(["collapse", "/run-dir"]),
      /unknown subcommand "collapse"/,
    );
  });

  it("rejects a missing or extra run-dir", () => {
    assert.throws(() => resolveArgs(["render"]), /exactly one <run-dir>/);
    assert.throws(
      () => resolveArgs(["render", "/a", "/b"]),
      /exactly one <run-dir>/,
    );
  });

  it("rejects unknown options", () => {
    assert.throws(
      () => resolveArgs(["render", "/run-dir", "--titel", "x"]),
      /unknown option: --titel/,
    );
  });
});
