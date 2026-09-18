import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_ACCEPTANCE_DIR, resolveAndValidateArgs } from "./args.ts";

describe("resolveAndValidateArgs", () => {
  it("defaults to no command, so main prints the usage", () => {
    const args = resolveAndValidateArgs([]);

    assert.equal(args.runFlag, false);
    assert.equal(args.validateFlag, false);
  });

  it("reads the command", () => {
    assert.equal(resolveAndValidateArgs(["run"]).runFlag, true);
    assert.equal(resolveAndValidateArgs(["validate"]).validateFlag, true);
  });

  it("rejects two commands at once", () => {
    assert.throws(
      () => resolveAndValidateArgs(["run", "validate"]),
      /Only one command/,
    );
  });

  it("falls back to the default acceptance directory", () => {
    const { acceptanceDirectory } = resolveAndValidateArgs(["validate"]);

    assert.equal(acceptanceDirectory, DEFAULT_ACCEPTANCE_DIR);
  });

  it("prefers the flag over the environment", () => {
    process.env.ACCEPTANCE_DIR = "/tmp/from-env";

    try {
      const { acceptanceDirectory } = resolveAndValidateArgs([
        "run",
        "--acceptance-dir",
        "/tmp/from-flag",
      ]);

      assert.equal(acceptanceDirectory, "/tmp/from-flag");
    } finally {
      delete process.env.ACCEPTANCE_DIR;
    }
  });

  it("reads the scenario filter", () => {
    const { scenario } = resolveAndValidateArgs([
      "run",
      "--scenario",
      "minimal",
    ]);

    assert.equal(scenario, "minimal");
  });
});

describe("resolveAndValidateArgs --no-git-checks", () => {
  it("is off unless asked for", () => {
    assert.equal(resolveAndValidateArgs(["run"]).noGitChecks, false);
  });

  it("is on when passed", () => {
    assert.equal(
      resolveAndValidateArgs(["run", "--no-git-checks"]).noGitChecks,
      true,
    );
  });
});
