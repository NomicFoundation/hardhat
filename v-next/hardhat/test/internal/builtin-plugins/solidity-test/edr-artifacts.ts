import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { BUILD_INFO_FORMAT } from "../../../../src/internal/builtin-plugins/solidity-test/edr-artifacts.js";

describe("BUILD_INFO_FORMAT", () => {
  it("matches a standard build ID", () => {
    const match = BUILD_INFO_FORMAT.exec("solc-0_8_0-abc123");

    assert.ok(
      match !== null && match.groups !== undefined,
      "Regexp should match and have groups",
    );

    assert.equal(match.groups.major, "0");
    assert.equal(match.groups.minor, "8");
    assert.equal(match.groups.patch, "0");
    assert.equal(match.groups.compilerType, undefined);
  });

  it("matches a build ID with compiler type", () => {
    const match = BUILD_INFO_FORMAT.exec("solc-0_8_0-solx-abc123");

    assert.ok(
      match !== null && match.groups !== undefined,
      "Regexp should match and have groups",
    );

    assert.equal(match.groups.compilerType, "solx");
  });

  it("matches a build ID with empty hash", () => {
    // The regex allows zero hex chars in the hash portion
    const match = BUILD_INFO_FORMAT.exec("solc-0_8_0-");
    assert.notEqual(match, null);
  });

  it("does not match a build ID without solc prefix", () => {
    const match = BUILD_INFO_FORMAT.exec("solx-0_8_0-abc123");
    assert.equal(match, null);
  });

  it("does not match a build ID with dots in version", () => {
    const match = BUILD_INFO_FORMAT.exec("solc-0.8.0-abc123");
    assert.equal(match, null);
  });
});
