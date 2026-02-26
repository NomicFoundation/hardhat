import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseVersionFromOutput } from "../../../../../../src/internal/builtin-plugins/solidity/build-system/compiler/index.js";

describe("Version string parsing", () => {
  it("parses standard solc version string with +commit hash", () => {
    const stdout =
      "solc, the solidity compiler\nVersion: 0.8.28+commit.7893614a";
    assert.equal(parseVersionFromOutput(stdout), "0.8.28+commit.7893614a");
  });

  it("parses plain semver and synthesizes +custom long version", () => {
    const stdout = "0.8.28";
    assert.equal(parseVersionFromOutput(stdout), "0.8.28+custom");
  });

  it("parses solx-style version output", () => {
    const stdout = "solc v0.8.28, LLVM revision v1.0.1";
    assert.equal(parseVersionFromOutput(stdout), "0.8.28+custom");
  });

  it("parses solx --version with multiline output", () => {
    const stdout =
      "Solidity compiler for the EraVM and EVM\nVersion: 0.8.28\nBuild timestamp: 2024-12-01";
    assert.equal(parseVersionFromOutput(stdout), "0.8.28+custom");
  });

  it("prefers +commit format over plain semver when both present", () => {
    const stdout = "Version: 0.8.28+commit.7893614a (also 0.8.28)";
    assert.equal(parseVersionFromOutput(stdout), "0.8.28+commit.7893614a");
  });

  it("returns null for completely unparseable version strings", () => {
    assert.equal(parseVersionFromOutput("not a version"), null);
    assert.equal(parseVersionFromOutput(""), null);
    assert.equal(parseVersionFromOutput("version unknown"), null);
  });

  it("handles version string with pre-release tag (no +commit)", () => {
    const stdout = "0.8.28-alpha.1";
    assert.equal(parseVersionFromOutput(stdout), "0.8.28+custom");
  });
});
