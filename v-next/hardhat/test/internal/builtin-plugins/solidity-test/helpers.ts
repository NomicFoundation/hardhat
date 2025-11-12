import type { ConfigurationVariableResolver } from "../../../../src/types/config.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";

import assert from "node:assert/strict";
import { before, describe, it } from "node:test";

import { CollectStackTraces, IncludeTraces } from "@nomicfoundation/edr";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import { resolveSolidityTestForkingConfig } from "../../../../src/internal/builtin-plugins/solidity-test/config.js";
import { solidityTestConfigToSolidityTestRunnerConfigArgs } from "../../../../src/internal/builtin-plugins/solidity-test/helpers.js";
import {
  DEFAULT_VERBOSITY,
  GENERIC_CHAIN_TYPE,
} from "../../../../src/internal/constants.js";
import { resolveConfigurationVariable } from "../../../../src/internal/core/configuration-variables.js";

describe("solidityTestConfigToSolidityTestRunnerConfigArgs", () => {
  let hre: HardhatRuntimeEnvironment;
  let configVarResolver: ConfigurationVariableResolver;

  before(async () => {
    hre = await createHardhatRuntimeEnvironment({});
    configVarResolver = (varOrStr) =>
      resolveConfigurationVariable(hre.hooks, varOrStr);
  });

  it("should not include traces for verbosity level 0 through 2", async () => {
    for (const verbosity of [0, 1, 2]) {
      const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
        chainType: GENERIC_CHAIN_TYPE,
        projectRoot: process.cwd(),
        config: {},
        verbosity,
        generateGasReport: false,
      });

      assert.equal(args.includeTraces, IncludeTraces.None);
    }
  });

  it("should include failing traces for verbosity level 3 and 4", async () => {
    for (const verbosity of [3, 4]) {
      const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
        chainType: GENERIC_CHAIN_TYPE,
        projectRoot: process.cwd(),
        config: {},
        verbosity,
        generateGasReport: false,
      });

      assert.equal(args.includeTraces, IncludeTraces.Failing);
    }
  });

  it("should include all traces for verbosity level 5 and above", async () => {
    for (const verbosity of [5, 6, 7]) {
      const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
        chainType: GENERIC_CHAIN_TYPE,
        projectRoot: process.cwd(),
        config: {},
        verbosity,
        generateGasReport: false,
      });

      assert.equal(args.includeTraces, IncludeTraces.All);
    }
  });

  it("should enable always tracing for verbosities above the default one", async () => {
    for (const verbosity of [1, 2, 3, 4, 5, 6, 7]) {
      const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
        chainType: GENERIC_CHAIN_TYPE,
        projectRoot: process.cwd(),
        config: {},
        verbosity,
        generateGasReport: false,
      });

      assert.equal(
        args.collectStackTraces,
        verbosity > DEFAULT_VERBOSITY
          ? CollectStackTraces.Always
          : CollectStackTraces.OnFailure,
      );
    }
  });

  it("sets blockGasLimit and disableBlockGasLimit when blockGasLimit is undefined", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: { blockGasLimit: undefined },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.blockGasLimit, undefined);
    assert.equal(args.disableBlockGasLimit, false);
  });

  it("sets blockGasLimit and disableBlockGasLimit when blockGasLimit is false", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: { blockGasLimit: false },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.blockGasLimit, undefined);
    assert.equal(args.disableBlockGasLimit, true);
  });

  it("sets blockGasLimit and disableBlockGasLimit when blockGasLimit is a number", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: { blockGasLimit: 1n },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.blockGasLimit, 1n);
    assert.equal(args.disableBlockGasLimit, false);
  });

  it("sets blockDifficulty based on prevRandao", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: { prevRandao: 123n },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.blockDifficulty, 123n);
  });

  it("sets ethRpcUrl, forkBlockNumber and rpcEndpoints based on forking config", async () => {
    const userForkingConfig = {
      url: "an_url",
      blockNumber: 123n,
      rpcEndpoints: { a: "b" },
    };

    const resolvedForkingConfig = resolveSolidityTestForkingConfig(
      userForkingConfig,
      configVarResolver,
    );

    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: { forking: resolvedForkingConfig },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.ethRpcUrl, "an_url");
    assert.equal(args.forkBlockNumber, 123n);
    assert.deepEqual(args.rpcEndpoints, { a: "b" });
  });

  it("sets generateGasReport to true", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {},
      verbosity: 0,
      generateGasReport: true,
    });

    assert.equal(args.generateGasReport, true);
  });

  it("sets generateGasReport to false", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {},
      verbosity: 0,
      generateGasReport: false,
    });

    assert.equal(args.generateGasReport, false);
  });
});
