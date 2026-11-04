import type { ConfigurationVariableResolver } from "../../../../src/types/config.js";
import type { HardhatRuntimeEnvironment } from "../../../../src/types/hre.js";
import type { SolidityTestProfileConfig } from "../../../../src/types/test.js";
import type { Artifact } from "@nomicfoundation/edr";

import assert from "node:assert/strict";
import { Readable, Writable } from "node:stream";
import { before, describe, it } from "node:test";

import {
  CollectStackTraces,
  IncludeTraces,
  l1HardforkLatest,
  l1HardforkToString,
  opHardforkToString,
  opLatestHardfork,
} from "@nomicfoundation/edr";

import { createHardhatRuntimeEnvironment } from "../../../../src/hre.js";
import {
  L1HardforkName,
  OpHardforkName,
} from "../../../../src/internal/builtin-plugins/network-manager/edr/types/hardfork.js";
import { resolveSolidityTestForkingConfig } from "../../../../src/internal/builtin-plugins/solidity-test/config.js";
import {
  isTestSuiteArtifact,
  selectTestSourcePaths,
  solidityTestConfigToSolidityTestRunnerConfigArgs,
  writeTestRunOutput,
} from "../../../../src/internal/builtin-plugins/solidity-test/helpers.js";
import {
  ALWAYS_COLLECT_STACK_TRACES_VERBOSITY,
  GENERIC_CHAIN_TYPE,
  L1_CHAIN_TYPE,
  OPTIMISM_CHAIN_TYPE,
} from "../../../../src/internal/constants.js";
import { resolveConfigurationVariable } from "../../../../src/internal/core/configuration-variables.js";

/**
 * The resolved profile the conversion tests start from. Each test overrides
 * only the fields it exercises.
 */
const BASE_PROFILE_CONFIG: SolidityTestProfileConfig = {
  fuzz: { seed: "0x1234" },
  rpcCachePath: "",
  eip712Types: { exclude: [] },
};

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
        config: BASE_PROFILE_CONFIG,
        verbosity,
        generateGasReport: false,
      });

      assert.equal(args.includeTraces, IncludeTraces.None);
    }
  });

  it("should include failing traces for verbosity level 3", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: BASE_PROFILE_CONFIG,
      verbosity: 3,
      generateGasReport: false,
    });

    assert.equal(args.includeTraces, IncludeTraces.Failing);
  });

  it("should include all traces for verbosity level 4 and above", async () => {
    for (const verbosity of [4, 5, 6, 7]) {
      const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
        chainType: GENERIC_CHAIN_TYPE,
        projectRoot: process.cwd(),
        config: BASE_PROFILE_CONFIG,
        verbosity,
        generateGasReport: false,
      });

      assert.equal(args.includeTraces, IncludeTraces.All);
    }
  });

  it("should only collect stack traces at verbosity 5 and above", async () => {
    for (const verbosity of [1, 2, 3, 4, 5, 6, 7]) {
      const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
        chainType: GENERIC_CHAIN_TYPE,
        projectRoot: process.cwd(),
        config: BASE_PROFILE_CONFIG,
        verbosity,
        generateGasReport: false,
      });

      assert.equal(
        args.collectStackTraces,
        verbosity >= ALWAYS_COLLECT_STACK_TRACES_VERBOSITY
          ? CollectStackTraces.Always
          : CollectStackTraces.OnFailure,
      );
    }
  });

  it("disables blockGasLimit when blockGasLimit is undefined", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        blockGasLimit: undefined,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.blockGasLimit, undefined);
    assert.equal(args.disableBlockGasLimit, true);
  });

  it("sets blockGasLimit and disableBlockGasLimit when blockGasLimit is false", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        blockGasLimit: false,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.blockGasLimit, undefined);
    assert.equal(args.disableBlockGasLimit, true);
  });

  it("sets blockGasLimit and disableBlockGasLimit when blockGasLimit is a bigint", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: { ...BASE_PROFILE_CONFIG, blockGasLimit: 1n },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.blockGasLimit, 1n);
    assert.equal(args.disableBlockGasLimit, false);
  });

  it("converts a number blockGasLimit to a bigint", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        blockGasLimit: 100,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.blockGasLimit, 100n);
    assert.equal(args.disableBlockGasLimit, false);
  });

  it("disables transactionGasCap when transactionGasCap is undefined", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        transactionGasCap: undefined,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.transactionGasCap, undefined);
    assert.equal(args.disableTransactionGasCap, true);
  });

  it("disables transactionGasCap when transactionGasCap is false", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        transactionGasCap: false,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.transactionGasCap, undefined);
    assert.equal(args.disableTransactionGasCap, true);
  });

  it("enforces transactionGasCap when transactionGasCap is a bigint", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        transactionGasCap: 1_000_000n,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.transactionGasCap, 1_000_000n);
    assert.equal(args.disableTransactionGasCap, false);
  });

  it("converts a number transactionGasCap to a bigint", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        transactionGasCap: 1_000_000,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.transactionGasCap, 1_000_000n);
    assert.equal(args.disableTransactionGasCap, false);
  });

  it("sets gasLimit when it is undefined", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        gasLimit: undefined,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.gasLimit, undefined);
  });

  it("sets gasLimit when it is a bigint", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        gasLimit: 12_000_000n,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.gasLimit, 12_000_000n);
  });

  it("sets blockDifficulty based on prevRandao", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: { ...BASE_PROFILE_CONFIG, prevRandao: 123n },
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
      config: {
        ...BASE_PROFILE_CONFIG,
        forking: resolvedForkingConfig,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.ethRpcUrl, "an_url");
    assert.equal(args.forkBlockNumber, 123n);
    assert.deepEqual(args.rpcEndpoints, { a: "b" });
  });

  it("accepts a number blockNumber in forking config and converts it to bigint", async () => {
    const userForkingConfig = {
      url: "an_url",
      blockNumber: 123,
      rpcEndpoints: { a: "b" },
    };

    const resolvedForkingConfig = resolveSolidityTestForkingConfig(
      userForkingConfig,
      configVarResolver,
    );

    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        forking: resolvedForkingConfig,
      },
      verbosity: 1,
      generateGasReport: false,
    });

    assert.equal(args.forkBlockNumber, 123n);
  });

  it("sets generateGasReport to true", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: BASE_PROFILE_CONFIG,
      verbosity: 0,
      generateGasReport: true,
    });

    assert.equal(args.generateGasReport, true);
  });

  it("sets generateGasReport to false", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: BASE_PROFILE_CONFIG,
      verbosity: 0,
      generateGasReport: false,
    });

    assert.equal(args.generateGasReport, false);
  });

  it("forwards testPattern and excludeTestPattern to the runner config", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: BASE_PROFILE_CONFIG,
      verbosity: 0,
      generateGasReport: false,
      testPattern: "unit_",
      excludeTestPattern: "^testFork_",
    });

    assert.equal(args.testPattern, "unit_");
    assert.equal(args.excludeTestPattern, "^testFork_");
  });

  it("leaves testPattern and excludeTestPattern undefined when not provided", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: BASE_PROFILE_CONFIG,
      verbosity: 0,
      generateGasReport: false,
    });

    assert.equal(args.testPattern, undefined);
    assert.equal(args.excludeTestPattern, undefined);
  });

  it("normalizes empty-string testPattern and excludeTestPattern to undefined", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: BASE_PROFILE_CONFIG,
      verbosity: 0,
      generateGasReport: false,
      testPattern: "",
      excludeTestPattern: "",
    });

    assert.equal(args.testPattern, undefined);
    assert.equal(args.excludeTestPattern, undefined);
  });

  it("forwards the EIP-712 exclude globs to the runner config", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: {
        ...BASE_PROFILE_CONFIG,
        eip712Types: {
          exclude: ["contracts/vendor/**", "node_modules/dep/**"],
        },
      },
      verbosity: 0,
      generateGasReport: false,
    });

    assert.deepEqual(args.eip712ExcludeGlobs, [
      "contracts/vendor/**",
      "node_modules/dep/**",
    ]);
  });

  it("excludes nothing from EIP-712 collection when no glob is configured", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: BASE_PROFILE_CONFIG,
      verbosity: 0,
      generateGasReport: false,
    });

    assert.deepEqual(args.eip712ExcludeGlobs, []);
  });

  it("doesn't pass the Hardhat-shaped `eip712Types` on to the runner config", async () => {
    const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
      chainType: GENERIC_CHAIN_TYPE,
      projectRoot: process.cwd(),
      config: BASE_PROFILE_CONFIG,
      verbosity: 0,
      generateGasReport: false,
    });

    assert.ok(
      !("eip712Types" in args),
      "`eip712Types` should not reach the runner config",
    );
  });

  describe("hardfork parameter", () => {
    it("should use provided hardfork for EDR", async () => {
      const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
        chainType: L1_CHAIN_TYPE,
        projectRoot: process.cwd(),
        hardfork: "cancun",
        config: BASE_PROFILE_CONFIG,
        verbosity: 2,
        generateGasReport: false,
      });

      assert.equal(args.hardfork, L1HardforkName.CANCUN);
    });

    it("should use provided hardfork for OP", async () => {
      const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
        chainType: OPTIMISM_CHAIN_TYPE,
        projectRoot: process.cwd(),
        hardfork: "ecotone",
        config: BASE_PROFILE_CONFIG,
        verbosity: 2,
        generateGasReport: false,
      });

      assert.equal(args.hardfork, OpHardforkName.ECOTONE);
    });

    it("should use latest L1 hardfork when hardfork is undefined", async () => {
      const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
        chainType: L1_CHAIN_TYPE,
        projectRoot: process.cwd(),
        hardfork: undefined,
        config: BASE_PROFILE_CONFIG,
        verbosity: 2,
        generateGasReport: false,
      });

      const expectedHardfork = l1HardforkToString(l1HardforkLatest());
      assert.equal(args.hardfork, expectedHardfork);
    });

    it("should use latest OP hardfork when hardfork is undefined", async () => {
      const args = await solidityTestConfigToSolidityTestRunnerConfigArgs({
        chainType: OPTIMISM_CHAIN_TYPE,
        projectRoot: process.cwd(),
        hardfork: undefined,
        config: BASE_PROFILE_CONFIG,
        verbosity: 2,
        generateGasReport: false,
      });

      const expectedHardfork = opHardforkToString(opLatestHardfork());
      assert.equal(args.hardfork, expectedHardfork);
    });
  });
});

describe("isTestSuiteArtifact", () => {
  const SOLC_VERSION = "0.8.0";
  const ZERO_BYTECODE = "0x";
  const NON_EMPTY_BYTECODE = "0x6080604052";

  const abiWith = (fnName: string): string =>
    JSON.stringify([
      { type: "function", name: fnName, inputs: [], outputs: [] },
    ]);

  const artifactFactory = ({
    name,
    abi,
    bytecode,
  }: {
    name: string;
    abi: string;
    bytecode: string;
  }): Artifact => ({
    id: {
      name,
      solcVersion: SOLC_VERSION,
      source: `test/${name}.t.sol`,
    },
    contract: {
      abi,
      bytecode,
      linkReferences: {},
      deployedBytecode: bytecode,
      deployedLinkReferences: {},
    },
  });

  it("returns true for a concrete contract with a test_* function", () => {
    const artifact = artifactFactory({
      name: "ConcreteTest",
      abi: abiWith("test_foo"),
      bytecode: NON_EMPTY_BYTECODE,
    });

    assert.equal(isTestSuiteArtifact(artifact), true);
  });

  it("returns true for a concrete contract with an invariant_* function", () => {
    const artifact = artifactFactory({
      name: "InvariantTest",
      abi: abiWith("invariant_bar"),
      bytecode: NON_EMPTY_BYTECODE,
    });

    assert.equal(isTestSuiteArtifact(artifact), true);
  });

  it("returns false for a concrete contract with no test/invariant ABI entries", () => {
    const artifact = artifactFactory({
      name: "Plain",
      abi: abiWith("foo"),
      bytecode: NON_EMPTY_BYTECODE,
    });

    assert.equal(isTestSuiteArtifact(artifact), false);
  });

  it("returns false for abstract contracts with zero bytecode, even when ABI has test entries", () => {
    const artifact = artifactFactory({
      name: "AbstractTest",
      abi: abiWith("test_foo"),
      bytecode: ZERO_BYTECODE,
    });

    assert.equal(isTestSuiteArtifact(artifact), false);
  });
});

describe("writeTestRunOutput", () => {
  it("returns the error that failed the reporter stream instead of leaving it unhandled", async () => {
    const runStream = new Readable({ objectMode: true, read() {} });
    const reporterError = new Error("The reporter failed");

    // A reporter that fails while formatting an event, e.g. because of an
    // unexpected event shape. The composed stream emits an `error` event that
    // nothing but `writeTestRunOutput` listens to, which would otherwise crash
    // the process with an uncaught exception, failing this test.
    const reporterStream = runStream.compose(async function* (
      source: AsyncIterable<{ type: string }>,
    ) {
      for await (const event of source) {
        assert.equal(event.type, "run:done");
        throw reporterError;
      }
    });

    runStream.push({ type: "run:done" });

    const error = await writeTestRunOutput(
      runStream,
      reporterStream,
      new Writable({
        write(_chunk, _encoding, callback) {
          callback();
        },
      }),
    );

    assert.equal(error, reporterError);

    // Give the reporter stream's `error` event a chance to surface while this
    // test is still running, so that an unhandled one is reported here.
    await new Promise((resolve) => setImmediate(resolve));
  });
});

describe("selectTestSourcePaths", () => {
  const parsableSource = {
    sourceName: "project/test/Foo.t.sol",
    userSourceName: "test/Foo.t.sol",
    path: "/project/test/Foo.t.sol",
    solcVersion: "0.8.28",
  };

  const unparsableSource = {
    sourceName: "project/test/Legacy.t.sol",
    userSourceName: "test/Legacy.t.sol",
    path: "/project/test/Legacy.t.sol",
    solcVersion: "0.7.6",
  };

  it("names every source when they can all be parsed", () => {
    const { testSourcePaths, unparsableSources } = selectTestSourcePaths([
      parsableSource,
      {
        sourceName: "project/test/Bar.t.sol",
        userSourceName: "test/Bar.t.sol",
        path: "/project/test/Bar.t.sol",
        solcVersion: "0.8.0",
      },
    ]);

    assert.deepEqual(testSourcePaths, {
      "project/test/Foo.t.sol": "/project/test/Foo.t.sol",
      "project/test/Bar.t.sol": "/project/test/Bar.t.sol",
    });
    assert.deepEqual(unparsableSources, []);
  });

  it("names no source when one of them predates solc 0.8", () => {
    const { testSourcePaths, unparsableSources } = selectTestSourcePaths([
      parsableSource,
      unparsableSource,
    ]);

    assert.equal(testSourcePaths, undefined);
    assert.deepEqual(unparsableSources, ["test/Legacy.t.sol"]);
  });

  it("reports each unparsable source once, sorted", () => {
    const { unparsableSources } = selectTestSourcePaths([
      {
        sourceName: "project/test/Older.t.sol",
        userSourceName: "test/Older.t.sol",
        path: "/project/test/Older.t.sol",
        solcVersion: "0.6.12",
      },
      unparsableSource,
      // A file with two test contracts is selected once per contract.
      unparsableSource,
    ]);

    assert.deepEqual(unparsableSources, [
      "test/Legacy.t.sol",
      "test/Older.t.sol",
    ]);
  });

  it("returns an empty map when no test suite is selected", () => {
    const { testSourcePaths, unparsableSources } = selectTestSourcePaths([]);

    assert.deepEqual(testSourcePaths, {});
    assert.deepEqual(unparsableSources, []);
  });
});
