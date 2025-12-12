import * as assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getEvmVersionFromSolcVersion } from "../../../../../src/internal/builtin-plugins/solidity/build-system/solc-info.js";

describe("solc-info", () => {
  it("should return prague for 0.8.31", () => {
    assert.equal(getEvmVersionFromSolcVersion("0.8.31"), "prague");
  });
});
