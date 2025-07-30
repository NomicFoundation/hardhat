import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IncludeTraces } from "@nomicfoundation/edr";

import { solidityTestConfigToSolidityTestRunnerConfigArgs } from "../../../../src/internal/builtin-plugins/solidity-test/helpers.js";
import { GENERIC_CHAIN_TYPE } from "../../../../src/internal/constants.js";

describe("solidityTestConfigToSolidityTestRunnerConfigArgs", () => {
  it("should not include traces for verbosity level 0 through 2", async () => {
    for (const verbosity of [0, 1, 2]) {
      const args = solidityTestConfigToSolidityTestRunnerConfigArgs(
        GENERIC_CHAIN_TYPE,
        process.cwd(),
        {},
        verbosity,
      );

      assert.equal(args.includeTraces, IncludeTraces.None);
    }
  });

  it("should include failing traces for verbosity level 3 and 4", async () => {
    for (const verbosity of [3, 4]) {
      const args = solidityTestConfigToSolidityTestRunnerConfigArgs(
        GENERIC_CHAIN_TYPE,
        process.cwd(),
        {},
        verbosity,
      );

      assert.equal(args.includeTraces, IncludeTraces.Failing);
    }
  });

  it("should include all traces for verbosity level 5 and above", async () => {
    for (const verbosity of [5, 6, 7]) {
      const args = solidityTestConfigToSolidityTestRunnerConfigArgs(
        GENERIC_CHAIN_TYPE,
        process.cwd(),
        {},
        verbosity,
      );

      assert.equal(args.includeTraces, IncludeTraces.All);
    }
  });
});
