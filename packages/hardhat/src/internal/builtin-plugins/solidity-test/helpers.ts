import type { TestsStream } from "./types.js";
import type { Abi } from "../../../types/artifacts.js";
import type { ChainType } from "../../../types/network.js";
import type { SolidityTestProfileConfig } from "../../../types/test.js";
import type {
  SolidityTestRunnerConfigArgs,
  PathPermission,
  Artifact,
  ObservabilityConfig,
} from "@nomicfoundation/edr";
import type { Writable } from "node:stream";

import { finished } from "node:stream/promises";
import { styleText } from "node:util";

import {
  opGenesisState,
  l1GenesisState,
  FsAccessPermission,
  CollectStackTraces,
  opHardforkFromString,
  l1HardforkFromString,
} from "@nomicfoundation/edr";
import { toBigInt } from "@nomicfoundation/hardhat-utils/bigint";
import { hexStringToBytes } from "@nomicfoundation/hardhat-utils/hex";

import {
  ALWAYS_COLLECT_STACK_TRACES_VERBOSITY,
  OPTIMISM_CHAIN_TYPE,
} from "../../constants.js";
import { resolveHardfork } from "../network-manager/config-resolution.js";
import { hardhatHardforkToEdrSpecId } from "../network-manager/edr/utils/convert-to-edr.js";
import { warnIfExperimentalHardfork } from "../network-manager/edr/utils/hardfork.js";
import { verbosityToIncludeTraces } from "../network-manager/edr/utils/trace-formatters.js";

import { formatArtifactId } from "./formatters.js";

interface SolidityTestConfigParams {
  chainType: ChainType;
  projectRoot: string;
  hardfork?: string;
  config: Omit<SolidityTestProfileConfig, "eip712Types">;
  verbosity: number;
  observability?: ObservabilityConfig;
  testPattern?: string;
  excludeTestPattern?: string;
  generateGasReport: boolean;
  eip712CanonicalTypes?: string[];
  testSourcePaths?: Record<string, string>;
}

export async function solidityTestConfigToSolidityTestRunnerConfigArgs({
  chainType,
  projectRoot,
  hardfork,
  config,
  verbosity,
  observability,
  testPattern,
  excludeTestPattern,
  generateGasReport,
  eip712CanonicalTypes,
  testSourcePaths,
}: SolidityTestConfigParams): Promise<SolidityTestRunnerConfigArgs> {
  const fsPermissions: PathPermission[] | undefined = [
    config.fsPermissions?.readWriteFile?.map((p) => ({
      access: FsAccessPermission.ReadWriteFile,
      path: p,
    })) ?? [],
    config.fsPermissions?.readFile?.map((p) => ({
      access: FsAccessPermission.ReadFile,
      path: p,
    })) ?? [],
    config.fsPermissions?.writeFile?.map((p) => ({
      access: FsAccessPermission.WriteFile,
      path: p,
    })) ?? [],
    config.fsPermissions?.dangerouslyReadWriteDirectory?.map((p) => ({
      access: FsAccessPermission.DangerouslyReadWriteDirectory,
      path: p,
    })) ?? [],
    config.fsPermissions?.readDirectory?.map((p) => ({
      access: FsAccessPermission.ReadDirectory,
      path: p,
    })) ?? [],
    config.fsPermissions?.dangerouslyWriteDirectory?.map((p) => ({
      access: FsAccessPermission.DangerouslyWriteDirectory,
      path: p,
    })) ?? [],
  ].flat(1);

  const hexToBytes = (hex: string | undefined) =>
    hex !== undefined ? hexStringToBytes(hex) : undefined;

  const sender = hexToBytes(config.from);
  const txOrigin = hexToBytes(config.txOrigin);
  const blockCoinbase = hexToBytes(config.coinbase);

  const resolvedHardforkName = resolveHardfork(hardfork, chainType);
  warnIfExperimentalHardfork(resolvedHardforkName, chainType);

  const resolvedHardfork = hardhatHardforkToEdrSpecId(
    resolvedHardforkName,
    chainType,
  );

  const localPredeploys =
    chainType === OPTIMISM_CHAIN_TYPE
      ? opGenesisState(opHardforkFromString(resolvedHardfork))
      : l1GenesisState(l1HardforkFromString(resolvedHardfork));

  const includeTraces = verbosityToIncludeTraces(verbosity);

  const blockGasLimit =
    typeof config.blockGasLimit === "number" ||
    typeof config.blockGasLimit === "bigint"
      ? toBigInt(config.blockGasLimit)
      : undefined;
  const disableBlockGasLimit = blockGasLimit === undefined;

  const transactionGasCap =
    typeof config.transactionGasCap === "number" ||
    typeof config.transactionGasCap === "bigint"
      ? toBigInt(config.transactionGasCap)
      : undefined;
  const disableTransactionGasCap = transactionGasCap === undefined;

  const blockDifficulty = config.prevRandao;

  let ethRpcUrl: string | undefined;
  if (config.forking?.url !== undefined) {
    ethRpcUrl = await config.forking.url.get();
  }

  const forkBlockNumber = config.forking?.blockNumber;

  let rpcEndpoints: Record<string, string> | undefined;
  if (config.forking?.rpcEndpoints !== undefined) {
    rpcEndpoints = {};
    for (const [name, configValue] of Object.entries(
      config.forking.rpcEndpoints,
    )) {
      rpcEndpoints[name] = await configValue.get();
    }
  }

  const shouldAlwaysCollectStackTraces =
    verbosity >= ALWAYS_COLLECT_STACK_TRACES_VERBOSITY;

  return {
    projectRoot,
    hardfork: resolvedHardfork,
    ...config,
    fsPermissions,
    localPredeploys,
    sender,
    txOrigin,
    blockCoinbase,
    observability,
    testPattern: testPattern === "" ? undefined : testPattern,
    excludeTestPattern:
      excludeTestPattern === "" ? undefined : excludeTestPattern,
    includeTraces,
    blockGasLimit,
    disableBlockGasLimit,
    transactionGasCap,
    disableTransactionGasCap,
    blockDifficulty,
    ethRpcUrl,
    forkBlockNumber,
    rpcEndpoints,
    generateGasReport,
    collectStackTraces: shouldAlwaysCollectStackTraces
      ? CollectStackTraces.Always
      : CollectStackTraces.OnFailure,
    eip712CanonicalTypes,
    testSourcePaths,
  };
}

export function isTestSuiteArtifact(artifact: Artifact): boolean {
  const bytecode = artifact.contract.bytecode;

  // Skip abstract contracts and interfaces i.e. those with no bytecode
  if (bytecode === "" || bytecode === "0x" || bytecode === undefined) {
    return false;
  }

  const abi: Abi = JSON.parse(artifact.contract.abi);
  return abi.some(({ type, name }) => {
    if (type === "function" && typeof name === "string") {
      return name.startsWith("test") || name.startsWith("invariant");
    }

    return false;
  });
}

/**
 * Writes the test reporter's output to `output` and waits for the test run to
 * complete, returning the error that failed it, if any.
 *
 * @param runStream The runner's stream of test events.
 * @param reporterStream The reporter's stream of output, composed from
 * `runStream`.
 * @param output Where the reporter's output is written to.
 * @returns The error that failed the run, or `undefined` if it succeeded.
 */
export async function writeTestRunOutput(
  runStream: TestsStream,
  reporterStream: NodeJS.ReadableStream,
  output: Writable,
): Promise<unknown> {
  const outputStream = reporterStream.pipe(output);

  // When the runner reports an error it destroys the run stream with it, which
  // also destroys the reporter stream composed from it. `pipe()` neither
  // forwards that error to the output stream nor ends it, so without this
  // listener the reporter stream emits an `error` event with nothing listening,
  // crashing the process, and `finished(outputStream)` below never settles.
  // Attached before any `await` so that it can't miss the event.
  let reporterStreamError: Error | undefined;
  reporterStream.on("error", (error: Error) => {
    reporterStreamError = error;
    if (!outputStream.writableEnded) {
      outputStream.end();
    }
  });

  let runError: unknown;
  try {
    // NOTE: We're awaiting the original run stream to finish to catch any
    // errors produced by the runner.
    await finished(runStream);

    // We also await the output stream to finish, as we want to wait for it
    // to avoid returning before the whole output was generated.
    await finished(outputStream);
  } catch (error) {
    runError = error;
  }

  // Neither await above surfaces an error that reached the reporter stream
  // without failing the run stream, e.g. one thrown by the reporter after the
  // run stream already ended.
  return runError ?? reporterStreamError;
}

export function warnDeprecatedTestFail(
  artifact: Artifact,
  sourceNameToUserSourceName: Map<string, string>,
): void {
  const abi: Abi = JSON.parse(artifact.contract.abi);

  abi.forEach(({ type, name }) => {
    if (
      type === "function" &&
      typeof name === "string" &&
      name.startsWith("testFail")
    ) {
      const formattedLocation = formatArtifactId(
        artifact.id,
        sourceNameToUserSourceName,
      );
      const warningMessage = `${styleText("yellow", "Warning")}: ${name} The support for the prefix \`testFail*\` has been removed. Consider using \`vm.expectRevert()\` for testing reverts in ${formattedLocation}\n`;

      console.warn(warningMessage);
    }
  });
}
