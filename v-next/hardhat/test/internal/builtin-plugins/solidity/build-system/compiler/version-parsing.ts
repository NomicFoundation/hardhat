import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseVersionFromOutput } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/index.js";

describe("Version string parsing", () => {
  it("parses standard solc version string with +commit hash", () => {
    const stdout =
      "solc, the solidity compiler\nVersion: 0.8.28+commit.7893614a";
    assert.equal(parseVersionFromOutput(stdout), "0.8.28+commit.7893614a");
  });

  it("prefers +commit format when present in multi-line output", () => {
    const stdout = "Version: 0.8.28+commit.7893614a (also 0.8.28)";
    assert.equal(parseVersionFromOutput(stdout), "0.8.28+commit.7893614a");
  });

  it("returns null for completely unparseable version strings", () => {
    assert.equal(parseVersionFromOutput("not a version"), null);
    assert.equal(parseVersionFromOutput(""), null);
    assert.equal(parseVersionFromOutput("version unknown"), null);
  });

  it("returns null for plain semver without +commit", () => {
    assert.equal(parseVersionFromOutput("0.8.28"), null);
  });

  it("returns null for solx-style version output without +commit", () => {
    assert.equal(
      parseVersionFromOutput("solc v0.8.28, LLVM revision v1.0.1"),
      null,
    );
  });
});
