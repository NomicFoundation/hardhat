import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IncludeTraces } from "@ignored/edr-optimism";

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

  it("sets blockGasLimit and disableBlockGasLimit when blockGasLimit is undefined", async () => {
    const args = solidityTestConfigToSolidityTestRunnerConfigArgs(
      GENERIC_CHAIN_TYPE,
      process.cwd(),
      { blockGasLimit: undefined },
      1,
    );

    assert.equal(args.blockGasLimit, undefined);
    assert.equal(args.disableBlockGasLimit, false);
  });

  it("sets blockGasLimit and disableBlockGasLimit when blockGasLimit is false", async () => {
    const args = solidityTestConfigToSolidityTestRunnerConfigArgs(
      GENERIC_CHAIN_TYPE,
      process.cwd(),
      { blockGasLimit: false },
      1,
    );

    assert.equal(args.blockGasLimit, undefined);
    assert.equal(args.disableBlockGasLimit, true);
  });

  it("sets blockGasLimit and disableBlockGasLimit when blockGasLimit is a number", async () => {
    const args = solidityTestConfigToSolidityTestRunnerConfigArgs(
      GENERIC_CHAIN_TYPE,
      process.cwd(),
      { blockGasLimit: 1n },
      1,
    );

    assert.equal(args.blockGasLimit, 1n);
    assert.equal(args.disableBlockGasLimit, false);
  });

  it("sets blockDifficulty based on prevRandao", async () => {
    const args = solidityTestConfigToSolidityTestRunnerConfigArgs(
      GENERIC_CHAIN_TYPE,
      process.cwd(),
      { prevRandao: 123n },
      1,
    );

    assert.equal(args.blockDifficulty, 123n);
  });

  it("sets ethRpcUrl, forkBlockNumber and rpcEndpoints based on forking config", async () => {
    const args = solidityTestConfigToSolidityTestRunnerConfigArgs(
      GENERIC_CHAIN_TYPE,
      process.cwd(),
      {
        forking: {
          url: "an_url",
          blockNumber: 123n,
          rpcEndpoints: { a: "b" },
        },
      },
      1,
    );

    assert.equal(args.ethRpcUrl, "an_url");
    assert.equal(args.forkBlockNumber, 123n);
    assert.deepEqual(args.rpcEndpoints, { a: "b" });
  });
});
